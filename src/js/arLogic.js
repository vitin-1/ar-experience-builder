import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

// XR8.Threejs.pipelineModule() acessa window.THREE em runtime
window.THREE = THREE;

// === CONFIG ===
const SUPABASE_URL = 'https://xeyfzhkualdchxedwkhz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MmczBA1FTY2mMU3TBX32gw_YUHzHgci';

// Câmera frontal (selfie). Pode ser alternada em runtime via switchCamera().
let isFrontCamera = true;

// Fator de suavização do tracking (0 = máximo suave/lento, 1 = sem suavização).
// 0.35 dá boa responsividade mantendo estabilidade para mãos em movimento.
const SMOOTH_ALPHA = 0.35;

// === ELEMENTS ===
const tapOverlay     = document.getElementById('tap-overlay');
const loadingSpinner = document.getElementById('loading-spinner');
const loadingText    = document.getElementById('loading-text');
const tapIcon        = document.getElementById('tap-icon');
const tapText        = document.getElementById('tap-text');
const tapSub         = document.getElementById('tap-sub');
const errorModal     = document.getElementById('error-modal');
const scannerHUD     = document.getElementById('scanner-hud');
const scanHint       = document.getElementById('scan-hint');
const statusPill     = document.getElementById('status-pill');
const statusTextEl   = document.getElementById('status-text');
const videoContainer = document.getElementById('video-container');

// === STATE ===
const meshes       = {};
const targetLabels = {};
// Poses suavizadas por alvo — resetadas quando o alvo é perdido para evitar
// interpolação de posição antiga ao ser reencontrado.
const smooth       = {};
let imageTargetData      = [];
let allVideos            = [];
let userScaleMultiplier  = 1.0;
let initialPinchDistance = null;
let initialUserScale     = 1.0;
let pillTimer            = null;
// true após 'hasVideo' — impede que status 'failed' transitório (que o 8th Wall
// pode disparar durante detecção de target na câmera frontal) mostre o modal.
let cameraReady = false;

// === ANALYTICS ===
const sbAnalytics = createClient(SUPABASE_URL, SUPABASE_KEY);
const trackedSessions = {};
const SCAN_COOLDOWN_MS = 15000;

const trackScan = (targetName) => {
  const now = Date.now();
  if (trackedSessions[targetName] && now - trackedSessions[targetName] < SCAN_COOLDOWN_MS) return;
  trackedSessions[targetName] = now;
  try {
    sbAnalytics.from('analytics').insert({ event_type: 'ar_scan', metadata: { target_name: targetName } }).then(() => {});
  } catch (_) {}
};

// === PINCH TO ZOOM ===
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    initialPinchDistance = Math.hypot(dx, dy);
    initialUserScale = userScaleMultiplier;
  }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2 && initialPinchDistance) {
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const ratio = Math.hypot(dx, dy) / initialPinchDistance;
    userScaleMultiplier = Math.max(0.3, Math.min(initialUserScale * ratio, 4.0));
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) initialPinchDistance = null;
});

// === STATUS PILL ===
const showStatus = (msg, type = 'found') => {
  statusPill.className = 'status-pill show ' + type;
  statusTextEl.textContent = msg;
  clearTimeout(pillTimer);
  pillTimer = setTimeout(
    () => statusPill.classList.remove('show'),
    type === 'found' ? 8000 : 3000
  );
};

// === SUPABASE TARGETS ===
const loadTargetsFromDB = async () => {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await sb
      .from('ar_targets')
      .select('target_name, label, target_image_url, video_url, video_aspect, target_properties')
      .eq('active', true);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Erro ao carregar targets, usando fallback:', err);
    return [
      {
        target_name: 'hunters', label: 'Hunters',
        target_image_url: '/targets/hunters.png', video_url: '/video.mp4',
        video_aspect: '16:9',
        target_properties: { left: 0, top: 167, width: 480, height: 305, originalWidth: 480, originalHeight: 640, isRotated: false }
      },
      {
        target_name: 'navegue', label: 'Navegue Seguro',
        target_image_url: '/targets/navegue.png', video_url: '/video-neymar.mp4',
        video_aspect: '9:16',
        target_properties: { left: 0, top: 109, width: 480, height: 422, originalWidth: 480, originalHeight: 640, isRotated: false }
      }
    ];
  }
};

const createVideoElement = (name, src) => {
  const v = document.createElement('video');
  v.id = 'video-' + name;
  v.className = 'video-src';
  v.src = src;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('webkit-playsinline', '');
  v.setAttribute('disablePictureInPicture', '');
  v.setAttribute('disableRemotePlayback', '');
  v.crossOrigin = 'anonymous';
  v.preload = 'metadata';
  videoContainer.appendChild(v);
  return v;
};

const getAspectHeight = (aspect) => {
  if (aspect === '9:16') return 1.7778;
  if (aspect === '1:1') return 1;
  return 0.5625; // 16:9 default
};

// === ROUNDED VIDEO CARD GEOMETRY ===
const createRoundedGeometry = (width, height, radius) => {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);

  const geo = new THREE.ShapeGeometry(shape, 12);
  const pos = geo.attributes.position;
  const uv  = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + width / 2) / width, (pos.getY(i) + height / 2) / height);
  }
  return geo;
};

// === THREE.JS SCENE INIT ===
const initXrScene = ({ scene }) => {
  // Câmera frontal: o 8th Wall exibe o feed já espelhado horizontalmente.
  // Espelhar a cena Three.js em X alinha os overlays 3D ao background.
  // DoubleSide no material garante que a inversão de winding não cullie a face.
  if (isFrontCamera) scene.scale.x = -1;

  Object.values(meshes).forEach(t => {
    const tex = new THREE.VideoTexture(t.video);
    tex.minFilter = THREE.LinearFilter;

    // Com scene.scale.x = -1, as UVs ficam invertidas horizontalmente.
    // Inverter repeat.x restaura a orientação correta do vídeo (texto legível,
    // rostos não espelhados).
    if (isFrontCamera) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(-1, 1);
      tex.offset.set(1, 0);
    }

    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const geo = createRoundedGeometry(1, t.aspectHeight, 0.05);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    t.mesh    = mesh;
    t.texture = tex;
  });
};

// === AR TARGET EVENTS ===
const showTarget = (detail) => {
  const { name, position, rotation, scale } = detail;
  const t = meshes[name];
  if (!t || !t.mesh) return;

  // O engine open source pode retornar plain objects {x,y,z} em vez de
  // instâncias Three.js — garantimos o tipo correto antes de chamar clone/lerp/slerp.
  const pos = (position && typeof position.clone === 'function')
    ? position
    : new THREE.Vector3(position?.x ?? 0, position?.y ?? 0, position?.z ?? 0);
  const rot = (rotation && typeof rotation.clone === 'function')
    ? rotation
    : new THREE.Quaternion(rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0, rotation?.w ?? 1);

  // Primeira detecção: snapping direto para evitar interpolação de posição zero.
  // Detecções subsequentes: lerp/slerp para suavizar motion blur e instabilidade
  // causados pelo movimento das mãos segurando a logo.
  if (!smooth[name]) {
    smooth[name] = {
      pos: pos.clone(),
      rot: rot.clone()
    };
  } else {
    smooth[name].pos.lerp(pos, SMOOTH_ALPHA);
    smooth[name].rot.slerp(rot, SMOOTH_ALPHA);
  }

  t.mesh.position.copy(smooth[name].pos);
  t.mesh.quaternion.copy(smooth[name].rot);
  t.mesh.scale.setScalar(scale * userScaleMultiplier);

  if (!t.mesh.visible) t.mesh.visible = true;

  const tryPlay = () => {
    const p = t.video.play();
    if (p) p.catch(() => { t.video.muted = true; t.video.play().catch(() => {}); });
  };

  if (t.video.readyState >= 2) {
    tryPlay();
  } else {
    t.video.load();
    t.video.addEventListener('canplay', tryPlay, { once: true });
    setTimeout(tryPlay, 3000);
  }

  scannerHUD.classList.add('hidden');
  scanHint.classList.add('hidden');
  showStatus(targetLabels[name] || name, 'found');
  trackScan(name);
};

const hideTarget = (name) => {
  const t = meshes[name];
  if (!t || !t.mesh) return;
  t.mesh.visible = false;
  t.video.pause();

  // Limpar o estado suavizado para que a próxima detecção faça snap
  // e não interpole a partir da última posição conhecida.
  delete smooth[name];

  const anyVisible = Object.values(meshes).some(m => m.mesh?.visible);
  if (!anyVisible) {
    scannerHUD.classList.remove('hidden');
    scanHint.classList.remove('hidden');
    userScaleMultiplier = 1.0;
  }
  showStatus('Escaneando...', 'lost');
};

// === MAIN INIT ===
const initAR = async () => {
  const targets = await loadTargetsFromDB();

  targets.forEach(row => {
    const vid = createVideoElement(row.target_name, row.video_url || '');
    allVideos.push(vid);
    targetLabels[row.target_name] = row.label || row.target_name;
    meshes[row.target_name] = {
      video: vid,
      aspectHeight: getAspectHeight(row.video_aspect),
      mesh: null,
      texture: null
    };

    const props = typeof row.target_properties === 'string'
      ? JSON.parse(row.target_properties)
      : (row.target_properties || {});

    imageTargetData.push({
      imagePath: row.target_image_url,
      metadata: {},
      name: row.target_name,
      type: 'PLANAR',
      properties: {
        left:          props.left          || 0,
        top:           props.top           || 0,
        width:         props.width         || 480,
        height:        props.height        || 640,
        originalWidth: props.originalWidth || 480,
        originalHeight: props.originalHeight || 640,
        isRotated:     props.isRotated     || false
      }
    });
  });

  const onxrloaded = () => {
    XR8.XrController.configure({
      imageTargetData,
      // Desativar world tracking (SLAM) quando só precisamos de image targets.
      // Economiza CPU/GPU significativo — crítico para câmera frontal hand-held.
      disableWorldTracking: true
    });
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
      {
        name: 'hunters-ar',
        onStart: () => initXrScene(XR8.Threejs.xrScene()),
        onUpdate: () => {},
        onCameraStatusChange: ({ status }) => {
          if (status === 'hasVideo') cameraReady = true;
          // Só mostra o modal se a câmera nunca chegou a funcionar: evita
          // que um 'failed' transitório (câmera frontal + detecção de target)
          // derrube uma sessão que já estava ativa.
          if (status === 'failed' && !cameraReady) errorModal.classList.add('show');
        },
        onException: (err) => {
          console.error('[AR] XR8 onException:', err);
          errorModal.classList.add('show');
        },
        listeners: [
          { event: 'reality.imagefound',   process: e => showTarget(e.detail) },
          { event: 'reality.imageupdated', process: e => showTarget(e.detail) },
          { event: 'reality.imagelost',    process: e => hideTarget(e.detail.name) }
        ]
      }
    ]);
    loadingSpinner.style.display = 'none';
    loadingText.style.display   = 'none';
    tapIcon.style.display = 'flex';
    tapText.style.display = 'block';
    tapSub.style.display  = 'block';
  };

  window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded);
};

initAR();

// === CAMERA SWITCH ===
// Para trocar de câmera é necessário reiniciar o XR8 — não há API de troca em runtime.
// Destrói as malhas existentes para que initXrScene as recrie corretamente
// com as novas configurações de espelho/UV.
const switchCamera = () => {
  const { scene } = XR8.Threejs.xrScene();

  Object.values(meshes).forEach(t => {
    if (t.mesh) {
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
      t.mesh = null;
    }
    if (t.texture) { t.texture.dispose(); t.texture = null; }
    t.video.pause();
  });

  Object.keys(smooth).forEach(k => delete smooth[k]);
  userScaleMultiplier = 1.0;
  scannerHUD.classList.remove('hidden');
  scanHint.classList.remove('hidden');

  isFrontCamera = !isFrontCamera;
  scanHint.textContent = isFrontCamera ? 'Mostre a logo para a câmera' : 'Aponte para uma logo';

  cameraReady = false;
  try { XR8.stop(); } catch (_) {}

  setTimeout(() => {
    try {
      const canvas = document.getElementById('camerafeed');
      XR8.run({
        canvas,
        allowedDevices: XR8.XrConfig.device().ANY,
        ...(isFrontCamera && { cameraConfig: { direction: 'front' } })
      });
    } catch (_) { errorModal.classList.add('show'); }
  }, 300);
};

document.getElementById('btn-flip-camera').addEventListener('click', () => {
  // Só permite trocar se a sessão XR8 já estiver ativa
  if (tapOverlay.classList.contains('hidden')) switchCamera();
});

// === TAP TO START ===
tapOverlay.addEventListener('click', () => {
  allVideos.forEach(v => {
    v.muted = true;
    v.load();
    const p = v.play();
    if (p) p.then(() => { v.pause(); v.currentTime = 0; v.muted = false; }).catch(() => {});
  });
  tapOverlay.classList.add('hidden');
  try {
    const canvas = document.getElementById('camerafeed');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    XR8.run({
      canvas,
      allowedDevices: XR8.XrConfig.device().ANY,
      // Força câmera frontal (selfie). Remove a propriedade para voltar ao padrão (traseira).
      ...(isFrontCamera && { cameraConfig: { direction: 'front' } })
    });
  } catch (_) {
    errorModal.classList.add('show');
  }
});

// === BACK BUTTON ===
document.getElementById('btn-voltar').addEventListener('click', (e) => {
  e.preventDefault();
  Object.values(meshes).forEach(t => { if (t.mesh) t.mesh.visible = false; t.video.pause(); });
  try { XR8.stop(); } catch (_) {}
  window.location.href = 'index.html';
});

// === CLEANUP ===
const stopAll = () => {
  Object.values(meshes).forEach(t => { if (t.mesh) t.mesh.visible = false; t.video.pause(); });
  try { XR8.stop(); } catch (_) {}
};

window.addEventListener('pagehide', stopAll);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Object.values(meshes).forEach(t => t.video.pause());
  } else {
    Object.values(meshes).forEach(t => {
      if (t.mesh?.visible) t.video.play().catch(() => {});
    });
  }
});

document.querySelectorAll('.ar-btn').forEach(btn =>
  btn.addEventListener('click', () => Object.values(meshes).forEach(t => t.video.pause()))
);

// 25s timeout — prevents infinite black screen if XR8 never fires
setTimeout(() => {
  if (!tapOverlay.classList.contains('hidden')) {
    tapOverlay.classList.add('hidden');
    errorModal.classList.add('show');
  }
}, 25000);

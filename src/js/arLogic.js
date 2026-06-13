// THREE e supabase chegam como globais via CDN em ar.html

// === CONFIG ===
const SUPABASE_URL = 'https://xeyfzhkualdchxedwkhz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MmczBA1FTY2mMU3TBX32gw_YUHzHgci';

let isFrontCamera = false;

// Suavização do tracking — 0 = máximo suave, 1 = sem suavização
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
const smooth       = {};
let imageTargetData      = [];
let allVideos            = [];
let userScaleMultiplier  = 1.0;
let initialPinchDistance = null;
let initialUserScale     = 1.0;
let pillTimer            = null;
// true após 'hasVideo' — impede que um 'failed' transitório mostre o modal de erro
let cameraReady = false;

// === SUPABASE ===
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === ANALYTICS ===
const trackedSessions = {};
const SCAN_COOLDOWN_MS = 15000;

const trackScan = (targetName) => {
  const now = Date.now();
  if (trackedSessions[targetName] && now - trackedSessions[targetName] < SCAN_COOLDOWN_MS) return;
  trackedSessions[targetName] = now;
  try {
    sb.from('analytics').insert({ event_type: 'ar_scan', metadata: { target_name: targetName } }).then(() => {});
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
const DB_FALLBACK = [
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
    target_properties: { left: 15, top: 0, width: 449, height: 640, originalWidth: 480, originalHeight: 640, isRotated: false }
  }
];

const loadTargetsFromDB = async () => {
  try {
    const { data, error } = await sb
      .from('ar_targets')
      .select('target_name, label, target_image_url, video_url, video_aspect, target_properties')
      .eq('active', true);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Erro ao carregar targets, usando fallback:', err);
    return DB_FALLBACK;
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
  return 0.5625;
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
  console.log('[initXrScene] cam:', isFrontCamera ? 'front' : 'back');
  Object.values(meshes).forEach(t => {
    t.mesh = null;
    const tex = new THREE.VideoTexture(t.video);
    tex.minFilter = THREE.LinearFilter;
    if (isFrontCamera) {
      // CSS scaleX(-1) espelha o canvas todo; flipa o UV horizontalmente
      // para o texto do vídeo aparecer correto na câmera frontal.
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.x = -1;
      tex.offset.x = 1;
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
  console.log('[showTarget] name:', name, '| cam:', isFrontCamera ? 'front' : 'back',
    '| pos:', JSON.stringify(position), '| scale:', scale);

  const t = meshes[name];
  if (!t) { console.warn('[showTarget] mesh não encontrado:', name); return; }
  if (!t.mesh) { console.warn('[showTarget] t.mesh é null:', name); return; }

  const pos = (position && typeof position.clone === 'function')
    ? position
    : new THREE.Vector3(position?.x ?? 0, position?.y ?? 0, position?.z ?? 0);
  const rot = (rotation && typeof rotation.clone === 'function')
    ? rotation
    : new THREE.Quaternion(rotation?.x ?? 0, rotation?.y ?? 0, rotation?.z ?? 0, rotation?.w ?? 1);

  if (!smooth[name]) {
    smooth[name] = { pos: pos.clone(), rot: rot.clone() };
  } else {
    smooth[name].pos.lerp(pos, SMOOTH_ALPHA);
    smooth[name].rot.slerp(rot, SMOOTH_ALPHA);
  }

  try { t.mesh.position.copy(smooth[name].pos); } catch (e) { console.error('[showTarget] ERRO position:', e); }
  try { t.mesh.quaternion.copy(smooth[name].rot); } catch (e) { console.error('[showTarget] ERRO rotation:', e); }
  try { t.mesh.scale.setScalar(scale * userScaleMultiplier); } catch (e) { console.error('[showTarget] ERRO scale:', e); }

  if (!t.mesh.visible) t.mesh.visible = true;

  const tryPlay = () => {
    if (!t.mesh || !t.mesh.visible) return;
    if (!t.video.paused) return;
    console.log('[tryPlay] readyState:', t.video.readyState, '| src:', t.video.src);
    const p = t.video.play();
    if (p) p.catch((err) => {
      console.error('[tryPlay] play() rejeitado:', err.name, err.message);
      t.video.muted = true;
      t.video.play().catch((e2) => console.error('[tryPlay] play() muted falhou:', e2.name, e2.message));
    });
  };

  if (t.video.readyState >= 2) {
    tryPlay();
  } else {
    console.log('[showTarget] vídeo não pronto (readyState:', t.video.readyState, '), aguardando canplay');
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
        left:           props.left           || 0,
        top:            props.top            || 0,
        width:          props.width          || 480,
        height:         props.height         || 640,
        originalWidth:  props.originalWidth  || 480,
        originalHeight: props.originalHeight || 640,
        isRotated:      props.isRotated      || false
      }
    });
  });

  const onxrloaded = () => {
    XR8.XrController.configure({
      imageTargetData,
      // Desativa SLAM/world tracking — só precisamos de image targets.
      // Sem isso o XR8 tenta iniciar o session manager de world tracking,
      // que falha na câmera frontal com "No valid session manager".
      disableWorldTracking: true
    });
    XR8.addCameraPipelineModules([
      XR8.GlTextureRenderer.pipelineModule(),
      XR8.Threejs.pipelineModule(),
      XR8.XrController.pipelineModule(),
      {
        name: 'hunters-ar',
        onStart: () => {},
        onUpdate: () => {},
        onCameraStatusChange: ({ status }) => {
          console.log('[AR] cameraStatus:', status);
          if (status === 'hasVideo') cameraReady = true;
          if (status === 'failed' && !cameraReady) errorModal.classList.add('show');
        },
        onException: (err) => {
          console.error('[AR] onException:', err);
          errorModal.classList.add('show');
        },
        listeners: [
          // reality.cameraconfigured garante que xrScene() está pronto
          // antes de inicializar meshes (no open-source pode ser null em onStart)
          { event: 'reality.cameraconfigured', process: () => {
            const xs = XR8.Threejs.xrScene();
            if (xs && !xs._huntersInit) { xs._huntersInit = true; initXrScene(xs); }
          }},
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
// Reinicia XR8 completamente — reconfigureSession não é suportado no open-source
const btnFlipCamera = document.getElementById('btn-flip-camera');
const arCanvas      = document.getElementById('camerafeed');

const switchCamera = () => {
  console.log('[switchCamera] início, isFront antes:', isFrontCamera);
  const { scene } = XR8.Threejs.xrScene();

  // Descarta meshes da cena atual para que initXrScene os recrie limpos
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
  cameraReady = false;

  arCanvas.classList.toggle('front-cam', isFrontCamera);
  console.log('[switchCamera] trocando para:', isFrontCamera ? 'front' : 'back');

  try { XR8.stop(); } catch (_) {}

  setTimeout(() => {
    try {
      arCanvas.width  = window.innerWidth;
      arCanvas.height = window.innerHeight;
      XR8.XrController.configure({ imageTargetData, disableWorldTracking: true });
      XR8.run({
        canvas: arCanvas,
        allowedDevices: XR8.XrConfig.device().ANY,
        ...(isFrontCamera && { cameraConfig: { direction: 'front' } })
      });
      console.log('[switchCamera] XR8.run() ok');
    } catch (err) {
      console.error('[switchCamera] ERRO no XR8.run():', err.name, err.message);
      errorModal.classList.add('show');
    }
  }, 300);
};

btnFlipCamera.addEventListener('click', () => {
  if (tapOverlay.classList.contains('hidden')) switchCamera();
});

// === CAMERA ERROR GUARD ===
const showCameraError = () => {
  tapOverlay.classList.add('hidden');
  errorModal.classList.add('show');
};

// === TAP TO START ===
tapOverlay.addEventListener('click', () => {
  allVideos.forEach(v => {
    v.muted = true;
    v.load();
    const p = v.play();
    if (p) p.then(() => { v.pause(); v.currentTime = 0; v.muted = false; }).catch(() => {});
  });
  tapOverlay.classList.add('hidden');
  btnFlipCamera.style.display = 'flex';

  try {
    arCanvas.width  = window.innerWidth;
    arCanvas.height = window.innerHeight;
    XR8.run({
      canvas: arCanvas,
      allowedDevices: XR8.XrConfig.device().ANY,
      ...(isFrontCamera && { cameraConfig: { direction: 'front' } })
    });
  } catch (_) {
    showCameraError();
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

// 25s timeout — evita tela preta infinita se XR8 não carregar
setTimeout(() => {
  if (!tapOverlay.classList.contains('hidden')) {
    tapOverlay.classList.add('hidden');
    errorModal.classList.add('show');
  }
}, 25000);

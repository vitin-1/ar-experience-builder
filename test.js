const supabaseUrl = 'https://xeyfzhkualdchxedwkhz.supabase.co';
const supabaseKey = 'sb_publishable_MmczBA1FTY2mMU3TBX32gw_YUHzHgci';
let supabase;
try {
  if (!window.supabase) throw new Error("A biblioteca do Supabase não foi carregada.");
  supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
} catch (e) {
  setTimeout(() => showToast("Erro fatal: " + e.message, 'error'), 1000);
}

const loginScreen = document.getElementById('login-screen');
const cmsScreen = document.getElementById('cms-screen');
const toast = document.getElementById('toast');
const saveBtn = document.getElementById('save-btn');

function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `mb-6 p-4 rounded-lg text-sm font-semibold text-center transition-all ${type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`;
  setTimeout(() => toast.classList.add('hidden'), 5000);
}

async function checkAuth() {
  if (!supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      loginScreen.classList.add('hidden');
      cmsScreen.classList.remove('hidden');
    } else {
      loginScreen.classList.remove('hidden');
      cmsScreen.classList.add('hidden');
    }
  } catch (err) {
    showToast("Aviso: " + err.message, 'error');
  }
}
checkAuth();

window.handleLogin = async function(e) {
  if (e) e.preventDefault();
  
  if (!supabase) {
    showToast("O sistema não pôde ser iniciado. Verifique sua rede.", 'error');
    return;
  }
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  
  if (!email || !password) {
    showToast('Preencha o e-mail e a senha.', 'error');
    return;
  }

  btn.textContent = 'Entrando...';
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error(error);
      showToast('Falha no Login: ' + error.message, 'error');
      setTimeout(() => alert("Aviso: " + error.message), 100);
      btn.textContent = 'Acessar Painel';
    } else {
      loginScreen.classList.add('hidden');
      cmsScreen.classList.remove('hidden');
      btn.textContent = 'Acessar Painel';
    }
  } catch (err) {
    showToast("Erro inesperado: " + err.message, 'error');
    btn.textContent = 'Acessar Painel';
  }
};

window.handleLogout = async function() {
  await supabase.auth.signOut();
  checkAuth();
};

window.handleUpload = async function(e) {
  if (e) e.preventDefault();
  const targetName = document.getElementById('target-select').value;
  const fileInput = document.getElementById('video-file');
  
  if (!fileInput.files || fileInput.files.length === 0) return;
  const file = fileInput.files[0];

  saveBtn.innerHTML = `
    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    Enviando vídeo (isso pode demorar)...
  `;
  saveBtn.disabled = true;

  try {
    const fileExt = file.name.split('.').pop();
    const uniqueName = `${targetName}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(uniqueName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(uniqueName);

    const { error: dbError } = await supabase
      .from('ar_targets')
      .update({ video_url: publicUrl })
      .eq('target_name', targetName);

    if (dbError) throw dbError;

    showToast('Sucesso! O vídeo da AR foi atualizado ao vivo! 🎉', 'success');
    fileInput.value = '';
    
  } catch (err) {
    console.error(err);
    showToast('Erro ao atualizar: ' + err.message, 'error');
  } finally {
    saveBtn.innerHTML = 'Salvar e Atualizar AR';
    saveBtn.disabled = false;
  }
};

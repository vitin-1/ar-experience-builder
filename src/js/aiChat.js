const WEBHOOK_URL = 'https://n8n-n8n.ooqqkc.easypanel.host/webhook/1c780a3c-77c7-4daf-a9dd-4695001fd4c1';

document.addEventListener('DOMContentLoaded', () => {
  // Elementos do painel de chat
  const chatPanel = document.getElementById('ai-chat-panel');
  const closeBtn = document.getElementById('close-chat-btn');
  const messagesContainer = document.getElementById('chat-messages');
  const panelInput = document.getElementById('chat-panel-input');
  const panelSendBtn = document.getElementById('chat-panel-send-btn');
  
  const mainInput = document.getElementById('ai-agent-input');
  const mainSendBtn = document.getElementById('main-action-btn');
  const mainBtnIcon = document.getElementById('main-btn-icon');
  const mainBtnBadge = document.getElementById('main-btn-badge');
  let hasHistory = false;
  let isChatOpen = false;

  const iconSend = `<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>`;
  const iconChat = `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>`;

  // Atualiza o ícone do botão principal (Chat vs Send)
  const updateMainIcon = () => {
    if (mainInput.value.trim().length > 0) {
      mainBtnIcon.innerHTML = iconSend;
    } else {
      mainBtnIcon.innerHTML = hasHistory ? iconChat : iconSend;
    }
  };

  mainInput.addEventListener('input', updateMainIcon);

  let sessionId = localStorage.getItem('n8n_chat_session');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('n8n_chat_session', sessionId);
  }

  const openPanel = () => {
    chatPanel.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevents body scroll
    if (mainBtnBadge) mainBtnBadge.classList.remove('active'); // Limpa a notificação ao abrir
    isChatOpen = true;
  };

  const closePanel = () => {
    chatPanel.classList.remove('open');
    document.body.style.overflow = ''; // Restores body scroll
    isChatOpen = false;
    updateMainIcon(); // Garante que o ícone volta ao estado correto
  };

  closeBtn.addEventListener('click', closePanel);

  const addMessage = (text, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', sender);
    msgDiv.textContent = text;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  const sendMessage = async (inputElement) => {
    const text = inputElement.value.trim();
    if (!text) return;

    inputElement.value = '';
    hasHistory = true; // Marca que o usuário já mandou mensagem
    updateMainIcon(); // Atualiza o botão da landing page
    
    // Limpa o outro input também para manter sincronizado se necessário
    if (inputElement === mainInput) panelInput.value = '';
    else mainInput.value = '';

    openPanel();
    addMessage(text, 'user');

    // Show typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('chat-msg', 'bot', 'typing');
    typingDiv.textContent = '...';
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'sendMessage',
          sessionId: sessionId,
          chatInput: text,
          message: text 
        })
      });

      typingDiv.remove();

      if (response.ok) {
        let responseData;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await response.json();
          // Tenta pegar o output comum do n8n
          responseData = json.output || json.message || json.text || JSON.stringify(json);
        } else {
          responseData = await response.text();
        }
        addMessage(responseData, 'bot');
      } else {
        const errorText = await response.text().catch(() => 'Sem detalhes adicionais');
        console.error('Erro na resposta do webhook:', response.status, response.statusText, errorText);
        
        if (response.status === 404) {
          addMessage('Erro 404: O webhook não foi encontrado. Se você está testando no n8n, verifique se o workflow está Ativo, ou use a URL que contém "/webhook-test/" em vez de "/webhook/".', 'bot');
        } else {
          addMessage(`Erro na comunicação (Status: ${response.status}). Verifique o console do navegador.`, 'bot');
        }
      }
      
      // Se o chat estiver fechado quando a resposta chegar, mostra a notificação
      if (!isChatOpen && mainBtnBadge) {
        mainBtnBadge.classList.add('active');
        hasHistory = true;
        updateMainIcon();
      }

    } catch (error) {
      typingDiv.remove();
      addMessage('Erro de conexão com o assistente.', 'bot');
      console.error(error);
    } finally {
      // Foca no input do painel após responder
      setTimeout(() => panelInput.focus(), 100);
    }
  };

  // Eventos do input principal (Landing Page)
  mainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage(mainInput);
    }
  });

  // Enviar a partir do input da landing page (botão dinâmico)
  mainSendBtn.addEventListener('click', () => {
    if (mainInput.value.trim().length > 0) {
      // Tem texto: Envia a mensagem
      sendMessage(mainInput);
    } else {
      // Não tem texto
      if (hasHistory) {
        // Se já tem histórico, abre o chat
        openPanel();
        setTimeout(() => panelInput.focus(), 100);
      } else {
        // Sem texto e sem histórico: apenas foca ou abre
        openPanel();
      }
    }
  });

  // Eventos do input do painel de chat
  panelInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage(panelInput);
    }
  });

  panelSendBtn.addEventListener('click', () => {
    sendMessage(panelInput);
  });

  // Fechar o chat clicando fora
  document.addEventListener('click', (e) => {
    if (isChatOpen) {
      // Verifica se o clique não foi no painel e nem nos inputs da main
      const clickedInsidePanel = chatPanel.contains(e.target);
      const clickedOnMainInput = mainInput.contains(e.target);
      const clickedOnMainBtn = mainSendBtn.contains(e.target);
      
      if (!clickedInsidePanel && !clickedOnMainInput && !clickedOnMainBtn) {
        closePanel();
      }
    }
  });
});

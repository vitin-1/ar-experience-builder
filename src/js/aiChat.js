const WEBHOOK_URL = 'https://n8n-n8n.ooqqkc.easypanel.host/webhook/1c780a3c-77c7-4daf-a9dd-4695001fd4c1';

document.addEventListener('DOMContentLoaded', () => {
  // Input da landing page
  const mainInput = document.getElementById('ai-agent-input');
  const mainSendBtn = document.querySelector('.ai-eq-btn');
  
  // Elementos do painel de chat
  const chatPanel = document.getElementById('ai-chat-panel');
  const closeBtn = document.getElementById('close-chat-btn');
  const messagesContainer = document.getElementById('chat-messages');
  const panelInput = document.getElementById('chat-panel-input');
  const panelSendBtn = document.getElementById('chat-panel-send-btn');

  let sessionId = localStorage.getItem('n8n_chat_session');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('n8n_chat_session', sessionId);
  }

  const openPanel = () => {
    chatPanel.classList.add('open');
  };

  const closePanel = () => {
    chatPanel.classList.remove('open');
  };

  closeBtn.addEventListener('click', closePanel);

  const addMessage = (text, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', sender);
    msgDiv.textContent = text;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  const sendMessage = async (sourceInput) => {
    const text = sourceInput.value.trim();
    if (!text) {
      // Se estiver vazio, apenas abre o painel se quiserem ver o histórico
      openPanel();
      if (sourceInput === mainInput) {
        setTimeout(() => panelInput.focus(), 100);
      }
      return;
    }

    sourceInput.value = '';
    // Limpa o outro input também para manter sincronizado se necessário
    if (sourceInput === mainInput) panelInput.value = '';
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

  mainSendBtn.addEventListener('click', () => {
    sendMessage(mainInput);
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
});

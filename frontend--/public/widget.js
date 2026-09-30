(function () {
  // Dynamic backend chatbot endpoint (supports local dev and deployed servers)
  const BACKEND_URL =
    (typeof window !== 'undefined' && (window.VITE_CHATBOT_URL || window.CHATBOT_API_URL)) ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:5000/api/chat'
      : '/api/chat');
  let chatHistory = [];

  // 1. Inject CSS stylesheet automatically if not already present
  if (!document.getElementById('canvas-sync-widget-css')) {
    const link = document.createElement('link');
    link.id = 'canvas-sync-widget-css';
    link.rel = 'stylesheet';
    link.href = '/widget.css';
    document.head.appendChild(link);
  }

  // 2. Build and inject Widget HTML structure dynamically
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'canvas-sync-chat-widget';
  widgetContainer.innerHTML = `
    <button class="chat-widget-trigger" id="widgetTrigger" aria-label="Open support chat" title="Chat with AI Support">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
    <div class="chat-widget-window" id="widgetWindow">
      <div class="chat-widget-header">
        <div class="chat-widget-header-title">
          <div class="chat-widget-avatar">
            ⚡
            <span class="chat-widget-status-dot"></span>
          </div>
          <div>
            <div class="chat-widget-title-text">CanvasSync Support</div>
            <div class="chat-widget-subtitle">AI Assistant &bull; Always active</div>
          </div>
        </div>
        <button class="chat-widget-close" id="widgetClose" aria-label="Close chat window">&times;</button>
      </div>
      <div class="chat-widget-messages" id="widgetMessages">
        <div class="chat-widget-msg bot">
          👋 Hi! I'm your CanvasSync AI assistant. How can I help you with your canvas or collaboration today?
        </div>
      </div>
      <div class="chat-widget-input-area">
        <input type="text" class="chat-widget-input" id="widgetInput" placeholder="Ask a question..." autocomplete="off">
        <button class="chat-widget-send" id="widgetSend" aria-label="Send message">
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widgetContainer);

  // 3. Select DOM Elements
  const trigger = document.getElementById('widgetTrigger');
  const windowEl = document.getElementById('widgetWindow');
  const closeBtn = document.getElementById('widgetClose');
  const sendBtn = document.getElementById('widgetSend');
  const inputField = document.getElementById('widgetInput');
  const msgContainer = document.getElementById('widgetMessages');

  // 4. UI Actions & Event Listeners
  trigger.addEventListener('click', () => {
    const isVisible = windowEl.style.display === 'flex';
    windowEl.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      setTimeout(() => inputField.focus(), 150);
    }
  });

  closeBtn.addEventListener('click', () => {
    windowEl.style.display = 'none';
  });

  sendBtn.addEventListener('click', handleSendMessage);
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // 5. Message handling
  async function handleSendMessage() {
    const text = inputField.value.trim();
    if (!text || sendBtn.disabled) return;

    // Display user message & update history
    appendMessage(text, 'user');
    inputField.value = '';
    chatHistory.push({ role: 'user', content: text });

    // Generate loading indicator state
    const typingEl = appendTypingIndicator();
    sendBtn.disabled = true;

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with status ${response.status}`);
      }

      const data = await response.json();

      // Remove typing indicator and render AI response
      if (typingEl && typingEl.parentNode) {
        typingEl.remove();
      }
      appendMessage(data.reply, 'bot');
      chatHistory.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      if (typingEl && typingEl.parentNode) {
        typingEl.remove();
      }
      const errMsg = err.message.includes('Failed to fetch')
        ? '⚠️ Unable to connect to chatbot server. Make sure the backend (chat_bot.py) is running on port 5000.'
        : `⚠️ Error: ${err.message}`;
      appendMessage(errMsg, 'error');
    } finally {
      sendBtn.disabled = false;
      inputField.focus();
    }
  }

  function appendMessage(text, type) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-widget-msg ${type}`;
    msgEl.textContent = text;
    msgContainer.appendChild(msgEl);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return msgEl;
  }

  function appendTypingIndicator() {
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-widget-typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    msgContainer.appendChild(typingEl);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return typingEl;
  }
})();

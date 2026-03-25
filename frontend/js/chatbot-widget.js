/**
 * SmartGrid RAG Chatbot Widget
 * Floating chat widget powered by Gemini + MySQL RAG
 * Include this script in every HTML page
 */

(function () {
  const API_BASE = 'http://localhost:8000';

  // ── Inject CSS ────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ── Floating Button ── */
    #sg-chat-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #0078D4;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,120,212,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #sg-chat-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(0,120,212,0.55);
    }
    #sg-chat-btn svg { width: 26px; height: 26px; fill: #fff; }

    #sg-chat-badge {
      position: absolute;
      top: -3px; right: -3px;
      background: #DC2626;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      width: 18px; height: 18px;
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
      font-family: system-ui, sans-serif;
    }

    /* ── Chat Window ── */
    #sg-chat-window {
      position: fixed;
      bottom: 96px;
      right: 28px;
      width: 400px;
      height: 580px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      z-index: 9999;
      font-family: 'DM Sans', system-ui, sans-serif;
      overflow: hidden;
      animation: sgSlideUp 0.25s ease;
    }
    @keyframes sgSlideUp {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    #sg-chat-window.open { display: flex; }

    /* Header */
    #sg-chat-header {
      background: #0078D4;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-radius: 16px 16px 0 0;
      flex-shrink: 0;
    }
    #sg-chat-header .sg-avatar {
      width: 36px; height: 36px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    #sg-chat-header .sg-title { color: #fff; font-weight: 700; font-size: 14px; flex: 1; }
    #sg-chat-header .sg-sub   { color: rgba(255,255,255,0.75); font-size: 11px; }
    #sg-chat-header .sg-dot   {
      width: 8px; height: 8px; border-radius: 50%;
      background: #4ade80;
      box-shadow: 0 0 6px #4ade80;
      animation: sgPulse 2s infinite;
    }
    @keyframes sgPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    #sg-chat-close {
      background: rgba(255,255,255,0.15);
      border: none; cursor: pointer;
      color: #fff; font-size: 18px;
      width: 28px; height: 28px;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    #sg-chat-close:hover { background: rgba(255,255,255,0.25); }

    /* Messages */
    #sg-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f8fafc;
    }
    #sg-chat-messages::-webkit-scrollbar { width: 4px; }
    #sg-chat-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

    .sg-msg {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      animation: sgFadeIn 0.2s ease;
    }
    @keyframes sgFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

    .sg-msg.user { flex-direction: row-reverse; }

    .sg-msg-avatar {
      width: 28px; height: 28px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
    }
    .sg-msg.bot  .sg-msg-avatar { background: #EFF6FF; }
    .sg-msg.user .sg-msg-avatar { background: #0078D4; color: #fff; font-size: 12px; font-weight: 700; }

    .sg-msg-bubble {
      max-width: 78%;
      padding: 10px 13px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.55;
    }
    .sg-msg.bot  .sg-msg-bubble {
      background: #fff;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      border-radius: 4px 12px 12px 12px;
    }
    .sg-msg.user .sg-msg-bubble {
      background: #0078D4;
      color: #fff;
      border-radius: 12px 4px 12px 12px;
    }

    /* Markdown inside bot bubble */
    .sg-msg.bot .sg-msg-bubble strong { font-weight: 600; }
    .sg-msg.bot .sg-msg-bubble ul { margin: 6px 0 6px 16px; padding: 0; }
    .sg-msg.bot .sg-msg-bubble li { margin-bottom: 3px; }
    .sg-msg.bot .sg-msg-bubble p  { margin: 0 0 6px; }
    .sg-msg.bot .sg-msg-bubble p:last-child { margin-bottom: 0; }

    /* SQL badge */
    .sg-sql-badge {
      margin-top: 6px;
      font-size: 10px;
      color: #64748b;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: monospace;
    }
    .sg-sql-badge:hover { background: #e2e8f0; }

    /* Typing indicator */
    .sg-typing .sg-msg-bubble {
      padding: 12px 16px;
    }
    .sg-typing-dots {
      display: flex; gap: 4px; align-items: center;
    }
    .sg-typing-dots span {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #94a3b8;
      animation: sgBounce 1.2s infinite;
    }
    .sg-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .sg-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes sgBounce {
      0%,80%,100% { transform: translateY(0); }
      40%          { transform: translateY(-6px); }
    }

    /* Suggestions */
    #sg-suggestions {
      padding: 10px 16px 4px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      border-top: 1px solid #f1f5f9;
      background: #fff;
      flex-shrink: 0;
    }
    .sg-chip {
      background: #EFF6FF;
      color: #0078D4;
      border: 1px solid #BFDBFE;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 11.5px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      font-weight: 500;
    }
    .sg-chip:hover { background: #DBEAFE; border-color: #93C5FD; }

    /* Input */
    #sg-chat-input-row {
      display: flex;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #e2e8f0;
      background: #fff;
      flex-shrink: 0;
      border-radius: 0 0 16px 16px;
    }
    #sg-chat-input {
      flex: 1;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      background: #f8fafc;
      color: #1e293b;
      resize: none;
      line-height: 1.4;
      transition: border-color 0.15s;
    }
    #sg-chat-input:focus { border-color: #0078D4; background: #fff; box-shadow: 0 0 0 3px rgba(0,120,212,0.08); }
    #sg-chat-send {
      width: 36px; height: 36px;
      background: #0078D4;
      border: none; border-radius: 50%;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
      align-self: flex-end;
    }
    #sg-chat-send:hover { background: #006CBF; transform: scale(1.05); }
    #sg-chat-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    #sg-chat-send svg { width: 16px; height: 16px; fill: #fff; }
  `;
  document.head.appendChild(style);

  // ── Inject HTML ───────────────────────────────────────────────────────────
  const html = `
    <!-- Floating button -->
    <button id="sg-chat-btn" title="Ask SmartGrid AI">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
      <div id="sg-chat-badge">1</div>
    </button>

    <!-- Chat window -->
    <div id="sg-chat-window">
      <div id="sg-chat-header">
        <div class="sg-avatar">⚡</div>
        <div style="flex:1">
          <div class="sg-title">SmartGrid AI</div>
          <div class="sg-sub">Powered by Gemini</div>
        </div>
        <div class="sg-dot"></div>
        <button id="sg-chat-close">✕</button>
      </div>

      <div id="sg-chat-messages"></div>

      <div id="sg-suggestions"></div>

      <div id="sg-chat-input-row">
        <textarea id="sg-chat-input" placeholder="Ask anything about your energy data..." rows="1"></textarea>
        <button id="sg-chat-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
  `;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  // ── State ─────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let history = [];
  let suggestionsLoaded = false;

  // ── Elements ──────────────────────────────────────────────────────────────
  const btn        = document.getElementById('sg-chat-btn');
  const win        = document.getElementById('sg-chat-window');
  const closeBtn   = document.getElementById('sg-chat-close');
  const messages   = document.getElementById('sg-chat-messages');
  const input      = document.getElementById('sg-chat-input');
  const sendBtn    = document.getElementById('sg-chat-send');
  const suggestDiv = document.getElementById('sg-suggestions');
  const badge      = document.getElementById('sg-chat-badge');

  // ── Toggle window ─────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    badge.style.display = 'none';
    if (isOpen) {
      input.focus();
      if (!suggestionsLoaded) loadSuggestions();
      if (messages.children.length === 0) addWelcomeMessage();
    }
  }

  btn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // ── Welcome message ───────────────────────────────────────────────────────
  function addWelcomeMessage() {
    appendMessage('bot',
      "👋 Hi! I'm your **SmartGrid AI assistant**.\n\nI can answer questions about your energy data — consumption patterns, anomalies, household comparisons, weather correlations, and more.\n\nWhat would you like to know?"
    );
  }

  // ── Load suggestion chips ─────────────────────────────────────────────────
  async function loadSuggestions() {
    suggestionsLoaded = true;
    try {
      const res = await fetch(`${API_BASE}/chatbot/suggestions`);
      const data = await res.json();
      const chips = data.suggestions.slice(0, 4); // Show 4 chips
      suggestDiv.innerHTML = chips.map(s =>
        `<span class="sg-chip" onclick="window._sgAsk('${s.replace(/'/g, "\\'")}')">${s}</span>`
      ).join('');
    } catch {
      suggestDiv.style.display = 'none';
    }
  }

  // ── Markdown renderer (lightweight) ──────────────────────────────────────
  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
      .replace(/^### (.*$)/gm, '<strong>$1</strong>')
      .replace(/^## (.*$)/gm, '<strong>$1</strong>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  // ── Append a message ──────────────────────────────────────────────────────
  function appendMessage(role, text, sqlUsed) {
    const div = document.createElement('div');
    div.className = `sg-msg ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'sg-msg-avatar';
    avatar.textContent = role === 'bot' ? '⚡' : 'U';

    const bubble = document.createElement('div');
    bubble.className = 'sg-msg-bubble';

    if (role === 'bot') {
      bubble.innerHTML = renderMarkdown(text);
      if (sqlUsed) {
        const sqlBadge = document.createElement('div');
        sqlBadge.className = 'sg-sql-badge';
        sqlBadge.innerHTML = `🔍 SQL used`;
        sqlBadge.title = sqlUsed;
        sqlBadge.onclick = () => {
          const shown = sqlBadge.nextSibling;
          if (shown && shown.tagName === 'PRE') {
            shown.remove();
          } else {
            const pre = document.createElement('pre');
            pre.style.cssText = 'background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;font-size:10px;margin-top:6px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:#475569';
            pre.textContent = sqlUsed;
            sqlBadge.after(pre);
          }
        };
        bubble.appendChild(sqlBadge);
      }
    } else {
      bubble.textContent = text;
    }

    div.appendChild(avatar);
    div.appendChild(bubble);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  // ── Typing indicator ──────────────────────────────────────────────────────
  function showTyping() {
    const div = document.createElement('div');
    div.className = 'sg-msg bot sg-typing';
    div.id = 'sg-typing';
    div.innerHTML = `
      <div class="sg-msg-avatar">⚡</div>
      <div class="sg-msg-bubble">
        <div class="sg-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('sg-typing');
    if (el) el.remove();
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';

    // Hide suggestions after first message
    suggestDiv.style.display = 'none';

    // Add user message
    appendMessage('user', text);
    history.push({ role: 'user', content: text });

    // Show typing
    showTyping();

    try {
      const res = await fetch(`${API_BASE}/chatbot/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-6) })
      });

      const data = await res.json();
      hideTyping();
      appendMessage('bot', data.reply, data.sql_used);
      history.push({ role: 'assistant', content: data.reply });

    } catch (err) {
      hideTyping();
      appendMessage('bot', '❌ Connection error. Make sure the backend is running at localhost:8000.');
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // ── Send button click ─────────────────────────────────────────────────────
  sendBtn.addEventListener('click', () => sendMessage(input.value));

  // ── Enter key (Shift+Enter for newline) ──────────────────────────────────
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  // ── Global function for chip clicks ──────────────────────────────────────
  window._sgAsk = function(question) {
    if (!isOpen) toggleChat();
    sendMessage(question);
  };

  // ── Show badge after 3 seconds to invite interaction ─────────────────────
  setTimeout(() => {
    if (!isOpen) {
      badge.style.display = 'flex';
    }
  }, 3000);

})();
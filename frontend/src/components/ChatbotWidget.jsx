import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Zap, User as UserIcon, Send } from 'lucide-react';
import { BASE_URL, API } from '../services/api';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "How many households are monitored?",
    "What are the main consumption patterns?",
    "Show me anomaly detection results",
    "Compare energy usage by ACORN group"
  ]);
  
  const endRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: 'bot', content: "Hello! I'm your **Energy Assistant** for the London smart meter dataset.\n\nI can help you understand electricity consumption patterns, ACORN household groups, energy anomalies, tariff structures, and weather correlations.\n\nWhat would you like to explore?" }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMsg = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMsg('');
    setLoading(true);

    try {
      const data = await API.chat(text, newHistory.slice(-10));
      setMessages(prev => [...prev, { role: 'bot', content: data.reply || "I'm sorry, I couldn't process that." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', content: "**Connection error** — make sure the backend is running." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X color="#fff" /> : <MessageSquare color="#fff" />}
      </button>

      {isOpen && (
        <div className="chat-window glass-panel">
          <div className="chat-header">
            <Zap size={20} color="#fff" />
            <div style={{ marginLeft: '12px', flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>Energy Assistant</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>Smart Grid Analytics</div>
            </div>
            <button className="btn-close" onClick={() => setIsOpen(false)}><X size={16} color="#fff" /></button>
          </div>
          
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg-wrap ${m.role}`}>
                <div className="avatar">
                  {m.role === 'bot' ? <Zap size={16}/> : <UserIcon size={16}/>}
                </div>
                <div className="bubble">
                  {(m.content || '').split('\n').map((line, j) => <p key={j}>{line}</p>)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="msg-wrap bot">
                <div className="avatar"><Zap size={16}/></div>
                <div className="bubble typing">...</div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          
          {messages.length <= 1 && (
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <span key={i} className="chip" onClick={() => sendMsg(s)}>{s}</span>
              ))}
            </div>
          )}
          
          <div className="chat-input-row">
            <input 
              value={inputMsg} 
              onChange={e => setInputMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg(inputMsg)}
              placeholder="Ask about energy consumption, patterns, or analytics..."
            />
            <button onClick={() => sendMsg(inputMsg)} disabled={loading}><Send size={16} color="#fff"/></button>
          </div>
        </div>
      )}

      <style>{`
        .chat-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0b6fbd, #0495d9);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          box-shadow: 0 18px 40px rgba(4, 149, 217, 0.18), 0 6px 16px rgba(15, 23, 42, 0.12);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          z-index: 1000;
        }
        .chat-fab:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 22px 48px rgba(4, 149, 217, 0.24), 0 8px 20px rgba(15, 23, 42, 0.14);
        }
        .chat-fab:active { transform: translateY(0) scale(0.98); }

        .chat-window {
          position: fixed;
          bottom: 92px;
          right: 24px;
          width: 390px;
          height: 560px;
          border-radius: 22px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
          background: #ffffff;
          box-shadow: 0 28px 60px rgba(15, 23, 42, 0.12), 0 12px 24px rgba(4, 149, 217, 0.08);
          border: 1px solid rgba(15, 23, 42, 0.08);
          animation: slideInUp 0.32s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .chat-header {
          background: linear-gradient(135deg, #0b6fbd, #0495d9);
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.18);
        }

        .btn-close {
          background: rgba(255, 255, 255, 0.24);
          border: 1px solid rgba(255, 255, 255, 0.32);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }
        .btn-close:hover {
          background: rgba(255, 255, 255, 0.4);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);
        }

        .chat-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #f8fbff;
        }

        .msg-wrap {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          animation: messageIn 0.28s ease-out;
        }

        .msg-wrap.user {
          flex-direction: row-reverse;
          justify-content: flex-start;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #eef6ff;
          color: #0b6fbd;
          border: 1px solid rgba(11, 111, 189, 0.14);
          font-weight: 700;
        }

        .msg-wrap.user .avatar {
          background: linear-gradient(135deg, #0b6fbd, #0495d9);
          color: #ffffff;
          border: none;
          box-shadow: 0 8px 20px rgba(4, 149, 217, 0.22);
        }

        .bubble {
          max-width: 280px;
          padding: 14px 16px;
          border-radius: 20px;
          font-size: 14px;
          line-height: 1.6;
          word-break: break-word;
          letter-spacing: -0.01em;
        }

        .bubble p {
          margin: 0 0 10px 0;
        }

        .bubble p:last-child {
          margin-bottom: 0;
        }

        .msg-wrap.bot .bubble {
          background: #ffffff;
          color: #1f2937;
          border: 1px solid #e6eef9;
          border-bottom-left-radius: 10px;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
        }

        .msg-wrap.user .bubble {
          background: linear-gradient(135deg, #0b6fbd, #0495d9);
          color: #ffffff;
          border-bottom-right-radius: 10px;
          box-shadow: 0 8px 24px rgba(4, 149, 217, 0.18);
        }

        .bubble.typing {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #eef4ff;
          color: #475569;
          border-radius: 18px;
          font-weight: 600;
        }

        .bubble.typing::after {
          content: '';
          width: 20px;
          height: 4px;
          background: linear-gradient(90deg, #dbe9ff, #c7ddff, #dbe9ff);
          background-size: 20px 4px;
          animation: typing 1.5s infinite;
          border-radius: 2px;
        }

        @keyframes typing {
          0% { background-position: -20px 0; }
          100% { background-position: 20px 0; }
        }

        .suggestions {
          padding: 16px 20px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          border-top: 1px solid #e6eef9;
          background: #ffffff;
        }

        .chip {
          padding: 8px 14px;
          background: #eef4ff;
          color: #0b6fbd;
          font-size: 12px;
          font-weight: 600;
          border-radius: 16px;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
          border: 1px solid rgba(11, 111, 189, 0.15);
        }

        .chip:hover {
          background: #d8e8ff;
          color: #044f86;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }

        .chat-input-row {
          padding: 16px 20px;
          display: flex;
          gap: 12px;
          border-top: 1px solid #e6eef9;
          background: #ffffff;
        }

        .chat-input-row input {
          flex: 1;
          border: 2px solid #e6eef9;
          padding: 14px 16px;
          border-radius: 26px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          background: #f7fbff;
          color: #1f2937;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .chat-input-row input:focus {
          border-color: #0495d9;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(4, 149, 217, 0.12);
        }

        .chat-input-row input::placeholder {
          color: #94a3b8;
        }

        .chat-input-row button {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #0b6fbd, #0495d9);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 6px 18px rgba(4, 149, 217, 0.24);
        }

        .chat-input-row button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 8px 22px rgba(4, 149, 217, 0.3);
        }

        .chat-input-row button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .chat-input-row button:active {
          transform: scale(0.98);
        }
      `}</style>
    </>
  );
}

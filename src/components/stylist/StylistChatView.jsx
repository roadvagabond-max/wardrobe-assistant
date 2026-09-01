import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Trash2, Bot, User, RefreshCw, MessageSquare, Loader2, ArrowRight, Layers, Compass, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatWithMasterStylist } from '../../services/gemini';
import GarmentLightboxModal from '../common/GarmentLightboxModal';

const QUICK_PROMPTS = [
  'Mit vegyek fel holnap a meglévő ruháimból?',
  'Hogyan kombináljam a sötétkék zakómat egy lazább pénteken?',
  'Milyen cipőt és övet válasszak szürke nadrághoz?',
  'Milyen kulcsdarab hiányzik leginkább a gardróbomból?',
  'Stílustanács egy elegáns esti vacsorához'
];

export default function StylistChatView({ weather }) {
  const { wardrobe, profile } = useAuth();
  
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('stylist_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        role: 'model',
        content: `Üdvözöllek! Én vagyok a személyes **Sartorial Mester Stylistod**. 👔✨\n\nIsmerem a teljes digitális gardróbodat (${wardrobe.length} db ruha), a stílus DNS-edet, az egyéni szabályaidat és az aktuális időjárást (${weather?.city || 'Budapest'}, ${weather?.temperature ?? 21}°C).\n\nKérdezz bármit: szett-kombinációkról, alkalomhoz illő öltözködésről, rétegezésről vagy hiányzó darabokról!`,
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLightboxItem, setSelectedLightboxItem] = useState(null);
  const [lightboxItems, setLightboxItems] = useState([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist chat to local storage
  useEffect(() => {
    try {
      localStorage.setItem('stylist_chat_history', JSON.stringify(messages));
    } catch (_) {}
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      // Send conversation history (filter out greeting model message if it's the very first)
      const apiMessages = newHistory.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        content: m.content
      }));

      const reply = await chatWithMasterStylist({
        messages: apiMessages,
        wardrobe,
        styleProfile: profile,
        weather
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: reply,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Stylist chat hiba:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          content: `⚠️ Sajnálom, nem sikerült választ kérnem a Gemini AI-tól (${err.message || 'Hálózati hiba'}). Kérlek ellenőrizd az API kulcsodat a Beállításokban!`,
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Biztosan törölni szeretnéd a csevegési előzményeket?')) {
      const resetMsg = [
        {
          role: 'model',
          content: `Csevegés alaphelyzetbe állítva. Készen állok az új kérdéseidre a gardróbod és stílusod alapján!`,
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(resetMsg);
      localStorage.setItem('stylist_chat_history', JSON.stringify(resetMsg));
    }
  };

  // Find wardrobe items mentioned in model text to offer rich visual previews
  const extractMentionedWardrobeItems = (text) => {
    if (!text || !wardrobe || wardrobe.length === 0) return [];
    const lower = text.toLowerCase();
    return wardrobe.filter(w => {
      if (!w.name) return false;
      const wName = w.name.toLowerCase();
      // Match exact name or strong keyword match
      return lower.includes(wName) || (wName.length > 8 && lower.includes(wName.slice(0, 10)));
    }).slice(0, 4);
  };

  const openLightboxForItem = (item, allMentions = []) => {
    const list = allMentions.length > 0 ? allMentions : [item];
    const idx = list.findIndex(x => x.id === item.id);
    setLightboxItems(list);
    setSelectedLightboxItem(item);
    setIsLightboxOpen(true);
  };

  // Simple rich text / markdown renderer
  const renderFormattedContent = (content) => {
    const paragraphs = content.split('\n\n');
    return (
      <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
        {paragraphs.map((p, pIdx) => {
          // Check for bullet lists
          if (p.startsWith('• ') || p.startsWith('- ') || p.startsWith('* ')) {
            const items = p.split('\n');
            return (
              <ul key={pIdx} className="space-y-1 pl-4 list-disc text-[var(--text-secondary)]">
                {items.map((itm, iIdx) => (
                  <li key={iIdx} dangerouslySetInnerHTML={{ 
                    __html: itm.replace(/^[•\-\*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') 
                  }} />
                ))}
              </ul>
            );
          }

          // Numbered list
          if (/^\d+\.\s/.test(p)) {
            const items = p.split('\n');
            return (
              <ol key={pIdx} className="space-y-1 pl-4 list-decimal text-[var(--text-secondary)]">
                {items.map((itm, iIdx) => (
                  <li key={iIdx} dangerouslySetInnerHTML={{ 
                    __html: itm.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') 
                  }} />
                ))}
              </ol>
            );
          }

          // Regular paragraph with bold support
          return (
            <p key={pIdx} dangerouslySetInnerHTML={{ 
              __html: p.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') 
            }} />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 flex flex-col h-[75vh] min-h-[500px]">
      
      {/* Top Bar with Context Pills & Clear Button */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-gold flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3" />
            <span>Sartorial Master AI</span>
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Ruhatár kontextus: <strong className="text-white">{wardrobe.length} db ruha</strong>
          </span>
          {weather && (
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              • {weather.city}, {weather.temperature}°C
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleClearHistory}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-all text-xs flex items-center gap-1"
          title="Beszélgetés törlése"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Előzmények törlése</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const mentionedItems = !isUser ? extractMentionedWardrobeItems(msg.content) : [];

          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                isUser 
                  ? 'bg-[var(--accent-gold)] text-black font-bold' 
                  : 'bg-[#151a24] text-[var(--accent-gold)] border border-[var(--border-gold)]'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-3 shadow-xl ${
                isUser
                  ? 'bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-black/60 border border-[var(--accent-gold)]/40 text-white rounded-tr-none'
                  : msg.isError
                  ? 'bg-rose-950/40 border border-rose-500/40 text-rose-200 rounded-tl-none'
                  : 'glass-card bg-[#0b0e14]/90 border-white/10 text-white/90 rounded-tl-none'
              }`}>
                {renderFormattedContent(msg.content)}

                {/* Wardrobe Items Visual Mention Cards */}
                {mentionedItems.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[10px] text-[var(--accent-gold)] font-mono uppercase tracking-wider block">
                      ✦ Említett Darabok a Gardróbodból (Kattints a nagyításhoz):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {mentionedItems.map((itm, iIdx) => (
                        <div
                          key={iIdx}
                          onClick={() => openLightboxForItem(itm, mentionedItems)}
                          className="cursor-pointer group p-1.5 rounded-lg bg-black/50 border border-white/10 hover:border-[var(--accent-gold)] transition-all flex items-center gap-2"
                        >
                          <div className="w-8 h-8 rounded bg-[#07090e] p-0.5 shrink-0 flex items-center justify-center overflow-hidden border border-white/5">
                            <img src={itm.imageUrl} alt={itm.name} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform" />
                          </div>
                          <span className="text-[11px] text-white/90 line-clamp-1 font-medium group-hover:text-[var(--accent-gold)]">
                            {itm.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#151a24] text-[var(--accent-gold)] border border-[var(--border-gold)] flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-card bg-[#0b0e14]/90 border-white/10 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-gold)]" />
              <span>A Mester Stylist elemzi a ruhatáradat és fogalmazza a tanácsot...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 shrink-0 no-scrollbar">
        {QUICK_PROMPTS.map((prompt, pIdx) => (
          <button
            key={pIdx}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 hover:border-[var(--border-gold)] border border-white/10 text-[11px] text-[var(--text-secondary)] hover:text-white transition-all active:scale-95 flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-[var(--accent-gold)] shrink-0" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="shrink-0 relative bg-black/60 border border-[var(--border-gold)] rounded-2xl p-2 flex items-end gap-2 shadow-2xl backdrop-blur-md">
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Kérdezz bármit a ruhatáradról, szettekről vagy stílusról... (Enter = Küldés, Shift+Enter = Új sor)"
          rows={1}
          disabled={isLoading}
          className="flex-1 bg-transparent border-0 focus:ring-0 text-white placeholder-[var(--text-muted)] text-xs sm:text-sm resize-none max-h-28 py-1.5 px-2 outline-none"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading}
          className={`p-2.5 rounded-xl transition-all shrink-0 ${
            inputMessage.trim() && !isLoading
              ? 'bg-[var(--accent-gold)] text-black hover:brightness-110 shadow-lg shadow-[var(--accent-gold)]/20 active:scale-95'
              : 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed'
          }`}
          title="Üzenet küldése"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Lightbox Modal for any clicked garment */}
      <GarmentLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        items={lightboxItems}
        initialIndex={lightboxItems.findIndex(x => x.id === selectedLightboxItem?.id)}
        outfitTitle="Személyes Stylist Csevegés"
      />

    </div>
  );
}

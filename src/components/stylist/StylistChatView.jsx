import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Trash2, Bot, User, RefreshCw, MessageSquare, Loader2, ArrowRight, Layers, Compass, HelpCircle, Plus, Eye, Shirt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatWithMasterStylist, formatStylistJsonToMarkdown, isGeminiConfigured } from '../../services/gemini';
import GarmentLightboxModal from '../common/GarmentLightboxModal';

const QUICK_PROMPTS = [
  'Mit vegyek fel holnap a meglévő ruháimból?',
  'Hogyan kombináljam a sötétkék zakómat egy lazább pénteken?',
  'Milyen cipőt és övet válasszak szürke nadrághoz?',
  'Milyen kulcsdarab hiányzik leginkább a gardróbomból?',
  'Stílustanács egy elegáns esti vacsorához'
];

export default function StylistChatView({ weather }) {
  const { wardrobe, profile, geminiApiKey } = useAuth();
  
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
        content: `Üdvözöllek! Én vagyok a személyes **Sartorial Mester Stylistod**. 👔✨\n\nIsmerem a teljes digitális gardróbodat (${wardrobe.length} db ruha), a stílus DNS-edet és az egyéni szabályaidat.\n\nKérdezz bármit: szett-kombinációkról, alkalomhoz illő öltözködésről, rétegezésről vagy hiányzó kulcsdarabokról!`,
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Lightbox viewer state for embedded item cards
  const [lightboxItems, setLightboxItems] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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
      // Send conversation history with a sliding window of recent messages
      const apiMessages = newHistory.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        content: m.content
      }));

      const reply = await chatWithMasterStylist({
        messages: apiMessages,
        wardrobe,
        styleProfile: profile,
        weather,
        apiKey: geminiApiKey
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
          content: `⚠️ ${err.message || 'Sajnálom, nem sikerült választ kérnem a Gemini AI-tól. Kérlek próbáld újra pár másodperc múlva!'}`,
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

  // Start a fresh new topic (Spec & Topic Boundary Guard)
  const handleNewTopic = () => {
    const resetMsg = [
      {
        role: 'model',
        content: `Üdvözöllek! Új témát kezdtünk. Milyen stíluskérdésben, szett-ötletben vagy ruhatár-elemzésben segíthetek ma? ✨`,
        timestamp: new Date().toISOString()
      }
    ];
    setMessages(resetMsg);
    localStorage.setItem('stylist_chat_history', JSON.stringify(resetMsg));
  };

  const handleClearHistory = () => {
    if (window.confirm('Biztosan törölni szeretnéd a csevegési előzményeket?')) {
      handleNewTopic();
    }
  };

  // Safe HTML sanitizer and bold formatter to prevent XSS
  const sanitizeAndFormat = (text = '') => {
    if (!text) return '';
    // 1. Strictly escape raw HTML characters to prevent XSS injection
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // 2. Safely transform markdown bold (**text**) to safe <strong> tags
    return escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
  };

  // Open garment in Lightbox
  const handleOpenGarmentLightbox = (item) => {
    if (!item) return;
    setLightboxItems([item]);
    setLightboxIndex(0);
    setIsLightboxOpen(true);
  };

  // Rich text / markdown renderer with JSON auto-formatting & embedded garment cards
  const renderFormattedContent = (rawContent) => {
    // 1. Extract {{item:ID}} tags and identify referenced items
    const itemMatches = [...rawContent.matchAll(/\{\{item:([a-zA-Z0-9_\-]+)\}\}/g)];
    const referencedIds = [...new Set(itemMatches.map(m => m[1]))];
    const referencedGarments = referencedIds
      .map(id => wardrobe.find(w => String(w.id) === String(id)))
      .filter(Boolean);

    // 2. Clean out raw {{item:ID}} tokens from text display
    const cleanedContent = rawContent.replace(/\{\{item:[a-zA-Z0-9_\-]+\}\}/g, '').trim();

    const formattedContent = formatStylistJsonToMarkdown(cleanedContent);
    const paragraphs = formattedContent.split('\n\n');

    return (
      <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
        {paragraphs.map((p, pIdx) => {
          const trimmed = p.trim();
          if (!trimmed) return null;

          // Headings (### )
          if (trimmed.startsWith('### ')) {
            const headingText = trimmed.replace(/^###\s+/, '');
            return (
              <h4 key={pIdx} className="text-sm sm:text-base font-bold text-[var(--accent-gold)] mt-2 pt-1 border-b border-white/10 pb-1 flex items-center gap-1.5">
                <span>{headingText}</span>
              </h4>
            );
          }

          // Bullet lists
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const items = trimmed.split('\n');
            return (
              <ul key={pIdx} className="space-y-1.5 pl-4 list-disc text-white/90">
                {items.map((itm, iIdx) => (
                  <li key={iIdx} dangerouslySetInnerHTML={{ 
                    __html: sanitizeAndFormat(itm.replace(/^[•\-\*]\s*/, ''))
                  }} />
                ))}
              </ul>
            );
          }

          // Numbered list
          if (/^\d+\.\s/.test(trimmed)) {
            const items = trimmed.split('\n');
            return (
              <ol key={pIdx} className="space-y-1.5 pl-4 list-decimal text-white/90">
                {items.map((itm, iIdx) => (
                  <li key={iIdx} dangerouslySetInnerHTML={{ 
                    __html: sanitizeAndFormat(itm.replace(/^\d+\.\s*/, ''))
                  }} />
                ))}
              </ol>
            );
          }

          // Regular paragraph with bold support
          return (
            <p key={pIdx} className="text-white/90" dangerouslySetInnerHTML={{ 
              __html: sanitizeAndFormat(trimmed).replace(/\n/g, '<br/>')
            }} />
          );
        })}

        {/* Embedded Interactive Garment Cards Shelf */}
        {referencedGarments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent-gold)]">
              <Sparkles className="w-3 h-3" />
              <span>Hivatkozott ruhatári darabok ({referencedGarments.length} db):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {referencedGarments.map((garment) => (
                <button
                  key={garment.id}
                  type="button"
                  onClick={() => handleOpenGarmentLightbox(garment)}
                  className="p-2 rounded-xl bg-black/40 hover:bg-white/10 border border-[var(--border-gold)]/50 hover:border-[var(--accent-gold)] flex items-center gap-2.5 transition-all text-left group active:scale-[0.98]"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-neutral-900 border border-white/10 shrink-0 flex items-center justify-center relative">
                    {garment.imageUrl ? (
                      <img
                        src={garment.imageUrl}
                        alt={garment.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Shirt className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-4 h-4 text-[var(--accent-gold)]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-[var(--accent-gold)] transition-colors">
                      {garment.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {garment.brand ? `${garment.brand} • ` : ''}{garment.color || garment.category}
                    </p>
                  </div>
                  <span className="p-1 rounded-lg bg-white/5 text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] shrink-0">
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 flex flex-col h-[75vh] min-h-[500px]">
      
      {/* Top Bar with Context Pills & Action Buttons */}
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleNewTopic}
            className="btn-gold py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95"
            title="Új téma indítása (tiszta kontextussal)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Új Téma</span>
          </button>
          
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-all text-xs flex items-center gap-1"
            title="Beszélgetés törlése"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Banner if Gemini is not yet configured */}
      {!isGeminiConfigured(geminiApiKey) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-200 shrink-0 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
            <span>A személyes Mester Stylist AI funkciókhoz ingyenes Gemini API kulcs szükséges.</span>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
            className="btn-gold py-1.5 px-3 text-xs shrink-0 font-bold flex items-center gap-1.5 shadow"
          >
            <span>⚙️ Beállítások Megnyitása</span>
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';

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

                {/* Direct Action Button if Error/Auth Issue */}
                {msg.isError && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                      className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1.5 font-bold shadow"
                    >
                      <span>⚙️ Beállítások Megnyitása (API Kulcs)</span>
                    </button>
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
          id="stylist-chat-textarea"
          name="stylistChatMessage"
          aria-label="Üzenet a Mester Stylistnak"
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

      {/* Lightbox Modal for Referenced Garments */}
      <GarmentLightboxModal
        isOpen={isLightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
        outfitTitle="Hivatkozott Ruhatári Darab"
      />

    </div>
  );
}

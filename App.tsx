import React, { useState, useEffect, useRef } from 'react';
import { Menu, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { PHILOSOPHERS, WEATHER_AUDIO } from './constants';
import { PhilosopherID, ChatMessage, DiaryEntry, WeatherMode } from './types';
import WeatherSystem from './components/WeatherSystem';
import MemoryCorridor from './components/MemoryCorridor';
import { startChatSession, sendMessage, generateDiary } from './services/deepseek.ts';

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<'GARDEN' | 'MEMORY' | 'INFO'>('GARDEN');
  // Always SNOW now
  const weatherMode = WeatherMode.SNOW;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Audio
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Chat
  const [selectedPhilosopher, setSelectedPhilosopher] = useState<PhilosopherID | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMicListening, setIsMicListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Memories
  const [memories, setMemories] = useState<DiaryEntry[]>([]);

  // --- Initialization ---

  useEffect(() => {
    // Load memories on mount
    const saved = localStorage.getItem('jinyao_memories');
    if (saved) {
      try {
        setMemories(JSON.parse(saved));
      } catch (e) { console.error("Failed to load memories", e); }
    }

    // Setup Audio
    audioRef.current = new Audio(WEATHER_AUDIO.SNOW);
    audioRef.current.loop = true;
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.volume = 0.5;

    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setInput(text);
          // Auto-send functionality
          setTimeout(() => {
             handleSendMessageInternal(text);
          }, 500);
        }
        setIsMicListening(false);
      };
      recognition.onerror = () => setIsMicListening(false);
      recognition.onend = () => setIsMicListening(false);
      recognitionRef.current = recognition;
    }

    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  // --- Audio Logic ---
  const toggleMusic = async () => {
    if (!audioRef.current) return;

    if (isPlayingMusic) {
      audioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlayingMusic(true);
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    }
  };

  // --- Handlers ---

  const handleSelectPhilosopher = (id: PhilosopherID) => {
    setSelectedPhilosopher(id);
    setMessages([]); // Clear previous chat
    try {
      startChatSession(id);
    } catch (err) {
      console.error(err);
      alert("Please ensure API Key is set.");
    }
  };

  const handleSendMessageInternal = async (textToSend: string) => {
    if (!textToSend.trim() || !selectedPhilosopher) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await sendMessage(userMsg.text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Thinking process interrupted...", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = () => handleSendMessageInternal(input);

  const handleEndConversation = async () => {
    if (messages.length === 0) return;

    setIsTyping(true);

    try {
      const diary = await generateDiary(messages, weatherMode);

      setMemories(prev => {
        const updated = [diary, ...prev];
        localStorage.setItem('jinyao_memories', JSON.stringify(updated));
        return updated;
      });

      // Reset
      setMessages([]);
      setSelectedPhilosopher(null);
      setCurrentView('MEMORY');
    } catch (e) {
      alert("Failed to save memory: " + e);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleMic = () => {
    if (isMicListening) {
      recognitionRef.current?.stop();
      setIsMicListening(false);
    } else {
      recognitionRef.current?.start();
      setIsMicListening(true);
    }
  };

  const handleNavClick = (view: 'GARDEN' | 'MEMORY' | 'INFO') => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  // --- Recycle Bin Logic (Direct Persistence) ---

  const handleSoftDelete = (id: string) => {
    // Moves from Gallery to Bin
    setMemories(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, isDeleted: true } : m);
      localStorage.setItem('jinyao_memories', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRestore = (id: string) => {
    // Restores from Bin to Gallery
    setMemories(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, isDeleted: false } : m);
      localStorage.setItem('jinyao_memories', JSON.stringify(updated));
      return updated;
    });
  };

  const handlePermanentDelete = (id: string) => {
    // Permanently removes from Bin
    setMemories(prev => {
      const updated = prev.filter(m => m.id !== id);
      localStorage.setItem('jinyao_memories', JSON.stringify(updated));
      return updated;
    });
  };

  // --- Render ---

  return (
    <div className="relative w-full h-screen bg-black text-gray-200 font-sans selection:bg-emerald-500/30 overflow-hidden">

      {/* 3D Weather Background (Always Snow) */}
      <WeatherSystem mode={weatherMode} />

      {/* Main UI Overlay - Glass Effect Container */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none bg-gradient-to-b from-transparent via-black/10 to-black/60 backdrop-blur-[1px]">

        {/* Header */}
        <header className="flex justify-between items-center p-6 md:p-8 pointer-events-auto z-50">
          <div className="flex flex-col">
            <h1 className="text-3xl font-serif font-bold text-white tracking-widest drop-shadow-md">JinYao</h1>
            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-300 opacity-80">The Garden of Philosophy</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8 text-xs font-medium tracking-widest bg-black/30 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
            {['GARDEN', 'MEMORY', 'MUSIC', 'INFO'].map((item) => (
               <button
                key={item}
                onClick={() => item === 'MUSIC' ? toggleMusic() : handleNavClick(item as any)}
                className={`hover:text-emerald-300 transition-colors ${currentView === item ? 'text-emerald-300' : 'text-gray-300'}`}
               >
                 {item === 'MUSIC' ? (isPlayingMusic ? 'PAUSE MUSIC' : 'PLAY MUSIC') : item}
               </button>
            ))}
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center space-x-4 md:hidden">
             <button onClick={toggleMusic} className="text-gray-300">
               {isPlayingMusic ? (
                 <Volume2 className="h-5 w-5" aria-hidden="true" />
               ) : (
                 <VolumeX className="h-5 w-5" aria-hidden="true" />
               )}
             </button>
             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white text-2xl focus:outline-none">
                {isMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
             </button>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-24 right-4 z-50 pointer-events-auto md:hidden flex flex-col items-end space-y-2 animate-fade-in">
             <div className="glass-panel rounded-xl p-4 flex flex-col space-y-4 w-48 text-right">
                {['GARDEN', 'MEMORY', 'INFO'].map((item) => (
                  <button
                    key={item}
                    onClick={() => handleNavClick(item as any)}
                    className={`text-sm tracking-widest font-serif ${currentView === item ? 'text-emerald-400' : 'text-white/80'}`}
                  >
                    {item}
                  </button>
                ))}
             </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 relative flex flex-col items-center justify-center">

          {currentView === 'GARDEN' && (
            <div className="w-full h-full flex flex-col justify-between p-4 md:p-8 pointer-events-none">

              {/* Top: Philosophers Selection */}
              <div className="w-full flex justify-center space-x-4 pointer-events-auto z-20">
                 {PHILOSOPHERS.map(p => (
                   <button
                    key={p.id}
                    onClick={() => handleSelectPhilosopher(p.id)}
                    className={`
                      px-6 py-3 rounded-full border backdrop-blur-md transition-all duration-500 shadow-lg
                      ${selectedPhilosopher === p.id 
                        ? 'bg-white/10 border-emerald-400/50 text-white shadow-[0_0_20px_rgba(52,211,153,0.2)]' 
                        : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10 hover:text-gray-200'}
                    `}
                   >
                     <span className="font-serif text-sm block">{p.name}</span>
                   </button>
                 ))}
              </div>

              {/* Middle: Chat Display */}
              <div className="flex-1 flex flex-col items-center justify-end pb-24 max-w-2xl mx-auto w-full pointer-events-auto">
                 {/* Current Conversation */}
                 <div className="w-full max-h-[40vh] overflow-y-auto mb-6 space-y-6 px-4 scrollbar-hide">
                    {messages.length === 0 && !selectedPhilosopher && (
                       <div className="text-center text-white/50 font-serif italic mt-20 animate-pulse-slow drop-shadow-lg">
                          Select a philosopher to begin the dialogue amidst the snow.
                       </div>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                        <div className={`max-w-[85%] p-5 rounded-xl backdrop-blur-md border shadow-lg ${
                          msg.role === 'user' 
                          ? 'bg-white/10 border-white/20 text-right text-gray-100' 
                          : 'bg-black/60 border-emerald-500/30 text-left font-serif leading-relaxed text-emerald-50'
                        }`}>
                           {msg.text}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-start">
                        <div className="bg-black/40 border border-emerald-500/20 px-4 py-2 rounded-full flex space-x-1 backdrop-blur-sm">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Input Area */}
                 {selectedPhilosopher && (
                   <div className="w-full glass-panel rounded-2xl p-2 flex items-center space-x-3 shadow-2xl bg-black/40">
                     <input
                       type="text"
                       value={input}
                       onChange={(e) => setInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder={`Converse with ${PHILOSOPHERS.find(p => p.id === selectedPhilosopher)?.name}...`}
                       className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400 px-4 py-3 font-serif"
                     />
                     <div className="h-6 w-px bg-white/10 mx-2"></div>
                     <button
                       onClick={toggleMic}
                       className={`p-3 rounded-full transition-all duration-300 ${isMicListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                       title="Speak to convert to text and auto-send"
                     >
                       {isMicListening ? (
                         <Mic className="h-5 w-5" aria-hidden="true" />
                       ) : (
                         <MicOff className="h-5 w-5" aria-hidden="true" />
                       )}
                     </button>
                     <button
                       onClick={handleSendMessage}
                       className="p-3 text-emerald-400 hover:text-emerald-300 font-bold hover:scale-110 transition-transform"
                     >
                       ➞
                     </button>
                   </div>
                 )}

                 {/* Action Bar */}
                 <div className="w-full flex justify-end items-center mt-4 px-2">
                    {messages.length > 0 && (
                      <button
                        onClick={handleEndConversation}
                        className="text-xs px-6 py-2 rounded-full uppercase tracking-wider border border-red-500/30 bg-red-900/20 text-red-300 hover:bg-red-900/40 hover:border-red-500/50 transition-all backdrop-blur-sm shadow-lg"
                      >
                        End & Save Memory
                      </button>
                    )}
                 </div>
              </div>
            </div>
          )}

          {currentView === 'MEMORY' && (
            <MemoryCorridor
              memories={memories}
              onDelete={handleSoftDelete}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
            />
          )}

          {currentView === 'INFO' && (
             <div className="pointer-events-auto p-12 max-w-3xl text-center glass-panel rounded-xl shadow-2xl z-20">
               <h2 className="text-4xl font-serif mb-6 text-emerald-400">To 槿尧</h2>
               <p className="text-lg leading-relaxed text-gray-300 font-serif">
                 <br />Snow comes to rest upon the window, and upon the heart.
                 <br />In letting-be the order of nature, the heart becomes free.
                 <br />Not as a gift, but as a clearing — where you may dwell, and be.
               </p>
               <p className="text-lg leading-relaxed text-gray-300 font-serif text-right px-2">——Cynthia</p>
             </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;

import React, { useState } from 'react';
import { DiaryEntry } from '../types';

interface MemoryCorridorProps {
  memories: DiaryEntry[];
  onDelete: (id: string) => void;
}

const MemoryCorridor: React.FC<MemoryCorridorProps> = ({ memories, onDelete }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<'IDLE' | 'COPIED'>('IDLE');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus('COPIED');
      setTimeout(() => setCopyStatus('IDLE'), 2000);
    });
  };

  const selectedMemory = selectedIndex !== null ? memories[selectedIndex] : null;

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 font-serif z-20 relative animate-fade-in pointer-events-auto">
        <p className="text-2xl italic tracking-wider">The corridor is silent.</p>
        <p className="text-sm mt-4 opacity-50 font-sans tracking-widest uppercase">Start a conversation to create a memory.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full flex flex-col items-center pt-20 pb-12 overflow-hidden relative z-10 pointer-events-auto">
        {/* Gallery Header */}
        <h1 className="text-3xl md:text-5xl font-serif text-white/90 mb-12 tracking-[0.2em] drop-shadow-2xl uppercase border-b border-white/10 pb-4">
          Memory Corridor
        </h1>
        
        {/* Scrollable Card List */}
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden flex items-center px-8 md:px-20 space-x-12 scrollbar-hide snap-x z-20 pb-8">
          {memories.map((memory, index) => (
            <div 
              key={memory.id}
              onClick={() => setSelectedIndex(index)}
              className="group relative flex-shrink-0 w-80 h-[500px] cursor-pointer transform transition-all duration-500 hover:-translate-y-4 hover:rotate-1 snap-center perspective-1000"
            >
              {/* Glass Tablet Card */}
              <div className="absolute inset-0 glass-panel rounded-sm border border-white/10 group-hover:border-white/40 group-hover:bg-white/5 transition-all shadow-2xl flex flex-col p-8 overflow-hidden bg-gradient-to-b from-white/5 to-transparent backdrop-blur-md">
                 
                 {/* Decorative Line */}
                 <div className="w-8 h-1 bg-emerald-500/50 mb-8 self-start"></div>

                 {/* Card Top: Time */}
                 <div className="flex flex-col items-start mb-6 opacity-60">
                    <span className="font-mono text-xs text-emerald-300 tracking-widest uppercase">
                       {new Date(memory.timestamp).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 mt-1">
                       {new Date(memory.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                 </div>
                 
                 {/* Card Title */}
                 <div className="flex-1 flex flex-col justify-center">
                   <h3 className="font-serif text-3xl text-white/90 italic leading-snug group-hover:text-emerald-200 transition-colors line-clamp-4">
                     {memory.title}
                   </h3>
                 </div>
                 
                 {/* Card Bottom: Interaction Hint */}
                 <div className="mt-auto pt-6 border-t border-white/10 flex justify-between items-center">
                     <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">
                       Read Entry ➞
                     </span>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         if (confirm('Permanently delete this memory?')) {
                           onDelete(memory.id);
                         }
                       }}
                       className="text-gray-600 hover:text-red-400 transition-colors p-2 z-20 hover:scale-110"
                       title="Delete"
                     >
                       ✕
                     </button>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Indicator */}
        <div className="mt-4 text-[10px] uppercase tracking-widest text-white/30">
           {memories.length} Memories Stored
        </div>
      </div>

      {/* Full Screen Reading Mode (Modal) */}
      {selectedMemory && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in pointer-events-auto">
          {/* Close Area (Click outside to close) */}
          <div className="absolute inset-0" onClick={() => setSelectedIndex(null)}></div>

          <div className="max-w-4xl w-full h-full md:h-[90vh] md:rounded-lg glass-panel border-0 md:border md:border-white/10 shadow-2xl overflow-hidden relative flex flex-col bg-black/80">
            
            {/* Top Toolbar */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
               <div className="text-xs font-mono text-emerald-500 tracking-widest uppercase">
                  Reading Mode
               </div>
               <button 
                onClick={() => setSelectedIndex(null)}
                className="text-white/50 hover:text-white transition-colors text-xs tracking-widest border border-white/10 hover:border-white/50 px-4 py-2 rounded-full uppercase"
              >
                Close
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-16">
                <article className="max-w-2xl mx-auto">
                    {/* Header */}
                    <header className="mb-16 text-center">
                      <div className="text-5xl mb-6 opacity-30 animate-pulse-slow">❄</div>
                      <h1 className="text-4xl md:text-5xl font-serif text-white italic tracking-wide leading-tight mb-6">
                        {selectedMemory.title}
                      </h1>
                      <time className="block text-sm font-mono text-emerald-500/80 tracking-widest uppercase">
                        {new Date(selectedMemory.timestamp).toLocaleString('zh-CN', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </time>
                    </header>

                    {/* Content Body */}
                    <div className="prose prose-invert prose-lg md:prose-xl font-serif leading-loose text-gray-300 mx-auto select-text whitespace-pre-wrap text-justify">
                      {selectedMemory.content}
                    </div>

                    {/* Footer / End of Entry */}
                    <div className="mt-20 flex flex-col items-center border-t border-white/10 pt-10">
                       <div className="w-16 h-px bg-emerald-500/30 mb-8"></div>
                       <button 
                        onClick={() => handleCopy(`${selectedMemory.title}\n${selectedMemory.timestamp}\n\n${selectedMemory.content}`)}
                        className={`text-xs tracking-[0.2em] uppercase transition-all px-8 py-3 rounded-full border ${copyStatus === 'COPIED' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300' : 'border-white/20 text-gray-400 hover:text-white hover:border-white'}`}
                      >
                        {copyStatus === 'COPIED' ? 'Copied to Clipboard' : 'Copy Full Entry'}
                      </button>
                    </div>
                </article>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MemoryCorridor;
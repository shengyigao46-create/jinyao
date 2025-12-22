import React, { useState } from 'react';
import { DiaryEntry } from '../types';

interface MemoryCorridorProps {
  memories: DiaryEntry[];
  onDelete: (id: string) => void;         // Soft delete (Move to Trash)
  onRestore: (id: string) => void;        // Restore from Trash
  onPermanentDelete: (id: string) => void; // Delete Forever
}

const MemoryCorridor: React.FC<MemoryCorridorProps> = ({ 
  memories, 
  onDelete, 
  onRestore, 
  onPermanentDelete 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState<'IDLE' | 'COPIED'>('IDLE');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'TRASH'>('ACTIVE');

  // Filter memories based on current view mode
  const displayedMemories = memories.filter(m => 
    viewMode === 'TRASH' ? m.isDeleted : !m.isDeleted
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus('COPIED');
      setTimeout(() => setCopyStatus('IDLE'), 2000);
    });
  };

  const selectedMemory = selectedIndex !== null && displayedMemories[selectedIndex] ? displayedMemories[selectedIndex] : null;

  return (
    <>
      <div className="w-full h-full flex flex-col items-center pt-20 pb-12 overflow-hidden relative z-10 pointer-events-auto">
        {/* Gallery Header & Switcher */}
        <div className="flex flex-col items-center mb-8 w-full px-8 relative">
          <h1 className="text-3xl md:text-5xl font-serif text-white/90 tracking-[0.2em] drop-shadow-2xl uppercase">
            {viewMode === 'ACTIVE' ? 'Memory Corridor' : 'Recycle Bin'}
          </h1>
          <div className="mt-6 flex space-x-4 border border-white/10 rounded-full p-1 bg-black/30 backdrop-blur-md">
             <button 
               onClick={() => { setViewMode('ACTIVE'); setSelectedIndex(null); }}
               className={`px-6 py-2 rounded-full text-xs tracking-widest uppercase transition-all ${viewMode === 'ACTIVE' ? 'bg-white/10 text-emerald-300 shadow-lg' : 'text-gray-500 hover:text-white'}`}
             >
               Gallery
             </button>
             <button 
               onClick={() => { setViewMode('TRASH'); setSelectedIndex(null); }}
               className={`px-6 py-2 rounded-full text-xs tracking-widest uppercase transition-all flex items-center space-x-2 ${viewMode === 'TRASH' ? 'bg-white/10 text-red-300 shadow-lg' : 'text-gray-500 hover:text-white'}`}
             >
               <span>Bin</span>
               <span className="opacity-50 text-[10px] ml-1">({memories.filter(m => m.isDeleted).length})</span>
             </button>
          </div>
        </div>
        
        {/* Empty State */}
        {displayedMemories.length === 0 && (
           <div className="flex flex-col items-center justify-center flex-1 text-gray-400 font-serif animate-fade-in">
             <p className="text-2xl italic tracking-wider opacity-50">
               {viewMode === 'ACTIVE' ? 'The corridor is silent.' : 'The bin is empty.'}
             </p>
           </div>
        )}

        {/* Scrollable Card List */}
        {displayedMemories.length > 0 && (
        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden flex items-center px-8 md:px-20 space-x-12 scrollbar-hide snap-x z-20 pb-8">
          {displayedMemories.map((memory, index) => (
            <div 
              key={memory.id}
              onClick={() => setSelectedIndex(index)}
              className="group relative flex-shrink-0 w-80 h-[500px] cursor-pointer transform transition-all duration-500 hover:-translate-y-4 hover:rotate-1 snap-center perspective-1000"
            >
              {/* Glass Tablet Card */}
              <div className={`absolute inset-0 glass-panel rounded-sm border transition-all shadow-2xl flex flex-col p-8 overflow-hidden bg-gradient-to-b backdrop-blur-md ${viewMode === 'TRASH' ? 'from-red-900/10 to-transparent border-red-500/10' : 'from-white/5 to-transparent border-white/10 group-hover:border-white/40 group-hover:bg-white/5'}`}>
                 
                 {/* Decorative Line */}
                 <div className={`w-8 h-1 mb-8 self-start ${viewMode === 'TRASH' ? 'bg-red-500/30' : 'bg-emerald-500/50'}`}></div>

                 {/* Card Top: Time */}
                 <div className="flex flex-col items-start mb-6 opacity-60">
                    <span className={`font-mono text-xs tracking-widest uppercase ${viewMode === 'TRASH' ? 'text-red-300/70' : 'text-emerald-300'}`}>
                       {new Date(memory.timestamp).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 mt-1">
                       {new Date(memory.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                 </div>
                 
                 {/* Card Title */}
                 <div className="flex-1 flex flex-col justify-center">
                   <h3 className={`font-serif text-3xl italic leading-snug transition-colors line-clamp-4 ${viewMode === 'TRASH' ? 'text-gray-400' : 'text-white/90 group-hover:text-emerald-200'}`}>
                     {memory.title}
                   </h3>
                 </div>
                 
                 {/* Card Bottom: Interaction Buttons */}
                 <div className="mt-auto pt-6 border-t border-white/10 flex justify-between items-center relative z-40">
                     <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">
                       Read Entry ➞
                     </span>
                     
                     <div className="flex space-x-2 pointer-events-auto">
                       {viewMode === 'ACTIVE' ? (
                         <button 
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             onDelete(memory.id);
                           }}
                           className="relative z-50 text-gray-500 hover:text-red-400 transition-colors p-3 rounded-full hover:bg-white/10"
                           title="Move to Bin"
                         >
                           <span className="text-xl leading-none">🗑️</span>
                         </button>
                       ) : (
                         <>
                           <button 
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               onRestore(memory.id);
                             }}
                             className="relative z-50 text-gray-500 hover:text-emerald-400 transition-colors p-3 rounded-full hover:bg-white/10"
                             title="Restore"
                           >
                             <span className="text-xl leading-none">♻️</span>
                           </button>
                           <button 
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               // Direct permanent delete without confirmation as requested
                               onPermanentDelete(memory.id);
                             }}
                             className="relative z-50 text-gray-500 hover:text-red-600 transition-colors p-3 rounded-full hover:bg-white/10"
                             title="Delete Forever"
                           >
                             <span className="text-xl leading-none">💥</span>
                           </button>
                         </>
                       )}
                     </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Navigation Indicator */}
        <div className="mt-4 text-[10px] uppercase tracking-widest text-white/30">
           {displayedMemories.length} Memories {viewMode === 'TRASH' ? 'in Bin' : 'Stored'}
        </div>
      </div>

      {/* Full Screen Reading Mode (Modal) */}
      {selectedMemory && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in pointer-events-auto">
          {/* Close Area (Click outside to close) */}
          <div className="absolute inset-0" onClick={() => setSelectedIndex(null)}></div>

          <div className="max-w-4xl w-full h-full md:h-[90vh] md:rounded-lg glass-panel border-0 md:border md:border-white/10 shadow-2xl overflow-hidden relative flex flex-col bg-black/80">
            
            {/* Top Toolbar */}
            <div className={`flex justify-between items-center p-6 border-b border-white/10 z-10 ${viewMode === 'TRASH' ? 'bg-red-900/20' : 'bg-black/40'}`}>
               <div className={`text-xs font-mono tracking-widest uppercase ${viewMode === 'TRASH' ? 'text-red-400' : 'text-emerald-500'}`}>
                  {viewMode === 'TRASH' ? 'Deleted Memory' : 'Reading Mode'}
               </div>
               <div className="flex items-center space-x-6">
                 
                 {viewMode === 'ACTIVE' ? (
                   <button 
                    onClick={() => {
                        onDelete(selectedMemory.id);
                        setSelectedIndex(null);
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors text-xs tracking-widest uppercase flex items-center space-x-2"
                   >
                    <span>Delete</span>
                    <span className="text-sm">🗑️</span>
                   </button>
                 ) : (
                    <>
                      <button 
                        onClick={() => {
                          onRestore(selectedMemory.id);
                          setSelectedIndex(null);
                        }}
                        className="text-emerald-500 hover:text-emerald-300 transition-colors text-xs tracking-widest uppercase flex items-center space-x-2"
                      >
                        <span>Restore</span>
                        <span className="text-sm">♻️</span>
                      </button>
                      <button 
                        onClick={() => {
                          // Direct permanent delete without confirmation as requested
                          onPermanentDelete(selectedMemory.id);
                          setSelectedIndex(null);
                        }}
                        className="text-red-500 hover:text-red-300 transition-colors text-xs tracking-widest uppercase flex items-center space-x-2"
                      >
                        <span>Erase</span>
                        <span className="text-sm">💥</span>
                      </button>
                    </>
                 )}

                 <div className="h-4 w-px bg-white/10"></div>
                 <button 
                  onClick={() => setSelectedIndex(null)}
                  className="text-white/50 hover:text-white transition-colors text-xs tracking-widest border border-white/10 hover:border-white/50 px-4 py-2 rounded-full uppercase"
                >
                  Close
                </button>
               </div>
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
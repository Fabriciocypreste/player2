import React from 'react';
import { X, Calendar, Clock, Tv, Film, Play } from 'lucide-react';
import { Channel } from '../types/iptv';

interface EpgDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  onPlayChannel: (channel: Channel) => void;
}

export const EpgDrawer: React.FC<EpgDrawerProps> = ({
  isOpen,
  onClose,
  channel,
  onPlayChannel,
}) => {
  if (!isOpen) return null;

  const current = channel.currentProgram;
  const upcoming = channel.upcomingPrograms || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Guia Eletrônico de Programação EPG"
    >
      <div className="w-full max-w-lg h-full glass-panel border-l border-white/10 text-white flex flex-col shadow-2xl p-6 overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">GUIA EPG DE PROGRAMAÇÃO</h2>
              <p className="text-xs text-zinc-400">Canal #{channel.number} • {channel.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Fechar guia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Program Spotlight */}
        {current && (
          <div className="my-5 p-4 rounded-2xl bg-zinc-900/90 border border-red-500/40 shadow-lg shadow-red-950/30">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                AO VIVO AGORA
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {current.startTime} - {current.endTime}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-white mt-1.5">
              {current.title}
            </h3>

            {current.episode && (
              <p className="text-xs font-medium text-zinc-300 mt-0.5">
                {current.episode}
              </p>
            )}

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              {current.synopsis}
            </p>

            {/* Progress bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span>Progresso atual</span>
                <span>{current.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full"
                  style={{ width: `${current.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Programs Timeline */}
        <div className="flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-red-500" />
            A Seguir na Grade
          </h4>

          {upcoming.length === 0 ? (
            <p className="text-xs text-zinc-500 italic py-4">Sem dados adicionais de programação futura.</p>
          ) : (
            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
              {upcoming.map((prog, idx) => (
                <div key={prog.id || idx} className="relative pl-8 group">
                  <span className="absolute left-1.5 top-2.5 w-3 h-3 rounded-full bg-[#121217] border-2 border-zinc-700 group-hover:border-red-500 transition-colors" />
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-300">
                        {prog.startTime} - {prog.endTime}
                      </span>
                      {prog.rating && (
                        <span className="text-[10px] px-1 py-0.2 bg-zinc-800 rounded text-zinc-400 border border-zinc-700">
                          {prog.rating}
                        </span>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-white mt-1">{prog.title}</h5>
                    {prog.episode && (
                      <p className="text-[11px] text-zinc-400">{prog.episode}</p>
                    )}
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{prog.synopsis}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="pt-4 border-t border-zinc-800">
          <button
            onClick={() => {
              onPlayChannel(channel);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/60 transition-all active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            Assistir Canal #{channel.number}
          </button>
        </div>
      </div>
    </div>
  );
};

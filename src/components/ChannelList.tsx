import React from 'react';
import { ChevronRight, Star, SlidersHorizontal, Zap, Radio, MapPin } from 'lucide-react';
import { Channel, ChannelQuality, StreamTypeFilter, StateFilter, ChannelStateCode } from '../types/iptv';

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannel: (channel: Channel) => void;
  qualityFilter: ChannelQuality | 'ALL';
  onQualityFilterChange: (quality: ChannelQuality | 'ALL') => void;
  streamTypeFilter: StreamTypeFilter;
  onStreamTypeFilterChange: (type: StreamTypeFilter) => void;
  stateFilter: StateFilter;
  onStateFilterChange: (state: StateFilter) => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  categoryLabel: string;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  qualityFilter,
  onQualityFilterChange,
  streamTypeFilter,
  onStreamTypeFilterChange,
  stateFilter,
  onStateFilterChange,
  favoriteIds,
  onToggleFavorite,
  categoryLabel,
}) => {
  return (
    <section
      className="w-72 md:w-84 lg:w-96 glass-panel border-r border-white/10 flex flex-col h-full shrink-0 select-none z-20 transition-all"
      aria-label="Lista de Canais"
    >
      {/* Category Header (Filters removed from menu per user request) */}
      <div className="p-3.5 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse" />
            {categoryLabel}
          </span>
          <span className="text-[11px] font-mono text-zinc-400 font-semibold bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-full">
            {channels.length} {channels.length === 1 ? 'canal' : 'canais'}
          </span>
        </div>
      </div>

      {/* Channel Scrollable List - Scrollbar completely hidden per user request */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 space-y-2">
        {channels.length === 0 ? (
          <div className="text-center py-12 px-4 text-zinc-400">
            <p className="text-xs">Nenhum canal encontrado com os filtros selecionados.</p>
            {streamTypeFilter !== 'ALL' && (
              <button
                onClick={() => onStreamTypeFilterChange('ALL')}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline block mx-auto"
              >
                Mostrar todos os canais
              </button>
            )}
          </div>
        ) : (
          channels.map((channel) => {
            const isSelected = channel.id === selectedChannelId;
            const isFav = favoriteIds.includes(channel.id);
            const isP2P = channel.streamType === 'p2p';

            return (
              <div
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectChannel(channel);
                  }
                }}
                className={`w-full group text-left p-3 rounded-xl transition-all cursor-pointer relative flex items-center justify-between gap-3 ${
                  isSelected ? 'glass-card-active' : 'glass-card'
                }`}
              >
                {/* Left Badge / Logo + Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Channel Logo Pill/Square with glass effect */}
                  <div
                    className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 border transition-all ${
                      isSelected
                        ? 'border-red-500/80 bg-red-950/50 text-white shadow-sm'
                        : 'border-white/10 bg-black/40 text-zinc-200 group-hover:border-white/20'
                    }`}
                  >
                    <span className="text-[10px] font-black tracking-tighter text-center leading-tight px-1">
                      {channel.logoText}
                    </span>
                    <span
                      className={`text-[8px] font-mono px-1 rounded-sm mt-0.5 ${
                        channel.quality === '4K'
                          ? 'bg-amber-500 text-black font-extrabold'
                          : channel.quality === 'FHD'
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {channel.quality}
                    </span>
                  </div>

                  {/* Channel Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono text-zinc-400 font-semibold">#{channel.number}</span>
                      <h3
                        className={`text-xs font-bold truncate leading-snug tracking-wide ${
                          isSelected ? 'text-white drop-shadow-sm' : 'text-zinc-200 group-hover:text-white'
                        }`}
                      >
                        {channel.name}
                      </h3>

                      {/* State Regional Badge */}
                      {channel.stateCode && channel.stateCode !== 'NACIONAL' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-white/10 text-white border border-white/15">
                          <MapPin className="w-2.5 h-2.5 text-red-400" />
                          {channel.stateCode}
                        </span>
                      )}

                      {/* P2P Tag Badge */}
                      {isP2P ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider bg-red-600/90 text-white border border-red-500/60 shadow-xs">
                          <Zap className="w-2.5 h-2.5 fill-current text-amber-300" />
                          P2P
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-semibold text-zinc-400 bg-white/[0.06] border border-white/5">
                          IPTV
                        </span>
                      )}
                    </div>

                    {/* Subtitle & Live Audio Equalizer Indicator */}
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-300">
                      {isSelected && (
                        <div
                          className="flex items-end gap-0.5 h-3.5 pr-1"
                          title="Vídeo de teste reproduzindo ao vivo"
                          aria-label="Áudio ao vivo reproduzindo"
                        >
                          <span className="w-0.5 bg-red-500 rounded-full animate-eq-1 inline-block" />
                          <span className="w-0.5 bg-red-500 rounded-full animate-eq-2 inline-block" />
                          <span className="w-0.5 bg-red-500 rounded-full animate-eq-3 inline-block" />
                        </div>
                      )}
                      <span className="truncate">{channel.subtitle}</span>
                      {isP2P && channel.peersCount && (
                        <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                          • {channel.peersCount} peers
                        </span>
                      )}
                    </div>

                    {/* Current Show snippet */}
                    {channel.currentProgram && (
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                        <span className="text-red-400 font-bold">▶</span>
                        <span className="truncate">{channel.currentProgram.title}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Actions: Favorite & Arrow */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => onToggleFavorite(channel.id, e)}
                    className={`p-1.5 rounded-md transition-colors ${
                      isFav
                        ? 'text-yellow-400 hover:text-yellow-300'
                        : 'text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar canal'}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>

                  <ChevronRight
                    className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                      isSelected ? 'text-red-500' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

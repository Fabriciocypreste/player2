import React from 'react';
import {
  LayoutGrid,
  Clock,
  Trophy,
  Film,
  Tv,
  Newspaper,
  Smile,
  Compass,
  Music,
  Plus,
  Radio,
  Sparkles,
  Gamepad2,
  Zap,
} from 'lucide-react';
import { CategoryId, CategoryInfo } from '../types/iptv';
import { CATEGORIES } from '../data/channelsData';

interface CategorySidebarProps {
  selectedCategory: CategoryId;
  onSelectCategory: (category: CategoryId) => void;
  channelCounts: Record<CategoryId, number>;
  onOpenCustomModal: () => void;
  onToggleRemote: () => void;
  isRemoteOpen: boolean;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutGrid,
  Clock,
  Trophy,
  Film,
  Tv,
  Newspaper,
  Smile,
  Compass,
  Music,
  Radio,
  Sparkles,
  Zap,
};

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  selectedCategory,
  onSelectCategory,
  channelCounts,
  onOpenCustomModal,
  onToggleRemote,
  isRemoteOpen,
}) => {
  return (
    <aside
      className="w-56 md:w-60 glass-panel border-r border-white/10 flex flex-col h-full shrink-0 select-none z-20 transition-all"
      aria-label="Categorias de Canais"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-950/70 border border-red-500/50">
            <Tv className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
              <span>REDBLACK</span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-950/70 border border-red-700/50 px-1 py-0.5 rounded backdrop-blur-sm">
                IPTV
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">Player TV Ao Vivo</p>
          </div>
        </div>
      </div>

      {/* Categories Nav (Scrollbar hidden as well) */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-3 space-y-1.5">
        {CATEGORIES.map((cat: CategoryInfo) => {
          const IconComponent = ICON_MAP[cat.iconName] || Tv;
          const isSelected = selectedCategory === cat.id;
          const count = channelCounts[cat.id] ?? 0;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold tracking-wide transition-all group ${
                isSelected
                  ? 'bg-red-950/30 text-white border border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)] backdrop-blur-md'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.06] border border-transparent backdrop-blur-xs'
              }`}
              aria-current={isSelected ? 'true' : undefined}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span
                  className={`p-1 rounded-md transition-colors ${
                    isSelected
                      ? 'text-red-500'
                      : 'text-zinc-400 group-hover:text-red-400'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </span>
                <span className="truncate uppercase font-medium">{cat.label}</span>
              </div>

              {count > 0 && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors ${
                    isSelected
                      ? 'bg-red-500/25 text-red-300 border border-red-500/30 font-bold'
                      : 'bg-white/[0.04] text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Action shortcuts footer with glass effect */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-black/30 backdrop-blur-md">
        <button
          onClick={onOpenCustomModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all shadow-xs"
          title="Inserir stream M3U / MP4"
        >
          <Plus className="w-3.5 h-3.5 text-red-500" />
          <span>Adicionar Canal</span>
        </button>

        <button
          onClick={onToggleRemote}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
            isRemoteOpen
              ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/80'
              : 'text-zinc-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
          }`}
          title="Abrir controle remoto virtual"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-red-400" />
          <span>Controle Remoto</span>
        </button>
      </div>
    </aside>
  );
};

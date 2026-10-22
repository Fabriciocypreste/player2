import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { CategorySidebar } from './components/CategorySidebar';
import { ChannelList } from './components/ChannelList';
import { VideoPlayer } from './components/VideoPlayer';
import { VirtualRemote } from './components/VirtualRemote';
import { EpgDrawer } from './components/EpgDrawer';
import { CustomStreamModal } from './components/CustomStreamModal';
import { INITIAL_CHANNELS, CATEGORIES } from './data/channelsData';
import { Channel, CategoryId, ChannelQuality, StreamTypeFilter, StateFilter, ChannelStateCode } from './types/iptv';
import { filterChannels, getNextChannel, getPreviousChannel } from './utils/channelLogic';
import { Menu, Layers } from 'lucide-react';

export default function App() {
  // Channels state
  const [channels, setChannels] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem('redblack_iptv_custom_channels');
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...INITIAL_CHANNELS, ...parsed];
      }
    } catch {
      // Fallback
    }
    return INITIAL_CHANNELS;
  });

  // Selected Category (defaults to 'entretenimento' to match screenshot!)
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('entretenimento');

  // Selected Channel (defaults to 'tnt-series-fhd')
  const [selectedChannelId, setSelectedChannelId] = useState<string>('tnt-series-fhd');

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('redblack_iptv_favorites');
      return saved ? JSON.parse(saved) : ['tnt-series-fhd', 'sony-fhd'];
    } catch {
      return ['tnt-series-fhd'];
    }
  });

  // Recents
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('redblack_iptv_recents');
      return saved ? JSON.parse(saved) : ['tnt-series-fhd', 'tnt-series-sd', 'sony-fhd'];
    } catch {
      return ['tnt-series-fhd'];
    }
  });

  // Quality & Stream Protocol & State Regional Filters
  const [qualityFilter, setQualityFilter] = useState<ChannelQuality | 'ALL'>('ALL');
  const [streamTypeFilter, setStreamTypeFilter] = useState<StreamTypeFilter>('ALL');
  const [stateFilter, setStateFilter] = useState<StateFilter>('ALL');

  // Fullscreen / Expanded player mode (defaults to false so initial view shows list, expands when channel is clicked)
  const [isExpandedPlayer, setIsExpandedPlayer] = useState<boolean>(false);

  // Modals & Panels
  const [isEpgOpen, setIsEpgOpen] = useState<boolean>(false);
  const [isRemoteOpen, setIsRemoteOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // Responsive mobile drawer toggles
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState<boolean>(false);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem('redblack_iptv_favorites', JSON.stringify(favoriteIds));
    } catch {
      // Ignore
    }
  }, [favoriteIds]);

  // Persist recents
  useEffect(() => {
    try {
      localStorage.setItem('redblack_iptv_recents', JSON.stringify(recentIds));
    } catch {
      // Ignore
    }
  }, [recentIds]);

  const handleOpenEpg = useCallback(() => {
    setIsRemoteOpen(false);
    setIsEpgOpen(true);
  }, []);

  // Record recent channels when selected & open in full screen
  const handleSelectChannel = useCallback((channel: Channel) => {
    setSelectedChannelId(channel.id);
    setIsExpandedPlayer(true); // "ao selecionar canal video abre em tela cheia"
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== channel.id);
      return [channel.id, ...filtered].slice(0, 15);
    });
    // On mobile, close drawers when channel is tapped
    setIsMobileSidebarOpen(false);
    setIsMobileListOpen(false);
  }, []);

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteIds((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    );
  };

  // Channel counts for each category
  const channelCounts = useMemo(() => {
    const counts: Record<CategoryId, number> = {
      todos: channels.length,
      p2p: 0,
      recentes: recentIds.length,
      esportes: 0,
      filmes: 0,
      entretenimento: 0,
      noticias: 0,
      infantil: 0,
      documentarios: 0,
      musica: 0,
      religiosos: 0,
      tv_aberta: 0,
      uhd_4k: 0,
    };

    channels.forEach((c) => {
      if (c.category in counts) {
        counts[c.category] = (counts[c.category] || 0) + 1;
      }
      if (c.streamType === 'p2p') {
        counts.p2p = (counts.p2p || 0) + 1;
      }
      if (c.quality === '4K') {
        counts.uhd_4k = (counts.uhd_4k || 0) + 1;
      }
    });

    return counts;
  }, [channels, recentIds]);

  // Filtered channels in middle list (Search bar removed, P2P filter + State filter added)
  const filteredChannels = useMemo(() => {
    return filterChannels(
      channels,
      selectedCategory,
      '',
      qualityFilter,
      recentIds,
      favoriteIds,
      streamTypeFilter,
      stateFilter
    );
  }, [channels, selectedCategory, qualityFilter, recentIds, favoriteIds, streamTypeFilter, stateFilter]);

  // Current active channel
  const activeChannel = useMemo(() => {
    const found = channels.find((c) => c.id === selectedChannelId);
    return found || channels[0] || INITIAL_CHANNELS[0];
  }, [channels, selectedChannelId]);

  // Next / Previous channel
  const handleNextChannel = useCallback(() => {
    const next = getNextChannel(filteredChannels.length > 0 ? filteredChannels : channels, activeChannel.id);
    if (next) {
      handleSelectChannel(next);
    }
  }, [filteredChannels, channels, activeChannel.id, handleSelectChannel]);

  const handlePreviousChannel = useCallback(() => {
    const prev = getPreviousChannel(filteredChannels.length > 0 ? filteredChannels : channels, activeChannel.id);
    if (prev) {
      handleSelectChannel(prev);
    }
  }, [filteredChannels, channels, activeChannel.id, handleSelectChannel]);

  // Switch channel by number (from virtual remote dial)
  const handleSelectChannelByNumber = useCallback(
    (channelNum: number) => {
      const match = channels.find((c) => c.number === channelNum);
      if (match) {
        handleSelectChannel(match);
      }
    },
    [channels, handleSelectChannel]
  );

  // Switch quality variant of same channel
  const handleQualityChange = useCallback(
    (targetQuality: ChannelQuality) => {
      const baseName = activeChannel.name.replace(/(4K|FHD|HD|SD)/g, '').trim();
      const match = channels.find(
        (c) =>
          c.quality === targetQuality &&
          c.name.replace(/(4K|FHD|HD|SD)/g, '').trim() === baseName
      );
      if (match) {
        handleSelectChannel(match);
      } else {
        setChannels((prev) =>
          prev.map((c) => (c.id === activeChannel.id ? { ...c, quality: targetQuality } : c))
        );
      }
    },
    [activeChannel, channels, handleSelectChannel]
  );

  // Add custom stream
  const handleAddChannel = (newChannel: Channel) => {
    setChannels((prev) => {
      const updated = [newChannel, ...prev];
      try {
        const customOnly = updated.filter((c) => c.id.startsWith('custom-'));
        localStorage.setItem('redblack_iptv_custom_channels', JSON.stringify(customOnly));
      } catch {
        // Ignore
      }
      return updated;
    });
    setSelectedCategory(newChannel.category);
    handleSelectChannel(newChannel);
  };

  const currentCategoryLabel = useMemo(() => {
    return CATEGORIES.find((cat) => cat.id === selectedCategory)?.label || 'CANAIS';
  }, [selectedCategory]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#030305] text-white font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Mobile Top Bar (Only visible on small screens < md) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-black/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-3">
        <button
          onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10"
          aria-label="Abrir categorias"
        >
          <Menu className="w-5 h-5 text-red-500" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            {activeChannel.name}
          </span>
        </div>

        <button
          onClick={() => setIsMobileListOpen((prev) => !prev)}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10"
          aria-label="Abrir lista de canais"
        >
          <Layers className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Left Column: Categories Sidebar (Hidden when player is in full screen mode) */}
      {!isExpandedPlayer && (
        <div
          className={`${
            isMobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden md:flex'
          } h-full`}
        >
          <CategorySidebar
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setIsMobileSidebarOpen(false);
            }}
            channelCounts={channelCounts}
            onOpenCustomModal={() => setIsCustomModalOpen(true)}
            onToggleRemote={() => setIsRemoteOpen((prev) => !prev)}
            isRemoteOpen={isRemoteOpen}
          />
          {isMobileSidebarOpen && (
            <div
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[-1]"
            />
          )}
        </div>
      )}

      {/* Middle Column: Channel Cards List (Hidden when player is in full screen mode) */}
      {!isExpandedPlayer && (
        <div
          className={`${
            isMobileListOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden md:flex'
          } h-full`}
        >
          <ChannelList
            channels={filteredChannels}
            selectedChannelId={selectedChannelId}
            onSelectChannel={handleSelectChannel}
            qualityFilter={qualityFilter}
            onQualityFilterChange={setQualityFilter}
            streamTypeFilter={streamTypeFilter}
            onStreamTypeFilterChange={setStreamTypeFilter}
            stateFilter={stateFilter}
            onStateFilterChange={setStateFilter}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            categoryLabel={currentCategoryLabel}
          />
          {isMobileListOpen && (
            <div
              onClick={() => setIsMobileListOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[-1]"
            />
          )}
        </div>
      )}

      {/* Right Column: Main Video Player Viewport */}
      <div className="flex-1 h-full w-full relative pt-12 md:pt-0">
        <VideoPlayer
          channel={activeChannel}
          allChannels={channels}
          isExpandedPlayer={isExpandedPlayer}
          onToggleExpandedPlayer={() => setIsExpandedPlayer((prev) => !prev)}
          onSelectChannel={handleSelectChannel}
          onNextChannel={handleNextChannel}
          onPreviousChannel={handlePreviousChannel}
          onOpenEpg={handleOpenEpg}
          onToggleRemote={() => setIsRemoteOpen((prev) => !prev)}
          onQualityChange={handleQualityChange}
          onStateChange={(state) => setStateFilter(state)}
        />
      </div>

      {/* Electronic Program Guide (EPG) Drawer */}
      <EpgDrawer
        isOpen={isEpgOpen}
        onClose={() => setIsEpgOpen(false)}
        channel={activeChannel}
        onPlayChannel={handleSelectChannel}
      />

      {/* Virtual Smart TV Remote Control */}
      <VirtualRemote
        isOpen={isRemoteOpen}
        onClose={() => setIsRemoteOpen(false)}
        onNextChannel={handleNextChannel}
        onPreviousChannel={handlePreviousChannel}
        onSelectChannelByNumber={handleSelectChannelByNumber}
        onToggleMute={() => {}}
        onOpenEpg={handleOpenEpg}
        currentChannel={activeChannel}
      />

      {/* Add Custom IPTV / M3U Stream Modal */}
      <CustomStreamModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onAddChannel={handleAddChannel}
      />
    </div>
  );
}

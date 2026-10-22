import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Info,
  Calendar,
  PictureInPicture2,
  Tv,
  Radio,
  RotateCcw,
  Sparkles,
  Zap,
  MapPin,
  ChevronDown,
  Check,
  X,
  Clock,
  Layers,
  ArrowLeft,
  Columns2,
  Grid2X2,
  Square,
  Server,
} from 'lucide-react';
import {
  Channel,
  ChannelQuality,
  ChannelStateCode,
  StateFilter,
  StreamSource,
  StreamSourceType,
  MultiViewLayout,
} from '../types/iptv';
import {
  getChannelStateVariants,
  switchChannelState,
  extractNetworkFamily,
  getChannelSources,
} from '../utils/channelLogic';

interface VideoPlayerProps {
  channel: Channel;
  allChannels?: Channel[];
  isExpandedPlayer?: boolean;
  onToggleExpandedPlayer?: () => void;
  onSelectChannel?: (channel: Channel) => void;
  onNextChannel: () => void;
  onPreviousChannel: () => void;
  onOpenEpg: () => void;
  onToggleRemote: () => void;
  onQualityChange: (quality: ChannelQuality) => void;
  onStateChange?: (state: ChannelStateCode) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  channel,
  allChannels = [],
  isExpandedPlayer = false,
  onToggleExpandedPlayer,
  onSelectChannel,
  onNextChannel,
  onPreviousChannel,
  onOpenEpg,
  onToggleRemote,
  onQualityChange,
  onStateChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true); // start muted so all browsers permit autoplay
  const [volume, setVolume] = useState<number>(0.85);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [showInfoBanner, setShowInfoBanner] = useState<boolean>(true);
  const [channelTransition, setChannelTransition] = useState<boolean>(false);
  const [showUnmuteHint, setShowUnmuteHint] = useState<boolean>(true);

  // In-player State Filter and In-player EPG state
  const [isStateSelectorOpen, setIsStateSelectorOpen] = useState<boolean>(false);
  const [isInPlayerEpgOpen, setIsInPlayerEpgOpen] = useState<boolean>(false);
  const [stateToastMessage, setStateToastMessage] = useState<string | null>(null);

  // Stream Sources (2 IPTV + 1 P2P per User Request)
  const availableSources = useMemo(() => getChannelSources(channel), [channel]);
  const [activeSourceType, setActiveSourceType] = useState<StreamSourceType>(() =>
    channel.streamType === 'p2p' ? 'p2p' : 'iptv1'
  );
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState<boolean>(false);

  // Keep active source in sync when channel changes
  useEffect(() => {
    setActiveSourceType(channel.streamType === 'p2p' ? 'p2p' : 'iptv1');
  }, [channel.id, channel.streamType]);

  const activeSource = useMemo(() => {
    return availableSources.find((s) => s.type === activeSourceType) || availableSources[0];
  }, [availableSources, activeSourceType]);

  // Multi-Telas / PIB (Multi-Screen) state
  const [multiViewLayout, setMultiViewLayout] = useState<MultiViewLayout>('single');
  const [isMultiViewMenuOpen, setIsMultiViewMenuOpen] = useState<boolean>(false);
  const [multiSlotChannels, setMultiSlotChannels] = useState<Channel[]>(() => {
    return [
      channel,
      allChannels.find((c) => c.id !== channel.id) || channel,
      allChannels.find((c) => c.category === 'noticias') || allChannels[2] || channel,
      allChannels.find((c) => c.category === 'esportes') || allChannels[3] || channel,
    ];
  });
  const [activeAudioSlot, setActiveAudioSlot] = useState<number>(0);

  // Keep first slot updated with active channel
  useEffect(() => {
    setMultiSlotChannels((prev) => [
      channel,
      prev[1] || allChannels.find((c) => c.id !== channel.id) || channel,
      prev[2] || allChannels[2] || channel,
      prev[3] || allChannels[3] || channel,
    ]);
  }, [channel.id]);

  const networkFamily = extractNetworkFamily(channel.name);
  const stateVariants = allChannels.length > 0 ? getChannelStateVariants(allChannels, channel) : [];

  const BRAZIL_STATES: { code: ChannelStateCode; label: string; name: string }[] = [
    { code: 'SP', label: 'São Paulo', name: 'São Paulo' },
    { code: 'RJ', label: 'Rio de Janeiro', name: 'Rio de Janeiro' },
    { code: 'MG', label: 'Minas Gerais', name: 'Minas Gerais' },
    { code: 'DF', label: 'Distrito Federal', name: 'Brasília / DF' },
    { code: 'BA', label: 'Bahia', name: 'Bahia' },
    { code: 'RS', label: 'Rio Grande do Sul', name: 'Rio Grande do Sul' },
    { code: 'NACIONAL', label: 'Nacional', name: 'Rede Nacional' },
  ];

  const handleSelectRegionalState = (targetState: ChannelStateCode) => {
    if (allChannels.length > 0 && onSelectChannel) {
      const match = switchChannelState(allChannels, channel, targetState);
      if (match) {
        onSelectChannel(match);
        setStateToastMessage(`Sintonizado: ${match.name} [${targetState}]`);
        setTimeout(() => setStateToastMessage(null), 3500);
        setIsStateSelectorOpen(false);
        return;
      }
    }
    if (onStateChange) {
      onStateChange(targetState);
    }
    setStateToastMessage(`Filtro regional aplicado: ${targetState}`);
    setTimeout(() => setStateToastMessage(null), 3500);
    setIsStateSelectorOpen(false);
  };

  // Live clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Show info banner briefly when channel changes
  useEffect(() => {
    setShowInfoBanner(true);
    setChannelTransition(true);
    const transTimer = setTimeout(() => setChannelTransition(false), 400);
    const bannerTimer = setTimeout(() => setShowInfoBanner(false), 5000);
    return () => {
      clearTimeout(transTimer);
      clearTimeout(bannerTimer);
    };
  }, [channel.id]);

  // Video stream initialization (HLS or native MP4)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const currentUrl = activeSource.videoUrl;
    const isHlsStream = activeSource.isHls || currentUrl.endsWith('.m3u8');

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(currentUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setHasError(true);
              setIsLoading(false);
              break;
          }
        }
      });
    } else {
      video.src = currentUrl;
      video.load();
      video
        .play()
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setIsLoading(false);
          setIsPlaying(false);
        });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeSource.videoUrl, activeSource.isHls]);

  // Sync volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (
      isStateSelectorOpen ||
      isInPlayerEpgOpen ||
      isSourceSelectorOpen ||
      isMultiViewMenuOpen
    ) {
      return; // Keep controls visible while menu or EPG is open
    }
    hideControlsTimerRef.current = setTimeout(() => {
      if (
        isPlaying &&
        !isStateSelectorOpen &&
        !isInPlayerEpgOpen &&
        !isSourceSelectorOpen &&
        !isMultiViewMenuOpen
      ) {
        setShowControls(false);
      }
    }, 4500);
  }, [
    isPlaying,
    isStateSelectorOpen,
    isInPlayerEpgOpen,
    isSourceSelectorOpen,
    isMultiViewMenuOpen,
  ]);

  useEffect(() => {
    if (
      isStateSelectorOpen ||
      isInPlayerEpgOpen ||
      isSourceSelectorOpen ||
      isMultiViewMenuOpen
    ) {
      setShowControls(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    }
  }, [
    isStateSelectorOpen,
    isInPlayerEpgOpen,
    isSourceSelectorOpen,
    isMultiViewMenuOpen,
  ]);

  const handleMouseMove = () => {
    resetHideTimer();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetHideTimer();
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    resetHideTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
    resetHideTimer();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // PiP not supported or failed
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPreviousChannel();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNextChannel();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setVolume((v) => Math.min(1, v + 0.05));
        setIsMuted(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setVolume((v) => Math.max(0, v - 0.05));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setIsInPlayerEpgOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsStateSelectorOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsSourceSelectorOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsMultiViewMenuOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isInPlayerEpgOpen) {
          setIsInPlayerEpgOpen(false);
        } else if (isStateSelectorOpen) {
          setIsStateSelectorOpen(false);
        } else if (isSourceSelectorOpen) {
          setIsSourceSelectorOpen(false);
        } else if (isMultiViewMenuOpen) {
          setIsMultiViewMenuOpen(false);
        } else if (multiViewLayout !== 'single') {
          setMultiViewLayout('single');
        } else if (isExpandedPlayer && onToggleExpandedPlayer) {
          onToggleExpandedPlayer();
        }
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setShowInfoBanner((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    onPreviousChannel,
    onNextChannel,
    isInPlayerEpgOpen,
    isStateSelectorOpen,
    isSourceSelectorOpen,
    isMultiViewMenuOpen,
    multiViewLayout,
    isExpandedPlayer,
    onToggleExpandedPlayer,
  ]);

  // Object fit class
  const fitClass =
    aspectRatio === 'contain'
      ? 'object-contain'
      : aspectRatio === 'cover'
      ? 'object-cover'
      : 'object-fill';

  // Helper to render an individual tile in Multi-Telas mode
  const renderMultiScreenTile = (slotIndex: number, currentSlotChannel: Channel) => {
    const isAudioActive = activeAudioSlot === slotIndex;
    const slotSources = getChannelSources(currentSlotChannel);
    return (
      <div
        key={`slot-${slotIndex}-${currentSlotChannel.id}`}
        onClick={() => setActiveAudioSlot(slotIndex)}
        className={`relative rounded-xl overflow-hidden bg-black border transition-all flex flex-col ${
          isAudioActive
            ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-1 ring-red-500'
            : 'border-white/10 hover:border-white/30'
        }`}
      >
        {/* Tile Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-2 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <span className="px-1.5 py-0.5 rounded bg-red-600 font-black text-[9px] text-white shrink-0">
              TELA {slotIndex + 1}
            </span>
            <span className="font-bold text-white text-[11px] truncate max-w-[120px] sm:max-w-[160px]">
              {currentSlotChannel.name}
            </span>
            {currentSlotChannel.stateCode && (
              <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-zinc-300 shrink-0">
                {currentSlotChannel.stateCode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Audio Focus Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveAudioSlot(slotIndex);
              }}
              className={`p-1 rounded transition-colors ${
                isAudioActive ? 'bg-red-600 text-white' : 'bg-black/60 text-zinc-400 hover:text-white'
              }`}
              title={isAudioActive ? 'Áudio Ativo nesta Tela' : 'Ativar Áudio nesta Tela'}
              aria-label={isAudioActive ? 'Desativar áudio deste canal' : 'Ativar áudio deste canal'}
            >
              {isAudioActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Channel Changer for this tile */}
            <select
              value={currentSlotChannel.id}
              onChange={(e) => {
                e.stopPropagation();
                const found = allChannels.find((c) => c.id === e.target.value);
                if (found) {
                  setMultiSlotChannels((prev) => {
                    const copy = [...prev];
                    copy[slotIndex] = found;
                    return copy;
                  });
                }
              }}
              className="bg-black/80 text-[10px] text-zinc-200 border border-white/20 rounded px-1 py-0.5 max-w-[100px] sm:max-w-[130px] focus:outline-none cursor-pointer"
            >
              {allChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.number} {c.name}
                </option>
              ))}
            </select>

            {/* Maximize to single screen */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectChannel) onSelectChannel(currentSlotChannel);
                setMultiViewLayout('single');
              }}
              className="p-1 rounded bg-black/60 text-zinc-400 hover:text-white"
              title="Maximizar para 1 Tela"
              aria-label="Maximizar para uma tela"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video element */}
        <video
          autoPlay
          playsInline
          loop
          muted={!isAudioActive || isMuted}
          src={slotSources[0].videoUrl}
          className="w-full h-full object-contain"
        />
      </div>
    );
  };

  return (
    <main
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={resetHideTimer}
      className="relative flex-1 bg-[#050508] flex flex-col items-center justify-center overflow-hidden h-full select-none"
      aria-label="Reprodutor de Vídeo IPTV"
    >
      {/* Broadcast Channel Watermark (corner bug like real TV transmission) */}
      {multiViewLayout === 'single' && (
        <div
          className="absolute top-20 right-8 z-20 pointer-events-none opacity-40 hover:opacity-80 transition-opacity"
          aria-hidden="true"
        >
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
            <span className="text-xs font-black tracking-widest text-white/80 font-['Outfit']">
              {channel.logoText}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          </div>
        </div>
      )}

      {/* Main Single Player or Multi-View Screens Layout */}
      {multiViewLayout === 'single' || multiViewLayout === 'pip' ? (
        <>
          {/* Main HTML5 Video Element - Playing test videos in full clarity */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            loop
            muted={isMuted}
            className={`w-full h-full relative z-10 ${fitClass} transition-opacity duration-300 ${
              channelTransition ? 'opacity-20' : 'opacity-100'
            }`}
            onPlay={() => {
              setIsPlaying(true);
              setHasError(false);
              setIsLoading(false);
            }}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLoading(false);
            }}
          />

          {/* Floating In-App PiP Window (Picture-in-Picture) */}
          {multiViewLayout === 'pip' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-24 right-6 z-40 w-72 h-44 rounded-xl border-2 border-red-500 bg-black/95 shadow-2xl overflow-hidden flex flex-col group animate-in fade-in slide-in-from-bottom-4 duration-200"
            >
              <div className="p-1.5 bg-black/80 flex items-center justify-between text-[10px] text-white">
                <span className="font-bold truncate max-w-[160px]">
                  PIP: {multiSlotChannels[1]?.name || 'Canal Secundário'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (onSelectChannel && multiSlotChannels[1]) {
                        onSelectChannel(multiSlotChannels[1]);
                      }
                      setMultiViewLayout('single');
                    }}
                    className="p-0.5 rounded hover:bg-white/20"
                    title="Alternar para Tela Cheia"
                  >
                    <Maximize className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setMultiViewLayout('single')}
                    className="p-0.5 rounded hover:bg-white/20"
                    title="Fechar PIP"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <video
                autoPlay
                playsInline
                loop
                muted
                src={getChannelSources(multiSlotChannels[1] || channel)[0].videoUrl}
                className="w-full flex-1 object-cover"
              />
            </div>
          )}
        </>
      ) : multiViewLayout === 'dual' ? (
        /* 2 TELAS (Dual Split-Screen) */
        <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full gap-2 p-3 pb-24 z-10">
          {renderMultiScreenTile(0, multiSlotChannels[0] || channel)}
          {renderMultiScreenTile(1, multiSlotChannels[1] || allChannels[1] || channel)}
        </div>
      ) : (
        /* 4 TELAS (Quad Multi-View 2x2 Grid) */
        <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-2 p-3 pb-24 z-10">
          {renderMultiScreenTile(0, multiSlotChannels[0] || channel)}
          {renderMultiScreenTile(1, multiSlotChannels[1] || allChannels[1] || channel)}
          {renderMultiScreenTile(2, multiSlotChannels[2] || allChannels[2] || channel)}
          {renderMultiScreenTile(3, multiSlotChannels[3] || allChannels[3] || channel)}
        </div>
      )}

      {/* Unmute Toast/Prompt */}
      {isMuted && showUnmuteHint && multiViewLayout === 'single' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(false);
            setShowUnmuteHint(false);
          }}
          className="absolute top-16 right-6 z-40 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg shadow-red-950/80 flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
        >
          <VolumeX className="w-3.5 h-3.5" />
          <span>Áudio Mudo • Clique para Ativar Som</span>
        </button>
      )}

      {/* Buffering Spinner */}
      {isLoading && multiViewLayout === 'single' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs z-20 pointer-events-none">
          <div className="w-12 h-12 rounded-full border-4 border-zinc-700 border-t-red-600 animate-spin" />
          <p className="mt-3 text-xs font-semibold text-zinc-300 tracking-wider uppercase">
            Sintonizando #{channel.number} {channel.name}...
          </p>
        </div>
      )}

      {/* TOP OSD BAR (Translucent Glass Overlay) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 glass-panel border-b border-white/10 z-30 transition-all duration-300 flex items-center justify-between ${
          showControls || showInfoBanner ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Left: Return button (when expanded) & Channel Info & Live Badge */}
        <div className="flex items-center gap-3">
          {isExpandedPlayer && onToggleExpandedPlayer && (
            <button
              onClick={onToggleExpandedPlayer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/80 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Voltar para a Lista de Canais (Esc)"
              aria-label="Voltar para os canais"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>CANAIS</span>
            </button>
          )}

          {/* Live Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600/90 text-white rounded-md text-[11px] font-black tracking-wider uppercase shadow-md shadow-red-950/60">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>AO VIVO</span>
          </div>

          {/* Channel Name & Subtitle & Source Badge & State Badge */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white tracking-wide">
                #{channel.number} {channel.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {channel.quality === '4K' ? '4K UHD HDR' : channel.quality === 'FHD' ? '1080p FHD' : channel.quality}
              </span>

              {/* Active Stream Source Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSourceSelectorOpen((prev) => !prev);
                  setIsStateSelectorOpen(false);
                  setIsMultiViewMenuOpen(false);
                }}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                  activeSource.type === 'p2p'
                    ? 'bg-red-600/90 text-white font-bold border border-red-400/50 shadow-xs'
                    : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                }`}
                title="Clique para alternar fontes (2 IPTV + 1 P2P)"
              >
                {activeSource.type === 'p2p' ? (
                  <Zap className="w-2.5 h-2.5 fill-current text-amber-300" />
                ) : (
                  <Server className="w-2.5 h-2.5 text-zinc-400" />
                )}
                <span>{activeSource.name}</span>
              </button>

              {/* State Regional Badge */}
              {channel.stateCode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsStateSelectorOpen((prev) => !prev);
                    setIsSourceSelectorOpen(false);
                    setIsMultiViewMenuOpen(false);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-500/40 flex items-center gap-1 hover:bg-red-900/80 transition-colors"
                  title="Clique para alternar estado transmitido (E)"
                >
                  <MapPin className="w-2.5 h-2.5 text-red-400" />
                  <span>{channel.stateCode}</span>
                </button>
              )}
            </div>
            {channel.currentProgram && (
              <p className="text-xs text-zinc-300 truncate font-medium">
                {channel.currentProgram.title} {channel.currentProgram.episode && `• ${channel.currentProgram.episode}`}
              </p>
            )}
          </div>
        </div>

        {/* Right: Clock & Top Tools */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              {currentTimeStr}
            </span>
            <p className="text-[10px] text-zinc-400">Horário de Brasília</p>
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setShowInfoBanner((prev) => !prev)}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Informações do Programa (I)"
              aria-label="Informações do canal"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsInPlayerEpgOpen((prev) => !prev)}
              className={`p-1.5 rounded-md transition-colors ${
                isInPlayerEpgOpen ? 'bg-red-600 text-white' : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
              title="Guia de Programação EPG no Player (G)"
              aria-label="Guia de programação no player"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleRemote}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Controle Remoto Virtual"
              aria-label="Controle remoto virtual"
            >
              <Tv className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Center Channel Zap Banner (Shown on channel switch) */}
      {showInfoBanner && !showControls && (
        <div className="absolute top-20 left-6 z-20 bg-black/80 backdrop-blur-md border-l-4 border-l-red-600 border border-zinc-800 rounded-r-xl p-3 max-w-md shadow-2xl transition-opacity animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-red-500">CANAL {channel.number}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-bold text-white">{channel.name}</span>
          </div>
          {channel.currentProgram && (
            <div className="mt-1">
              <p className="text-sm font-semibold text-zinc-100">{channel.currentProgram.title}</p>
              <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{channel.currentProgram.synopsis}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-400 font-mono">
                <span>{channel.currentProgram.startTime} - {channel.currentProgram.endTime}</span>
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 rounded-full" style={{ width: `${channel.currentProgram.progressPercent}%` }} />
                </div>
                <span>{channel.currentProgram.progressPercent}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM OSD CONTROLS BAR (Translucent Frosted Glass Card) */}
      <div
        className={`absolute bottom-3 left-4 right-4 p-4 glass-panel border border-white/10 rounded-2xl z-30 transition-all duration-300 flex flex-col gap-2.5 shadow-2xl ${
          showControls || isStateSelectorOpen || isSourceSelectorOpen || isMultiViewMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Program EPG Progress Bar */}
        {channel.currentProgram && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-300">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-red-500 font-bold">EM EXIBIÇÃO:</span>
                <span className="text-white font-semibold">{channel.currentProgram.title}</span>
                {channel.currentProgram.rating && (
                  <span className="px-1 py-0.2 bg-zinc-800 text-[10px] rounded text-zinc-300 border border-zinc-700">
                    {channel.currentProgram.rating}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px]">
                <span>{channel.currentProgram.startTime}</span>
                <span>/</span>
                <span>{channel.currentProgram.endTime}</span>
              </div>
            </div>

            {/* Red Scrubber Bar */}
            <div
              className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative group/bar cursor-pointer"
              title={`Progresso: ${channel.currentProgram.progressPercent}%`}
            >
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-300 relative shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                style={{ width: `${channel.currentProgram.progressPercent}%` }}
              >
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover/bar:opacity-100 shadow-md" />
              </div>
            </div>
          </div>
        )}

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between pt-1">
          {/* Left Controls: Channel Nav & Play/Pause */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPreviousChannel}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
              title="Canal Anterior (Seta Cima)"
              aria-label="Canal anterior"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-950/60 transition-transform active:scale-95"
              title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
              aria-label={isPlaying ? 'Pausar transmissão' : 'Reproduzir transmissão'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={onNextChannel}
              className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
              title="Próximo Canal (Seta Baixo)"
              aria-label="Próximo canal"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={toggleMute}
                className="p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
                title={isMuted ? 'Ativar Áudio (M)' : 'Silenciar (M)'}
                aria-label={isMuted ? 'Ativar som' : 'Silenciar som'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 sm:w-24 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                aria-label="Controle de volume"
              />
            </div>
          </div>

          {/* Right Controls: Quality, Aspect Ratio, PiP, Fullscreen */}
          <div className="flex items-center gap-1.5">
            {/* Quality Selector */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[10px]">
              {(['4K', 'FHD', 'HD', 'SD'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onQualityChange(q)}
                  className={`px-2 py-1 rounded font-mono font-bold transition-colors ${
                    channel.quality === q
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`Alternar qualidade para ${q}`}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Fonte Selector (2 IPTV + 1 P2P per User Request) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSourceSelectorOpen((prev) => !prev);
                  setIsMultiViewMenuOpen(false);
                  setIsStateSelectorOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                  isSourceSelectorOpen
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/60'
                    : 'bg-zinc-900/90 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
                title="Escolher Fonte de Transmissão (2 Fontes IPTV + 1 Fonte P2P)"
                aria-label="Selecionar fonte de transmissão"
              >
                {activeSource.type === 'p2p' ? (
                  <Zap className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Server className="w-3 h-3 text-red-400" />
                )}
                <span>FONTE: {activeSource.shortLabel}</span>
                <ChevronDown
                  className={`w-3 h-3 text-zinc-400 transition-transform ${
                    isSourceSelectorOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Source Selection Popover Menu */}
              {isSourceSelectorOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2 w-80 bg-black/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                      <Server className="w-3.5 h-3.5 text-red-500" />
                      <span>Fontes de Transmissão</span>
                    </div>
                    <button
                      onClick={() => setIsSourceSelectorOpen(false)}
                      className="text-zinc-400 hover:text-white p-0.5 rounded"
                      aria-label="Fechar menu de fontes"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-400 mb-2.5 leading-relaxed">
                    Selecione a fonte de streaming (2 rotas IPTV e 1 malha P2P Mesh):
                  </p>

                  <div className="space-y-1.5">
                    {availableSources.map((src) => {
                      const isActive = src.type === activeSourceType;
                      return (
                        <button
                          key={src.id}
                          onClick={() => {
                            setActiveSourceType(src.type);
                            setIsSourceSelectorOpen(false);
                            setStateToastMessage(`Fonte alternada: ${src.name}`);
                            setTimeout(() => setStateToastMessage(null), 3000);
                          }}
                          className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-all text-xs border ${
                            isActive
                              ? 'bg-red-600/20 text-white border-red-500/60 shadow-inner'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                src.type === 'p2p'
                                  ? 'bg-cyan-500/20 text-cyan-400'
                                  : src.type === 'iptv1'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {src.type === 'p2p' ? (
                                <Zap className="w-3.5 h-3.5" />
                              ) : (
                                <Server className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-[11px] truncate">
                                  {src.name}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-1 py-0.2 rounded uppercase font-bold ${
                                    src.type === 'p2p'
                                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                  }`}
                                >
                                  {src.shortLabel}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                                {src.serverInfo || src.description}
                              </p>
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-red-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Multi-Telas / PIB Layout Selector Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMultiViewMenuOpen((prev) => !prev);
                  setIsSourceSelectorOpen(false);
                  setIsStateSelectorOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                  multiViewLayout !== 'single' || isMultiViewMenuOpen
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/60'
                    : 'bg-zinc-900/90 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
                title="Modo Multi-Telas e PIB (Picture-in-Picture)"
                aria-label="Configurar multi-telas e PIB"
              >
                {multiViewLayout === 'quad' ? (
                  <Grid2X2 className="w-3 h-3 text-red-400" />
                ) : multiViewLayout === 'dual' ? (
                  <Columns2 className="w-3 h-3 text-red-400" />
                ) : multiViewLayout === 'pip' ? (
                  <PictureInPicture2 className="w-3 h-3 text-red-400" />
                ) : (
                  <Square className="w-3 h-3 text-red-400" />
                )}
                <span className="uppercase">
                  {multiViewLayout === 'single'
                    ? '1 TELA'
                    : multiViewLayout === 'dual'
                    ? '2 TELAS'
                    : multiViewLayout === 'quad'
                    ? '4 TELAS'
                    : 'PIB'}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-zinc-400 transition-transform ${
                    isMultiViewMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Multi-Telas / PIB Popover Menu */}
              {isMultiViewMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2 w-72 bg-black/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                      <Grid2X2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Multi-Telas & PIB</span>
                    </div>
                    <button
                      onClick={() => setIsMultiViewMenuOpen(false)}
                      className="text-zinc-400 hover:text-white p-0.5 rounded"
                      aria-label="Fechar menu multi-telas"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-400 mb-2.5 leading-relaxed">
                    Assista a vários canais ao vivo simultaneamente ou ative o PIB:
                  </p>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setMultiViewLayout('single');
                        setIsMultiViewMenuOpen(false);
                      }}
                      className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all ${
                        multiViewLayout === 'single'
                          ? 'bg-red-600/20 text-white border-red-500/60'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5'
                      }`}
                    >
                      <Square className="w-4 h-4 text-red-400 shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">1 Tela</div>
                        <div className="text-[9px] text-zinc-400">Padrão</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setMultiViewLayout('dual');
                        setIsMultiViewMenuOpen(false);
                      }}
                      className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all ${
                        multiViewLayout === 'dual'
                          ? 'bg-red-600/20 text-white border-red-500/60'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5'
                      }`}
                    >
                      <Columns2 className="w-4 h-4 text-red-400 shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">2 Telas</div>
                        <div className="text-[9px] text-zinc-400">Lado a Lado</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setMultiViewLayout('quad');
                        setIsMultiViewMenuOpen(false);
                      }}
                      className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all ${
                        multiViewLayout === 'quad'
                          ? 'bg-red-600/20 text-white border-red-500/60'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5'
                      }`}
                    >
                      <Grid2X2 className="w-4 h-4 text-red-400 shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">4 Telas</div>
                        <div className="text-[9px] text-zinc-400">Mosaico 2x2</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setMultiViewLayout('pip');
                        setIsMultiViewMenuOpen(false);
                      }}
                      className={`p-2 rounded-lg text-left flex items-center gap-2 border transition-all ${
                        multiViewLayout === 'pip'
                          ? 'bg-red-600/20 text-white border-red-500/60'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5'
                      }`}
                    >
                      <PictureInPicture2 className="w-4 h-4 text-red-400 shrink-0" />
                      <div>
                        <div className="font-bold text-[11px]">PIB Flutuante</div>
                        <div className="text-[9px] text-zinc-400">Miniatura</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Regional State Filter Selector in Player */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStateSelectorOpen((prev) => !prev);
                  setIsSourceSelectorOpen(false);
                  setIsMultiViewMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                  isStateSelectorOpen
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/60'
                    : 'bg-zinc-900/90 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
                title="Filtrar ou Alternar Estado Transmitido (E)"
                aria-label="Selecionar estado transmitido"
              >
                <MapPin className="w-3 h-3 text-red-400" />
                <span>{channel.stateCode || 'ESTADO'}</span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isStateSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* State Selection Popover Menu */}
              {isStateSelectorOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full right-0 mb-2 w-72 bg-black/95 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span>Estado Transmitido</span>
                    </div>
                    <button
                      onClick={() => setIsStateSelectorOpen(false)}
                      className="text-zinc-400 hover:text-white p-0.5 rounded"
                      aria-label="Fechar menu de estados"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-400 mb-2.5 leading-relaxed">
                    Sintonize o sinal regional transmitido ou alterne a praça da emissora:
                  </p>

                  {/* Brazilian State Quick Switcher Pills */}
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {BRAZIL_STATES.map((st) => {
                      const isActive = (channel.stateCode || 'NACIONAL') === st.code;
                      return (
                        <button
                          key={st.code}
                          onClick={() => handleSelectRegionalState(st.code)}
                          className={`py-1 px-1.5 rounded-lg text-center font-mono text-[10px] font-bold transition-all ${
                            isActive
                              ? 'bg-red-600 text-white shadow-sm border border-red-500'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'
                          }`}
                          title={st.name}
                        >
                          {st.code}
                        </button>
                      );
                    })}
                  </div>

                  {/* Available Network Sibling Affiliates */}
                  {stateVariants.length > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                        Afiliadas da Rede {networkFamily}:
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
                        {stateVariants.map((variant) => {
                          const isCurrent = variant.id === channel.id;
                          return (
                            <button
                              key={variant.id}
                              onClick={() => {
                                if (onSelectChannel) {
                                  onSelectChannel(variant);
                                  setStateToastMessage(`Sintonizado: ${variant.name}`);
                                  setTimeout(() => setStateToastMessage(null), 3000);
                                  setIsStateSelectorOpen(false);
                                }
                              }}
                              className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between transition-colors text-[11px] ${
                                isCurrent
                                  ? 'bg-red-600/20 text-white border border-red-500/50'
                                  : 'hover:bg-white/5 text-zinc-300 hover:text-white'
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-1.5 font-bold truncate">
                                  <span className="text-[9px] font-mono px-1 rounded bg-black/60 border border-white/10 text-zinc-300">
                                    {variant.stateCode}
                                  </span>
                                  <span className="truncate">{variant.name}</span>
                                </div>
                                <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                                  {variant.currentProgram?.title || variant.subtitle}
                                </p>
                              </div>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* In-Player EPG Toggle Button */}
            <button
              onClick={() => setIsInPlayerEpgOpen((prev) => !prev)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                isInPlayerEpgOpen
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/60'
                  : 'bg-zinc-900/90 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
              }`}
              title="Guia Eletrônico de Programação no Player (G)"
              aria-label="Abrir guia EPG no player"
            >
              <Calendar className="w-3 h-3 text-red-400" />
              <span className="hidden sm:inline">GUIA</span>
              <span>EPG</span>
            </button>

            {/* In-App Fullscreen / Expand Toggle */}
            {onToggleExpandedPlayer && (
              <button
                onClick={onToggleExpandedPlayer}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  isExpandedPlayer
                    ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950/60'
                    : 'bg-zinc-900/90 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
                }`}
                title={isExpandedPlayer ? 'Voltar para Lista de Canais' : 'Expandir Player em Tela Cheia'}
                aria-label="Expandir ou recolher player"
              >
                {isExpandedPlayer ? (
                  <>
                    <ArrowLeft className="w-3 h-3 text-white" />
                    <span>CANAIS</span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-3 h-3 text-red-400" />
                    <span className="hidden sm:inline">EXPANDIR</span>
                  </>
                )}
              </button>
            )}

            {/* Aspect Ratio Switcher */}
            <button
              onClick={() => {
                if (aspectRatio === 'contain') setAspectRatio('cover');
                else if (aspectRatio === 'cover') setAspectRatio('fill');
                else setAspectRatio('contain');
              }}
              className="px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 border border-zinc-800 rounded-lg transition-colors hidden sm:block"
              title="Alternar Proporção da Tela"
            >
              {aspectRatio === 'contain' ? '16:9' : aspectRatio === 'cover' ? 'Preencher' : 'Esticar'}
            </button>

            {/* Browser Native PiP */}
            <button
              onClick={togglePiP}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors hidden sm:block"
              title="Mini-Player Picture-in-Picture do Navegador"
              aria-label="Picture-in-picture do navegador"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>

            {/* Browser Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
              title={isFullscreen ? 'Sair da Tela Cheia do Navegador (F)' : 'Tela Cheia do Navegador (F)'}
              aria-label={isFullscreen ? 'Sair de tela cheia' : 'Entrar em tela cheia'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Floating State Switch Toast Notification */}
      {stateToastMessage && (
        <div className="absolute top-20 right-6 z-50 bg-black/90 backdrop-blur-md border border-red-500/60 rounded-xl px-4 py-2.5 text-xs text-white font-bold flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <MapPin className="w-4 h-4 text-red-500" />
          <span>{stateToastMessage}</span>
        </div>
      )}

      {/* Embedded In-Player EPG Modal / Translucent Overlay (Directly on top of video) */}
      {isInPlayerEpgOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-4 md:inset-8 z-40 bg-black/85 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          aria-label="Guia EPG no Reprodutor"
        >
          {/* EPG Overlay Header */}
          <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-white tracking-wide">
                    GUIA ELETRÔNICO DE PROGRAMAÇÃO (EPG)
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">
                    AO VIVO
                  </span>
                  {channel.stateCode && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/15 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-red-400" />
                      {channel.stateName || channel.stateCode}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  #{channel.number} {channel.name} • Sinal em {channel.quality} • {channel.streamType === 'p2p' ? 'P2P Mesh Anti-Trava' : 'IPTV CDN'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsInPlayerEpgOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors border border-white/10"
              title="Fechar Guia EPG (Esc)"
              aria-label="Fechar Guia EPG"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* EPG Content Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-6">
            {/* Currently Playing Card */}
            {channel.currentProgram && (
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-red-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping inline-block" />
                    <span className="text-xs font-black text-red-500 uppercase tracking-wider">
                      EM EXIBIÇÃO AGORA
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    <span>{channel.currentProgram.startTime} - {channel.currentProgram.endTime}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white tracking-wide">
                      {channel.currentProgram.title}
                    </h3>
                    {channel.currentProgram.rating && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                        {channel.currentProgram.rating}
                      </span>
                    )}
                  </div>
                  {channel.currentProgram.episode && (
                    <p className="text-xs text-red-400 font-semibold mt-0.5">
                      {channel.currentProgram.episode}
                    </p>
                  )}
                  <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                    {channel.currentProgram.synopsis}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                    <span>Início: {channel.currentProgram.startTime}</span>
                    <span className="text-red-400 font-bold">{channel.currentProgram.progressPercent}% Concluído</span>
                    <span>Término: {channel.currentProgram.endTime}</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full transition-all shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                      style={{ width: `${channel.currentProgram.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Regional Affiliates Selector Section inside EPG */}
            {stateVariants.length > 1 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    <span>Sinais Regionais por Estado ({networkFamily})</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Clique para trocar de praça instantaneamente
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {stateVariants.map((variant) => {
                    const isCurrent = variant.id === channel.id;
                    return (
                      <div
                        key={variant.id}
                        onClick={() => {
                          if (onSelectChannel) {
                            onSelectChannel(variant);
                            setStateToastMessage(`Sintonizado: ${variant.name}`);
                            setTimeout(() => setStateToastMessage(null), 3000);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-red-600/25 border-red-500 shadow-md'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-black/60 text-white border border-white/10">
                            {variant.stateCode}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                              <Check className="w-3 h-3" /> ATIVO
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white truncate">{variant.name}</h4>
                        <p className="text-[10px] text-zinc-400 line-clamp-1 mt-1">
                          {variant.currentProgram?.title || variant.subtitle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Programs Timeline */}
            <div className="space-y-2.5">
              <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Grade Completa de Programação Futura</span>
              </span>

              {channel.upcomingPrograms && channel.upcomingPrograms.length > 0 ? (
                <div className="space-y-2">
                  {channel.upcomingPrograms.map((prog) => (
                    <div
                      key={prog.id}
                      className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors flex items-start gap-3"
                    >
                      <div className="text-center font-mono shrink-0 w-14 py-1 px-1.5 rounded-lg bg-black/40 border border-white/10">
                        <span className="text-xs font-bold text-white block">{prog.startTime}</span>
                        <span className="text-[9px] text-zinc-400 block">{prog.endTime}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white tracking-wide">{prog.title}</h4>
                          {prog.rating && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-800 text-zinc-300">
                              {prog.rating}
                            </span>
                          )}
                        </div>
                        {prog.episode && (
                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{prog.episode}</p>
                        )}
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{prog.synopsis}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic py-4 text-center">
                  Nenhum programa adicional cadastrado para hoje nesta emissora.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

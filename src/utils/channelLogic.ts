import type {
  CategoryId,
  Channel,
  ChannelQuality,
  StreamTypeFilter,
  StateFilter,
  ChannelStateCode,
  StreamSource,
  StreamSourceType,
} from '../types/iptv.ts';

export function filterChannels(
  channels: Channel[],
  category: CategoryId,
  searchQuery: string = '',
  qualityFilter: ChannelQuality | 'ALL' = 'ALL',
  recentIds: string[] = [],
  favoriteIds: string[] = [],
  streamTypeFilter: StreamTypeFilter = 'ALL',
  stateFilter: StateFilter = 'ALL'
): Channel[] {
  let filtered = [...channels];

  // Category filter
  if (category === 'recentes') {
    filtered = recentIds
      .map(id => channels.find(c => c.id === id))
      .filter((c): c is Channel => Boolean(c));
  } else if (category === 'p2p') {
    filtered = filtered.filter(c => c.streamType === 'p2p');
  } else if (category === 'uhd_4k') {
    filtered = filtered.filter(c => c.category === 'uhd_4k' || c.quality === '4K');
  } else if (category !== 'todos') {
    filtered = filtered.filter(c => c.category === category);
  }

  // Stream Type filter (P2P vs IPTV)
  if (streamTypeFilter === 'P2P') {
    filtered = filtered.filter(c => c.streamType === 'p2p');
  } else if (streamTypeFilter === 'IPTV') {
    filtered = filtered.filter(c => c.streamType !== 'p2p');
  }

  // State / Regional filter (RJ, SP, MG, RS, BA, DF, etc.)
  if (stateFilter !== 'ALL') {
    filtered = filtered.filter(c => c.stateCode === stateFilter || c.stateCode === 'NACIONAL');
  }

  // Quality filter
  if (qualityFilter !== 'ALL') {
    filtered = filtered.filter(c => c.quality === qualityFilter);
  }

  // Search filter
  const query = searchQuery.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(c => {
      const matchName = c.name.toLowerCase().includes(query);
      const matchSub = c.subtitle.toLowerCase().includes(query);
      const matchState = (c.stateName || '').toLowerCase().includes(query) || (c.stateCode || '').toLowerCase().includes(query);
      const matchShow = c.currentProgram?.title.toLowerCase().includes(query);
      const matchEp = c.currentProgram?.episode?.toLowerCase().includes(query);
      const matchNum = c.number.toString().includes(query);
      return matchName || matchSub || matchState || matchShow || matchEp || matchNum;
    });
  }

  return filtered;
}

export function extractNetworkFamily(channelName: string): string {
  const upper = channelName.toUpperCase();
  if (upper.includes('GLOBO')) return 'GLOBO';
  if (upper.includes('SBT')) return 'SBT';
  if (upper.includes('RECORD')) return 'RECORD';
  if (upper.includes('BAND')) return 'BAND';
  if (upper.includes('TNT')) return 'TNT';
  if (upper.includes('ESPN')) return 'ESPN';
  if (upper.includes('SONY')) return 'SONY';
  return channelName.split(' ')[0] || channelName;
}

export function getChannelStateVariants(channels: Channel[], currentChannel: Channel): Channel[] {
  const family = extractNetworkFamily(currentChannel.name);
  return channels.filter(c => extractNetworkFamily(c.name) === family && Boolean(c.stateCode));
}

export function switchChannelState(
  channels: Channel[],
  currentChannel: Channel,
  targetState: ChannelStateCode
): Channel | null {
  const family = extractNetworkFamily(currentChannel.name);
  const match = channels.find(
    c => extractNetworkFamily(c.name) === family && c.stateCode === targetState
  );
  if (match) return match;
  // If no direct sibling in that network, return first channel with that state
  const stateMatch = channels.find(c => c.stateCode === targetState);
  return stateMatch || null;
}

export function getNextChannel(channels: Channel[], currentId: string): Channel | null {
  if (channels.length === 0) return null;
  const currentIndex = channels.findIndex(c => c.id === currentId);
  if (currentIndex === -1) return channels[0];
  const nextIndex = (currentIndex + 1) % channels.length;
  return channels[nextIndex];
}

export function getPreviousChannel(channels: Channel[], currentId: string): Channel | null {
  if (channels.length === 0) return null;
  const currentIndex = channels.findIndex(c => c.id === currentId);
  if (currentIndex === -1) return channels[0];
  const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
  return channels[prevIndex];
}

export function calculateProgressMinutes(startTime: string, endTime: string): { totalMinutes: number; elapsedMinutes: number } {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startTotal = (startH || 0) * 60 + (startM || 0);
  let endTotal = (endH || 0) * 60 + (endM || 0);
  if (endTotal < startTotal) {
    endTotal += 24 * 60; // passes midnight
  }
  const totalMinutes = Math.max(1, endTotal - startTotal);
  return { totalMinutes, elapsedMinutes: Math.round(totalMinutes * 0.5) };
}

export function validateStreamUrl(url: string): { isValid: boolean; error?: string; isHls: boolean } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Por favor, insira uma URL válida.', isHls: false };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'A URL deve usar o protocolo http ou https.', isHls: false };
    }
    const isHls = trimmed.toLowerCase().includes('.m3u8');
    return { isValid: true, isHls };
  } catch {
    return { isValid: false, error: 'Formato de URL inválido.', isHls: false };
  }
}

export function getChannelSources(channel: Channel): StreamSource[] {
  if (channel.sources && channel.sources.length >= 3) {
    return channel.sources;
  }

  const baseVideo = channel.videoUrl || '/videos/test-series.mp4';
  const backupVideo =
    baseVideo === '/videos/test-series.mp4'
      ? '/videos/test-action.mp4'
      : baseVideo === '/videos/test-action.mp4'
      ? '/videos/test-smpte.mp4'
      : '/videos/sample-nature.mp4';

  const p2pVideo =
    baseVideo === '/videos/test-smpte.mp4'
      ? '/videos/test-series.mp4'
      : baseVideo;

  return [
    {
      id: `${channel.id}-iptv1`,
      type: 'iptv1',
      name: 'Fonte IPTV 1 (CDN Principal)',
      shortLabel: 'IPTV 1',
      serverInfo: 'Edge CDN BR-SP01 • Alta Estabilidade',
      videoUrl: baseVideo,
      quality: channel.quality,
      status: 'otimo',
    },
    {
      id: `${channel.id}-iptv2`,
      type: 'iptv2',
      name: 'Fonte IPTV 2 (CDN Backup)',
      shortLabel: 'IPTV 2',
      serverInfo: 'Cloudflare BR-RJ02 • Servidor Secundário',
      videoUrl: backupVideo,
      quality: channel.quality,
      status: 'estavel',
    },
    {
      id: `${channel.id}-p2p`,
      type: 'p2p',
      name: 'Fonte P2P Mesh (Anti-Trava)',
      shortLabel: 'P2P MESH',
      serverInfo: `Malha P2P Descentralizada • ${channel.peersCount || 94} Peers`,
      videoUrl: p2pVideo,
      quality: channel.quality,
      peersCount: channel.peersCount || 94,
      status: 'otimo',
    },
  ];
}

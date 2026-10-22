export type ChannelQuality = '4K' | 'FHD' | 'HD' | 'SD';

export type StreamProtocol = 'p2p' | 'iptv';

export type StreamTypeFilter = 'ALL' | 'P2P' | 'IPTV';

export type StreamSourceType = 'iptv1' | 'iptv2' | 'p2p';

export interface StreamSource {
  id: string;
  type: StreamSourceType;
  name: string;
  shortLabel: string;
  serverInfo: string;
  description?: string;
  videoUrl: string;
  quality: ChannelQuality;
  isHls?: boolean;
  peersCount?: number;
  status: 'online' | 'estavel' | 'otimo';
}

export type MultiViewLayout = 'single' | 'dual' | 'quad' | 'pip';

export type ChannelStateCode = 'SP' | 'RJ' | 'MG' | 'RS' | 'BA' | 'DF' | 'NACIONAL';

export type StateFilter = 'ALL' | ChannelStateCode;

export type CategoryId =
  | 'todos'
  | 'p2p'
  | 'recentes'
  | 'esportes'
  | 'filmes'
  | 'entretenimento'
  | 'noticias'
  | 'infantil'
  | 'documentarios'
  | 'musica'
  | 'religiosos'
  | 'tv_aberta'
  | 'uhd_4k';

export interface EpgProgram {
  id: string;
  title: string;
  episode?: string;
  synopsis: string;
  startTime: string; // e.g. "19:30"
  endTime: string;   // e.g. "20:45"
  progressPercent: number; // 0 - 100
  rating?: string;   // "12", "14", "Livre", "16"
}

export interface Channel {
  id: string;
  name: string;
  number: number;
  category: CategoryId;
  quality: ChannelQuality;
  streamType?: StreamProtocol; // 'p2p' or 'iptv'
  peersCount?: number;         // active P2P mesh peers
  stateCode?: ChannelStateCode; // 'RJ', 'SP', 'MG', 'RS', 'BA', 'DF', 'NACIONAL'
  stateName?: string;          // 'Rio de Janeiro', 'São Paulo', 'Minas Gerais', etc.
  subtitle: string;
  logoText: string;
  logoBg?: string;
  videoUrl: string;
  sources?: StreamSource[];
  isHls?: boolean;
  aspectRatio?: string;
  currentProgram: EpgProgram;
  upcomingPrograms: EpgProgram[];
}

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  iconName: string;
}

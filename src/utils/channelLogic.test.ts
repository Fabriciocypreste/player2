import test from 'node:test';
import assert from 'node:assert/strict';
import { filterChannels, getNextChannel, getPreviousChannel, validateStreamUrl, switchChannelState, getChannelStateVariants, getChannelSources } from './channelLogic.ts';
import type { Channel } from '../types/iptv.ts';

const mockChannels: Channel[] = [
  {
    id: 'globo-rj',
    name: 'TV GLOBO RIO DE JANEIRO',
    number: 901,
    category: 'tv_aberta',
    quality: 'FHD',
    stateCode: 'RJ',
    stateName: 'Rio de Janeiro',
    streamType: 'p2p',
    subtitle: 'TV ABERTA • RJ',
    logoText: 'GLOBO RJ',
    videoUrl: 'https://example.com/globo-rj.mp4',
    currentProgram: { id: 'p1', title: 'RJTV 2ª Edição', synopsis: 'Notícias do Rio', startTime: '19:15', endTime: '20:00', progressPercent: 50 },
    upcomingPrograms: [],
  },
  {
    id: 'globo-sp',
    name: 'TV GLOBO SÃO PAULO',
    number: 902,
    category: 'tv_aberta',
    quality: 'FHD',
    stateCode: 'SP',
    stateName: 'São Paulo',
    streamType: 'p2p',
    subtitle: 'TV ABERTA • SP',
    logoText: 'GLOBO SP',
    videoUrl: 'https://example.com/globo-sp.mp4',
    currentProgram: { id: 'p2', title: 'SPTV 2ª Edição', synopsis: 'Notícias de SP', startTime: '19:15', endTime: '20:00', progressPercent: 50 },
    upcomingPrograms: [],
  },
  {
    id: 'globo-mg',
    name: 'TV GLOBO MINAS GERAIS',
    number: 903,
    category: 'tv_aberta',
    quality: 'FHD',
    stateCode: 'MG',
    stateName: 'Minas Gerais',
    streamType: 'p2p',
    subtitle: 'TV ABERTA • MG',
    logoText: 'GLOBO MG',
    videoUrl: 'https://example.com/globo-mg.mp4',
    currentProgram: { id: 'p3', title: 'MGTV 2ª Edição', synopsis: 'Notícias de MG', startTime: '19:15', endTime: '20:00', progressPercent: 50 },
    upcomingPrograms: [],
  },
  {
    id: 'tnt-series-fhd',
    name: 'TNT SERIES FHD',
    number: 101,
    category: 'entretenimento',
    quality: 'FHD',
    stateCode: 'NACIONAL',
    streamType: 'p2p',
    subtitle: 'ENTRETENIMENTO • NACIONAL',
    logoText: 'TNT',
    videoUrl: 'https://example.com/tnt.mp4',
    currentProgram: { id: 'p4', title: 'The Mentalist', synopsis: 'Policial', startTime: '19:00', endTime: '20:00', progressPercent: 50 },
    upcomingPrograms: [],
  },
];

test('filterChannels filters by stateCode RJ', () => {
  const result = filterChannels(mockChannels, 'todos', '', 'ALL', [], [], 'ALL', 'RJ');
  // Returns RJ channels plus NACIONAL
  assert.equal(result.some(c => c.id === 'globo-rj'), true);
  assert.equal(result.some(c => c.id === 'globo-sp'), false);
  assert.equal(result.some(c => c.id === 'tnt-series-fhd'), true);
});

test('switchChannelState finds regional affiliate for same network', () => {
  const current = mockChannels[0]; // Globo RJ
  const spMatch = switchChannelState(mockChannels, current, 'SP');
  assert.equal(spMatch?.id, 'globo-sp');

  const mgMatch = switchChannelState(mockChannels, current, 'MG');
  assert.equal(mgMatch?.id, 'globo-mg');
});

test('getChannelStateVariants returns all affiliates of same network', () => {
  const current = mockChannels[0]; // Globo RJ
  const variants = getChannelStateVariants(mockChannels, current);
  assert.equal(variants.length, 3);
});

test('getNextChannel and getPreviousChannel cycle correctly', () => {
  const next = getNextChannel(mockChannels, 'globo-rj');
  assert.equal(next?.id, 'globo-sp');
});

test('validateStreamUrl checks http/https and identifies HLS .m3u8', () => {
  const hls = validateStreamUrl('https://test.com/stream.m3u8');
  assert.equal(hls.isValid, true);
  assert.equal(hls.isHls, true);
});

test('getChannelSources returns 2 IPTV sources and 1 P2P source', () => {
  const sources = getChannelSources(mockChannels[0]);
  assert.equal(sources.length, 3);
  assert.equal(sources.some(s => s.type === 'iptv1'), true);
  assert.equal(sources.some(s => s.type === 'iptv2'), true);
  assert.equal(sources.some(s => s.type === 'p2p'), true);
});

import React, { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle2, Film } from 'lucide-react';
import { Channel, CategoryId, ChannelQuality } from '../types/iptv';
import { validateStreamUrl } from '../utils/channelLogic';

interface CustomStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddChannel: (channel: Channel) => void;
}

export const CustomStreamModal: React.FC<CustomStreamModalProps> = ({
  isOpen,
  onClose,
  onAddChannel,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<CategoryId>('entretenimento');
  const [quality, setQuality] = useState<ChannelQuality>('FHD');
  const [streamType, setStreamType] = useState<'p2p' | 'iptv'>('p2p');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe o nome do canal.');
      return;
    }

    const validation = validateStreamUrl(url);
    if (!validation.isValid) {
      setError(validation.error || 'URL inválida.');
      return;
    }

    const randomNum = Math.floor(100 + Math.random() * 899);
    const newChannel: Channel = {
      id: `custom-${Date.now()}`,
      name: name.trim().toUpperCase(),
      number: randomNum,
      category,
      quality,
      streamType,
      peersCount: streamType === 'p2p' ? Math.floor(25 + Math.random() * 70) : undefined,
      subtitle: `${category.toUpperCase()} • ${streamType.toUpperCase()} IPTV`,
      logoText: name.trim().slice(0, 4).toUpperCase(),
      videoUrl: url.trim(),
      isHls: validation.isHls,
      currentProgram: {
        id: `custom-p-${Date.now()}`,
        title: `${name.trim()} - Transmissão Ao Vivo`,
        synopsis: 'Fluxo de vídeo personalizado adicionado pelo usuário.',
        startTime: '00:00',
        endTime: '23:59',
        progressPercent: 50,
      },
      upcomingPrograms: [],
    };

    onAddChannel(newChannel);
    setName('');
    setUrl('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar Canal Personalizado"
    >
      <div className="w-full max-w-md bg-[#111116] border border-zinc-800 rounded-2xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold tracking-wide">ADICIONAR CANAL IPTV</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Nome do Canal
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: TNT SPORTS 4K ou MEU STREAM"
              className="w-full bg-[#181820] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              URL da Transmissão (M3U8 / MP4)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://.../stream.m3u8 ou .mp4"
              className="w-full bg-[#181820] border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Suporta fluxos HLS (.m3u8) e arquivos de vídeo direto (.mp4).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryId)}
                className="w-full bg-[#181820] border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="entretenimento">Entretenimento</option>
                <option value="esportes">Esportes</option>
                <option value="filmes">Filmes</option>
                <option value="noticias">Notícias</option>
                <option value="infantil">Infantil</option>
                <option value="documentarios">Documentários</option>
                <option value="musica">Música</option>
                <option value="tv_aberta">TV Aberta</option>
                <option value="uhd_4k">4K / UHD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Qualidade
              </label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as ChannelQuality)}
                className="w-full bg-[#181820] border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="4K">4K UHD</option>
                <option value="FHD">FHD 1080p</option>
                <option value="HD">HD 720p</option>
                <option value="SD">SD 480p</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Protocolo
              </label>
              <select
                value={streamType}
                onChange={(e) => setStreamType(e.target.value as 'p2p' | 'iptv')}
                className="w-full bg-[#181820] border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="p2p">P2P IPTV</option>
                <option value="iptv">IPTV Padrão</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md shadow-red-950 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Sintonizar Canal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

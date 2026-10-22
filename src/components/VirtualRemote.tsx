import React, { useState } from 'react';
import {
  Power,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Volume1,
  Calendar,
  Info,
  Maximize2,
  X,
  Tv,
} from 'lucide-react';
import { Channel } from '../types/iptv';

interface VirtualRemoteProps {
  isOpen: boolean;
  onClose: () => void;
  onNextChannel: () => void;
  onPreviousChannel: () => void;
  onSelectChannelByNumber: (num: number) => void;
  onToggleMute: () => void;
  onOpenEpg: () => void;
  currentChannel: Channel;
}

export const VirtualRemote: React.FC<VirtualRemoteProps> = ({
  isOpen,
  onClose,
  onNextChannel,
  onPreviousChannel,
  onSelectChannelByNumber,
  onToggleMute,
  onOpenEpg,
  currentChannel,
}) => {
  const [dialDigits, setDialDigits] = useState<string>('');
  const [dialTimeout, setDialTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  if (!isOpen) return null;

  const handleDigitClick = (digit: number) => {
    const newDigits = dialDigits + digit.toString();
    setDialDigits(newDigits);

    if (dialTimeout) clearTimeout(dialTimeout);

    const timer = setTimeout(() => {
      const channelNum = parseInt(newDigits, 10);
      if (!isNaN(channelNum)) {
        onSelectChannelByNumber(channelNum);
      }
      setDialDigits('');
    }, 1200);

    setDialTimeout(timer);
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-72 glass-panel border border-red-500/40 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(239,68,68,0.25)] text-white select-none backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-200"
      role="dialog"
      aria-label="Controle Remoto Virtual"
    >
      {/* Remote Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-xs font-black tracking-widest text-zinc-300">CONTROLE IPTV</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Fechar controle remoto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Screen / Dial indicator */}
      <div className="my-3 bg-black/80 border border-zinc-800 rounded-xl p-2.5 text-center">
        <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">
          Canal Atual: #{currentChannel.number}
        </div>
        <div className="text-sm font-bold text-red-500 font-mono mt-0.5 truncate">
          {dialDigits ? `Sintonizando: #${dialDigits}...` : currentChannel.name}
        </div>
      </div>

      {/* Power & Function Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-950 transition-colors"
          title="Desligar / Fechar"
          aria-label="Desligar controle"
        >
          <Power className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors"
          title="Mudo"
          aria-label="Silenciar som"
        >
          <VolumeX className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenEpg}
          className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition-colors"
          title="Guia EPG"
          aria-label="Abrir guia de canais"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* D-Pad Navigation */}
      <div className="my-3 flex flex-col items-center justify-center">
        <div className="w-40 h-40 rounded-full bg-[#181820] border-2 border-zinc-800 relative flex items-center justify-center shadow-inner">
          {/* UP button */}
          <button
            onClick={onPreviousChannel}
            className="absolute top-1 p-2 text-zinc-400 hover:text-red-500 active:scale-95 transition-all"
            title="Canal Anterior (CH+)"
            aria-label="Canal anterior"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          {/* DOWN button */}
          <button
            onClick={onNextChannel}
            className="absolute bottom-1 p-2 text-zinc-400 hover:text-red-500 active:scale-95 transition-all"
            title="Próximo Canal (CH-)"
            aria-label="Próximo canal"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          {/* LEFT button */}
          <button
            onClick={onPreviousChannel}
            className="absolute left-1 p-2 text-zinc-400 hover:text-red-500 active:scale-95 transition-all"
            title="Voltar"
            aria-label="Voltar canal"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          {/* RIGHT button */}
          <button
            onClick={onNextChannel}
            className="absolute right-1 p-2 text-zinc-400 hover:text-red-500 active:scale-95 transition-all"
            title="Avançar"
            aria-label="Avançar canal"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          {/* OK Center */}
          <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-red-950/80 cursor-pointer active:scale-90 transition-transform">
            OK
          </div>
        </div>
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2 my-2 text-sm font-mono font-bold">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleDigitClick(num)}
            className="py-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800/80 hover:border-red-500/50 hover:text-white active:scale-95 transition-all shadow-xs"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => setDialDigits('')}
          className="py-2.5 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          Limpar
        </button>
        <button
          onClick={() => handleDigitClick(0)}
          className="py-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800/80 hover:border-red-500/50 hover:text-white active:scale-95 transition-all shadow-xs"
        >
          0
        </button>
        <button
          onClick={() => {
            if (dialDigits) {
              const channelNum = parseInt(dialDigits, 10);
              if (!isNaN(channelNum)) onSelectChannelByNumber(channelNum);
              setDialDigits('');
            }
          }}
          className="py-2.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800/50 text-xs font-sans font-bold transition-colors"
        >
          Ir
        </button>
      </div>

      {/* IPTV Color Buttons */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800">
        <button
          onClick={onOpenEpg}
          className="h-3 rounded-full bg-red-600 hover:opacity-80 transition-opacity"
          title="Vermelho: Guia EPG"
          aria-label="Botão vermelho: Guia EPG"
        />
        <button
          onClick={onNextChannel}
          className="h-3 rounded-full bg-green-500 hover:opacity-80 transition-opacity"
          title="Verde: Próximo Canal"
          aria-label="Botão verde: Próximo canal"
        />
        <button
          onClick={() => handleDigitClick(1)}
          className="h-3 rounded-full bg-yellow-400 hover:opacity-80 transition-opacity"
          title="Amarelo: Canal 1"
          aria-label="Botão amarelo: Canal 1"
        />
        <button
          onClick={onToggleMute}
          className="h-3 rounded-full bg-blue-500 hover:opacity-80 transition-opacity"
          title="Azul: Silenciar"
          aria-label="Botão azul: Silenciar som"
        />
      </div>
    </div>
  );
};

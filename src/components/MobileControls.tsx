import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, ShoppingCart, RefreshCw, Zap } from 'lucide-react';

interface MobileControlsProps {
  onAction: (key: string) => void;
  onHold: (key: string, isDown: boolean) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onAction, onHold }) => {
  const bindHold = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onHold(key, true);
    },
    onPointerUp: (e: React.PointerEvent) => {
      onHold(key, false);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      onHold(key, false);
    }
  });

  return (
    <div className="absolute inset-x-0 bottom-4 pointer-events-none flex justify-between px-6 z-40 lg:hidden">
      {/* D-Pad / Movement */}
      <div className="grid grid-cols-3 gap-2 w-36 h-36 pointer-events-auto">
        <div />
        <button
          {...bindHold('w')}
          className="bg-[#121c24]/80 border border-[#23423b] rounded-xl flex items-center justify-center text-[#f2c45d] active:bg-[#1f4a3e]"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        <div />
        <button
          {...bindHold('a')}
          className="bg-[#121c24]/80 border border-[#23423b] rounded-xl flex items-center justify-center text-[#f2c45d] active:bg-[#1f4a3e]"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          {...bindHold('s')}
          className="bg-[#121c24]/80 border border-[#23423b] rounded-xl flex items-center justify-center text-[#f2c45d] active:bg-[#1f4a3e]"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
        <button
          {...bindHold('d')}
          className="bg-[#121c24]/80 border border-[#23423b] rounded-xl flex items-center justify-center text-[#f2c45d] active:bg-[#1f4a3e]"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-end gap-3 pointer-events-auto">
        <button
          {...bindHold('shift')}
          className="w-14 h-14 bg-[#121c24]/80 border border-[#23423b] rounded-full flex items-center justify-center text-[#469c8b] font-bold text-xs active:bg-[#1f4a3e]"
        >
          RUN
        </button>
        <button
          onClick={() => onAction('u')}
          className="w-14 h-14 bg-[#121c24]/80 border border-[#23423b] rounded-full flex items-center justify-center text-[#f2c45d] font-bold text-xs active:bg-[#1f4a3e]"
        >
          UPG
        </button>
        <button
          onClick={() => onAction('r')}
          className="w-14 h-14 bg-[#121c24]/80 border border-[#23423b] rounded-full flex items-center justify-center text-emerald-400 font-bold text-xs active:bg-[#1f4a3e]"
        >
          REST
        </button>
        <button
          onClick={() => onAction('e')}
          className="w-18 h-18 bg-gradient-to-r from-[#f2c45d] to-[#d4a538] rounded-full flex items-center justify-center text-[#121c24] font-extrabold text-sm shadow-lg active:scale-95"
        >
          ACTION
        </button>
      </div>
    </div>
  );
};

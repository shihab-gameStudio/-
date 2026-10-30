import React from 'react';
import { GameState } from '../types/game';
import { Volume2, VolumeX, Camera, Pause } from 'lucide-react';

interface GameHUDProps {
  state: GameState;
  noticeText: string;
  onCameraToggle: () => void;
  onPause: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state,
  noticeText,
  onCameraToggle,
  onPause,
  muted,
  onToggleMute
}) => {
  const isVendor = state.role === 'vendor';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-40">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Stats Cluster */}
        <div className="bg-[#121c24]/90 backdrop-blur-md border border-[#23423b] rounded-xl p-3 shadow-xl flex items-center gap-6 text-slate-100 pointer-events-auto">
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-medium">
              {isVendor ? 'Wallet' : 'Duty Cash'}
            </div>
            <div className="text-xl font-extrabold text-[#f2c45d] tabular-nums">
              ৳{isVendor ? state.cash : state.policeCash}
            </div>
          </div>
          <div className="w-[1px] h-8 bg-slate-700" />
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-medium">
              {isVendor ? 'Cart Level' : 'Police Rank'}
            </div>
            <div className="text-xl font-extrabold text-[#469c8b] tabular-nums">
              {isVendor ? String(state.level).padStart(2, '0') : ['', 'CONST.', 'ASI', 'SI', 'INSP.'][state.rank]}
            </div>
          </div>
          <div className="w-[1px] h-8 bg-slate-700" />
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-medium">
              {isVendor ? 'Inventory' : 'Integrity'}
            </div>
            <div className="text-xl font-extrabold text-slate-200 tabular-nums">
              {isVendor ? `${state.stock}/${state.cap}` : `${state.integrity}%`}
            </div>
          </div>
          <div className="w-[1px] h-8 bg-slate-700" />
          <div>
            <div className="text-[10px] uppercase text-slate-400 font-medium">
              {isVendor ? 'Sales' : 'Arrests'}
            </div>
            <div className="text-xl font-extrabold text-emerald-400 tabular-nums">
              {isVendor ? state.sales : state.arrests}
            </div>
          </div>
        </div>

        {/* Role & Utility Buttons */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-[#121c24]/90 backdrop-blur-md border border-[#23423b] px-4 py-2 rounded-xl text-xs font-bold text-[#f2c45d]">
            {isVendor ? '🛒 VENDOR · বাবাজি' : '👮 POLICE · বাবাজি'}
          </div>

          <button
            onClick={onToggleMute}
            className="w-10 h-10 bg-[#121c24]/90 backdrop-blur-md border border-[#23423b] rounded-xl flex items-center justify-center hover:bg-[#1f4a3e]/40 text-slate-300 transition-colors cursor-pointer"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onCameraToggle}
            className="w-10 h-10 bg-[#121c24]/90 backdrop-blur-md border border-[#23423b] rounded-xl flex items-center justify-center hover:bg-[#1f4a3e]/40 text-slate-300 transition-colors cursor-pointer"
            title="Toggle Camera Zoom"
          >
            <Camera className="w-5 h-5" />
          </button>

          <button
            onClick={onPause}
            className="w-10 h-10 bg-[#121c24]/90 backdrop-blur-md border border-[#23423b] rounded-xl flex items-center justify-center hover:bg-[#1f4a3e]/40 text-slate-300 transition-colors cursor-pointer"
            title="Pause Game"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Notice / Ticker */}
      <div className="self-center pointer-events-none text-center">
        {noticeText && (
          <div className="bg-[#16222b]/90 backdrop-blur-md border border-[#30705f] text-[#f9df85] px-6 py-2 rounded-full text-xs font-semibold shadow-xl animate-fade-in">
            {noticeText}
          </div>
        )}
      </div>

      {/* Bottom Bar: Hints & Wanted / Progress */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-auto">
        <div className="bg-[#121c24]/90 backdrop-blur-md border border-[#23423b] px-4 py-3 rounded-xl shadow-xl flex items-center gap-4">
          <div>
            <div className="text-[11px] font-bold text-[#f2c45d]">
              {isVendor
                ? state.sale
                  ? `Selling ${state.sale.product} · ৳${state.sale.price}`
                  : state.alert
                  ? '🚨 POLICE CHASE — RUN!'
                  : state.cooldown > 0
                  ? `Cooldown ${Math.ceil(state.cooldown)}s`
                  : 'Earn, escape, upgrade.'
                : 'Patrol, pursue, decide.'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isVendor
                ? state.sale
                  ? 'Stay near the customer until sale finishes.'
                  : `W/S drive · A/D steer · Drag camera · C view · E sell · Shift run · U upgrade (৳${130 + state.level * 85}) · R restock${
                      state.level >= 10 ? ' · B big stall' : ''
                    }`
                : 'W/S move · A/D turn · Drag to look · C camera · Shift run · E capture'}
            </div>
          </div>
          <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              id="progressbar"
              className="h-full bg-gradient-to-r from-[#469c8b] to-[#f2c45d] transition-all duration-200"
              style={{
                width: isVendor
                  ? state.sale
                    ? `${Math.min(100, 100 * ((state.time - state.sale.start) / state.sale.seconds))}%`
                    : state.cooldown > 0
                    ? `${100 - (state.cooldown / 11) * 100}%`
                    : '0%'
                  : `${Math.min(100, (state.arrests / 5) * 100)}%`
              }}
            />
          </div>
        </div>

        {/* Wanted Stars or Arrest Progress */}
        <div className="bg-[#121c24]/90 backdrop-blur-md border border-[#23423b] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400">
            {isVendor ? 'Wanted Heat:' : 'Magistrate Event:'}
          </span>
          <span className="text-sm font-bold text-[#f2c45d] tracking-widest">
            {isVendor
              ? '★ '.repeat(Math.min(5, Math.ceil(state.heat / 20))) + '☆ '.repeat(5 - Math.min(5, Math.ceil(state.heat / 20)))
              : state.arrests >= 5
              ? 'UNLOCKED ✓'
              : `${state.arrests}/5 arrests`}
          </span>
        </div>
      </div>
    </div>
  );
};

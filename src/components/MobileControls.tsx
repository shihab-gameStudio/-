import React, { useRef, useState } from 'react';
import { ShoppingCart, RefreshCw, Camera, Zap } from 'lucide-react';

interface MobileControlsProps {
  onAction: (key: string) => void;
  onHold: (key: string, isDown: boolean) => void;
}

const directions = ['w', 'a', 's', 'd'] as const;

export const MobileControls: React.FC<MobileControlsProps> = ({ onAction, onHold }) => {
  const activeKeys = useRef<Set<string>>(new Set());
  const activePointer = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });

  const setDirections = (dx: number, dy: number) => {
    const desired = new Set<string>();
    if (dy < -0.24) desired.add('w');
    if (dy > 0.24) desired.add('s');
    if (dx < -0.30) desired.add('a');
    if (dx > 0.30) desired.add('d');
    for (const key of directions) {
      const on = desired.has(key);
      if (on !== activeKeys.current.has(key)) {
        onHold(key, on);
        if (on) activeKeys.current.add(key);
        else activeKeys.current.delete(key);
      }
    }
  };

  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.36);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.36);
    const len = Math.max(1, Math.hypot(dx, dy));
    const x = dx / len;
    const y = dy / len;
    setThumb({ x: x * 36, y: y * 36 });
    setDirections(x, y);
  };
  const releaseStick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    setDirections(0, 0);
    setThumb({ x: 0, y: 0 });
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const bindHold = (key: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onHold(key, true);
    },
    onPointerUp: () => onHold(key, false),
    onPointerCancel: () => onHold(key, false),
    onLostPointerCapture: () => onHold(key, false)
  });

  return (
    <div className="absolute inset-x-0 bottom-3 z-40 flex items-end justify-between px-3 sm:px-6 pointer-events-none lg:hidden select-none">
      <div
        role="application"
        aria-label="Movement joystick: drag up to move, left and right to steer"
        className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 rounded-full border-2 border-[#469c8b]/75 bg-[#121c24]/70 shadow-xl pointer-events-auto touch-none"
        onPointerDown={e => {
          e.preventDefault();
          activePointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          moveStick(e);
        }}
        onPointerMove={e => { if (activePointer.current === e.pointerId) moveStick(e); }}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
        onLostPointerCapture={releaseStick}
      >
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-[#f2c45d]/80">▲</span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[#f2c45d]/80">▼</span>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#f2c45d]/80">◀</span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#f2c45d]/80">▶</span>
        <div
          className="absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 bg-[#469c8b] border-4 border-[#a3d0b7] rounded-full shadow-lg pointer-events-none"
          style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 pointer-events-auto items-end touch-none">
        <button {...bindHold('shift')} aria-label="Sprint" className="col-span-1 h-12 w-12 bg-[#16352e]/90 border border-[#469c8b] rounded-full text-[#a5f5d0] font-bold text-xs touch-none">
          <Zap size={18} className="mx-auto"/>RUN
        </button>
        <button onClick={() => onAction('u')} aria-label="Upgrade cart" className="h-12 w-12 bg-[#121c24]/85 border border-[#23423b] rounded-full text-[#f2c45d] font-bold text-[10px]">
          <ShoppingCart size={16} className="mx-auto"/>UPG
        </button>
        <button onClick={() => onAction('r')} aria-label="Restock" className="h-12 w-12 bg-[#121c24]/85 border border-[#23423b] rounded-full text-emerald-300 font-bold text-[10px]">
          <RefreshCw size={16} className="mx-auto"/>REST
        </button>
        <button onClick={() => onAction('c')} aria-label="Change camera" className="h-12 w-12 bg-[#121c24]/85 border border-[#23423b] rounded-full text-slate-100">
          <Camera size={20} className="mx-auto"/>
        </button>
        <button onClick={() => onAction('e')} aria-label="Interact, sell or arrest" className="col-span-2 h-14 rounded-2xl bg-[#f2c45d] text-[#121c24] font-extrabold text-sm shadow-lg">
          ACTION
        </button>
      </div>
    </div>
  );
};

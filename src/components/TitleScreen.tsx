import React, { useState } from 'react';
import { Role } from '../types/game';
import { ShoppingCart, Shield, Users, Play } from 'lucide-react';

interface TitleScreenProps {
  onStartSolo: (role: Role) => void;
  onOpenRoom: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartSolo, onOpenRoom }) => {
  const [selectedRole, setSelectedRole] = useState<Role>('vendor');

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#1b263b] to-[#10221f] flex flex-col items-center justify-center p-6 text-slate-100 z-50">
      <div className="max-w-2xl w-full text-center space-y-6 bg-[#16222b]/80 backdrop-blur-md p-8 rounded-2xl border border-[#23423b] shadow-2xl">
        <div className="space-y-2">
          <div className="inline-block bg-[#1f4a3e] text-[#f2c45d] px-4 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-2 border border-[#30705f]">
            ঢাকাইয়া স্ট্রিট সারভাইভাল · Dhaka Street Life 3D
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#f2c45d] to-[#469c8b] font-['Hind_Siliguri']">
            ঠেলার নাম বাবাজি <span className="text-2xl sm:text-3xl block text-slate-300 font-sans mt-1">Thelar Nam Babaji</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Navigate the bustling streets of Dhaka, sell authentic street goods from your wooden pushcart, evade enforcement heat, and build your street vending empire or patrol as police!
          </p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => setSelectedRole('vendor')}
            className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
              selectedRole === 'vendor'
                ? 'bg-[#1f4a3e]/40 border-[#469c8b] shadow-lg shadow-[#469c8b]/10'
                : 'bg-[#121c24]/50 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-lg text-[#f2c45d]">Thela Gari Wala</span>
              <ShoppingCart className="w-6 h-6 text-[#f2c45d]" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Push your cart through Gulistan and New Market, serve customers, upgrade inventory, and dodge police chases!
            </p>
          </button>

          <button
            onClick={() => setSelectedRole('police')}
            className={`p-5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
              selectedRole === 'police'
                ? 'bg-[#1f4a3e]/40 border-[#469c8b] shadow-lg shadow-[#469c8b]/10'
                : 'bg-[#121c24]/50 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-lg text-[#469c8b]">Police Constable</span>
              <Shield className="w-6 h-6 text-[#469c8b]" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Patrol the streets, pursue fleeing vendors, record lawful arrests, and climb the career promotion ladder!
            </p>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={() => onStartSolo(selectedRole)}
            className="flex-1 bg-gradient-to-r from-[#f2c45d] to-[#d4a538] hover:from-[#f9df85] hover:to-[#f2c45d] text-[#121c24] font-bold py-3.5 px-6 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            Play Solo vs AI
          </button>

          <button
            onClick={onOpenRoom}
            className="flex-1 bg-[#203b65] hover:bg-[#284970] text-slate-100 font-bold py-3.5 px-6 rounded-xl border border-[#30578f] shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users className="w-5 h-5" />
            Play 1v1 Online
          </button>
        </div>

        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <span>WASD / Arrows to Move</span>
          <span>·</span>
          <span>Shift to Sprint</span>
          <span>·</span>
          <span>E to Interact</span>
          <span>·</span>
          <span>C to Camera</span>
        </div>
      </div>
    </div>
  );
};

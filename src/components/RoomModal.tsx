import React, { useState } from 'react';
import { Role } from '../types/game';
import { Users, Copy, Check, ArrowRight } from 'lucide-react';

interface RoomModalProps {
  onCreateRoom: (role: Role) => void;
  onJoinRoom: (code: string) => void;
  onClose: () => void;
  roomCode: string | null;
  assignedRole: Role | null;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  onCreateRoom,
  onJoinRoom,
  onClose,
  roomCode,
  assignedRole
}) => {
  const [role, setRole] = useState<Role>('vendor');
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#16222b] border border-[#30705f] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 text-slate-100 animate-scale-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-[#f2c45d] uppercase">
              Online 1v1 Multiplayer
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 font-['Hind_Siliguri']">
              Private Room
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm font-bold">
            ✕
          </button>
        </div>

        {roomCode ? (
          <div className="space-y-4 bg-[#121c24] p-4 rounded-xl border border-slate-700 text-center">
            <div className="text-xs text-slate-400">Share this invite code with your friend:</div>
            <div className="text-3xl font-mono font-bold text-[#f2c45d] tracking-widest bg-[#16222b] py-3 rounded-lg border border-[#30705f]">
              {roomCode}
            </div>
            <button
              onClick={handleCopy}
              className="w-full bg-[#203b65] hover:bg-[#284970] text-slate-100 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Code!' : 'Copy Invite Code'}
            </button>
            <div className="text-xs text-[#469c8b] animate-pulse">
              Waiting for opponent to join as {assignedRole === 'vendor' ? 'Police' : 'Vendor'}...
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Create Room Section */}
            <div className="space-y-3 bg-[#121c24] p-4 rounded-xl border border-slate-700">
              <div className="text-sm font-bold text-[#f2c45d]">Create Private Room</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRole('vendor')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                    role === 'vendor' ? 'bg-[#1f4a3e] border-[#469c8b] text-[#f2c45d]' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Vendor
                </button>
                <button
                  onClick={() => setRole('police')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                    role === 'police' ? 'bg-[#1f4a3e] border-[#469c8b] text-[#f2c45d]' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Police
                </button>
              </div>
              <button
                onClick={() => onCreateRoom(role)}
                className="w-full bg-gradient-to-r from-[#f2c45d] to-[#d4a538] text-[#121c24] font-bold py-2.5 rounded-xl text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                Create Room
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex-1 h-[1px] bg-slate-800" />
              <span>OR JOIN EXISTING</span>
              <div className="flex-1 h-[1px] bg-slate-800" />
            </div>

            {/* Join Room Section */}
            <div className="space-y-3 bg-[#121c24] p-4 rounded-xl border border-slate-700">
              <div className="text-sm font-bold text-[#469c8b]">Join Room by Code</div>
              <input
                type="text"
                placeholder="Enter 6-character code"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-[#16222b] border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-slate-100 uppercase focus:outline-none focus:border-[#469c8b]"
              />
              <button
                onClick={() => {
                  if (inputCode.trim().length === 6) onJoinRoom(inputCode.trim());
                }}
                disabled={inputCode.trim().length !== 6}
                className="w-full bg-[#203b65] hover:bg-[#284970] disabled:opacity-50 text-slate-100 font-bold py-2.5 rounded-xl text-xs shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                Join Room
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

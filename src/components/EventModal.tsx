import React from 'react';
import { AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

interface EventModalProps {
  title: string;
  eyebrow: string;
  text: string;
  buttons: { text: string; onClick: () => void; isSecondary?: boolean }[];
}

export const EventModal: React.FC<EventModalProps> = ({ title, eyebrow, text, buttons }) => {
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#16222b] border border-[#30705f] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100 animate-scale-up">
        <div className="space-y-1">
          <div className="text-[10px] font-bold tracking-widest text-[#f2c45d] uppercase">
            {eyebrow}
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 font-['Hind_Siliguri']">
            {title}
          </h2>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          {text}
        </p>

        <div className="flex flex-col gap-2.5 pt-2">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.onClick}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-transform active:scale-98 cursor-pointer ${
                btn.isSecondary
                  ? 'bg-red-950/60 hover:bg-red-900/60 border border-red-800/80 text-red-200'
                  : 'bg-gradient-to-r from-[#f2c45d] to-[#d4a538] hover:from-[#f9df85] hover:to-[#f2c45d] text-[#121c24] shadow-lg'
              }`}
            >
              {btn.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

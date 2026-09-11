import React from 'react';
import { PK_LOGO_IMAGE } from '../lib/assets';

export const AccessDenied404: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Error Code */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-xl p-3">
            <img 
              src={PK_LOGO_IMAGE} 
              alt="PK ARENA" 
              className="w-full h-full object-cover rounded-xl opacity-60 grayscale"
            />
          </div>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white mb-2">
          404 <span className="text-zinc-600 font-light">|</span> Not Found
        </h1>
        
        <p className="text-sm text-zinc-400 max-w-xs mt-2 leading-relaxed">
          The requested page or service is not available for web browsers. Access is restricted to the official mobile application.
        </p>

        <div className="mt-8 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 w-full text-left">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-yellow-500 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Notice
          </div>
          <p className="text-xs text-zinc-400 leading-normal">
            Please open this URL inside the official <span className="text-white font-medium">PK ARENA Mobile App</span> to participate in tournaments and manage your wallet.
          </p>
        </div>

        <div className="mt-10 text-[11px] text-zinc-600 tracking-widest uppercase">
          ERROR_CODE: HTTP_404_CLIENT_RESTRICTED
        </div>
      </div>
    </div>
  );
};

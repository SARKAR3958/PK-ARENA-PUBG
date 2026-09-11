import React from 'react';
import { AlertTriangle, ServerOff } from 'lucide-react';

export const NoServerFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-300 flex flex-col items-center justify-center p-6 text-center select-none font-mono">
      <div className="max-w-md w-full flex flex-col items-center">
        {/* Glowing Server Off Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900/90 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <ServerOff className="w-10 h-10 text-red-500 animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
          NO SERVER FOUND
        </h1>
        
        <p className="text-xs sm:text-sm text-zinc-500 max-w-xs mt-2 leading-relaxed font-sans">
          The requested host or server destination could not be resolved from this browser client.
        </p>

        {/* Diagnostic Status Box */}
        <div className="mt-8 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 w-full text-left font-mono">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-red-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            ERR_CONNECTION_REFUSED
          </div>
          <div className="text-[11px] text-zinc-500 space-y-1">
            <p>• Host: <span className="text-zinc-400">api.gateway.internal</span></p>
            <p>• Status: <span className="text-red-400">Offline / 503 Target Unavailable</span></p>
            <p>• Protocol: <span className="text-zinc-400">TCP/IP Port Restricted</span></p>
          </div>
        </div>

        <div className="mt-10 text-[10px] text-zinc-700 tracking-widest uppercase">
          DIAGNOSTIC_CODE: ERR_NO_SERVER_FOUND_0x800704cf
        </div>
      </div>
    </div>
  );
};

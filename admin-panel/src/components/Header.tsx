'use client';

import { Bell, Search, RefreshCw } from 'lucide-react';

export default function Header({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-slate-800 glass-panel fixed top-0 right-0 left-64 z-20 flex items-center justify-between px-8">
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide">{title}</h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Qidiruv (Nomzod, telefon, kompaniya)..."
            className="w-72 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Sync Button */}
        <button
          onClick={() => window.location.reload()}
          className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-colors"
          title="Yangilash"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}

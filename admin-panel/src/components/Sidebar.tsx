'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building2, Briefcase, FileSpreadsheet, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Bosh sahifa (Dashboard)', icon: LayoutDashboard },
    { href: '/applications', label: 'Nomzodlar (Arizalar)', icon: Users },
    { href: '/companies', label: 'Kompaniyalar', icon: Building2 },
    { href: '/vacancies', label: 'Vakansiyalar', icon: Briefcase },
  ];

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-slate-800 flex flex-col z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
          HR
        </div>
        <div>
          <h1 className="font-extrabold text-sm text-white tracking-wide">MARKETING MARKAZI</h1>
          <p className="text-xs text-indigo-400 font-medium">HR Management Bot</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-md shadow-indigo-900/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin Footer Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs">
              SA
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Super Admin</p>
              <p className="text-[10px] text-slate-500">admin@marketing.uz</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-rose-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

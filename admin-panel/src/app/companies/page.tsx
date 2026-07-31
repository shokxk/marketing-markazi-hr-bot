'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Building2, Plus, CheckCircle2, XCircle, MapPin, Briefcase } from 'lucide-react';

interface CompanyItem {
  id: string;
  name: string;
  city?: string;
  address?: string;
  isActive: boolean;
  _count?: { vacancies: number; applications: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([
    { id: '1', name: 'Daler Boilers', city: 'Toshkent', address: 'Yashnobod t.', isActive: true, _count: { vacancies: 4, applications: 34 } },
    { id: '2', name: 'Kichkina Tabib', city: 'Toshkent', address: 'Chilanzar t.', isActive: true, _count: { vacancies: 3, applications: 28 } },
    { id: '3', name: 'Usta Shop', city: 'Farg\'ona', address: 'Qo\'qon sh.', isActive: true, _count: { vacancies: 2, applications: 22 } },
    { id: '4', name: 'Yuksak Travel', city: 'Samarqand', address: 'Markaziy ko\'cha', isActive: true, _count: { vacancies: 5, applications: 19 } },
  ]);

  useEffect(() => {
    fetch('http://localhost:4000/api/companies')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCompanies(data);
      })
      .catch(() => console.log('Using sample companies'));
  }, []);

  return (
    <>
      <Header title="Kompaniyalarni Boshqarish (30+ Hamkorlar)" />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-400">Jami <b>{companies.length}</b> ta faol hamkor kompaniya tizimga ulangan</p>
          <button className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-900/30">
            <Plus className="w-4 h-4" />
            <span>Yangi Kompaniya Qo'shish</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((comp) => (
            <div key={comp.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-extrabold text-indigo-400 text-base">
                  {comp.name.slice(0, 2).toUpperCase()}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${comp.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                  {comp.isActive ? 'FAOL' : 'NOFAOL'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{comp.name}</h3>
                <p className="text-xs text-slate-400 flex items-center mt-1">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                  {comp.city || 'Toshkent'}, {comp.address || 'Markaziy bino'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-400 font-medium">
                <div>
                  Vakansiyalar: <b className="text-white">{comp._count?.vacancies || 3}</b>
                </div>
                <div>
                  Arizalar: <b className="text-indigo-400">{comp._count?.applications || 12}</b>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

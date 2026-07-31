'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Briefcase, Plus, Video, DollarSign, Clock, MapPin } from 'lucide-react';

interface VacancyItem {
  id: string;
  title: string;
  salaryFrom?: number;
  salaryTo?: number;
  city?: string;
  workSchedule?: string;
  videoRequired: boolean;
  isActive: boolean;
  company: { name: string };
  _count?: { applications: number };
}

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState<VacancyItem[]>([
    {
      id: 'v-1',
      title: 'Sotuv menejeri',
      salaryFrom: 4000000,
      salaryTo: 8000000,
      city: 'Toshkent',
      workSchedule: '09:00–18:00 (6/1)',
      videoRequired: true,
      isActive: true,
      company: { name: 'Daler Boilers' },
      _count: { applications: 34 },
    },
    {
      id: 'v-2',
      title: 'Call-center operatori',
      salaryFrom: 3000000,
      salaryTo: 5000000,
      city: 'Toshkent',
      workSchedule: 'Smenali grafik',
      videoRequired: true,
      isActive: true,
      company: { name: 'Kichkina Tabib' },
      _count: { applications: 28 },
    },
  ]);

  useEffect(() => {
    fetch('http://localhost:4000/api/vacancies')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setVacancies(data);
      })
      .catch(() => console.log('Using sample vacancies'));
  }, []);

  return (
    <>
      <Header title="Vakansiyalarni Boshqarish" />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-xs text-slate-400">Jami <b>{vacancies.length}</b> ta faol vakansiya e'lon qilingan</p>
          <button className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-900/30">
            <Plus className="w-4 h-4" />
            <span>Yangi Vakansiya Qo'shish</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vacancies.map((vac) => (
            <div key={vac.id} className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/40 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">{vac.company?.name}</span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">{vac.title}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${vac.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                  {vac.isActive ? 'FAOL' : 'YOPILGAN'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>{vac.salaryFrom ? `${vac.salaryFrom / 1000000} - ${vac.salaryTo ? vac.salaryTo / 1000000 : ''} mln so'm` : 'Kelishuv asosida'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{vac.workSchedule || '09:00 - 18:00'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>{vac.city || 'Toshkent'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Video className="w-4 h-4 text-violet-400" />
                  <span>Video: {vac.videoRequired ? 'Majburiy ✅' : 'Ixtiyoriy'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Jami kelgan arizalar: <b className="text-white">{vac._count?.applications || 0} ta</b></span>
                <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200">
                  Tahrirlash
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

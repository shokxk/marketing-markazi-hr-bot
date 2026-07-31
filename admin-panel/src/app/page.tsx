'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Users, FileCheck, Video, Award, TrendingUp, Building2, ArrowUpRight } from 'lucide-react';

interface StatsOverview {
  totalApplications: number;
  todayApplications: number;
  completionRate: number;
  videoSubmissionRate: number;
  highScorersCount: number;
  companyBreakdown: { id: string; name: string; count: number }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsOverview>({
    totalApplications: 142,
    todayApplications: 18,
    completionRate: 84,
    videoSubmissionRate: 76,
    highScorersCount: 39,
    companyBreakdown: [
      { id: '1', name: 'Daler Boilers', count: 34 },
      { id: '2', name: 'Kichkina Tabib', count: 28 },
      { id: '3', name: 'Usta Shop', count: 22 },
      { id: '4', name: 'Yuksak Travel', count: 19 },
      { id: '5', name: 'Active Polimer', count: 15 },
    ],
  });

  useEffect(() => {
    fetch('http://localhost:4000/api/stats/overview')
      .then((res) => res.json())
      .then((data) => {
        if (data.totalApplications !== undefined) {
          setStats(data);
        }
      })
      .catch(() => console.log('Using default dashboard metrics'));
  }, []);

  return (
    <>
      <Header title="Bosh sahifa (Analitika & Metrikalar)" />

      <div className="space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Applications */}
          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jami arizalar</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{stats.totalApplications}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400 font-semibold">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+{stats.todayApplications} ta bugun</span>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tugallash konversiyasi</p>
                <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{stats.completionRate}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">20 ta savolli anketa bo'yicha</div>
          </div>

          {/* Video Submission Rate */}
          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Video yuborish foizi</p>
                <h3 className="text-3xl font-extrabold text-violet-400 mt-2">{stats.videoSubmissionRate}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Video className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">30-60 soniyalik video tanishtiruv</div>
          </div>

          {/* High Scorers */}
          <div className="p-6 rounded-2xl glass-card relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kuchli nomzodlar (80+)</p>
                <h3 className="text-3xl font-extrabold text-amber-400 mt-2">{stats.highScorersCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Award className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400">Avtomatik ball bo'yicha saralangan</div>
          </div>
        </div>

        {/* Company breakdown list */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>Kompaniyalar bo'yicha arizalar taqsimoti</span>
              </h3>
            </div>
          </div>

          <div className="space-y-4">
            {stats.companyBreakdown.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{item.name}</h4>
                    <p className="text-xs text-slate-400">Faol hamkor kompaniya</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-white">{item.count}</span>
                    <span className="text-xs text-slate-400 block">arizalar</span>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

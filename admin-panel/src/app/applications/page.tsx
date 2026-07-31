'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Download, Filter, Video, Eye, CheckCircle, Clock, AlertTriangle, ExternalLink, X } from 'lucide-react';

interface ApplicationItem {
  id: string;
  applicationNumber: string;
  score: number;
  status: string;
  videoUrl?: string;
  isDuplicate: boolean;
  createdAt: string;
  user: {
    fullName?: string;
    phone?: string;
    telegramUsername?: string;
  };
  company: { name: string };
  vacancy: { title: string };
  aiSummary?: string;
  answers?: { question: { code: string; textUz: string }; answerText?: string }[];
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([
    {
      id: 'app-1',
      applicationNumber: 'HR-2026-000245',
      score: 85,
      status: 'SUBMITTED',
      videoUrl: 'http://localhost:4000/uploads/sample.mp4',
      isDuplicate: false,
      createdAt: '2026-07-31T14:20:00.000Z',
      user: {
        fullName: 'Azizbek Karimov',
        phone: '+998 90 123 45 67',
        telegramUsername: 'azizbek_k',
      },
      company: { name: 'Daler Boilers' },
      vacancy: { title: 'Sotuv menejeri' },
      aiSummary: 'Nomzod 24 yoshda, Qo‘qon shahrida yashaydi. Sotuv yo‘nalishida 1 yillik tajribaga ega. amoCRM bilan ishlagan. Rus tilini o‘rta darajada biladi. Ishni 3 kun ichida boshlashi mumkin.',
    },
    {
      id: 'app-2',
      applicationNumber: 'HR-2026-000246',
      score: 72,
      status: 'UNDER_REVIEW',
      isDuplicate: true,
      createdAt: '2026-07-31T15:10:00.000Z',
      user: {
        fullName: 'Malika Sobirova',
        phone: '+998 93 987 65 43',
        telegramUsername: 'malika_s',
      },
      company: { name: 'Kichkina Tabib' },
      vacancy: { title: 'Call-center operatori' },
      aiSummary: 'Nomzod 21 yoshda, Toshkent shahrida yashaydi. Call-center sohasida 6 oy tajribaga ega.',
    },
  ]);

  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);

  useEffect(() => {
    fetch('http://localhost:4000/api/applications')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setApplications(data);
      })
      .catch(() => console.log('Using fallback candidate list'));
  }, []);

  const handleExportExcel = () => {
    window.open('http://localhost:4000/api/applications/export/excel', '_blank');
  };

  return (
    <>
      <Header title="Nomzodlar (Arizalar)" />

      <div className="space-y-6">
        {/* Controls & Export */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span>Filtrlash</span>
            </button>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Excel'ga yuklash (.xlsx)</span>
          </button>
        </div>

        {/* Applications Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Ariza №</th>
                  <th className="py-4 px-6">Nomzod F.I.O.</th>
                  <th className="py-4 px-6">Kompaniya & Vakansiya</th>
                  <th className="py-4 px-6">Reyting (Score)</th>
                  <th className="py-4 px-6">Video</th>
                  <th className="py-4 px-6">Holati</th>
                  <th className="py-4 px-6 text-right">Harakat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-indigo-400">
                      {app.applicationNumber}
                      {app.isDuplicate && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Takroriy
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{app.user?.fullName || 'Nomzod'}</div>
                      <div className="text-slate-400 text-[11px]">{app.user?.phone}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-200">{app.company?.name}</div>
                      <div className="text-slate-400 text-[11px]">{app.vacancy?.title}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-extrabold text-xs">
                        {app.score}/100
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {app.videoUrl ? (
                        <span className="inline-flex items-center text-emerald-400 font-semibold space-x-1">
                          <Video className="w-4 h-4" />
                          <span>Mavjud</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Yo'q</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {app.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all font-semibold"
                      >
                        Batafsil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Candidate Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-indigo-400 font-bold">{selectedApp.applicationNumber}</span>
                <h3 className="text-lg font-extrabold text-white mt-1">{selectedApp.user?.fullName}</h3>
                <p className="text-xs text-slate-400">
                  {selectedApp.company?.name} — {selectedApp.vacancy?.title}
                </p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Summary Block */}
            {selectedApp.aiSummary && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">🤖 AI Xulosasi (HR uchun)</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedApp.aiSummary}</p>
              </div>
            )}

            {/* Candidate Video Review */}
            {selectedApp.videoUrl && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🎥 Video Tanishtiruv</h4>
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <video src={selectedApp.videoUrl} controls className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-white"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

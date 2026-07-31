import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Marketing Markazi HR Dashboard',
  description: 'Telegram HR Bot & Candidate Recruitment Management Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <Sidebar />
        <div className="pl-64">
          <main className="pt-16 p-8 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}

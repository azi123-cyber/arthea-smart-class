'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { 
  Home, 
  MessageSquare, 
  LayoutDashboard, 
  BarChart3, 
  Sparkles, 
  Upload, 
  BookOpen, 
  Bug, 
  LogOut, 
  ShieldCheck, 
  GraduationCap,
  X,
  PenSquare,
  Users,
  FileEdit,
  Settings
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { role, username, logout } = useAuth();
  const [showBugModal, setShowBugModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [bugText, setBugText] = useState('');
  const [bugSent, setBugSent] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const links = [
    { name: 'Dashboard', href: '/', icon: <Home size={20} /> },
    { name: 'Forum', href: '/forum', icon: <MessageSquare size={20} /> },
    { name: 'Bank Soal', href: '/tryout', icon: <LayoutDashboard size={20} /> },
    { name: 'Hasil', href: '/results', icon: <BarChart3 size={20} /> },
    { name: 'AI Gen', href: '/ai-generator', icon: <Sparkles size={20} /> },
  ];

  const adminLinks = [
    { name: 'Upload Soal', href: '/admin/upload', icon: <Upload size={20} /> },
    { name: 'Materi', href: '/admin/materi', icon: <BookOpen size={20} /> },
  ];

  const teacherLinks = [
    { name: 'Buat Ujian', href: '/teacher/create-exam', icon: <PenSquare size={20} /> },
  ];

  const handleSendBug = () => {
    if (!bugText.trim()) return;
    const waText = encodeURIComponent(`Bug Report dari ${username || 'User'}\n\n${bugText}`);
    window.open(`https://wa.me/6287744100119?text=${waText}`, '_blank');
    setBugText('');
    setBugSent(true);
    setTimeout(() => { setBugSent(false); setShowBugModal(false); }, 2500);
  };

  const renderLinks = (linkList: { name: string; href: string; icon: React.ReactNode }[]) =>
    linkList.map((link) => {
      const isActive = pathname === link.href;
      return (
        <Link key={link.href} href={link.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group ${isActive
            ? 'bg-[#075E54] text-white shadow-lg shadow-[#075E54]/30'
            : 'text-gray-600 dark:text-gray-400 hover:bg-[#25D366]/10 hover:text-[#075E54] dark:hover:text-[#25D366]'
          }`}>
          <span className={`group-hover:scale-110 transition-transform ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#075E54] dark:group-hover:text-[#25D366]'}`}>
            {link.icon}
          </span>
          <span className="font-semibold text-sm">{link.name}</span>
          {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#25D366]" />}
        </Link>
      );
    });

  return (
    <>
      <aside className="hidden md:flex w-64 h-screen sticky top-0 flex-col bg-white dark:bg-[#111b21] border-r border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
        {/* Logo + Branding */}
        <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <img
              src="/bahan/arthea_logo_light.png"
              alt="Arthea"
              className="h-10 w-10 object-contain block"
            />
            <div>
              <p className="font-black text-gray-900 dark:text-white text-xl tracking-widest leading-none">ARTHEA</p>
              <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">Smart Class Platform</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 py-6 flex-grow overflow-y-auto">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3">Main Menu</p>
          {renderLinks(links)}

          {role === 'teacher' && (
            <>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3 mt-8">Guru Panel</p>
              {renderLinks(teacherLinks)}
            </>
          )}

          {role === 'admin' && (
            <>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-3 mt-8">Admin Controls</p>
              {renderLinks(adminLinks)}
            </>
          )}
        </nav>

        {/* Bottom Controls removed as it is now in Settings */}

        {/* User info */}
        <div className="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-2xl p-3 border border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md"
              style={{ background: 'linear-gradient(135deg, #075E54, #25D366)' }}>
              {(username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-800 dark:text-gray-100 truncate">{username || 'Pengguna'}</p>
              <div className="flex items-center gap-1">
                {role === 'admin' ? <ShieldCheck size={10} className="text-red-500" /> 
                  : role === 'teacher' ? <Users size={10} className="text-blue-500" />
                  : <GraduationCap size={10} className="text-[#128C7E]" />}
                <p className={`text-[10px] font-black uppercase tracking-tighter ${
                  role === 'admin' ? 'text-red-500' : role === 'teacher' ? 'text-blue-500' : 'text-[#128C7E]'
                }`}>{role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Guru / Teacher' : 'Student Account'}</p>
              </div>
            </div>
            <button onClick={() => setShowSettingsModal(true)} title="Pengaturan" className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
              <Settings size={18} />
            </button>
          </div>
          <p className="text-center text-[9px] font-black text-gray-300 dark:text-gray-700 mt-3 tracking-[0.2em] uppercase">ARSYIR DEV</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-[#111b21] border-t border-gray-200 dark:border-gray-800 flex justify-around items-center px-1 py-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        {[
          ...links.slice(0, 2), // Dashboard, Forum
          ...(role === 'admin' ? [adminLinks[0]] : role === 'teacher' ? [teacherLinks[0]] : []), // Upload (admin) / Buat (teacher)
          ...links.slice(3, 5), // Hasil, AI Gen
        ].map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-12 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-300'}`}>
              <div className={`mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}>
                {link.icon}
              </div>
              <span className={`text-[9px] font-bold uppercase transition-all whitespace-nowrap overflow-hidden text-ellipsis w-full text-center tracking-tighter ${isActive ? 'opacity-100 block' : 'opacity-0 hidden'}`}>{link.name.split(' ')[0]}</span>
            </Link>
          );
        })}
        <button onClick={() => setShowSettingsModal(true)} className="flex flex-col items-center justify-center p-2 rounded-xl w-12 text-gray-400 hover:text-primary">
           <Settings size={20} className="mb-1" />
           <span className="text-[9px] font-bold uppercase transition-all tracking-tighter w-full text-center">Set</span>
        </button>
      </nav>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white dark:bg-[#111b21] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
             <div className="bg-[#075E54] dark:bg-[#202c33] px-6 py-5 text-white flex items-center justify-between">
               <h3 className="text-lg font-black flex items-center gap-2"><Settings size={20}/> Pengaturan</h3>
               <button onClick={() => setShowSettingsModal(false)} className="text-white/70 hover:text-white transition-colors"><X size={24} /></button>
             </div>
             <div className="p-4 flex flex-col gap-2">
                <button onClick={() => { setShowSettingsModal(false); setShowBugModal(true); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/10 dark:hover:bg-orange-900/20 font-bold transition-colors">
                   <Bug size={20} /> Laporkan Bug
                </button>
                <button onClick={() => { setShowSettingsModal(false); logout(); }} className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 font-bold transition-colors">
                   <LogOut size={20} /> Keluar Aplikasi
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white dark:bg-[#111b21] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-orange-500 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/bahan/fixing_bug.svg" alt="bug" className="w-10 h-10 brightness-200" />
                <div>
                  <h3 className="text-lg font-black">Laporkan Bug</h3>
                  <p className="text-white/70 text-xs">Bantu kami tingkatkan kualitas</p>
                </div>
              </div>
              <button onClick={() => setShowBugModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {bugSent ? (
                <div className="text-center py-10">
                   <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="text-green-600 dark:text-green-400" size={40} />
                   </div>
                  <p className="font-black text-green-600 dark:text-green-400 text-xl tracking-tight">Laporan Terkirim!</p>
                  <p className="text-gray-500 text-sm mt-2">Terima kasih telah membantu kami.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">Jelaskan bug yang Anda temukan sedetail mungkin (langkah reproduksi, halaman mana, dll.)</p>
                  <textarea
                    value={bugText}
                    onChange={(e) => setBugText(e.target.value)}
                    placeholder="Cth: Di halaman Forum, tombol Reply tidak muncul setelah scroll ke bawah..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl p-4 min-h-[140px] outline-none focus:border-orange-400 text-gray-700 dark:text-gray-300 text-sm resize-none transition-colors"
                  />
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowBugModal(false)}
                      className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors">
                      Batal
                    </button>
                    <button onClick={handleSendBug} disabled={!bugText.trim()}
                      className="flex-1 py-3 rounded-2xl font-bold text-white transition-all"
                      style={{ background: bugText.trim() ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#d1d5db' }}>
                      <div className="flex items-center justify-center gap-2">
                        <Upload size={18} />
                        <span>Kirim ke Admin</span>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

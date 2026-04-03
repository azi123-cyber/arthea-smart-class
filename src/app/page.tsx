'use client';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { role, username } = useAuth();
  const [stats, setStats] = useState({ tryouts: 0, forumPosts: 0 });

  useEffect(() => {
    if (username) {
      // Fetch user's tryout stats
      const resultsRef = ref(db, `results/${username}`);
      onValue(resultsRef, (snapshot) => {
        const data = snapshot.val();
        setStats(prev => ({ ...prev, tryouts: data ? Object.keys(data).length : 0 }));
      });
    }
    // Fetch total forum posts
    const forumRef = ref(db, 'forum');
    onValue(forumRef, (snapshot) => {
      const data = snapshot.val();
      setStats(prev => ({ ...prev, forumPosts: data ? Object.keys(data).length : 0 }));
    });
  }, [username]);

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-gray-900 dark:text-white flex items-center gap-3">
            Selamat Datang, {username || (role === 'admin' ? 'Admin' : 'Siswa')}! <Sparkles className="text-yellow-400" size={32} />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-tight">Mari lanjutkan perjalanan belajarmu hari ini.</p>
        </div>
        <div className="hidden sm:block">
           <img src="/bahan/arthea_logo_light.png" alt="Arthea" className="h-12 object-contain" />
        </div>
      </div>

      {role === 'user' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2 bg-gradient-to-br from-primary to-secondary text-white border-0 overflow-hidden relative group">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-center h-full relative z-10">
              <div>
                <h3 className="text-2xl font-bold mb-2">Try Out Nasional #5</h3>
                <p className="opacity-80 mb-6">Persiapkan dirimu untuk ujian yang sebenarnya. Waktu terbatas!</p>
                <Link href="/tryout" className="bg-white text-primary px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform inline-block shadow-lg">Mulai Sekarang</Link>
              </div>
              <img src="/bahan/ready_test.svg" alt="Ready Test" className="w-32 h-32 transition-transform duration-500 brightness-200 drop-shadow-xl group-hover:scale-105" />
            </div>
          </Card>
          <Card className="!p-6 border-2 border-gray-50 dark:border-gray-800">
            <h4 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-6">Statistik Belajar</h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center font-black text-2xl shadow-sm">{stats.tryouts}</div>
              <div>
                <p className="font-black text-gray-800 dark:text-gray-200">Try Out Selesai</p>
                <p className="text-xs text-gray-500 font-medium">Total riwayat ujian</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center font-black text-2xl shadow-sm">{stats.forumPosts}</div>
              <div>
                <p className="font-black text-gray-800 dark:text-gray-200">Diskusi Aktif</p>
                <p className="text-xs text-gray-500 font-medium">Topik di forum diskusi</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white border-0 hover:-translate-y-1 transition-transform group">
             <div className="flex justify-between h-full items-center">
                <div>
                   <h3 className="text-2xl font-bold mb-2">Review Soal Baru</h3>
                   <p className="opacity-80 mb-6">Kelola bank soal dan hasil AI</p>
                   <Link href="/ai-generator" className="bg-white text-orange-500 px-6 py-2 rounded-full font-bold inline-block shadow-lg hover:scale-105 transition-transform">Lihat Soal</Link>
                </div>
                <img src="/bahan/add_files.svg" className="w-24 h-24 brightness-200 mix-blend-screen group-hover:scale-110 transition-transform" alt="review"/>
             </div>
          </Card>
          <Card className="bg-gradient-to-br from-green-400 to-emerald-600 text-white border-0 hover:-translate-y-1 transition-transform group">
             <div className="flex justify-between h-full items-center">
                <div>
                   <h3 className="text-2xl font-bold mb-2">Pantau Forum</h3>
                   <p className="opacity-80 mb-6">{stats.forumPosts} diskusi tersedia</p>
                   <Link href="/forum" className="bg-white text-emerald-600 px-6 py-2 rounded-full font-bold inline-block shadow-lg hover:scale-105 transition-transform">Ke Forum</Link>
                </div>
                <img src="/bahan/begin_chat.svg" className="w-24 h-24 brightness-200 mix-blend-screen group-hover:scale-110 transition-transform" alt="forum"/>
             </div>
          </Card>
        </div>
      )}

      <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-4 tracking-tight">Jelajahi Fitur Utama</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: '/bahan/document_ready.svg', title: 'Belajar dgn AI', color: 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30', href: '/ai-generator' },
          { icon: '/bahan/ready_test.svg', title: 'Try Out Simulasi', color: 'bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30', href: '/tryout' },
          { icon: '/bahan/begin_chat.svg', title: 'Forum Diskusi', color: 'bg-green-50/50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30', href: '/forum' },
          { icon: '/bahan/personal_goals.svg', title: 'Lihat Hasil', color: 'bg-purple-50/50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30', href: '/results' }
        ].map(item => (
          <Link href={item.href} key={item.title} className="block h-full">
            <Card className={`group cursor-pointer hover:-translate-y-2 !border ${item.color} flex flex-col items-center justify-center text-center !p-8 h-full transition-all duration-300 shadow-sm hover:shadow-xl`}>
               <img src={item.icon} alt={item.title} className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform duration-500 dark-icon-bright" />
               <h4 className="font-bold tracking-tight">{item.title}</h4>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

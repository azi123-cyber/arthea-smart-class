'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import StatusAnimation from '@/components/StatusAnimation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, Calendar, Clock, BarChart4, Trophy, TrendingUp, TrendingDown, ChevronLeft } from 'lucide-react';

export default function ResultsPage() {
  const { role, username: currentUsername } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  useEffect(() => {
    if (currentUsername && role) {
      fetchResults(currentUsername, role);
    } else if (!currentUsername) {
      // Fallback untuk localStorage
      const savedUser = localStorage.getItem('username');
      const savedRole = localStorage.getItem('role') as any;
      if (savedUser && savedRole) {
        fetchResults(savedUser, savedRole);
      } else {
        setLoading(false);
      }
    }
  }, [currentUsername, role]);

  const fetchResults = async (user: string, userRole: string) => {
    try {
      setLoading(true);
      const isPrivileged = userRole === 'admin' || userRole === 'teacher';
      
      const [resultsRes, usersRes] = await Promise.all([
        fetch(isPrivileged ? '/api/backend/results/all' : `/api/backend/results/${user}`, { cache: 'no-store' }),
        fetch(isPrivileged ? '/api/backend/users/all' : `/api/backend/users/all`, { cache: 'no-store' }) // Tetap butuh semua user info untuk link nama
      ]);

      const rawData = await resultsRes.json();
      const usersData = await usersRes.json();

      if (rawData && !rawData.error) {
        const allData = isPrivileged ? rawData : { [user]: rawData };
        
        const resultsList: any[] = [];
        const stats: any[] = [];
        
        let currentUserTotal = 0;
        let currentUserCount = 0;

        Object.entries(allData).forEach(([u, userResults]: [string, any]) => {
          let totalScore = 0;
          let count = 0;
          const userObj = usersData[u] || {};
          const studentClass = userObj.kelas || 'Umum';

          Object.entries(userResults).forEach(([id, val]: [string, any]) => {
            totalScore += Number(val.score || 0);
            count++;
            
            if (u === user || userRole === 'admin' || userRole === 'teacher') {
              resultsList.push({
                id,
                studentUsername: u,
                studentName: userObj.name || u,
                studentClass: studentClass,
                ...val,
                date: new Date(val.timestamp).toLocaleString('id-ID')
              });
            }
          });
          
          if (count > 0) {
            const avg = Math.round(totalScore / count);
            if (u === user) {
               currentUserTotal = totalScore;
               currentUserCount = count;
            }
            stats.push({
               username: u,
               name: userObj.name || u,
               kelas: studentClass,
               average: avg,
               tryouts: count
            });
          }
        });
        
        setResults(resultsList.sort((a, b) => b.timestamp - a.timestamp));
        setGlobalStats(stats.sort((a, b) => b.average - a.average));
        
        if (currentUserCount > 0) {
           setUserStats({ average: Math.round(currentUserTotal / currentUserCount), count: currentUserCount });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFullAnswerText = (answer: string | string[], options?: string[]) => {
    if (!answer) return "-";
    if (!options || !options.length) return Array.isArray(answer) ? answer.join(', ') : answer;
    
    const ansArray = Array.isArray(answer) ? answer : answer.split(',').map(s => s.trim());
    return ansArray.map(a => {
       const aUpper = a.toUpperCase();
       // Cari opsi yang diawali dengan pilihan, e.g. "A." atau "A)"
       const found = options.find(o => {
         const oUpper = o.trim().toUpperCase();
         return oUpper.startsWith(aUpper + ".") || oUpper.startsWith(aUpper + " ") || oUpper.startsWith(aUpper + ")") || oUpper === aUpper;
       });
       return found || a;
    }).join(' | ');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <StatusAnimation type="loading" message="Memuat Hasil..." />
      </div>
    );
  }

  if (selectedResult) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto pb-24">
        <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-primary font-bold self-start mb-2 flex items-center gap-2">
          <ChevronLeft size={18} /> Kembali ke Daftar
        </button>
        <Card className="!p-8 border-2 border-primary/20 bg-white dark:bg-[#111b21] shadow-2xl rounded-[2rem]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-black mb-1 text-gray-900 dark:text-white">Detail Pengerjaan</h2>
              <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                <UserIcon size={14} className="text-primary" />
                <span>Siswa: {selectedResult.studentName || selectedResult.studentUsername}</span>
                <span className="opacity-30">•</span>
                <Calendar size={14} className="text-primary" />
                <span>{selectedResult.date}</span>
              </div>
            </div>
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest text-center">
              Tryout <br/>#{selectedResult.tryoutId}
            </div>
          </div>
          <div className="h-px bg-gray-100 dark:bg-gray-800 w-full mb-8" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl text-center border border-primary/10 dark:border-primary/20">
              <p className="text-xs font-bold text-primary uppercase">Skor</p>
              <p className="text-3xl font-black text-primary">{selectedResult.score}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl text-center border border-green-100 dark:border-green-900/30">
              <p className="text-xs font-bold text-green-600 uppercase">Benar</p>
              <p className="text-3xl font-black text-green-600">{selectedResult.correctCount || 0}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl text-center border border-red-100 dark:border-red-900/30">
              <p className="text-xs font-bold text-red-600 uppercase">Salah</p>
              <p className="text-3xl font-black text-red-600">{selectedResult.wrongCount || 0}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl text-center border border-orange-100 dark:border-orange-900/30">
              <p className="text-xs font-bold text-orange-600 uppercase">Pelanggaran</p>
              <p className="text-3xl font-black text-orange-600">{selectedResult.violations || 0}</p>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-6">Review Jawaban & Penjelasan</h3>
          <div className="space-y-8">
            {(selectedResult.answers || []).map((ans: any, idx: number) => (
              <div key={idx} className="border-l-4 border-gray-100 dark:border-gray-800 pl-6 py-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                  {ans.isCorrect ? (
                    <span className="text-xs font-black text-green-600 bg-green-100 px-2 py-0.5 rounded">BENAR</span>
                  ) : (
                    <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded">SALAH</span>
                  )}
                </div>
                <p className="font-bold text-lg mb-4 text-gray-800 dark:text-gray-200">{ans.question}</p>
                <div className="grid gap-2 mb-4">
                   <p className={`p-4 rounded-xl text-sm font-medium border ${ans.isCorrect ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'}`}>
                     Jawaban Anda: {getFullAnswerText(ans.userAnswer, ans.options)}
                   </p>
                    {!ans.isCorrect && (
                      <p className="p-4 rounded-xl text-sm font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300">
                        Jawaban Benar: {getFullAnswerText(ans.correctAnswer, ans.options)}
                      </p>
                    )}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <p className="text-xs font-black text-blue-600 mb-2 tracking-widest uppercase">Penjelasan AI</p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{ans.explanation || 'Pembahasan tidak tersedia untuk soal ini.'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <StatusAnimation type="warning" message="Belum Ada Hasil" subMessage="Selesaikan setidaknya satu tryout untuk melihat hasil di sini." />
        <Link href="/tryout" className="mt-8 inline-block px-8 py-4 bg-primary text-white rounded-full font-bold shadow-lg">
          Mulai Tryout Sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in max-w-5xl mx-auto px-4 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black mb-2 text-gray-900 dark:text-white tracking-tight">
            { (role === 'teacher' || role === 'admin') ? 'Hasil Pengerjaan User' : 'Hasil Ujian & Pembahasan' }
          </h1>
          <p className="text-gray-500 font-medium">
            { (role === 'teacher' || role === 'admin') ? 'Pantau progres dan hasil pengerjaan seluruh siswa Anda.' : 'Lihat riwayat nilai dan penjelasan untuk setiap soal yang telah dikerjakan.' }
          </p>
        </div>
        { (role === 'teacher' || role === 'admin') && (
           <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
              <BarChart4 className="text-blue-600" />
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Total Data</p>
                <p className="text-xl font-black text-blue-800 dark:text-blue-300">{results.length} Pengerjaan</p>
              </div>
           </div>
        )}
      </div>

      {userStats && (role !== 'admin' && role !== 'teacher') && (
        <Card className="!p-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl rounded-3xl">
          <div>
             <h2 className="text-xl md:text-2xl font-black mb-2 text-gray-900 dark:text-white tracking-tight">Skor Rata-rata Kamu: <span className="text-primary text-3xl">{userStats.average}</span></h2>
             {userStats.average < 70 ? (
               <p className="text-red-500 font-bold flex items-center gap-2"><TrendingDown size={18}/> Nilai di bawah 70. Ayoo giat belajar lagi!</p>
             ) : (
               <p className="text-green-500 font-bold flex items-center gap-2"><TrendingUp size={18}/> Bagus sekali! Pertahankan dan tingkatkan terus prestasimu!</p>
             )}
          </div>
          <div className="text-right hidden md:block">
            <p className="text-4xl font-black text-primary">{userStats.count}</p>
            <p className="text-xs font-black uppercase text-primary/50 tracking-widest mt-1">Tryout Dikerjakan</p>
          </div>
        </Card>
      )}

      {globalStats.length > 0 && (
         <Card className="!p-6 border-2 border-gray-100 dark:border-gray-800 shadow-md">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2 tracking-tight text-gray-900 dark:text-white"><Trophy className="text-yellow-500"/> Peringkat Rata-rata Peserta</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b-2 border-gray-100 dark:border-gray-800 uppercase font-black text-[10px] text-gray-400 tracking-widest">
                    <th className="py-4 px-4 w-16 text-center">Rank</th>
                    <th className="py-4 px-4">Peserta</th>
                    <th className="py-4 px-4 w-24">Kelas</th>
                    <th className="py-4 px-4 w-32 text-center">Selesai</th>
                    <th className="py-4 px-4 w-32 text-center text-primary">Target Skor</th>
                  </tr>
                </thead>
                <tbody className="font-medium">
                  {globalStats.slice(0, 50).map((stat, idx) => (
                    <tr key={idx} className={`border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${stat.username === currentUsername ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
                      <td className="py-4 px-4 text-center font-black text-gray-500">{idx + 1}</td>
                      <td className="py-4 px-4">
                         <span className={`font-bold ${stat.username === currentUsername ? 'text-primary' : 'text-gray-900 dark:text-gray-200'}`}>{stat.name}</span>
                         {stat.username === currentUsername && <span className="ml-2 text-[9px] bg-primary text-white px-2 py-0.5 rounded-full font-black tracking-widest shadow-sm">SAYA</span>}
                      </td>
                      <td className="py-4 px-4"><span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">{stat.kelas}</span></td>
                      <td className="py-4 px-4 text-center">{stat.tryouts} TO</td>
                      <td className="py-4 px-4 text-center font-black text-lg text-gray-900 dark:text-white">{stat.average}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </Card>
      )}

      <div className="flex items-center gap-3 mt-4 mb-2">
         <Clock className="text-gray-400" size={18} />
         <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Riwayat Pengerjaan</h3>
      </div>

      <div className="grid gap-5">
        {results.map((res) => (
          <Card key={res.id} className="cursor-pointer group hover:!border-primary/50 !p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 border-2 border-transparent bg-white dark:bg-[#111b21] shadow-sm hover:shadow-xl rounded-3xl" onClick={() => setSelectedResult(res)}>
            <div className="flex items-center gap-5 flex-grow w-full">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl group-hover:scale-110 transition-transform">
                {res.studentName?.[0]?.toUpperCase() || res.studentUsername?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border border-primary/20">Tryout #{res.tryoutId?.toString().substring(0,6) || "..."}</span>
                  {(role === 'teacher' || role === 'admin') && (
                    <span className="text-[11px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest">{res.studentName || res.studentUsername}</span>
                  )}
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">Skor Akhir: <span className="text-primary">{res.score}</span></h3>
                <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  <span className="flex items-center gap-1"><Clock size={10} /> {res.date}</span>
                  <span className="opacity-30">•</span>
                  <span className={res.violations > 0 ? 'text-red-500' : 'text-green-500'}>{res.violations} Pelanggaran</span>
                </div>
              </div>
            </div>
            <button 
              className="w-full md:w-auto px-8 py-3 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-xs uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all shadow-sm"
            >
              Lihat Detail
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

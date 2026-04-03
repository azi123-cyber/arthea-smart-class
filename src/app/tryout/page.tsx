'use client';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

export default function TryoutList() {
  const { username } = useAuth();
  const [tryouts, setTryouts] = useState<any[]>([
    { id: 1, title: 'Try Out Nasional #5', subject: 'Campuran', duration: '120 Menit', date: 'Aktif' },
    { id: 2, title: 'Simulasi UTBK: Penalaran Umum', subject: 'Logika', duration: '90 Menit', date: 'Berakhir Besok' },
    { id: 3, title: 'Quiz Harian Aljabar', subject: 'Matematika Dasar', duration: '30 Menit', date: 'Tersedia' },
  ]);

  useEffect(() => {
    // Tunggu sampai username ada jika user sedang login
    if (username === undefined) return; 

    const materialsRef = ref(db, 'materials');
    return onValue(materialsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
         const fetchedMaterials = Object.entries(data)
           .filter(([id, val]: [string, any]) => 
              (val.type === 'soal' || val.type === 'tryout') && 
              (!val.isPrivate || val.uploadedBy === username)
           )
           .map(([id, val]: [string, any]) => ({
             id,
             ...val,
             title: val.title,
             subject: val.subject,
             duration: 'Fleksibel',
             date: 'AI / Soal Tersedia'
           }))
           .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
         
         // Merge with hardcoded placeholders for demonstration
         setTryouts([
            ...fetchedMaterials,
            { id: 1, title: 'Try Out Nasional #5', subject: 'Campuran', duration: '120 Menit', date: 'Aktif' },
            { id: 2, title: 'Simulasi UTBK: Penalaran Umum', subject: 'Logika', duration: '90 Menit', date: 'Berakhir Besok' },
            { id: 3, title: 'Quiz Harian Aljabar', subject: 'Matematika Dasar', duration: '30 Menit', date: 'Tersedia' }
         ]);
      }
    });
  }, [username]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-extrabold mb-2 text-gray-900 dark:text-white flex items-center gap-4">
              Ujian & Try Out <img src="/bahan/ready_test.svg" className="w-10 h-10" alt="test"/>
            </h1>
            <p className="text-gray-500">Uji kemampuanmu dengan berbagai simulasi ujian terbaik dan soal AI.</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {tryouts.map(t => (
           <Card key={t.id} className="flex flex-col h-full hover:-translate-y-2 !border-2 hover:!border-primary transition-all duration-300 group">
             <div className="flex justify-between items-start mb-4">
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1 text-xs rounded-full">{t.subject}</span>
                <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">{t.duration === 'Fleksibel' ? t.duration : `${t.duration} Menit`}</span>
             </div>
             <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{t.title}</h3>
             <p className="text-sm text-gray-500 mb-6 flex-grow">Status: <span className="font-semibold text-primary">{t.date}</span></p>
             <div className="grid grid-cols-2 gap-2 mt-auto">
               {(t.uploadedBy === username) && (
                  <button onClick={async () => {
                     const confirmed = window.confirm("Hapus soal AI ini?");
                     if (confirmed) {
                       await set(ref(db, `materials/${t.id}`), null);
                     }
                  }} className="col-span-2 text-xs font-bold bg-red-50 text-red-600 border border-red-100 py-2 rounded-xl mb-2 hover:bg-red-100 transition">Hapus Soal</button>
               )}
               <button 
                 onClick={(e) => {
                   e.preventDefault();
                   const link = `${window.location.origin}/ujian/public/${t.id}`;
                   navigator.clipboard.writeText(link);
                   alert("Link ujian public telah disalin! Salin ini ke teman Anda.");
                 }}
                 className="col-span-1 bg-indigo-50 text-indigo-600 font-bold py-3 rounded-xl text-center transition-colors text-xs hover:bg-indigo-100 border border-indigo-100"
               >
                 Salin Link
               </button>
               <Link href={`/tryout/${t.id}`} className="col-span-1 bg-gray-900 hover:bg-primary dark:bg-white dark:text-gray-900 text-white font-bold py-3 rounded-xl text-center transition-colors shadow-lg text-xs flex items-center justify-center">
                 Mulai Kerjakan
               </Link>
             </div>
           </Card>
         ))}
       </div>
    </div>
  );
}

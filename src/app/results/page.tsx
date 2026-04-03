'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, get, child } from 'firebase/database';
import { Card } from '@/components/ui/Card';
import StatusAnimation from '@/components/StatusAnimation';
import Link from 'next/link';

export default function ResultsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('username');
      if (storedUser) {
        setUsername(storedUser);
        fetchResults(storedUser);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const fetchResults = async (user: string) => {
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `results/${user}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const resultsList = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          date: new Date(val.timestamp).toLocaleString('id-ID')
        })).sort((a, b) => b.timestamp - a.timestamp);
        setResults(resultsList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto">
        <button onClick={() => setSelectedResult(null)} className="text-gray-500 hover:text-primary font-bold self-start mb-2 flex items-center gap-2">
          <span>&larr;</span> Kembali ke Daftar
        </button>
        <Card className="!p-8 border-2 border-primary/20">
          <h2 className="text-3xl font-black mb-2">Detail Pengerjaan</h2>
          <p className="text-gray-500 mb-8 border-b pb-4">Tryout #{selectedResult.tryoutId} • {selectedResult.date}</p>
          
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
                     Jawaban Anda: {ans.userAnswer}
                   </p>
                    {!ans.isCorrect && (
                      <p className="p-4 rounded-xl text-sm font-medium border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300">
                        Jawaban Benar: {ans.correctAnswer}
                      </p>
                    )}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                  <p className="text-xs font-black text-blue-600 mb-2 tracking-widest uppercase">Penjelasan AI</p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{ans.explanation || 'Pembahasan tidak tersedia untuk soal ini.'}</p>
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
    <div className="flex flex-col gap-8 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-extrabold mb-2 text-gray-900 dark:text-white">Hasil Ujian & Pembahasan</h1>
        <p className="text-gray-500">Lihat riwayat nilai dan penjelasan untuk setiap soal yang telah dikerjakan.</p>
      </div>

      <div className="grid gap-6">
        {results.map((res) => (
          <Card key={res.id} className="!p-6 hover:shadow-xl transition-shadow border-2 hover:border-primary">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-grow">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">Tryout #{res.tryoutId}</span>
                  <span className="text-gray-400 text-xs font-medium">{res.date}</span>
                </div>
                <h3 className="text-xl font-bold mb-1">Skor Akhir: {res.score} / 100</h3>
                <p className="text-sm text-gray-500">Pelanggaran: <span className={res.violations > 0 ? 'text-red-500 font-bold' : 'text-green-500'}>{res.violations}</span></p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedResult(res)}
                  className="px-6 py-2 bg-primary text-white rounded-full font-bold text-sm hover:scale-105 transition-transform"
                >
                  Lihat Detail
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

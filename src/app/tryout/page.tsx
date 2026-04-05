'use client';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function TryoutList() {
  const { username } = useAuth();
  const [tryouts, setTryouts] = useState<any[]>([]);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username === undefined) return;

    const fetchData = async () => {
      try {
        const [examsRes, materialsRes] = await Promise.all([
          fetch('/api/backend/exams/list', { cache: 'no-store' }),
          fetch('/api/backend/materials/list', { cache: 'no-store' })
        ]);

        const examsData = await examsRes.json();
        const materialsData = await materialsRes.json();
        
        console.log("Exams from proxy:", examsData);
        console.log("Materials from proxy:", materialsData);

        const handleData = (data: any, isExams = false) => {
          if (!data || data.error) return [];
          return Object.entries(data)
            .filter(([id, val]: [string, any]) =>
              isExams || ((val.type === 'soal' || val.type === 'tryout') && 
              (!val.isPrivate || val.uploadedBy === username))
            )
            .map(([id, val]: [string, any]) => ({
              id,
              ...val,
              title: val.title,
              subject: val.subject || (isExams ? 'Ujian Guru' : 'AI Gen'),
              duration: val.durationMinutes || val.duration || 'Fleksibel',
              date: isExams ? 'Ujian Guru' : 'AI / Soal Tersedia',
              isExam: isExams
            }));
        };

        const exams = handleData(examsData, true);
        const materials = handleData(materialsData, false);

        setTryouts([
          ...exams,
          ...materials
        ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  const handleEditPembahasan = async (t: any) => {
    try {
      setLoading(true);
      const type = t.isExam ? 'exams' : 'materials';
      const res = await fetch(`/api/backend/${type}/${t.id}`);
      if (res.ok) {
        const data = await res.json();
        let qs = [];
        if (data.questions) {
          qs = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;
        } else if (data.content) {
          const content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
          qs = content.questions || content;
        }
        setEditingExam({...t, type});
        setEditingQuestions(qs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePembahasan = async () => {
    if (!editingExam) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/backend/${editingExam.type}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExam.id,
          username,
          updates: {
             [editingExam.type === 'exams' ? 'questions' : 'content']: JSON.stringify(editingQuestions)
          }
        })
      });
      if (res.ok) {
        alert("Pembahasan berhasil disimpan!");
        setEditingExam(null);
      } else {
        alert("Gagal menyimpan pembahasan");
      }
    } catch (err) {
      console.error(err);
      alert("Error saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
           <div>
            <h1 className="text-4xl font-extrabold mb-2 text-gray-900 dark:text-white flex items-center gap-4">
              Ujian & Try Out <img src="/bahan/ready_test.svg" className="w-10 h-10" alt="test"/>
            </h1>
            <p className="text-gray-500">Uji kemampuanmu dengan berbagai simulasi ujian terbaik dan soal AI.</p>
          </div>
          {(useAuth().role === 'teacher' || useAuth().role === 'admin') && (
            <Link href="/teacher/create-exam" className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform shadow-lg shadow-primary/25">
              <span className="text-xl">+</span> Buat Ujian Baru
            </Link>
          )}
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
                   <>
                    <button 
                      onClick={() => handleEditPembahasan(t)}
                      className="p-3 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition-all border border-blue-100 flex items-center justify-center shadow-sm"
                      title="Kelola Pembahasan"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-quote"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m8 12 2-2 2 2"/><path d="m14 12 2-2 2 2"/></svg>
                    </button>
                    <button 
                      onClick={async () => {
                        const confirmed = window.confirm(`Hapus ${t.isExam ? 'ujian' : 'soal AI'} ini?`);
                        if (confirmed) {
                          try {
                            const type = t.isExam ? 'exams' : 'materials';
                            const res = await fetch(`/api/backend/${type}/${t.id}?username=${username}`, {
                              method: 'DELETE'
                            });
                            if (res.ok) {
                              alert("Berhasil dihapus");
                              window.location.reload();
                            } else {
                              const err = await res.json();
                              alert("Gagal menghapus: " + (err.error || "Unknown error"));
                            }
                          } catch (err) {
                            console.error("Error deleting via proxy:", err);
                            alert("Gagal menghubungi server");
                          }
                        }
                      }}
                      className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 flex items-center justify-center shadow-sm"
                      title="Hapus Soal"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
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

       {/* Modal Kelola Pembahasan */}
       {editingExam && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white dark:bg-dark p-6 md:p-8 rounded-[2.5rem] w-full max-w-4xl shadow-2xl border-2 border-primary/20 animate-scale-in my-auto">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Kelola Pembahasan</h2>
                    <p className="text-gray-500 font-medium">Tambahkan atau perbarui penjelasan untuk setiap soal.</p>
                  </div>
                  <button onClick={() => setEditingExam(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
               </div>
               
               <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {editingQuestions.map((q, idx) => (
                    <div key={idx} className="p-6 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">#{idx + 1}</span>
                        <h4 className="font-bold text-gray-900 dark:text-gray-200 line-clamp-1">{q.text || q.question}</h4>
                      </div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Penjelasan / Pembahasan</label>
                      <textarea 
                        className="w-full p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:border-primary/50 text-sm min-h-[100px] transition-all"
                        placeholder="Tuliskan langkah-langkah atau alasan jawaban yang benar..."
                        value={q.pembahasan || q.explanation || ""}
                        onChange={(e) => {
                          const newQs = [...editingQuestions];
                          newQs[idx].pembahasan = e.target.value;
                          newQs[idx].explanation = e.target.value;
                          setEditingQuestions(newQs);
                        }}
                      />
                    </div>
                  ))}
               </div>

               <div className="mt-8 flex gap-3">
                  <button 
                    disabled={isSaving}
                    onClick={handleSavePembahasan}
                    className="flex-grow py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Menyimpan Perubahan..." : "Simpan Semua Pembahasan"}
                  </button>
                  <button 
                    onClick={() => setEditingExam(null)}
                    className="px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black hover:bg-gray-200 transition-colors"
                  >
                    Batal
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}

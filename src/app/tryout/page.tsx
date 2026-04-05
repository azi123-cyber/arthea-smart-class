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

       {/* Modal Kelola Pembahasan - Refined for Responsiveness & Polish */}
       {editingExam && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Animated Backdrop */}
            <div 
              className="absolute inset-0 bg-darker/90 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setEditingExam(null)}
            />
            
            {/* Modal Container */}
            <div className="relative bg-[#0b0f19] border border-white/10 rounded-2xl md:rounded-[2.5rem] w-full max-w-5xl shadow-[0_0_50px_-12px_rgba(0,168,132,0.2)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[92vh] overflow-hidden">
               {/* Header */}
               <div className="p-5 md:p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent">
                  <div className="flex-grow pr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="shrink-0 p-2 bg-primary/20 rounded-xl hidden md:block">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m8 12 2-2 2 2"/><path d="m14 12 2-2 2 2"/></svg>
                      </div>
                      <h2 className="text-xl md:text-3xl font-black text-white tracking-tight truncate uppercase">Kelola Pembahasan</h2>
                    </div>
                    <p className="text-xs md:text-base text-gray-400 font-medium line-clamp-1 md:line-clamp-none">Sempurnakan penjelasan soal untuk pengalaman belajar yang lebih baik.</p>
                  </div>
                  <button 
                    onClick={() => setEditingExam(null)} 
                    className="shrink-0 p-2 md:p-3 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all active:scale-90 bg-white/5 border border-white/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
               </div>
               
               {/* Scrollable Content */}
               <div className="flex-grow overflow-y-auto p-5 md:p-10 custom-scrollbar space-y-6 bg-dark/30">
                  {editingQuestions.map((q, idx) => (
                    <div key={idx} className="group relative p-5 md:p-8 bg-white/5 hover:bg-white/[0.07] rounded-2xl md:rounded-[2.5rem] border border-white/10 transition-all duration-500 overflow-hidden">
                      {/* Decorative Background Element - Subtle on Mobile */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors hidden sm:block" />
                      
                      <div className="relative flex flex-col gap-5">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-black text-base md:text-lg shadow-lg shadow-primary/20">
                            {idx + 1}
                          </div>
                          <div className="flex-grow pt-0.5">
                            <label className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-0.5 md:mb-1 block">Pertanyaan</label>
                            <h4 className="text-lg md:text-xl font-bold text-gray-100 leading-snug md:leading-relaxed line-clamp-2 md:line-clamp-none">{q.text || q.question}</h4>
                          </div>
                        </div>

                        <div className="relative group/textarea">
                          <div className="flex justify-between items-center mb-2 px-1">
                            <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Penjelasan / Pembahasan</label>
                            <span className="text-[8px] md:text-[10px] font-medium text-gray-500 hidden sm:block">Auto-saved as you type</span>
                          </div>
                          <textarea 
                            className="w-full p-4 md:p-6 bg-darker/50 border-2 border-white/5 rounded-xl md:rounded-[2rem] outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 text-gray-200 text-sm md:text-base min-h-[140px] md:min-h-[160px] transition-all resize-none shadow-inner"
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
                      </div>
                    </div>
                  ))}
               </div>

               {/* Footer Actions */}
               <div className="p-5 md:p-10 border-t border-white/5 bg-darker/50 flex flex-col md:flex-row gap-3">
                  <button 
                    disabled={isSaving}
                    onClick={handleSavePembahasan}
                    className="flex-grow group relative py-4 md:py-5 bg-primary hover:bg-primary-dark text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden order-1 md:order-1"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-5 md:h-5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                          <span>Simpan Semua</span>
                        </>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </button>
                  <button 
                    onClick={() => setEditingExam(null)}
                    className="px-6 md:px-10 py-4 md:py-5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg border border-white/10 transition-all active:scale-[0.98] order-2 md:order-2"
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

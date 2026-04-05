'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import StatusAnimation from '@/components/StatusAnimation';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, ChevronLeft, Plus, Trash2, PencilLine } from 'lucide-react';

export default function ExamEditor() {
  const params = useParams();
  const router = useRouter();
  const { username, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for username to be defined (AuthContext might be loading)
    if (!params.id || username === undefined) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Try to fetch from exams first
        let type = 'exams';
        let res = await fetch(`/api/backend/exams/${params.id}`, { cache: 'no-store' });
        if (!res.ok) {
          type = 'materials';
          res = await fetch(`/api/backend/materials/${params.id}`, { cache: 'no-store' });
        }

        if (res.ok) {
          const data = await res.json();
          // Permission Check: only original uploader or admin can edit
          if (data.uploadedBy !== username && role !== 'admin') {
            setError("Anda tidak memiliki izin untuk mengedit ujian ini.");
            return;
          }

          setExamData({ ...data, type });
          let qs = [];
          if (data.questions) {
            qs = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;
          } else if (data.content) {
            const content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            qs = content.questions || content;
          }
          if (!Array.isArray(qs)) qs = [qs];
          setQuestions(qs);
        } else {
          setError("Gagal memuat data ujian.");
        }
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan saat memuat data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, username, role]);

  const handleSave = async () => {
    if (!examData) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/backend/${examData.type}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.id,
          username,
          updates: {
             title: examData.title,
             [examData.type === 'exams' ? 'questions' : 'content']: JSON.stringify(questions)
          }
        })
      });

      if (res.ok) {
        alert("Ujian berhasil diperbarui!");
        router.push('/tryout');
        router.refresh();
      } else {
        const errData = await res.json();
        alert("Gagal menyimpan: " + (errData.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error saat menghubungi server.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = (idx: number, updates: any) => {
    const newQs = [...questions];
    newQs[idx] = { ...newQs[idx], ...updates };
    setQuestions(newQs);
  };

  const addQuestion = () => {
    setQuestions([...questions, { 
      question: "Pertanyaan Baru", 
      options: ["Opsi A", "Opsi B", "Opsi C", "Opsi D"], 
      correctAnswer: "Opsi A", 
      explanation: "",
      type: "Pilihan Ganda"
    }]);
  };

  const deleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert("Minimal harus ada satu soal.");
      return;
    }
    if (window.confirm("Hapus soal ini?")) {
      setQuestions(questions.filter((_, i) => i !== idx));
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark text-white">
      <StatusAnimation type="loading" message="Membuka Ruang Edit..." />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-dark">
      <StatusAnimation type="error" message="Akses Ditolak" subMessage={error} />
      <Link href="/tryout" className="mt-8 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all">
        Kembali ke Bank Soal
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark text-white selection:bg-primary/30">
      <div className="max-w-5xl mx-auto p-4 md:p-10 animate-fade-in pb-40">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex-grow">
            <Link href="/tryout" className="flex items-center gap-2 text-gray-500 hover:text-primary transition-all font-bold text-sm mb-4 inline-flex group">
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Kembali
            </Link>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-primary/20 rounded-2xl">
                <PencilLine size={24} className="text-primary" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase">Edit Workspace</h1>
            </div>
            <p className="text-gray-400 font-medium text-lg">Sesuaikan konten dan pembahasan ujian Anda dengan mudah.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
             <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-grow md:flex-initial flex items-center justify-center gap-3 px-10 py-5 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-lg shadow-[0_10px_30px_-10px_rgba(0,168,132,0.4)] hover:shadow-[0_15px_40px_-10px_rgba(0,168,132,0.5)] active:scale-95 transition-all disabled:opacity-50"
              >
                <Save size={22} /> {isSaving ? "Menyimpan..." : "Simpan Fix"}
              </button>
          </div>
        </div>

        <div className="space-y-10">
          {/* Judul Ujian Card */}
          <Card className="!p-8 md:!p-10 bg-[#0b0f19] border-white/5 shadow-2xl">
             <div className="relative group">
                <label className="block text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Judul Utama Ujian</label>
                <input 
                  type="text" 
                  value={examData.title}
                  onChange={(e) => setExamData({...examData, title: e.target.value})}
                  className="w-full text-2xl md:text-4xl font-black bg-transparent border-b-4 border-white/5 focus:border-primary outline-none transition-all pb-4 text-white placeholder:text-white/10"
                  placeholder="Masukkan Judul Ujian Disini..."
                />
             </div>
          </Card>

          {/* Question List Section */}
          <div className="space-y-16 mt-16">
            {questions.map((q, idx) => (
              <div key={idx} className="relative pl-0 md:pl-12">
                 {/* Question Number Badge - Sidebar Style */}
                 <div className="hidden md:flex absolute left-0 top-0 w-px h-full bg-gradient-to-b from-primary/50 via-white/5 to-transparent items-center justify-start">
                    <div className="absolute top-0 -left-6 w-12 h-12 rounded-2xl bg-dark border-2 border-primary/30 flex items-center justify-center font-black text-xl text-primary shadow-[0_0_20px_rgba(0,168,132,0.15)]">
                      {idx + 1}
                    </div>
                 </div>

                 <Card className="!p-8 md:!p-12 bg-white/5 border-white/10 rounded-[3rem] shadow-2xl hover:bg-white/[0.07] transition-all duration-500 overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
                    
                    <div className="relative flex justify-between items-center mb-10 pb-6 border-b border-white/5">
                        <div className="flex items-center gap-3 md:hidden">
                           <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black">{idx+1}</div>
                           <span className="font-black uppercase tracking-widest text-xs">Detail Soal</span>
                        </div>
                        <span className="hidden md:inline-flex px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-white/5">Question Settings</span>
                        <button 
                          onClick={() => deleteQuestion(idx)}
                          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 active:scale-90"
                          title="Hapus Soal"
                        >
                          <Trash2 size={20} />
                        </button>
                    </div>

                    <div className="space-y-10">
                        {/* Question Input */}
                        <div>
                           <div className="flex justify-between items-end mb-3 px-1">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Konten Pertanyaan</label>
                              <span className="text-[10px] text-primary/60 font-bold">Markdown Ready</span>
                           </div>
                           <textarea 
                              className="w-full p-6 md:p-8 bg-dark/50 border-2 border-white/5 rounded-[2.5rem] outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 text-white text-lg md:text-xl font-medium min-h-[180px] transition-all resize-none shadow-inner"
                              value={q.question || q.text || q.questions || ""}
                              onChange={(e) => updateQuestion(idx, { question: e.target.value, text: e.target.value })}
                              placeholder="Tuliskan soal Anda di sini..."
                           />
                        </div>

                        {/* Options Section */}
                        {q.options && Array.isArray(q.options) && (
                           <div className="bg-dark/40 p-6 md:p-10 rounded-[3rem] border border-white/5">
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-8 text-center">Opsi Jawaban Ganda</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                 {q.options.map((opt: string, optIdx: number) => (
                                    <div key={optIdx} className="relative group/opt">
                                       <div className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-primary/40 text-xs group-focus-within/opt:text-primary transition-colors">
                                          {String.fromCharCode(65 + optIdx)}
                                       </div>
                                       <input 
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const newOpts = [...q.options];
                                            newOpts[optIdx] = e.target.value;
                                            updateQuestion(idx, { options: newOpts });
                                          }}
                                          className="w-full pl-20 pr-6 py-5 bg-white/5 border-2 border-transparent focus:border-primary/30 rounded-2xl outline-none text-white font-bold transition-all"
                                          placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                                       />
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Config Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Kunci Jawaban</label>
                              <input 
                                 type="text"
                                 value={q.correctAnswer}
                                 onChange={(e) => updateQuestion(idx, { correctAnswer: e.target.value })}
                                 className="w-full p-4 bg-primary/10 border-2 border-primary/20 rounded-2xl outline-none focus:border-primary text-primary font-black"
                                 placeholder="Contoh: A atau Nama Opsi"
                              />
                           </div>

                           <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 ml-1">Kategori Soal</label>
                              <div className="relative">
                                <select 
                                    value={q.type || "Pilihan Ganda"}
                                    onChange={(e) => updateQuestion(idx, { type: e.target.value })}
                                    className="w-full p-4 bg-dark/50 border-2 border-white/10 rounded-2xl outline-none focus:border-primary text-white font-bold appearance-none cursor-pointer"
                                >
                                  <option value="Pilihan Ganda">Pilihan Ganda</option>
                                  <option value="PGK">Pilihan Ganda Kompleks</option>
                                  <option value="Essay">Essay / Isian</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                              </div>
                           </div>
                        </div>

                        {/* Explanation Area */}
                        <div className="pt-6 border-t border-white/5">
                           <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 ml-1">Pembahasan & Penjelasan Solusi</label>
                           <textarea 
                              className="w-full p-6 md:p-8 bg-primary/5 border-2 border-primary/10 rounded-[2.5rem] outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 text-gray-200 text-base md:text-lg font-medium min-h-[140px] transition-all resize-none shadow-inner"
                              value={q.explanation || q.pembahasan || ""}
                              onChange={(e) => updateQuestion(idx, { explanation: e.target.value, pembahasan: e.target.value })}
                              placeholder="Tuliskan kunci rahasia atau langkah pengerjaan di sini..."
                           />
                        </div>
                    </div>
                 </Card>
              </div>
            ))}

            {/* Add Question Button */}
            <button 
              onClick={addQuestion}
              className="w-full py-16 border-4 border-dashed border-white/5 rounded-[4rem] text-gray-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-6 group scale-[0.98] hover:scale-100 transition-all duration-500"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-all duration-500 group-hover:rotate-90">
                 <Plus size={40} />
              </div>
              <div className="text-center">
                 <span className="text-2xl font-black uppercase tracking-[0.4em] block mb-2">Tambah Soal</span>
                 <p className="text-sm font-medium text-gray-500 group-hover:text-primary/60">Perkaya materi ujian Anda</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Floating Controls */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50 animate-in slide-in-from-bottom-10 duration-700">
         <div className="bg-[#0b0f19]/80 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex gap-4 ring-1 ring-white/10">
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex-grow flex items-center justify-center gap-3 py-5 bg-primary hover:bg-primary-dark text-white rounded-[1.5rem] font-black shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save size={22} />
              <span>{isSaving ? "PROSES..." : "SIMPAN SEMUA"}</span>
            </button>
            <button 
              onClick={() => {
                if (window.confirm("Batalkan perubahan? Data yang belum disimpan akan hilang.")) {
                  router.push('/tryout');
                }
              }}
              className="px-8 py-5 bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 rounded-[1.5rem] font-black border border-white/10 transition-all active:scale-95"
            >
              BATAL
            </button>
         </div>
      </div>
    </div>
  );
}

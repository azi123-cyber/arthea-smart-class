'use client';
import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import StatusAnimation from '@/components/StatusAnimation';
import { Sparkles, FileText, UploadCloud, Brain, Zap, Settings, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://154.12.117.59:5094';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'buat_token_rahasia_panjang_kamu_disini';

export default function AIGenerator() {
  const { username, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [subMateri, setSubMateri] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState(1);
  const [duration, setDuration] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [tokenUjian, setTokenUjian] = useState("");
  const [includeClue, setIncludeClue] = useState(true);
  const [includeExplanation, setIncludeExplanation] = useState(true);
  const [modelType, setModelType] = useState("Pintar");
  const [language, setLanguage] = useState("Indonesia");
  const [limits, setLimits] = useState({ Pintar: 0, Menengah: 0, Biasa: 0 });
  const [materialId, setMaterialId] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Force Gemini untuk guru
  useEffect(() => {
    if (role === 'teacher' || role === 'admin') {
      setModelType("Pintar");
    }
  }, [role]);

  useEffect(() => {
    if (username) {
      fetch(`${BACKEND_URL}/ai/limits?uid=${username}`, {
        headers: { 'x-api-token': API_TOKEN }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLimits(data.data);
        }
      })
      .catch(err => console.error("Error fetching AI limits:", err));
    }
  }, [username]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!prompt || !username) return;
    setLoading(true);
    
    let imageContent = "";
    let imageMimeType = "";
    if (selectedFile) {
       try {
         const reader = new FileReader();
         await new Promise<void>((resolve, reject) => {
           reader.onload = () => {
             const result = reader.result as string;
             const parts = result.split(',');
             imageContent = parts[1] || "";
             imageMimeType = selectedFile.type;
             resolve();
           };
           reader.onerror = reject;
           reader.readAsDataURL(selectedFile);
         });
       } catch (e) {
         console.error("Gagal membaca file referensi", e);
       }
    }

    try {
      const response = await fetch(`${BACKEND_URL}/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": API_TOKEN
        },
        body: JSON.stringify({
          uid: username,
          prompt: prompt,
          subMateri: subMateri,
          modelType: modelType,
          difficulty: difficulty,
          count: questionCount,
          language: language,
          duration: duration,
          maxAttempts: maxAttempts,
          tokenUjian: tokenUjian,
          includeClue: includeClue,
          includeExplanation: includeExplanation,
          role: role,
          imageContent: imageContent,
          imageMimeType: imageMimeType
        })
      });
      
      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON API Output:", responseText);
        alert("Gagal terhubung ke backend. Pastikan backend dengan fitur AI sudah berjalan (node server.js lokal atau di server pterodactyl terupdate).");
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        alert(data.error || "Terjadi kesalahan saat membuat soal.");
        setLoading(false);
        return;
      }
      
      if (data.success) {
        setLimits(data.limits);
        setMaterialId(data.materialId || "");
        setGeneratedQuestions(data.questions || []);
        setGenerated(true);
      } else {
        alert("Gagal men-generate soal.");
      }
      
    } catch (err) {
      console.error(err);
      alert("Koneksi ke server gagal.");
    } finally {
      setLoading(false);
    }
  };

  const isLimitReached = (type: string) => {
    if (role === "teacher" || role === "admin") {
       if (type === "Pintar" && limits.Pintar >= 8) return true;
       if (type === "Menengah" && limits.Menengah >= 8) return true;
       if (type === "Biasa" && limits.Biasa >= 10) return true;
    } else {
       if (type === "Pintar" && limits.Pintar >= 1) return true;
       if (type === "Menengah" && limits.Menengah >= 1) return true;
       if (type === "Biasa" && limits.Biasa >= 5) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-5xl mx-auto pb-20 px-4 md:px-6">
      <div className="text-center mb-8 mt-4">
         <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-white flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 tracking-tight">
           <span>AI Question Generator</span> <img src="/bahan/document_ready.svg" className="w-10 h-10 md:w-12 md:h-12 dark-icon-bright" alt="ai" />
         </h1>
         <p className="text-gray-500 max-w-2xl mx-auto font-medium px-2">Generate soal otomatis dengan bantuan AI. Sesuaikan tingkat kesulitan dan tipe kecerdasan mesin.</p>
      </div>

      {!generated ? (
        <Card className="!p-8 border-2 border-gray-50 dark:border-gray-800 shadow-xl">
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
             <div className="flex flex-col gap-6">
                <div>
                   <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Prompt Detail (Prompt Utama)</label>
                   <textarea 
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     placeholder="Contoh: Buatkan soal HOTS tentang hukum Newton beserta pembahasannya..."
                     className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-2xl p-6 min-h-[160px] outline-none transition-all placeholder:opacity-50 font-medium"
                   ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Sub Materi (Opsional)</label>
                    <input 
                      value={subMateri}
                      onChange={(e) => setSubMateri(e.target.value)}
                      type="text" 
                      placeholder="Contoh: Newton"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none transition-all placeholder:opacity-50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Bahasa Output</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none transition-all font-bold text-gray-900 dark:text-white appearance-none"
                    >
                      <option value="Indonesia">Indonesia</option>
                      <option value="English">English</option>
                      <option value="Arabic">Arab</option>
                      <option value="Mandarin">Mandarin</option>
                      <option value="Jepang">Jepang</option>
                    </select>
                  </div>
                </div>
                
                {/* File Upload Placeholder */}
                <div>
                  <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Upload Referensi Tambahan</label>
                  <div 
                    onClick={triggerFileSelect}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 cursor-pointer transition-all bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-5 flex flex-col items-center justify-center group text-center"
                  >
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png"/>
                     <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-500">
                        <UploadCloud className="text-primary opacity-50 group-hover:opacity-100 transition-opacity" size={24} />
                     </div>
                     <p className="text-gray-600 dark:text-gray-400 font-bold tracking-tight text-sm">
                       {selectedFile ? selectedFile.name : 'Upload File Referensi'}
                     </p>
                  </div>
                </div>
             </div>

             <div className="flex flex-col gap-6">
                <div>
                   <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Model AI</label>
                   <div className="flex flex-col gap-3">
                      <button onClick={() => setModelType("Pintar")} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${modelType === 'Pintar' ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-800'}`}>
                         <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-xl ${modelType === 'Pintar' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}><Brain size={20} /></div>
                           <div className="text-left">
                             <p className="font-bold text-gray-900 dark:text-white">AI Pintar</p>
                             <p className="text-[10px] text-gray-500 font-black tracking-wider uppercase">Akurat & Rinci</p>
                           </div>
                         </div>
                         <div className="text-right">
                           {isLimitReached("Pintar") ? <span className="text-xs font-black text-red-500 flex items-center gap-1"><Lock size={12}/> Habis</span> : <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-md">{1 - limits.Pintar}/1 Sisa</span>}
                         </div>
                      </button>

                      {(role !== 'teacher' && role !== 'admin') && (
                         <>
                           <button onClick={() => setModelType("Menengah")} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${modelType === 'Menengah' ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-800'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${modelType === 'Menengah' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}><Zap size={20} /></div>
                                <div className="text-left">
                                  <p className="font-bold text-gray-900 dark:text-white">AI Menengah</p>
                                  <p className="text-[10px] text-gray-500 font-black tracking-wider uppercase">Cepat & Analitis</p>
                                </div>
                              </div>
                              <div className="text-right">
                                {isLimitReached("Menengah") ? <span className="text-xs font-black text-red-500 flex items-center gap-1"><Lock size={12}/> Habis</span> : <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-md">{1 - limits.Menengah}/1 Sisa</span>}
                              </div>
                           </button>

                           <button onClick={() => setModelType("Biasa")} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${modelType === 'Biasa' ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-800'}`}>
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${modelType === 'Biasa' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}><Settings size={20} /></div>
                                <div className="text-left">
                                  <p className="font-bold text-gray-900 dark:text-white">AI Biasa</p>
                                  <p className="text-[10px] text-gray-500 font-black tracking-wider uppercase">Cocok Untuk Soal Ringan</p>
                                </div>
                              </div>
                              <div className="text-right">
                                {isLimitReached("Biasa") ? <span className="text-xs font-black text-red-500 flex items-center gap-1"><Lock size={12}/> Habis</span> : <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-md">{5 - limits.Biasa}/5 Sisa</span>}
                              </div>
                           </button>
                         </>
                      )}
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Tingkat Kesulitan</label>
                    <select 
                      value={difficulty}
                      onChange={(e) => setDifficulty(parseInt(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none transition-all font-bold text-gray-900 dark:text-white appearance-none"
                    >
                      <option value={1}>1 - Mudah (Banyak Clue)</option>
                      <option value={2}>2 - Sedang (Clue Singkat)</option>
                      <option value={3}>3 - Sulit (Tanpa Clue)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Jumlah</label>
                    <input 
                      type="number"
                      min="1"
                      max="20"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none transition-all font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Waktu (Menit)</label>
                    <input 
                      type="number"
                      min="1"
                      max="180"
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none transition-all font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Batas Mengerjakan</label>
                    <input 
                      type="number"
                      min="1"
                      max="10"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none transition-all font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3 ml-1">Token Ujian (Opsional)</label>
                    <input 
                      type="text"
                      value={tokenUjian}
                      onChange={(e) => setTokenUjian(e.target.value)}
                      placeholder="Kosongkan jika tidak perlu token"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none transition-all font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={includeClue} onChange={(e) => setIncludeClue(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">Sertakan Clue Bantuan</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={includeExplanation} onChange={(e) => setIncludeExplanation(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary" />
                    <span className="font-bold text-sm text-gray-700 dark:text-gray-300">Sertakan Pembahasan AI</span>
                  </label>
                </div>
             </div>
           </div>

           {loading ? (
              <div className="mt-8 flex justify-center py-10">
                 <StatusAnimation type="loading" message="AI Sedang Memproses..." subMessage={`Membuat ${questionCount} soal dengan AI ${modelType}...`} />
              </div>
           ) : (
             <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button 
                   onClick={handleGenerate}
                   disabled={!prompt || isLimitReached(modelType)}
                   className={`px-8 py-4 md:px-10 md:py-5 rounded-full font-black flex items-center gap-3 transition-all duration-300 shadow-xl
                      ${prompt && !isLimitReached(modelType) ? 'bg-primary text-white hover:scale-105 shadow-primary/30' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'}`}
                >
                   <Sparkles size={24} />
                   <span>{isLimitReached(modelType) ? 'Limit Harian Habis' : 'Generate Soal Sekarang'}</span>
                </button>
             </div>
           )}
        </Card>
      ) : (role === 'teacher' || role === 'admin') ? (
        <Card className="!p-8 animate-fade-in border-4 border-primary/10 shadow-2xl max-w-4xl mx-auto w-full">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Review & Edit Soal AI</h2>
            <p className="text-gray-500 mb-8 font-medium">Tinjau soal yang dihasilkan, perbaiki jika ada kesalahan, lalu simpan ke Bank Soal.</p>
            <div className="flex flex-col gap-6">
               {generatedQuestions.map((q, idx) => (
                  <div key={idx} className="p-6 border-2 border-gray-100 dark:border-gray-800 rounded-2xl bg-white dark:bg-dark">
                      <label className="font-black text-primary text-sm uppercase tracking-widest">Pertanyaan {idx + 1}</label>
                      <textarea 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border focus:border-primary/30 rounded-xl mt-3 font-medium min-h-[100px]" 
                        value={q.question} 
                        onChange={(e) => {
                           const newQ = [...generatedQuestions];
                           newQ[idx].question = e.target.value;
                           setGeneratedQuestions(newQ);
                        }}
                      />
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                         {q.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx}>
                              <label className="text-xs font-bold text-gray-400 block mb-1">Opsi {String.fromCharCode(65 + optIdx)}</label>
                              <input 
                                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 font-medium focus:border-primary/30" 
                                value={opt} 
                                onChange={(e) => {
                                   const newQ = [...generatedQuestions];
                                   newQ[idx].options[optIdx] = e.target.value;
                                   setGeneratedQuestions(newQ);
                                }}
                              />
                            </div>
                         ))}
                      </div>
                      <div className="mt-4">
                         <label className="text-xs font-bold text-gray-400 block mb-1">Jawaban Benar</label>
                         <input className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold max-w-xs focus:border-primary/30" 
                            value={q.correctAnswer} 
                            placeholder="A, B, C, atau D"
                            onChange={(e) => {
                               const newQ = [...generatedQuestions];
                               newQ[idx].correctAnswer = e.target.value;
                               setGeneratedQuestions(newQ);
                         }} />
                      </div>
                  </div>
               ))}
               <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                   <button onClick={() => setGenerated(false)} className="px-6 py-3 rounded-full font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Batal / Buat Ulang</button>
                   <button onClick={async () => {
                       setLoading(true);
                       try {
                          const materialTitle = `AI Generated: ${prompt.substring(0, 30)}`;
                          const res = await fetch(`${BACKEND_URL}/materials/upload`, {
                             method: 'POST',
                             headers: { 'Content-Type': 'application/json', 'x-api-token': API_TOKEN },
                             body: JSON.stringify({
                                title: materialTitle, subject: subMateri || "AI Generator",
                                type: "soal", content: JSON.stringify(generatedQuestions)
                             })
                          });
                          if(res.ok) {
                             alert("Berhasil disimpan ke Bank Soal Umum!");
                             setGenerated(false);
                             setPrompt("");
                          } else {
                             alert("Gagal menyimpan!");
                          }
                       } catch(e) { alert("Error menyimpan ke server!") }
                       setLoading(false);
                   }} className="px-8 py-3 rounded-full bg-primary text-white font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/25">Simpan ke Bank Soal Umum</button>
               </div>
            </div>
        </Card>
      ) : (
        <Card className="!p-10 animate-fade-in border-4 border-primary/10 shadow-2xl max-w-2xl mx-auto w-full">
           <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                 <FileText className="text-green-600 dark:text-green-400" size={48} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Soal Berhasil Dibuat!</h2>
              <p className="text-gray-500 mb-10 max-w-md font-medium">{questionCount} Soal dengan tingkat kesulitan {difficulty} telah siap di bank soal kamu secara privat.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                 <button onClick={() => setGenerated(false)} className="px-8 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-black hover:bg-gray-200 transition-colors">Buat Lagi</button>
                 <Link href="/tryout" className="px-12 py-4 rounded-2xl bg-primary text-white font-black hover:scale-105 transition-transform shadow-lg shadow-primary/25">Lihat Bank Soal</Link>
              </div>
           </div>
        </Card>
      )}
    </div>
  );
}

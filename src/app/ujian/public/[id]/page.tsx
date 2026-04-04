'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import StatusAnimation from '@/components/StatusAnimation';
import { AlertTriangle, User, Image } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function PublicQuizInterface() {
  const params = useParams();
  const { username, role } = useAuth(); // Ambil user login
  const [guestName, setGuestName] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [materialData, setMaterialData] = useState<any>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [ipBlocked, setIpBlocked] = useState<string | null>(null);

  const BACKEND_URL = '/api/backend';
  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'buat_token_rahasia_panjang_kamu_disini';


  useEffect(() => {
    if (!params.id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        // Coba branch exams (Manual) baru fallback ke materials (AI)
        let snap = await get(ref(db, `exams/${params.id}`));
        if (!snap.exists()) {
          snap = await get(ref(db, `materials/${params.id}`));
        }

        if (snap.exists()) {
          const data = snap.val();
          setMaterialData(data);
          
          let qList = [];
          if (data.questions) {
            qList = typeof data.questions === 'string' ? JSON.parse(data.questions) : data.questions;
          } else if (data.content) {
            const content = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            qList = content.questions || content;
          }
          
          if (!Array.isArray(qList)) qList = [qList];
          setQuestions(qList);

          // Handle timer
          const dur = Number(data.durationMinutes || data.duration);
          if (dur && dur > 0) {
            setTimeLeft(dur * 60);
          } else {
            setTimeLeft(0);
          }
        } else {
          setIsDeleted(true);
        }
      } catch (err) {
        console.error("Error loading exam:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);


  const currentQuestion = questions[currentQuestionIndex] || null;
  const selectedOption = answers[currentQuestionIndex] ?? null;

  const saveResults = async () => {
    // Ambil username dari context atau fallback ke localStorage
    const activeUsername = username || (typeof window !== 'undefined' ? localStorage.getItem('username') : null);

    if (!activeUsername) {
       console.log("Guest exam finished. Showing results locally.");
       return;
    }

    try {
      let correctCount = 0;
      let wrongCount = 0;

      const detailedAnswers = questions.map((q, idx) => {
         const userAns = answers[idx];
         let isCorrect = false;
         
         // Safe check for correct answer source (AI might use 'answer' instead of 'correctAnswer')
         const rawCorrectAns = q.correctAnswer ?? q.answer ?? "";

         if (q.type === 'PGK') {
            const correctArr = Array.isArray(rawCorrectAns) ? rawCorrectAns : [String(rawCorrectAns)];
            const userArr = Array.isArray(userAns) ? userAns.map((i: number) => String.fromCharCode(65 + i)) : [];
            isCorrect = correctArr.length > 0 && correctArr.length === userArr.length && correctArr.every((v: string) => userArr.includes(v));
         } else if (q.type === 'Essay') {
            isCorrect = String(userAns || "").trim().toLowerCase() === String(rawCorrectAns || "").trim().toLowerCase();
         } else {
            // Default PG
            isCorrect = userAns !== undefined && ((q.options || [])[userAns] === rawCorrectAns || String.fromCharCode(65 + userAns) === rawCorrectAns);
         }

         if (isCorrect) correctCount++; else wrongCount++;
         
         let displayUserAns = "Tidak Dijawab";
         if (q.type === 'PGK' && Array.isArray(userAns)) {
            displayUserAns = userAns.map(i => (q.options || [])[i] || String.fromCharCode(65 + i)).join(", ");
         } else if (q.type === 'Essay') {
            displayUserAns = userAns || "Tidak Dijawab";
         } else if (userAns !== undefined) {
            displayUserAns = (q.options || [])[userAns] || String.fromCharCode(65 + userAns);
         }

         return {
            question: q.text || q.question || "Pertanyaan",
            userAnswer: displayUserAns || "Tidak Dijawab",
            correctAnswer: Array.isArray(rawCorrectAns) ? rawCorrectAns.join(", ") : String(rawCorrectAns || "-"),
            isCorrect,
            explanation: q.explanation || q.pembahasan || "Pembahasan tidak tersedia.",
         };
      });

      const score = Math.round((correctCount / questions.length) * 100);

      // Bersihkan data dari objek/properti bernilai undefined untuk mencegah Firebase Error (crash)
      const dataToSave = {
        answers: detailedAnswers,
        violations,
        score,
        correctCount,
        wrongCount,
        timestamp: Date.now(),
        tryoutId: params.id,
        title: materialData?.title || "Ujian"
      };

      // Simpan riwayat untuk user login
      const dbRef = ref(db, `results/${activeUsername}/${params.id}_${Date.now()}`);
      await set(dbRef, JSON.parse(JSON.stringify(dataToSave)));
      
      // Duplikasi ke Bank Soal User B (Login Only)
      const duplicateRef = ref(db, `materials/${params.id}_dup_${activeUsername}`);
      const dupSnap = await get(duplicateRef);
      if (!dupSnap.exists()) {
         const dupData = {
           ...materialData,
           id: `${params.id}_dup_${activeUsername}`,
           uploadedBy: activeUsername,
           createdAt: Date.now(),
           isPrivate: true,
           isDuplicate: true,
           originalId: params.id
         };
         await set(duplicateRef, JSON.parse(JSON.stringify(dupData)));
      }

    } catch (err) {
      console.error("Failed to save result/duplicate:", err);
    }
  };

  const handleStartExam = async () => {
     if (!guestName.trim() && !username) return;
     setLoading(true);
     try {
        const res = await fetch(`${BACKEND_URL}/api/track-ip`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ action: username ? 'exam_login' : 'exam_guest' })
        });
        if (!res.ok) {
           const data = await res.json();
           setIpBlocked(data.error || "Akses diblokir.");
           setLoading(false);
           return;
        }
        setHasStarted(true);
     } catch (e) {
        setHasStarted(true); // Fallback if backend down
     } finally {
        setLoading(false);
     }
  };


  useEffect(() => {
     if (questions.length > 0 && !submitted && hasStarted) {
        const timer = setInterval(() => {
           setTimeLeft(prev => {
              if (prev <= 1) {
                 clearInterval(timer);
                 setSubmitted(true);
                 saveResults();
                 return 0;
              }
              return prev - 1;
           });
        }, 1000);
        return () => clearInterval(timer);
     }
  }, [questions, submitted, hasStarted]);

  const formatTime = (seconds: number) => {
     const h = Math.floor(seconds / 3600);
     const m = Math.floor((seconds % 3600) / 60);
     const s = seconds % 60;
     return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (submitted || !hasStarted) return;
    const handleViolation = (reason: string) => {
      setViolations(prev => {
        const newVal = prev + 1;
        if (newVal >= 3) setSubmitted(true);
        else setShowWarning(true);
        return newVal;
      });
    };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') handleViolation('visibility_hidden'); };
    const onWindowBlur = () => handleViolation('window_blur');
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) handleViolation('mouse_leave_window');
    };
    const preventCopyPasteCombo = (e: ClipboardEvent) => { e.preventDefault(); alert("Aksi ini tidak diizinkan selama ujian!"); };
    const preventContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    const preventDevTools = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) { e.preventDefault(); alert("Akses dilarang!"); }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener("copy", preventCopyPasteCombo);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventDevTools);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener("copy", preventCopyPasteCombo);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventDevTools);
    };
  }, [submitted, hasStarted]);

  if (isDeleted) return <div className="text-center py-20"><StatusAnimation type="access_denied" message="Ujian Permanen Dihapus" subMessage="Pemilik soal telah menghapus materi ini, sehingga tidak dapat dikerjakan lagi." /></div>;
  if (ipBlocked) return <div className="text-center py-20"><StatusAnimation type="access_denied" message="Akses Dibatasi" subMessage={ipBlocked} /></div>;

  if (!hasStarted) {
     return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in w-full max-w-md mx-auto">
           <Card className="!p-8 w-full border-2 border-primary/20">
              <h2 className="text-2xl font-black mb-4 text-center">Mulai Ujian</h2>
              {username ? (
                 <div className="text-center mb-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-sm font-bold text-primary">Anda masuk sebagai: {username}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Ujian ini akan otomatis tersimpan di riwayat & bank soal Anda.</p>
                 </div>
              ) : (
                 <>
                    <p className="text-sm text-gray-500 text-center mb-6">Masukkan nama Anda untuk mulai pengerjaan publik (Tanpa Riwayat).</p>
                    <div className="relative mb-6">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                       <input 
                         type="text" 
                         value={guestName}
                         onChange={(e) => setGuestName(e.target.value)}
                         className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-transparent bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary/30 font-bold"
                         placeholder="Nama Lengkap"
                       />
                    </div>
                 </>
              )}
              <button 
                 onClick={handleStartExam}
                 disabled={!username && !guestName.trim()}
                 className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 disabled:opacity-50 transition hover:scale-[1.02]"
               >
                 {username ? 'Mulai Ujian & Simpan' : 'Mulai Sekarang'}
              </button>
              {!username && (
                 <p className="text-[10px] text-gray-400 text-center mt-4">Pengerjaan tanpa login hanya dapat melihat pembahasan di akhir tanpa menyimpan bukti/riwayat.</p>
              )}
              {!username && (
                <div className="mt-8 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-300 dark:text-gray-600">by arsyir azeim</p>
                </div>
              )}
           </Card>
        </div>
     );
  }

  if (submitted) {
    if (violations >= 3) {
       return (
         <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in w-full max-w-2xl mx-auto">
            <StatusAnimation type="access_denied" message="Ujian Dihentikan" subMessage="Anda didiskualifikasi karena pelanggaran berulang." />
         </div>
       );
    }

    // REVIEW MODE (Direct results for guest/all)
    const correctCount = questions.filter((q, idx) => {
       const userAns = answers[idx];
       if (q.type === 'PGK') {
          const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
          const userArr = Array.isArray(userAns) ? userAns.map((i: number) => String.fromCharCode(65 + i)) : [];
          return correctArr.length === userArr.length && correctArr.every((v: string) => userArr.includes(v));
       } else if (q.type === 'Essay') {
          return String(userAns || "").trim().toLowerCase() === String(q.correctAnswer || "").trim().toLowerCase();
       } else {
          return userAns !== undefined && (q.options[userAns] === q.correctAnswer || String.fromCharCode(65 + userAns) === q.correctAnswer);
       }
    }).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto pb-20">
         <StatusAnimation type="success" message="Selesai!" subMessage={username ? "Riwayat pengerjaan Anda telah disimpan di tab Hasil." : "Lihat pembahasan Anda di bawah ini."} />
         
         <Card className="!p-8 border-2 border-primary/20">
            <h2 className="text-3xl font-black mb-6 text-center">Skor Anda: {score}</h2>
            
            <div className="space-y-10">
               {questions.map((q, idx) => {
                  const userIdx = answers[idx];
                  let isCorrect = false;
                  if (q.type === 'PGK') {
                     const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
                     const userArr = Array.isArray(userIdx) ? userIdx.map((i: number) => String.fromCharCode(65 + i)) : [];
                     isCorrect = correctArr.length === userArr.length && correctArr.every((v: string) => userArr.includes(v));
                  } else if (q.type === 'Essay') {
                     isCorrect = String(userIdx || "").trim().toLowerCase() === String(q.correctAnswer || "").trim().toLowerCase();
                  } else {
                     isCorrect = userIdx !== undefined && ((q.options || [])[userIdx] === q.correctAnswer || String.fromCharCode(65 + userIdx) === q.correctAnswer);
                  }
                  return (
                     <div key={idx} className="border-l-4 border-gray-100 dark:border-gray-800 pl-6 py-2">
                        <div className="flex items-center gap-3 mb-2">
                           <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                           {isCorrect ? <span className="text-[10px] font-black bg-green-100 text-green-600 px-2 py-0.5 rounded">BENAR</span> : <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded">SALAH</span>}
                        </div>
                        <p className="font-bold text-lg mb-4">{q.text || q.question}</p>
                        <div className="space-y-2 mb-4">
                           <div className={`p-4 rounded-xl text-sm border font-medium ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                             <p className="font-black text-[10px] uppercase mb-1 opacity-50">Jawaban Anda</p>
                             {q.type === 'PGK' && Array.isArray(userIdx) ? userIdx.map(i => (q.options || [])[i] || String.fromCharCode(65 + i)).join(", ") : (q.type === 'Essay' ? (userIdx || "Tidak Dijawab") : (userIdx !== undefined ? ((q.options || [])[userIdx] || String.fromCharCode(65 + userIdx)) : "Tidak Dijawab"))}
                           </div>
                           {!isCorrect && (
                              <div className="p-4 rounded-xl text-sm border bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                                 <p className="font-black text-[10px] uppercase mb-1 opacity-50">Kunci Jawaban</p>
                                 {(() => {
                                   if (q.type === 'Essay') return q.correctAnswer;
                                   const getOptionText = (ansLabel: string) => {
                                      const label = ansLabel?.trim();
                                      if (!label) return "";
                                      const idx = label.charCodeAt(0) - 65; // A=0, B=1, dll
                                      if (idx >= 0 && idx < q.options?.length) return q.options[idx];
                                      const matched = q.options?.find((opt: string) => opt.startsWith(label + "."));
                                      return matched || label;
                                   };
                                   if (Array.isArray(q.correctAnswer)) {
                                      return q.correctAnswer.map((ans: string) => getOptionText(ans)).join("  ||  ");
                                   }
                                   return getOptionText(q.correctAnswer);
                                 })()}
                              </div>
                           )}
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800">
                           <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Pembahasan</p>
                           <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{q.explanation || "Tidak ada pembahasan tersedia."}</p>
                        </div>
                     </div>
                  );
               })}
            </div>

            <div className="mt-12 flex justify-center">
               <Link href="/" className="px-10 py-4 bg-gray-900 text-white rounded-full font-bold shadow-xl hover:scale-105 transition">Kembali ke Dashboard</Link>
            </div>
         </Card>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-fade-in max-w-4xl mx-auto relative px-3 md:px-4 pb-20 pt-4 md:pt-0">
      {/* Warning Modal Overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-dark p-8 rounded-3xl max-w-md w-full shadow-2xl text-center border-2 border-red-500 m-4">
             <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle size={40} />
             </div>
             <h3 className="text-2xl font-bold mb-2 text-red-600">PELANGGARAN TERDETEKSI</h3>
             <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">Sistem mendeteksi Anda keluar dari halaman ujian. <strong className="text-red-500 bg-red-50 px-2 py-1 rounded">Peringatan: {violations}/3</strong></p>
             {violations < 3 && (
                <button 
                  onClick={() => setShowWarning(false)}
                  className="px-8 py-3 bg-red-600 text-white w-full rounded-full font-bold hover:bg-red-700 transition"
                >
                  Kembali Mengerjakan
                </button>
             )}
           </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white dark:bg-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
         <div>
           <h2 className="font-bold text-lg">Try Out #{params.id} (Ujian Publik)</h2>
           <p className="text-xs text-gray-500 font-medium tracking-wide">Pengerja: {guestName}</p>
         </div>
         <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold font-mono text-sm md:text-base">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
               </span>
               <span className="hidden md:inline">Sisa Waktu: </span>{formatTime(timeLeft)}
            </div>
            <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2">
               <span className="text-xs text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded">Soal {currentQuestionIndex + 1} / {questions.length}</span>
               <span className={`text-[9px] md:text-[10px] font-black text-white px-2 py-1 rounded tracking-widest uppercase ${currentQuestion.type === 'PG' ? 'bg-blue-500' : currentQuestion.type === 'PGK' ? 'bg-purple-500' : 'bg-green-500'}`}>
                 {currentQuestion.type}
               </span>
            </div>
         </div>
      </div>

      <Card className="!p-5 md:!p-8 shadow-sm">
         <div className="text-xl leading-relaxed mb-8 font-medium text-gray-800 dark:text-gray-100 prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQuestion.text || currentQuestion.question}</ReactMarkdown>
         </div>
         
         <div className="flex flex-col gap-4">
           {currentQuestion.type === 'Essay' ? (
              <textarea 
                className="w-full p-6 h-40 bg-gray-50 dark:bg-gray-800 border-2 border-primary/10 rounded-2xl outline-none focus:border-primary/40 font-medium text-lg transition-all"
                placeholder="Ketik jawaban Anda di sini..."
                value={answers[currentQuestionIndex] || ""}
                onChange={(e) => setAnswers({...answers, [currentQuestionIndex]: e.target.value})}
              />
           ) : (
             currentQuestion.options.map((opt: string, idx: number) => {
               const isSelected = currentQuestion.type === 'PGK' 
                 ? (answers[currentQuestionIndex] || []).includes(idx)
                 : answers[currentQuestionIndex] === idx;

               return (
                 <div 
                    key={idx} 
                    onClick={() => {
                       if (currentQuestion.type === 'PGK') {
                          const currentArr = answers[currentQuestionIndex] || [];
                          if (currentArr.includes(idx)) {
                             setAnswers({...answers, [currentQuestionIndex]: currentArr.filter((i: number) => i !== idx)});
                          } else {
                             setAnswers({...answers, [currentQuestionIndex]: [...currentArr, idx]});
                          }
                       } else {
                          setAnswers({...answers, [currentQuestionIndex]: idx});
                       }
                    }}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center gap-4 outline-none
                      ${isSelected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                 >
                    <div className={`w-8 h-8 rounded-full border-2 flex flex-shrink-0 items-center justify-center transition-colors
                       ${isSelected ? 'border-primary bg-white dark:bg-dark' : 'border-gray-300 bg-gray-50 dark:bg-gray-800'}`}>
                       {isSelected && (
                          currentQuestion.type === 'PGK' 
                          ? <div className="text-primary font-black text-xs">✓</div>
                          : <div className="w-4 h-4 bg-primary rounded-full animate-fade-in" />
                       )}
                    </div>
                    <div className={`text-lg transition-colors prose dark:prose-invert max-w-none ml-2 ${isSelected ? 'font-bold text-primary dark:text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                    </div>
                 </div>
               );
             })
           )}
         </div>

         <div className="flex justify-between items-center mt-12 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button 
               onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
               disabled={currentQuestionIndex === 0}
               className={`px-4 md:px-6 py-3 font-bold transition-colors ${currentQuestionIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
               &lt; Sebelumnya
            </button>
            
            {currentQuestionIndex < questions.length - 1 ? (
                <button 
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  className={`px-6 md:px-8 py-3 rounded-full font-bold shadow-lg transition-all duration-300 bg-primary text-white hover:scale-105 shadow-primary/30 hover:bg-secondary`}
                >
                  Selanjutnya &gt;
                </button>
            ) : (
                <button 
                  onClick={() => {
                    setSubmitted(true);
                    saveResults();
                  }}
                  className={`px-6 md:px-8 py-3 rounded-full font-bold shadow-lg transition-all duration-300 bg-primary text-white hover:scale-105 shadow-primary/30 hover:bg-secondary`}
                >
                  Selesai
                </button>
            )}
         </div>
      </Card>
    </div>
  );
}

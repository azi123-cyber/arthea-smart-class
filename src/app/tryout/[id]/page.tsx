'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import StatusAnimation from '@/components/StatusAnimation';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, set, get } from 'firebase/database';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function QuizInterface() {
  const params = useParams();
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
  const [pastAttempts, setPastAttempts] = useState(0);
  const [examToken, setExamToken] = useState("");
  const [showClue, setShowClue] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!params.id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        // Coba fetch dari proxy backend
        let res = await fetch(`/api/backend/exams/${params.id}`, { cache: 'no-store' });
        if (!res.ok) {
           res = await fetch(`/api/backend/materials/${params.id}`, { cache: 'no-store' });
        }

        if (res.ok) {
          const mat = await res.json();
          setMaterialData(mat);
          try {
             let parsed = typeof mat.content === 'string' ? JSON.parse(mat.content) : mat.content;
             if (!parsed && mat.questions) {
                parsed = typeof mat.questions === 'string' ? JSON.parse(mat.questions) : mat.questions;
             }
             // Handle cases where the questions are nested under a 'questions' key
             if (parsed && !Array.isArray(parsed) && parsed.questions) parsed = parsed.questions;
             if (!Array.isArray(parsed)) parsed = [parsed];
             setQuestions(parsed);
             
             const dur = Number(mat.durationMinutes || mat.duration);
             if (dur) setTimeLeft(dur * 60);
             else setTimeLeft(90 * 60);
          } catch (e) {
             console.error("Gagal mengurai konten materi");
          }
        }
      } catch (err) {
        console.error("Error loading tryout via proxy:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    const username = localStorage.getItem('username');
    if (!username) return;
    const resultsRef = ref(db, `results/${username}`);
    get(resultsRef).then((snap) => {
       if (snap.exists()) {
          const data = snap.val();
          const attempts = Object.values(data).filter((res: any) => res.tryoutId === params.id).length;
          setPastAttempts(attempts);
       }
    });
  }, [params.id]);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const selectedOption = answers[currentQuestionIndex] ?? null;

  // Save results to Firebase
  const saveResults = async () => {
    try {
      const username = localStorage.getItem('username') || 'anonymous';
      let correctCount = 0;
      let wrongCount = 0;

      const detailedAnswers = questions.map((q, idx) => {
         const userOptIdx = answers[idx];
         const userAnswerString = userOptIdx !== undefined ? q.options[userOptIdx] : "Tidak Dijawab";
         const isCorrect = userOptIdx !== undefined && (q.options[userOptIdx] === q.correctAnswer || String.fromCharCode(65 + userOptIdx) === q.correctAnswer);
         
         if (isCorrect) correctCount++; 
         else wrongCount++;
         
         return {
            question: q.text || q.question,
            userAnswer: userAnswerString,
            correctAnswer: q.correctAnswer || q.options[0],
            isCorrect,
            explanation: q.explanation || "Pembahasan tidak tersedia untuk soal ini.",
         };
      });

      const score = Math.round((correctCount / questions.length) * 100);

      const dbRef = ref(db, `results/${username}/${params.id}_${Date.now()}`);
      await set(dbRef, {
        answers: detailedAnswers,
        violations,
        score,
        correctCount,
        wrongCount,
        timestamp: Date.now(),
        tryoutId: params.id
      });
      console.log("Results saved successfully");
    } catch (err) {
      console.error("Failed to save results:", err);
    }
  };

  useEffect(() => {
     if (questions.length > 0 && !submitted && hasStarted) {
        if (timeLeft === 0) setTimeLeft(5400); // Default to 90 mins
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

  // Security Mechanisms
  useEffect(() => {
    if (submitted || !hasStarted) return;

    const handleViolation = (reason: string) => {
      setViolations(prev => {
        const newVal = prev + 1;
        if (newVal >= 3) {
          setSubmitted(true); // Auto submit on 3rd violation
        } else {
          setShowWarning(true); // Tampilkan modal peringatan
        }
        return newVal;
      });
    };

    const onVisibilityChange = () => {
      // Jika tab ditinggalkan atau window di-minimize
      if (document.visibilityState === 'hidden') handleViolation('visibility_hidden');
    };

    const onWindowBlur = () => {
      // Jika klik di luar area window
      handleViolation('window_blur');
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        handleViolation('mouse_leave_window');
      }
    };

    const preventCopyPasteCombo = (e: ClipboardEvent) => {
      e.preventDefault();
      alert("Aksi Copy/Paste tidak diizinkan selama ujian!");
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      alert("Klik kanan tidak diizinkan selama ujian dan terdeteksi sebagai pelanggaran!");
    };
    
    // Nonaktifkan tombol keyboard tertentu seperti F12
    const preventDevTools = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        alert("Akses Developer Tools dilarang selama ujian!");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener("copy", preventCopyPasteCombo);
    document.addEventListener("paste", preventCopyPasteCombo);
    document.addEventListener("cut", preventCopyPasteCombo);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventDevTools);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener("copy", preventCopyPasteCombo);
      document.removeEventListener("paste", preventCopyPasteCombo);
      document.removeEventListener("cut", preventCopyPasteCombo);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventDevTools);
    };
  }, [submitted, hasStarted]);

  if (loading) return <div className="flex justify-center py-20"><StatusAnimation type="loading" message="Memuat Soal Ujian..." /></div>;
  if (!questions || questions.length === 0) return <div className="text-center font-bold text-red-500 py-20">Soal tidak ditemukan. Mungkin Anda belum punya akses, ID salah, atau pastikan Rule Firebase Read telah diperbarui.</div>;

  if (!hasStarted && materialData) {
     const maxAttempts = materialData.maxAttempts || 1;
     if (pastAttempts >= maxAttempts) {
        return (
          <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in w-full max-w-md mx-auto">
             <StatusAnimation type="error" message="Akses Ditolak" subMessage={`Anda telah mencapai batas maksimal pengerjaan untuk ujian ini (${maxAttempts} kali).`} />
             <Link href="/tryout" className="mt-8 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 text-center">
               Kembali ke Bank Soal
             </Link>
          </div>
        );
     }

     return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in w-full max-w-md mx-auto">
           <Card className="!p-8 w-full border-2 border-primary/20">
              <h2 className="text-2xl font-black mb-2 text-center">{materialData.title}</h2>
              <p className="text-sm text-gray-500 text-center mb-6">Waktu: {materialData.duration || 90} Menit • Batas Ujian: {maxAttempts} Kali</p>
              
              {materialData.token && (
                 <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">Masukkan Token Ujian</label>
                    <input 
                      type="text" 
                      value={examToken}
                      onChange={(e) => setExamToken(e.target.value)}
                      className="w-full p-4 text-center rounded-xl border-2 border-gray-200 focus:border-primary outline-none font-bold text-gray-900 dark:text-white dark:bg-gray-800"
                      placeholder="Token Rahasia"
                    />
                 </div>
              )}

              <button 
                 onClick={() => {
                    if (materialData.token && examToken !== materialData.token) {
                       alert("Token ujian salah!");
                       return;
                    }
                    setHasStarted(true);
                 }}
                 className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:scale-105 transition-transform"
              >
                 Mulai Kerjakan Sekarang
              </button>
           </Card>
        </div>
     );
  }

  if (submitted) {
    if (violations >= 3) {
       return (
         <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in w-full max-w-2xl mx-auto">
            <StatusAnimation type="access_denied" message="Ujian Dihentikan" subMessage="Anda didiskualifikasi karena terdeteksi melakukan pelanggaran ujian (seperti meninggalkan halaman atau hilang fokus) lebih dari 3 kali." />
            <Link href="/tryout" className="mt-8 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full font-bold transition-colors">
              Kembali
            </Link>
         </div>
       );
    }
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fade-in w-full max-w-2xl mx-auto">
         <StatusAnimation type="success" message="Ujian Selesai!" subMessage="Jawaban Anda telah berhasil disimpan dan sedang dievaluasi oleh sistem AI." />
         <Link href="/tryout" className="mt-8 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full font-bold transition-colors">
           Kembali ke Daftar Try Out
         </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto relative">
      {/* Warning Modal Overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-dark p-8 rounded-3xl max-w-md w-full shadow-2xl text-center border-2 border-red-500 m-4">
             <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <AlertTriangle size={40} />
             </div>
             <h3 className="text-2xl font-bold mb-2 text-red-600">PELANGGARAN TERDETEKSI</h3>
             <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium">Sistem mendeteksi Anda keluar dari halaman ujian, kehilangan fokus, atau melakukan aktivitas yang dibatasi. <br/><br/><strong className="text-red-500 bg-red-50 px-2 py-1 rounded">Peringatan: {violations}/3</strong></p>
             {violations < 3 && (
                <button 
                  onClick={() => setShowWarning(false)}
                  className="px-8 py-3 bg-red-600 text-white w-full rounded-full font-bold hover:bg-red-700 transition"
                >
                  Saya Mengerti & Kembali Mengerjakan
                </button>
             )}
           </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white dark:bg-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
         <div>
           <h2 className="font-bold text-lg">Try Out #{params.id}</h2>
           <p className="text-xs text-gray-500 font-medium tracking-wide">Soal {currentQuestionIndex + 1} dari {questions.length}</p>
         </div>
         <div className="flex items-center gap-2 md:gap-4">
            {violations > 0 && (
               <div className="hidden md:block px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200">
                  {violations}/3 Pelanggaran
               </div>
            )}
            <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold font-mono text-sm md:text-base">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
               </span>
               <span className="hidden md:inline">Sisa Waktu: </span>{formatTime(timeLeft)}
            </div>
         </div>
      </div>

      <Card className="!p-8">
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
                          const currentArr = answers[currentQuestionIndex] as any || [];
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

         {currentQuestion.clue && (
           <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
             {!showClue[currentQuestionIndex] ? (
               <button 
                 onClick={() => setShowClue({...showClue, [currentQuestionIndex]: true})}
                 className="px-6 py-2 bg-yellow-50 text-yellow-600 font-bold rounded-xl border border-yellow-100 hover:bg-yellow-100 transition-colors text-sm flex items-center gap-2"
               >
                 💡 Butuh Bantuan? Lihat Clue
               </button>
             ) : (
               <div className="animate-fade-in bg-yellow-50 dark:bg-yellow-900/10 p-5 rounded-2xl border border-yellow-200 dark:border-yellow-900/30 font-medium text-yellow-800 dark:text-yellow-400">
                 <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-xs">💡 Clue AI</div>
                 <div className="prose dark:prose-invert max-w-none text-sm"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentQuestion.clue}</ReactMarkdown></div>
               </div>
             )}
           </div>
         )}

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

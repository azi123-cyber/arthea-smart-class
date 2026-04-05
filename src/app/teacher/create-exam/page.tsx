'use client';
import { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
// Firebase Client SDK push/set removed to bypass PERMISSION_DENIED errors. 
// Uses backend proxy instead.
import { Card } from '@/components/ui/Card';
import {
  PlusCircle, Trash2, Save, Eye, EyeOff, Clock, Lock, Globe, Copy, CheckCircle2,
  ChevronDown, ChevronUp, Lightbulb, FileText
} from 'lucide-react';

interface Question {
  id: number;
  type: 'PG' | 'PGK' | 'Essay';
  text: string;
  options: string[];
  correctAnswer: any; // number for PG, number[] for PGK, string for Essay
  clue: string;
  pembahasan: string;
  showClue: boolean;
}

// Backend proxy configuration
const BACKEND_URL = '/api/backend';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'arthea_smart_class_2024_secure_99';

export default function CreateExam() {
  const { username, role } = useAuth();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [targetClass, setTargetClass] = useState('Semua');
  const [hasTimer, setHasTimer] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<string>('60');
  const [maxAttempts, setMaxAttempts] = useState<string>('1');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [accessToken, setAccessToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [enableToken, setEnableToken] = useState(false);
  const [showPembahasanNow, setShowPembahasanNow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedExamId, setSavedExamId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Hitung jumlah kata pada token
  const countWords = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;

  // Kompute nilai actual: durasi >360 = unlimited (null), attempts >5 = unlimited (0)
  const numDuration = parseInt(durationMinutes || '0');
  const numAttempts = parseInt(maxAttempts || '1');
  const actualDuration = hasTimer ? (numDuration > 360 ? null : numDuration) : null;
  const actualMaxAttempts = numAttempts > 5 ? 0 : numAttempts; // 0 = unlimited
  const [questions, setQuestions] = useState<Question[]>([{
    id: 1, type: 'PG', text: '', options: ['', '', '', ''], correctAnswer: 0, clue: '', pembahasan: '', showClue: false
  }]);

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      id: Date.now(), type: 'PG', text: '', options: ['', '', '', ''], correctAnswer: 0, clue: '', pembahasan: '', showClue: false
    }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestion = (id: number, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId: number, optIdx: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const newOpts = [...q.options];
      newOpts[optIdx] = value;
      return { ...q, options: newOpts };
    }));
  };

  const handleSave = async () => {
    if (!title || questions.some(q => !q.text)) {
      alert('Isi judul dan semua pertanyaan terlebih dahulu!');
      return;
    }
    // Validasi token: harus 1-8 kata jika aktif
    if (visibility === 'private' && enableToken && accessToken.trim()) {
      const wordCount = countWords(accessToken);
      if (wordCount < 1 || wordCount > 8) {
        setTokenError('Token harus terdiri dari 1–8 kata. Lebih dari 8 kata tidak diizinkan.');
        return;
      }
      setTokenError('');
    }
    setSaving(true);
    try {
      const examData = {
        title,
        subject,
        targetClass,
        hasTimer,
        durationMinutes: actualDuration,
        isUnlimitedTime: actualDuration === null && hasTimer,
        maxAttempts: actualMaxAttempts,
        isUnlimitedAttempts: actualMaxAttempts === 0,
        visibility,
        accessToken: (visibility === 'private' && enableToken) ? accessToken.trim() : null,
        showPembahasanNow,
        uploadedBy: username || 'Guru',
        createdAt: Date.now(),
        questions: questions.map(q => ({
          type: q.type,
          text: q.text,
          options: q.type === 'Essay' ? [] : q.options,
          correctAnswer: q.type === 'PGK' 
            ? (Array.isArray(q.correctAnswer) ? q.correctAnswer.map((i: number) => String.fromCharCode(65 + i)) : [])
            : (q.type === 'PG' ? String.fromCharCode(65 + q.correctAnswer) : q.correctAnswer),
          clue: q.clue || null,
          pembahasan: q.pembahasan || null,
        }))
      };

      const cleanData = JSON.parse(JSON.stringify(examData));
      
      const res = await fetch(`${BACKEND_URL}/exams/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': API_TOKEN,
        },
        body: JSON.stringify(cleanData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan ke server');
      }

      const result = await res.json();
      setSavedExamId(result.key);
    } catch (err: any) {
      const errorMsg = err.message || 'Cek koneksi internet';
      alert(`Gagal menyimpan ujian: ${errorMsg}`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = savedExamId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/ujian/public/${savedExamId}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role !== 'teacher' && role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Lock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-2xl font-black text-gray-400">Akses Ditolak</p>
          <p className="text-gray-500 mt-2">Hanya guru yang dapat membuat ujian.</p>
        </div>
      </div>
    );
  }

  if (savedExamId) {
    return (
      <div className="max-w-2xl mx-auto py-16 flex flex-col items-center text-center gap-6 animate-fade-in">
        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Ujian Tersimpan!</h2>
        <p className="text-gray-500">{title}</p>
        {visibility === 'public' && (
          <div className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4">
            <p className="text-xs font-black text-primary uppercase mb-2 tracking-widest">Link Ujian Publik</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-sm font-mono text-gray-700 dark:text-gray-300 outline-none" />
              <button onClick={copyLink} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-primary text-white hover:bg-primary-dark'}`}>
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Disalin!' : 'Salin'}
              </button>
            </div>
          </div>
        )}
        {visibility === 'private' && (
          <div className="w-full bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <p className="text-xs font-black text-amber-600 uppercase mb-2 tracking-widest">Ujian Privat</p>
            <p className="text-sm text-amber-700 dark:text-amber-400">Siswa harus login terlebih dahulu untuk mengakses ujian ini.</p>
            {accessToken && enableToken && <p className="mt-2 text-sm font-black text-amber-800 dark:text-amber-300">Token: <span className="font-mono bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">{accessToken}</span></p>}
          </div>
        )}
        <div className="flex gap-4 mt-4">
          <button onClick={() => { setSavedExamId(null); setTitle(''); setQuestions([{id:1,type:'PG',text:'',options:['','','',''],correctAnswer:0,clue:'',pembahasan:'',showClue:false}]); }}
            className="px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
            Buat Ujian Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Buat Soal / Ujian</h1>
        <p className="text-gray-500 mt-1">Buat ujian lengkap dengan pengaturan waktu, visibilitas, dan pembahasan.</p>
      </div>

      {/* Exam Settings */}
      <Card className="!p-8 border-2 border-gray-100 dark:border-gray-800">
        <h2 className="text-xs font-black text-primary uppercase tracking-widest mb-6">Pengaturan Ujian</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Judul Ujian *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Cth: Ujian Tengah Semester Matematika Kelas X"
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 outline-none font-bold text-gray-900 dark:text-white" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mata Pelajaran</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 outline-none font-bold text-gray-900 dark:text-white">
              {['Matematika','Fisika','Kimia','Biologi','Informatika','Bahasa Indonesia','Bahasa Inggris','Sejarah','Astronomi','Ekonomi'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Kelas</label>
            <select value={targetClass} onChange={e => setTargetClass(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 outline-none font-bold text-gray-900 dark:text-white">
              {['Semua','X','XI','XII'].map(k => <option key={k}>Kelas {k}</option>)}
            </select>
          </div>

          {/* Timer */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Batas Waktu</label>
            <button onClick={() => setHasTimer(!hasTimer)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${hasTimer ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
              <Clock size={18} />
              <span>{hasTimer ? (numDuration > 360 ? `Unlimited (>${numDuration} menit)` : `${numDuration} Menit`) : 'Tidak Ada Batas Waktu'}</span>
            </button>
            {hasTimer && (
              <div className="space-y-1">
                <input type="number" 
                  min="1"
                  value={durationMinutes} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || parseInt(val) >= 1) setDurationMinutes(val);
                    else setDurationMinutes('1');
                  }} 
                  className={`w-full bg-gray-50 dark:bg-gray-800 border-2 rounded-2xl px-5 py-3 outline-none font-bold text-gray-900 dark:text-white ${numDuration > 360 ? 'border-green-400' : 'border-primary/20'}`} placeholder="Menit" />
                <p className={`text-xs font-bold ml-1 ${numDuration > 360 ? 'text-green-600' : 'text-gray-400'}`}>
                  {numDuration > 360 ? '✅ Lebih dari 360 menit = Unlimited (tanpa batas waktu)' : `Maksimal 360 menit. Lebih dari itu = unlimited.`}
                </p>
              </div>
            )}
          </div>

          {/* Max Attempts */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maks. Pengerjaan</label>
            <div className="space-y-1">
              <input type="number" 
                min="1"
                value={maxAttempts} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || parseInt(val) >= 1) setMaxAttempts(val);
                  else setMaxAttempts('1');
                }} 
                className={`w-full bg-gray-50 dark:bg-gray-800 border-2 rounded-2xl px-5 py-3 outline-none font-bold text-gray-900 dark:text-white ${numAttempts > 5 ? 'border-green-400' : 'border-gray-100 dark:border-gray-700'}`} placeholder="Jumlah percobaan" />
              <p className={`text-xs font-bold ml-1 ${numAttempts > 5 ? 'text-green-600' : 'text-gray-400'}`}>
                {numAttempts > 5 ? `✅ Lebih dari 5 = Unlimited (siswa bisa kerjakan selamanya)` : `1–5 = terbatas. Lebih dari 5 = unlimited.`}
              </p>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visibilitas Soal</label>
            <div className="flex gap-2">
              <button onClick={() => setVisibility('public')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${visibility === 'public' ? 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                <Globe size={16} /> Publik
              </button>
              <button onClick={() => setVisibility('private')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${visibility === 'private' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 text-amber-600' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                <Lock size={16} /> Privat
              </button>
            </div>
            {visibility === 'private' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enableToken} onChange={e => { setEnableToken(e.target.checked); setTokenError(''); }} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Gunakan Token Akses (opsional)</span>
                </label>
                {enableToken && (
                  <div className="space-y-1">
                    <input value={accessToken}
                      onChange={e => {
                        const v = e.target.value;
                        setAccessToken(v);
                        const wc = countWords(v);
                        if (v.trim() && wc > 8) setTokenError(`Token terlalu panjang (${wc} kata). Maksimal 8 kata.`);
                        else setTokenError('');
                      }}
                      placeholder="Cth: kelas10 olimpiade"
                      className={`w-full bg-gray-50 dark:bg-gray-800 border-2 rounded-xl px-4 py-3 outline-none font-mono font-bold text-gray-900 dark:text-white ${tokenError ? 'border-red-400' : 'border-amber-200 dark:border-amber-800'}`} />
                    {tokenError
                      ? <p className="text-xs font-bold text-red-500 ml-1">{tokenError}</p>
                      : <p className="text-xs font-bold text-gray-400 ml-1">Maks. 8 kata. Lebih dari 8 kata = error.</p>
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pembahasan timing */}
          <div className="md:col-span-2 flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-100 dark:border-blue-800 rounded-2xl">
            <input type="checkbox" id="pembahasan-now" checked={showPembahasanNow} onChange={e => setShowPembahasanNow(e.target.checked)} className="w-4 h-4 accent-primary" />
            <label htmlFor="pembahasan-now" className="cursor-pointer">
              <p className="font-bold text-sm text-gray-800 dark:text-gray-200">Tampilkan pembahasan langsung setelah ujian selesai</p>
              <p className="text-xs text-gray-500 mt-0.5">Jika tidak dicentang, pembahasan disembunyikan sampai guru mengaktifkannya.</p>
            </label>
          </div>
        </div>
      </Card>

      {/* Questions */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-primary uppercase tracking-widest">Daftar Soal ({questions.length})</h2>
          <button onClick={addQuestion} className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
            <PlusCircle size={16} /> Tambah Soal
          </button>
        </div>

        {questions.map((q, idx) => (
          <Card key={q.id} className="!p-6 border-2 border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm">{idx + 1}</span>
                <select 
                  value={q.type} 
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    updateQuestion(q.id, 'type', newType);
                    if (newType === 'PGK') updateQuestion(q.id, 'correctAnswer', []);
                    else if (newType === 'Essay') updateQuestion(q.id, 'correctAnswer', '');
                    else updateQuestion(q.id, 'correctAnswer', 0);
                  }}
                  className="bg-gray-50 dark:bg-gray-800 border-none outline-none font-black text-[10px] uppercase tracking-widest text-primary px-3 py-1 rounded-lg"
                >
                  <option value="PG">Pilihan Ganda</option>
                  <option value="PGK">PG Kompleks</option>
                  <option value="Essay">Essay / Isian</option>
                </select>
              </div>
              <button onClick={() => removeQuestion(q.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <textarea value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} rows={3}
                placeholder="Tulis pertanyaan di sini..."
                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/30 rounded-xl px-4 py-3 outline-none font-medium text-gray-900 dark:text-white resize-none" />

              {q.type === 'Essay' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kunci Jawaban Essay</label>
                  <textarea 
                    value={q.correctAnswer} 
                    onChange={e => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                    placeholder="Tulis kunci jawaban di sini..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-4 py-3 outline-none font-bold text-gray-900 dark:text-white"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, oi) => {
                    const isCorrect = q.type === 'PGK' 
                      ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(oi))
                      : q.correctAnswer === oi;

                    return (
                      <div key={oi} className="flex items-center gap-2">
                        <button onClick={() => {
                          if (q.type === 'PGK') {
                            const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                            if (current.includes(oi)) updateQuestion(q.id, 'correctAnswer', current.filter(i => i !== oi));
                            else updateQuestion(q.id, 'correctAnswer', [...current, oi]);
                          } else {
                            updateQuestion(q.id, 'correctAnswer', oi);
                          }
                        }}
                          className={`w-8 h-8 rounded-full flex-shrink-0 border-2 flex items-center justify-center font-black text-xs transition-all ${isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-400'}`}>
                          {['A','B','C','D','E'][oi] || '?'}
                        </button>
                        <input value={opt} onChange={e => updateOption(q.id, oi, e.target.value)}
                          placeholder={`Pilihan ${['A','B','C','D','E'][oi] || '?'}`}
                          className="flex-1 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl px-3 py-2 outline-none text-sm font-medium text-gray-900 dark:text-white" />
                        {q.type === 'PGK' && oi === q.options.length - 1 && q.options.length < 5 && (
                           <button onClick={() => {
                              const newOpts = [...q.options, ''];
                              updateQuestion(q.id, 'options', newOpts);
                           }} className="p-1 text-primary hover:bg-primary/10 rounded-lg"><PlusCircle size={14}/></button>
                        )}
                        {q.type === 'PGK' && q.options.length > 2 && (
                           <button onClick={() => {
                              const newOpts = q.options.filter((_, i) => i !== oi);
                              updateQuestion(q.id, 'options', newOpts);
                              if (Array.isArray(q.correctAnswer)) updateQuestion(q.id, 'correctAnswer', q.correctAnswer.filter(i => i !== oi));
                           }} className="p-1 text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Clue & Pembahasan */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb size={14} className="text-yellow-500" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clue / Titik Terang (Opsional)</label>
                </div>
                <input value={q.clue} onChange={e => updateQuestion(q.id, 'clue', e.target.value)}
                  placeholder="Contoh: Ingat hukum Newton ke-2..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-yellow-300 rounded-xl px-4 py-2 outline-none text-sm font-medium text-gray-900 dark:text-white" />

                <div className="flex items-center gap-2 mt-2">
                  <FileText size={14} className="text-blue-500" />
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pembahasan (Opsional)</label>
                </div>
                <textarea value={q.pembahasan} onChange={e => updateQuestion(q.id, 'pembahasan', e.target.value)} rows={2}
                  placeholder="Penjelasan jawaban benar..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-300 rounded-xl px-4 py-2 outline-none text-sm font-medium text-gray-900 dark:text-white resize-none" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <button onClick={handleSave} disabled={saving}
        className="btn-primary w-full py-5 text-lg gap-3">
        {saving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={24} />}
        <span>{saving ? 'Menyimpan...' : 'Simpan & Publikasikan Ujian'}</span>
      </button>
    </div>
  );
}

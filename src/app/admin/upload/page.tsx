'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Upload, Trash2, FileText, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function UploadSoal() {
  const [level, setLevel] = useState('Kabupaten');
  const [year, setYear] = useState('2024');
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'materi'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('Sedang memproses file...');
    
    // Simulate processing
    setTimeout(() => {
        setQuestions([
            { id: 1, type: 'PG', text: 'Sebuah balok bermassa 2kg ditarik dengan gaya 10N...', ans: 'A' },
            { id: 2, type: 'PG', text: 'Planet yang memiliki cincin paling megah adalah...', ans: 'C' }
        ]);
        setUploading(false);
        setStatus('Berhasil mengekstrak 2 soal!');
    }, 2000);
  };

  const saveToDB = () => {
    alert('Simpan ke Database Berhasil!');
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in max-w-5xl mx-auto">
      {/* Tab Switcher */}
      <div className="flex gap-4 p-1 bg-gray-100 dark:bg-gray-800 w-fit rounded-2xl mx-auto">
         <button onClick={() => setActiveTab('upload')} className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Upload Soal</button>
         <button onClick={() => setActiveTab('materi')} className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'materi' ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Buat Materi</button>
      </div>

      {activeTab === 'upload' ? (
        <>
          <div className="flex justify-between items-center bg-white dark:bg-gray-900 !p-8 rounded-[2.5rem] border-2 border-gray-50 dark:border-gray-800 shadow-sm">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Ekstraksi Soal Pintar</h1>
              <p className="text-gray-500 font-medium">Upload PDF/Gambar soal untuk diekstrak menjadi format digital.</p>
            </div>
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
               <Upload className="text-primary" size={32} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 !p-8 border-2 border-gray-50 dark:border-gray-800">
               <h3 className="text-xs font-black text-primary uppercase tracking-widest mb-6 ml-1">Konfigurasi Target</h3>
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tingkatan Lomba</label>
                     <select value={level} onChange={(e)=>setLevel(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-primary/20">
                        <option>Kabupaten (OSN-K)</option>
                        <option>Provinsi (OSN-P)</option>
                        <option>Nasional (OSN)</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tahun Soal</label>
                     <input type="number" value={year} onChange={(e)=>setYear(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl outline-none font-bold text-sm border-2 border-transparent focus:border-primary/20" />
                  </div>
                  <div className="pt-4">
                     <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center group hover:border-primary/50 transition-colors cursor-pointer bg-gray-50/50 dark:bg-gray-800/30">
                        <input type="file" onChange={handleFileChange} className="hidden" id="file-up" />
                        <label htmlFor="file-up" className="cursor-pointer">
                           <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3 group-hover:scale-110 transition-transform" />
                           <p className="text-xs font-black text-gray-500 truncate">{file ? file.name : 'Pilih File PDF/Soal'}</p>
                        </label>
                     </div>
                  </div>
                  <button 
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="btn-primary w-full py-4 mt-4 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : <Upload size={18} />}
                    <span>Upload & Ekstrak</span>
                  </button>
               </div>
            </Card>

            <Card className="lg:col-span-2 !p-8 border-2 border-gray-50 dark:border-gray-800 relative">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black text-primary uppercase tracking-widest ml-1">Preview & Edit Soal ({questions.length})</h3>
                  {questions.length > 0 && (
                    <button onClick={saveToDB} className="flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform shadow-lg shadow-green-500/20">
                       <CheckCircle2 size={14} />
                       <span>Simpan Semua</span>
                    </button>
                  )}
               </div>

               {status && (
                 <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 p-4 rounded-2xl text-xs font-black flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    {status}
                 </div>
               )}

               <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {questions.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 select-none">
                       <PlusCircle size={64} className="mb-4 opacity-50" />
                       <p className="font-black uppercase tracking-widest text-lg">Belum ada data</p>
                       <p className="text-xs font-medium">Upload file di panel samping untuk memulai ektraksi</p>
                    </div>
                  ) : questions.map((q, idx) => (
                    <div key={q.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all group">
                       <div className="flex justify-between items-start">
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-3">
                                <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xs">#{idx+1}</span>
                                <span className="text-[10px] font-black bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-md text-gray-600 dark:text-gray-400 uppercase tracking-tighter">{q.type}</span>
                             </div>
                             <p className="font-bold text-gray-800 dark:text-gray-200 leading-relaxed mb-4">{q.text}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jawaban:</span>
                                <span className="text-sm font-black text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-lg border border-green-100 dark:border-green-800">{q.ans}</span>
                             </div>
                          </div>
                          <button onClick={()=>setQuestions(questions.filter(x=>x.id!==q.id))} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                            <Trash2 size={20} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="!p-10 border-2 border-gray-50 dark:border-gray-800">
            <h2 className="text-2xl font-black mb-8 tracking-tight">Buat Materi Pembelajaran</h2>
            <form className="space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Judul Materi</label>
                     <input required type="text" className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none font-bold" placeholder="Cth: Dasar-Dasar Astrofisika" />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Kategori</label>
                     <select className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 outline-none font-bold">
                        <option>Fisika</option>
                        <option>Astronomi</option>
                        <option>Informatika</option>
                        <option>Matematika</option>
                     </select>
                  </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Deskripsi Lengkap (Rich Text)</label>
                 <textarea required className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-primary/20 rounded-xl p-4 h-32 outline-none font-medium" placeholder="Tuliskan deskripsi ringkas materi ini..."></textarea>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">File Pendukung Konten</label>
                  <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-all bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-10 flex flex-col items-center justify-center group cursor-pointer">
                     <FileText size={48} className="text-gray-300 dark:text-gray-600 mb-4 group-hover:scale-110 transition-transform" />
                     <p className="text-gray-600 dark:text-gray-400 font-black tracking-tight">Klik atau Drag File Dokumen Anda Di Sini</p>
                     <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">PDF, ZIP, DOCX (Max 50MB)</p>
                  </div>
               </div>

               <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                  <button type="submit" className="btn-primary !px-12 !py-4 flex items-center gap-3">
                     <CheckCircle2 size={20} />
                     <span>Publish ke Server</span>
                  </button>
               </div>
            </form>
         </Card>
      )}
    </div>
  );
}

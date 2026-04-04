'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageSquarePlus, Send, Trash2, ArrowLeft, MessageSquare, Paperclip, X as XIcon, Image } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { Card } from '@/components/ui/Card';

// Backend proxy untuk operasi non-file (delete, dll)
const BACKEND_URL = '/api/backend';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || 'buat_token_rahasia_panjang_kamu_disini';

// Cloudinary - Upload gambar gratis langsung dari browser
const CLOUDINARY_CLOUD_NAME = 'djlgykgj9';
const CLOUDINARY_UPLOAD_PRESET = 'Arthea';

export default function Forum() {
  const { role, username } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [topicFile, setTopicFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const forumRef = ref(db, 'forum');
    return onValue(forumRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
          replies: val.replyList ? Object.keys(val.replyList).length : 0,
          replyList: val.replyList ? Object.entries(val.replyList).map(([rId, rVal]: [string, any]) => ({ id: rId, ...rVal })).sort((a: any, b: any) => a.timestamp - b.timestamp) : []
        }));
        setTopics(list.sort((a: any, b: any) => b.timestamp - a.timestamp));
      } else {
        setTopics([]);
      }
    });
  }, []);

  // Upload file ke Cloudinary (gratis, permanen, HTTPS)
  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'forum');
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: 'POST', body: formData }
      );
      if (res.ok) {
        const data = await res.json();
        return data.secure_url as string; // URL HTTPS permanen
      } else {
        const err = await res.json();
        console.error('Cloudinary upload error:', err);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    return null;
  };

  const handleCreateTopic = async () => {
    if (!newTopicTitle || !newTopicContent) return;
    setUploadingFile(true);
    let fileUrl: string | null = null;
    if (topicFile) fileUrl = await uploadToCloudinary(topicFile);

    // Ambil data user
    let userRealName = username;
    let userKelas = 'X';
    try {
      const snap = await import('firebase/database').then(({get}) => get(ref(db, `users/${username}`)));
      if (snap.exists()) {
         userRealName = snap.val().name || username;
         userKelas = snap.val().kelas || 'X';
      }
    } catch(e) {}

    const forumRef = ref(db, 'forum');
    const newPostRef = push(forumRef);
    await set(newPostRef, {
      title: newTopicTitle,
      content: newTopicContent,
      author: username || 'Anonymous',
      authorName: userRealName,
      kelas: userKelas,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      timestamp: Date.now(),
      tags: ['Diskusi'],
      fileUrl: fileUrl || null,
      fileType: topicFile ? (topicFile.type.startsWith('image/') ? 'image' : 'document') : null,
      fileName: topicFile ? topicFile.name : null,
      replyList: {}
    });
    setNewTopicTitle('');
    setNewTopicContent('');
    setTopicFile(null);
    setShowCreate(false);
    setUploadingFile(false);
  };

  const handleReply = async (topicId: string) => {
    if (!replyText && !replyFile) return;
    setUploadingFile(true);
    let fileUrl: string | null = null;
    let fileType: string | null = null;
    let fileName: string | null = null;
    if (replyFile) {
      fileUrl = await uploadToCloudinary(replyFile);
      fileType = replyFile.type.startsWith('image/') ? 'image' : 'document';
      fileName = replyFile.name;
    }
    let userRealName = username;
    try {
      const snap = await import('firebase/database').then(({get}) => get(ref(db, `users/${username}`)));
      if (snap.exists()) {
         userRealName = snap.val().name || username;
      }
    } catch(e) {}

    const replyRef = push(ref(db, `forum/${topicId}/replyList`));
    await set(replyRef, {
      author: username || 'Anonymous',
      authorName: userRealName,
      role: role,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      content: replyText,
      fileUrl: fileUrl || null,
      fileType: fileType,
      fileName: fileName,
    });
    setReplyText('');
    setReplyFile(null);
    setUploadingFile(false);
  };

  // Cloudinary: hapus file tidak perlu dari frontend (butuh API key secret)
  // File di Cloudinary akan tetap ada tapi tidak masalah (storage 25GB gratis)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteFileFromBackend = async (_fileUrl: string) => {
    // Cloudinary deletion membutuhkan server-side API secret
    // File akan tetap di Cloudinary tapi tidak ditampilkan lagi setelah entry Firebase dihapus
    // Ini aman karena storage 25GB gratis dan tidak ada masalah privasi (URL tidak diindex)
  };

  const handleDeleteTopic = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    const topic = topics.find(t => t.id === topicId);
    if (confirm('Hapus diskusi ini selamanya?')) {
      try {
        // Hapus via backend (pakai Firebase Admin SDK - bypass rules)
        const res = await fetch(`${BACKEND_URL}/firebase/path`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': API_TOKEN,
          },
          body: JSON.stringify({ path: `forum/${topicId}` }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal hapus');
        }
        setSelectedTopic(null);
        alert('Diskusi berhasil dihapus.');
      } catch (err: any) {
        alert('Gagal menghapus diskusi: ' + err.message);
      }
    }
  };
  // suppress unused warning dari deleteFileFromBackend
  void deleteFileFromBackend;

  const handleDeleteReply = async (topicId: string, replyKey: string) => {
    if (confirm('Hapus balasan ini?')) {
      try {
        // Hapus via backend (pakai Firebase Admin SDK - bypass rules)
        const res = await fetch(`${BACKEND_URL}/firebase/path`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-api-token': API_TOKEN,
          },
          body: JSON.stringify({ path: `forum/${topicId}/replyList/${replyKey}` }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal hapus');
        }
        alert('Balasan berhasil dihapus.');
      } catch (err: any) {
        alert('Gagal menghapus balasan: ' + err.message);
      }
    }
  };

  const fixUrl = (url?: string) => {
    if (!url) return url;
    // Cloudinary URL sudah HTTPS, langsung pakai
    if (url.startsWith('https://res.cloudinary.com')) return url;
    // URL lama dari backend Pterodactyl (HTTP) - lewatkan proxy agar tidak Mixed Content
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const match = url.match(/\/uploads\/(.+)$/);
      if (match) {
        const segments = match[1].split('/');
        const fileName = segments[segments.length - 1];
        if (fileName) return `/api/uploads/${fileName}`;
      }
    }
    // Jika relative path /uploads/...
    if (url.startsWith('/uploads/')) {
      const rest = url.replace('/uploads/', '');
      const fileName = rest.split('/').pop();
      if (fileName) return `/api/uploads/${fileName}`;
    }
    // Sudah pakai proxy, return as-is
    if (url.startsWith('/api/uploads/')) return url;
    return url;
  };


  const TopicIcon = ({ author }: { author: string }) => (
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl border-2 border-primary/5 shadow-sm">
      {author.charAt(0).toUpperCase()}
    </div>
  );

  const KelasChip = ({ kelas }: { kelas?: string }) => kelas ? (
    <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">Kelas {kelas}</span>
  ) : null;

  const AttachmentPreview = ({ fileUrl, fileType, fileName }: { fileUrl?: string; fileType?: string; fileName?: string }) => {
    const [imgError, setImgError] = useState(false);
    const fixedUrl = fixUrl(fileUrl);
    
    if (!fixedUrl) return null;
    if (fileType === 'image') {
      if (imgError) {
        return (
          <a href={fixedUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 mt-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl w-fit hover:bg-red-100 transition-colors">
            <Image size={14} className="text-red-500" />
            <span className="text-xs font-bold text-red-500 truncate max-w-[200px]">{fileName || 'Foto tidak dapat ditampilkan — klik untuk buka'}</span>
          </a>
        );
      }
      return (
        <img
          src={fixedUrl}
          alt={fileName || 'Lampiran'}
          className="max-h-80 w-full md:w-auto rounded-2xl border border-gray-200 dark:border-gray-700 object-contain mt-2 cursor-pointer bg-gray-50 dark:bg-gray-800"
          onClick={() => window.open(fixedUrl, '_blank')}
          onError={() => setImgError(true)}
        />
      );
    }
    return (
      <a href={fixedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit hover:bg-primary/10 transition-colors">
        <Paperclip size={14} className="text-primary" />
        <span className="text-xs font-bold text-primary truncate max-w-[200px]">{fileName || 'Lihat Lampiran'}</span>
      </a>
    );
  };



  return (
    <div className="max-w-6xl mx-auto px-4 pt-8 pb-40 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
            Forum Komunitas
          </h1>
          <p className="text-gray-500 font-medium tracking-tight">Berbagi ilmu dan diskusi seputar OSN & AI.</p>
        </div>
        {!showCreate && !selectedTopic && (
          <button onClick={() => setShowCreate(true)} className="btn-primary px-10 flex items-center gap-2 group">
            <MessageSquarePlus size={20} className="group-hover:scale-110 transition-transform" />
            <span>Mulai Diskusi Baru</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {showCreate ? (
          <Card className="animate-fade-in !p-10 max-w-2xl mx-auto w-full border-2 border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setShowCreate(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Buat Topik Baru</h2>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Judul Diskusi</label>
                <input type="text" placeholder="Apa yang ingin kamu tanyakan?" value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-[#202c33] border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-bold placeholder:opacity-50 text-gray-900 dark:text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Detail Konten</label>
                <textarea placeholder="Jelaskan pertanyaanmu secara detail di sini..." value={newTopicContent}
                  onChange={(e) => setNewTopicContent(e.target.value)} rows={5}
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-[#202c33] border-2 border-transparent focus:border-primary/20 rounded-2xl outline-none font-medium placeholder:opacity-50 leading-relaxed text-gray-900 dark:text-white resize-none" />
              </div>

              {/* File Attachment */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Lampiran (Opsional)</label>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => setTopicFile(e.target.files?.[0] || null)} />
                {topicFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                    {topicFile.type.startsWith('image/') ? <Image size={18} className="text-primary" /> : <Paperclip size={18} className="text-primary" />}
                    <span className="text-sm font-bold text-primary flex-1 truncate">{topicFile.name}</span>
                    <button onClick={() => setTopicFile(null)} className="text-gray-400 hover:text-red-500 transition-colors"><XIcon size={16} /></button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[#202c33] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-500 font-bold text-sm hover:border-primary/50 hover:text-primary transition-colors">
                    <Paperclip size={18} /> Tambah Foto / Dokumen
                  </button>
                )}
              </div>

              <button onClick={handleCreateTopic} disabled={uploadingFile}
                className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3">
                {uploadingFile ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={24} />}
                <span>{uploadingFile ? 'Mengirim...' : 'Posting Sekarang'}</span>
              </button>
            </div>
          </Card>
        ) : selectedTopic ? (
          <div className="animate-fade-in flex flex-col gap-6">
            <button onClick={() => setSelectedTopic(null)} className="flex items-center gap-2 text-gray-500 font-bold hover:text-primary transition-colors ml-2">
              <ArrowLeft size={18} />
              <span>Kembali ke Daftar</span>
            </button>
            
            {topics.find(t => t.id === selectedTopic) && (() => {
              const topic = topics.find(t => t.id === selectedTopic);
              return (
                <>
                  <Card className="!p-10 border-b-4 border-primary/20 shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <TopicIcon author={topic.authorName || topic.author} />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-black dark:text-white leading-tight tracking-tight">{topic.title}</h2>
                            <KelasChip kelas={topic.kelas} />
                          </div>
                          <p className="text-xs font-bold text-gray-400">Oleh <span className="text-primary-dark dark:text-primary font-black underline decoration-primary/20 underline-offset-2">{topic.authorName || topic.author}</span> • {topic.date}, {topic.time}</p>
                        </div>
                      </div>
                      {(role === 'admin' || username === topic.author) && (
                        <button onClick={(e) => handleDeleteTopic(e, topic.id)} className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                           <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap pl-0 md:pl-16">
                      {topic.content}
                    </div>

                    <div className="pl-0 md:pl-16">
                      <AttachmentPreview fileUrl={topic.fileUrl} fileType={topic.fileType} fileName={topic.fileName} />
                    </div>
                  </Card>

                  {/* Replies Area */}
                  <div className="space-y-6 pt-6 pb-28 pl-0 md:pl-16 relative">
                    <div className="absolute left-6 top-0 bottom-0 w-1 bg-gray-100 dark:bg-gray-800 hidden md:block" />
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-8 relative z-10 bg-white dark:bg-[#0b141a] inline-block pr-4">Balasan ({topic.replies})</h3>
                    {topic.replyList?.map((reply: any, idx: number) => (
                      <div key={idx} className={`flex ${reply.author === username ? 'justify-end' : 'justify-start'} animate-fade-in relative z-10 group/reply`}>
                        <div className={`max-w-[85%] p-5 rounded-3xl shadow-md border-2 transition-all duration-300 relative ${reply.author === username ? 'bg-primary text-white border-primary-dark rounded-tr-none hover:shadow-primary/20' : 'bg-white dark:bg-[#202c33] dark:border-[#3b4a54] border-gray-100 rounded-tl-none hover:border-primary/20'}`}>
                          <div className="flex justify-between items-start gap-4 mb-2">
                             <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${reply.author === username ? 'text-white/70' : 'text-primary'}`}>{reply.authorName || reply.author}</p>
                                {reply.role === 'admin' && <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-lg font-black tracking-tighter">STAFF</span>}
                                {reply.role === 'teacher' && <span className="text-[8px] bg-blue-500 text-white px-2 py-0.5 rounded-lg font-black tracking-tighter">GURU</span>}
                             </div>
                             {(role === 'admin' || username === reply.author) && (
                                <button onClick={() => handleDeleteReply(topic.id, reply.id)} className={`p-1.5 rounded-lg transition-colors ${reply.author === username ? 'hover:bg-red-600 text-white/50 hover:text-white' : 'hover:bg-red-50 text-red-500/50 hover:text-red-500'}`}>
                                   <Trash2 size={12} />
                                </button>
                             )}
                          </div>
                          <p className={`text-base font-medium leading-relaxed break-words whitespace-pre-wrap overflow-hidden ${reply.author === username ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{reply.content}</p>
                          {reply.fileUrl && (
                            <div className={reply.author === username ? 'opacity-100' : ''}>
                              <AttachmentPreview fileUrl={reply.fileUrl} fileType={reply.fileType} fileName={reply.fileName} />
                            </div>
                          )}
                          <p className={`text-[9px] text-right mt-3 opacity-60 font-black tracking-widest`}>{reply.time}</p>
                        </div>
                      </div>
                    ))}

                  </div>

                  {/* Reply Input Bar */}
                  <div className="mt-12 mx-2 md:mx-6 glass rounded-[2rem] p-3 md:p-4 sticky bottom-[4.5rem] md:bottom-6 z-50 shadow-2xl border-2 border-white/20 dark:border-white/5 bg-white/95 dark:bg-[#0b141a]/95 backdrop-blur-xl mb-4 md:mb-0">
                    <input ref={replyFileRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={e => setReplyFile(e.target.files?.[0] || null)} />
                    {replyFile && (
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                        <Paperclip size={14} className="text-primary" />
                        <span className="text-xs font-bold text-primary truncate flex-1">{replyFile.name}</span>
                        <button onClick={() => setReplyFile(null)} className="text-gray-400 hover:text-red-500"><XIcon size={14} /></button>
                      </div>
                    )}
                    <div className="flex gap-3 items-center">
                      <button onClick={() => replyFileRef.current?.click()} className="p-3 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all">
                        <Paperclip size={24} />
                      </button>
                      <input type="text" placeholder="Tulis balasan cerdas kamu..." value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !uploadingFile && handleReply(selectedTopic)}
                        className="flex-1 bg-gray-50 dark:bg-black/20 rounded-[1.25rem] outline-none px-6 font-bold text-gray-800 dark:text-white placeholder:text-gray-400/60 py-4" />
                      <button onClick={() => handleReply(selectedTopic)} disabled={uploadingFile || (!replyText && !replyFile)}
                        className="btn-primary !py-3 md:!py-4 !px-4 md:!px-10 flex items-center gap-2 shadow-xl shadow-primary/20">
                        {uploadingFile ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                        <span className="hidden md:inline">Kirim</span>
                      </button>
                    </div>
                  </div>

                </>
              );
            })()}
          </div>
        ) : (
          <div className="grid gap-5">
            {topics.length === 0 ? (
              <div className="text-center py-32 bg-white/30 dark:bg-black/20 rounded-[3rem] border-4 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center">
                 <MessageSquare size={64} className="text-gray-200 dark:text-gray-700 mb-4" />
                 <p className="text-2xl font-black text-gray-300 uppercase tracking-widest">Belum ada diskusi</p>
                 <button onClick={() => setShowCreate(true)} className="text-primary font-black mt-4 hover:underline flex items-center gap-2">
                   Jadilah yang pertama bertanya <ArrowLeft className="rotate-180" size={16} />
                 </button>
              </div>
            ) : topics.map(topic => (
              <Card key={topic.id} onClick={() => setSelectedTopic(topic.id)} className="cursor-pointer group hover:!border-primary/30 !p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 border-2 border-transparent">
                <div className="flex items-center gap-5 flex-1 w-full">
                  <TopicIcon author={topic.authorName || topic.author} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-xl font-black group-hover:text-primary transition-colors tracking-tight">{topic.title}</h3>
                      <KelasChip kelas={topic.kelas} />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <span className="text-primary-dark dark:text-primary underline decoration-primary/10 underline-offset-2">{topic.authorName || topic.author}</span>
                       <span className="opacity-30">•</span>
                       <span>{topic.date}</span>
                       {topic.fileUrl && <span className="flex items-center gap-1 text-primary"><Paperclip size={10} />Lampiran</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-10 border-t md:border-t-0 md:border-l border-gray-50 dark:border-gray-800 w-full md:w-auto pt-5 md:pt-0 pl-0 md:pl-10">
                  <div className="text-center min-w-[70px]">
                    <p className="text-3xl font-black text-primary group-hover:scale-110 transition-transform duration-300">{topic.replies}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Balasan</p>
                  </div>
                  { (role === 'admin' || username === topic.author) && (
                    <button onClick={(e) => handleDeleteTopic(e, topic.id)} className="w-12 h-12 rounded-2xl bg-red-50 hover:bg-red-500 hover:text-white text-red-500 transition-all flex items-center justify-center shadow-sm">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

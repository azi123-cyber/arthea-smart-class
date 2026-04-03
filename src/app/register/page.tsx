'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, AlertCircle, Fingerprint } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [kelas, setKelas] = useState('X');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3) { setError('Username min 3 karakter.'); return; }
    if (password.length < 6) { setError('Password min 6 karakter.'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      const userRef = ref(db, `users/${username}`);
      const existing = await get(userRef);
      if (existing.exists()) {
        setError('Username sudah digunakan.');
        setIsSubmitting(false);
        return;
      }
      
      const userData = {
        name,
        username,
        password,
        kelas,
        role: 'siswa',
        createdAt: Date.now(),
        isVerified: true
      };

      await set(userRef, userData);
      login('user', username);
      router.push('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError('Gagal mendaftarkan akun. Coba lagi.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md premium-card animate-fade-in relative z-10 shadow-2xl">
        {/* Header decoration */}
        <div className="bg-primary px-8 py-10 text-white text-center relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
          <img src="/bahan/arthea_logo_light.png" alt="logo" className="h-16 mx-auto mb-4 object-contain relative z-10 drop-shadow-lg" />
          <h2 className="text-3xl font-black relative z-10">Daftar Akun</h2>
          <p className="text-white/80 text-sm mt-1 relative z-10 font-medium">Bergabung dengan Arthea Smart Class</p>
        </div>

        <div className="px-8 py-10 flex flex-col gap-6 bg-white dark:bg-[#111b21]">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 flex items-center gap-3">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Nama Lengkap</label>
              <div className="group flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-2 border-transparent focus-within:border-primary/30 rounded-2xl px-5 py-4 transition-all">
                <User size={18} className="opacity-40 group-focus-within:opacity-100 transition-opacity" />
                <input type="text" placeholder="Nama asli kamu" value={name} onChange={e => setName(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-400/60" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Kelas</label>
              <div className="group flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-2 border-transparent focus-within:border-primary/30 rounded-2xl px-5 py-4 transition-all">
                <select value={kelas} onChange={e => setKelas(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-400/60 cursor-pointer w-full">
                  {['X','XI','XII'].map(k => <option key={k} value={k} className="text-gray-800">Kelas {k}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Username</label>
              <div className="group flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-2 border-transparent focus-within:border-primary/30 rounded-2xl px-5 py-4 transition-all">
                <Fingerprint size={18} className="opacity-40 group-focus-within:opacity-100 transition-opacity" />
                <input type="text" placeholder="Username unik" value={username} onChange={e => setUsername(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-400/60" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Password</label>
              <div className="group flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-2 border-transparent focus-within:border-primary/30 rounded-2xl px-5 py-4 transition-all">
                <Lock size={18} className="opacity-40 group-focus-within:opacity-100 transition-opacity" />
                <input type={showPass ? 'text' : 'password'} placeholder="Min. 6 karakter" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-400/60" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-primary hover:text-primary-dark text-[10px] font-black uppercase tracking-tight">
                  {showPass ? 'Sembunyi' : 'Lihat'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-4 py-5 text-lg shadow-primary/20">
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary font-black hover:underline underline-offset-4">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

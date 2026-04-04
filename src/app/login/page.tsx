'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { ref, get, child } from 'firebase/database';
import { User, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3 || password.length < 6) {
      setError('Username (min 3) atau password (min 6 karakter).');
      return;
    }
    setIsSubmitting(true);
    setError('');

    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5094';

    try {
      // 1. Check IP Block & Track Login
      const trackRes = await fetch(`${BACKEND_URL}/auth/login-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (!trackRes.ok) {
        const data = await trackRes.json();
        setError(data.error || 'Akses ditolak.');
        setIsSubmitting(false);
        return;
      }

      // 2. Auth Logic
      const snapshot = await get(child(ref(db), `users/${username}`));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.password === password) {
          login(userData.role || 'user', username);
          router.push('/');
        } else {
          setError('Password salah. Periksa kembali.');
          setIsSubmitting(false);
        }
      } else {
        setError('Username tidak ditemukan.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Gagal menghubungi server. Periksa koneksi.');
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
          <h2 className="text-3xl font-black relative z-10">Selamat Datang</h2>
          <p className="text-white/80 text-sm mt-1 relative z-10 font-medium">Masuk ke Arthea Smart Class</p>
        </div>

        <div className="px-8 py-10 flex flex-col gap-6 bg-white dark:bg-[#111b21]">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 flex items-center gap-3">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Username</label>
              <div className="group flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-2 border-transparent focus-within:border-primary/30 rounded-2xl px-5 py-4 transition-all">
                <User size={18} className="opacity-40 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type="text"
                  placeholder="Username kamu"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-400/60"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Password</label>
              <div className="group flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-2 border-transparent focus-within:border-primary/30 rounded-2xl px-5 py-4 transition-all">
                <Lock size={18} className="opacity-40 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 font-bold placeholder-gray-400/60"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-primary hover:text-primary-dark text-[10px] font-black uppercase tracking-tight">
                  {showPass ? 'Sembunyi' : 'Lihat'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-4 py-5 text-lg shadow-primary/20">
              {isSubmitting ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Masuk...</span>
                </div>
              ) : (
                'Masuk Sekarang'
              )}
            </button>
          </form>

          <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
            Belum punya akun?{' '}
            <Link href="/register" className="text-primary font-black hover:underline underline-offset-4">Daftar Sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

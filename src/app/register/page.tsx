'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, AlertCircle, Fingerprint, MessageSquare, CheckCircle2, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.43.217:5094';

export default function Register() {
  const [name, setName] = useState('');
  const [kelas, setKelas] = useState('X');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const { login } = useAuth();

  // Step 1: Kirim OTP ke WA admin
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Nama min 2 karakter.'); return; }
    if (username.length < 3) { setError('Username min 3 karakter.'); return; }
    if (password.length < 6) { setError('Password min 6 karakter.'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, kelas, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) setError(data.error); // Cooldown 2 menit
        else if (res.status === 403) setError(`Akses Diblokir: ${data.error}`);
        else setError(data.error || 'Gagal mengirim OTP.');
        setIsSubmitting(false);
        return;
      }
      setOtpSent(true);
      setStep('otp');
      // cooldown 60 detik
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError('Tidak dapat terhubung ke server. Pastikan server backend berjalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verifikasi OTP dan buat akun
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { setError('Kode OTP harus 6 digit.'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, otp: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verifikasi gagal.');
        setIsSubmitting(false);
        return;
      }
      // Akun berhasil dibuat
      login('user', username);
      router.push('/');
    } catch (err) {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kirim ulang OTP
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, kelas, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) setError(data.error);
        else setError(data.error || 'Gagal mengirim ulang OTP.');
        return;
      }
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch { setError('Gagal mengirim ulang OTP.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md premium-card animate-fade-in relative z-10 shadow-2xl">
        {/* Header */}
        <div className="bg-primary px-8 py-10 text-white text-center relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
          <img src="/bahan/arthea_logo_light.png" alt="logo" className="h-16 mx-auto mb-4 object-contain relative z-10 drop-shadow-lg" />
          <h2 className="text-3xl font-black relative z-10">
            {step === 'form' ? 'Daftar Akun' : 'Verifikasi OTP'}
          </h2>
          <p className="text-white/80 text-sm mt-1 relative z-10 font-medium">
            {step === 'form' ? 'Bergabung dengan Arthea Smart Class' : 'Masukkan kode yang dikirim ke WhatsApp admin'}
          </p>
        </div>

        <div className="px-8 py-10 flex flex-col gap-6 bg-white dark:bg-[#111b21]">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-xs font-black border border-red-100 dark:border-red-900/30 flex items-center gap-3">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {step === 'form' ? (
            <form onSubmit={handleRequestOTP} className="flex flex-col gap-5">
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
                    {['X', 'XI', 'XII'].map(k => <option key={k} value={k} className="text-gray-800">Kelas {k}</option>)}
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

              {/* Info OTP */}
              <div className="flex items-start gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl">
                <MessageSquare size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                  Setelah klik Daftar, silakan hubungi admin untuk mendapatkan kode OTP pendaftaran Anda.
                </p>
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-4 py-5 text-lg shadow-primary/20">
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </div>
                ) : 'Daftar & Minta OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
              {/* Info */}
              <div className="flex items-start gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl">
                <MessageSquare size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-primary uppercase tracking-wider mb-0.5">OTP Tersimpan!</p>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Masukkan kode 6 digit yang Anda terima. Kode berlaku <span className="font-black text-primary">10 menit</span>.
                  </p>
                </div>
              </div>

              {/* OTP Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Kode OTP (6 Digit)</label>
                <div className="group flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-2 border-transparent focus-within:border-primary/30 rounded-2xl px-5 py-4 transition-all">
                  <CheckCircle2 size={18} className="opacity-40 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 font-black placeholder-gray-400/60 text-2xl tracking-[0.5em]"
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting || otpCode.length !== 6} className="btn-primary w-full py-5 text-lg shadow-primary/20">
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi...</span>
                  </div>
                ) : 'Verifikasi & Buat Akun'}
              </button>

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setStep('form'); setOtpCode(''); setError(''); }}
                  className="text-sm font-bold text-gray-500 hover:text-primary transition-colors">
                  ← Ubah Data
                </button>
                <button type="button" onClick={handleResendOTP} disabled={resendCooldown > 0 || isSubmitting}
                  className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-primary hover:underline'}`}>
                  <RefreshCw size={14} />
                  {resendCooldown > 0 ? `Tunggu ${resendCooldown}s` : 'Kirim Ulang OTP'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-primary font-black hover:underline underline-offset-4">Masuk</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

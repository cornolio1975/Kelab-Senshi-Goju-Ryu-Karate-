'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured, basePath } from '@/db/dbClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) {
          setError(updateError.message);
          setLoading(false);
          return;
        }

        setMessage('Your password has been reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setMessage('Mock password reset success! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center overflow-hidden bg-[#030712] font-sans text-slate-200">
      
      {/* --- DYNAMIC BACKGROUND & EFFECTS --- */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0f172a] to-[#030712] z-0" />
      
      {/* Glowing orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse z-0" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[150px] animate-pulse z-0" style={{ animationDuration: '5s' }} />
      
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik02MCAwaC02MHY2MCIvPjwvZz48L3N2Zz4=')] opacity-20 z-0 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-[#030712] z-0" />

      {/* --- CONTENT WRAPPER --- */}
      <div className="relative z-10 w-full max-w-[440px] px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* FROSTED GLASS CARD */}
        <div className="bg-[#0f172a]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl shadow-black/50 overflow-hidden relative">
          
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

          <div className="p-8 sm:p-10 flex flex-col items-center space-y-6">
            
            {/* HEADER */}
            <div className="flex flex-col items-center space-y-4 text-center w-full">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative h-16 w-16 rounded-full flex items-center justify-center overflow-hidden border border-white/10 bg-black shadow-inner">
                  <img src={`${basePath}/logo.jpg`} alt="Senshi Logo" className="h-full w-full object-cover" />
                </div>
              </div>
              
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-white uppercase drop-shadow-md">Senshi Goju-Ryu</h2>
                <p className="text-xs text-indigo-300/80 font-medium tracking-widest uppercase">
                  Reset Password
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-center leading-relaxed font-medium px-4">
              Enter your new secure password below to complete access recovery.
            </p>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 rounded-xl text-center backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              {message && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 rounded-xl text-center backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                  {message}
                </div>
              )}

              <div className="space-y-4">
                {/* New Password Input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full pl-11 pr-11 py-3.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Confirm Password Input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    className="w-full pl-11 pr-11 py-3.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading || !!message}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] rounded-xl text-sm font-black tracking-widest uppercase cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 border border-indigo-400/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Update Password</span>
                    <Check className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="w-full pt-4 border-t border-white/5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer flex items-center gap-1 transition-all"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back to Sign In</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

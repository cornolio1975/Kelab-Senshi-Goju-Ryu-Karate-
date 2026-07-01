'use client';

import React, { useState, useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { 
  Users, Eye, Mail, Lock, EyeOff, Shield, ArrowRight, 
  User, KeyRound, Send, ArrowLeft 
} from 'lucide-react';
import { supabase, isSupabaseConfigured, basePath } from '@/db/dbClient';

export default function LoginPage() {
  const { login, usersList, addUser } = useTournament();
  
  // Tab roles: 'Admin' | 'Co-Admin' | 'Viewer'
  const [activeRole, setActiveRole] = useState<'Admin' | 'Co-Admin' | 'Viewer'>('Viewer');
  
  // Modes: 'signIn' | 'signUp' | 'forgotPassword'
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'forgotPassword'>('signIn');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'forgotPassword') {
        if (!email) {
          setError('Please enter your email address.');
          setLoading(false);
          return;
        }

        if (isSupabaseConfigured && supabase) {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + basePath + '/auth/reset-password',
          });
          if (resetError) {
            setError(resetError.message);
          } else {
            setMessage('A password reset link has been sent to your email.');
          }
        } else {
          setMessage('Mock password reset email sent successfully!');
        }
        setLoading(false);
        return;
      }

      if (activeRole === 'Viewer' && mode === 'signIn') {
        login('Viewer', 'spectator@senshikarate.com');
        window.location.href = `${basePath}/public`;
        return;
      }

      if (mode === 'signUp') {
        if (!name || !email || !password || !confirmPassword) {
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

        if (isSupabaseConfigured && supabase) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
              emailRedirectTo: window.location.origin + basePath + '/auth/callback',
              data: {
                name: name.trim(),
                role: activeRole,
              }
            }
          });

          if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
          }

          // Register user locally
          const newUser = {
            name: name.trim(),
            email: email.trim(),
            role: activeRole,
            status: 'Active' as const,
            accessibility: {
              themeContrast: 'standard' as const,
              textScale: 'standard' as const,
              reducedMotion: false,
              legibilityFont: 'standard' as const,
            }
          };
          addUser(newUser);

          if (data.session) {
            login(activeRole, email.trim());
            window.location.href = `${basePath}/`;
          } else {
            setMessage('Registration successful! Please check your email to confirm your account.');
          }
        } else {
          // Mock Sign Up
          const newUser = {
            name: name.trim(),
            email: email.trim(),
            role: activeRole,
            status: 'Active' as const,
            accessibility: {
              themeContrast: 'standard' as const,
              textScale: 'standard' as const,
              reducedMotion: false,
              legibilityFont: 'standard' as const,
            }
          };
          addUser(newUser);
          login(activeRole, email.trim());
          window.location.href = `${basePath}/`;
        }
        setLoading(false);
        return;
      }

      // Mode is 'signIn'
      if (!email || !password) {
        setError('Please enter both email and password.');
        setLoading(false);
        return;
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }

        // On successful sign in, make sure user is in local usersList
        const userEmail = data.user?.email || email.trim();
        let matchedUser = usersList.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
        if (!matchedUser) {
          const displayName = data.user?.user_metadata?.name || userEmail.split('@')[0];
          const userRoleMetadata = data.user?.user_metadata?.role || activeRole;
          const newUser = {
            name: displayName,
            email: userEmail,
            role: userRoleMetadata as 'Admin' | 'Co-Admin' | 'Viewer',
            status: 'Active' as const,
            accessibility: {
              themeContrast: 'standard' as const,
              textScale: 'standard' as const,
              reducedMotion: false,
              legibilityFont: 'standard' as const,
            }
          };
          addUser(newUser);
          matchedUser = newUser;
        }

        if (matchedUser.status === 'Suspended') {
          setError('Your access has been suspended by the Tournament Director.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        login(matchedUser.role, matchedUser.email);
        window.location.href = `${basePath}/`;
      } else {
        // Mock Sign In
        const userObj = usersList.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (!userObj) {
          setError(`No account found for ${email}. Please contact the administrator.`);
          setLoading(false);
          return;
        }

        if (userObj.status === 'Suspended') {
          setError('Your access has been suspended by the Tournament Director.');
          setLoading(false);
          return;
        }

        if (userObj.role !== activeRole) {
          setError(`Access denied. Your account is registered as a ${userObj.role}, not ${activeRole}.`);
          setLoading(false);
          return;
        }

        login(activeRole, userObj.email);
        window.location.href = `${basePath}/`;
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleHelpText = () => {
    switch (activeRole) {
      case 'Admin':
        return 'Full control panel access. Configure events, brackets, and manage all participants.';
      case 'Co-Admin':
        return 'Tournament floor access. Manage tatami schedules, bouts, and scoring parameters.';
      case 'Viewer':
        return 'Public spectator hub. Watch live streams, browse brackets, and view medal standings.';
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
                  {mode === 'signIn' ? 'Tournament Sign In' : mode === 'signUp' ? 'Create Account' : 'Password Recovery'}
                </p>
              </div>
            </div>

            {/* ROLE SELECTOR (Only shown for Sign In and Sign Up) */}
            {mode !== 'forgotPassword' && (
              <div className="bg-black/40 p-1.5 rounded-2xl w-full border border-white/5 relative flex shadow-inner">
                {[
                  { id: 'Viewer', label: 'Spectator', icon: Users },
                  { id: 'Co-Admin', label: 'Tatami', icon: Shield },
                  { id: 'Admin', label: 'Director', icon: Shield }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeRole === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveRole(tab.id as any);
                        setError(null);
                      }}
                      className={`flex-1 py-2.5 px-2 rounded-xl text-[11px] font-bold transition-all duration-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer relative z-10 ${
                        isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-indigo-600/90 rounded-xl shadow-lg shadow-indigo-900/50 -z-10 animate-in zoom-in-95 duration-200" />
                      )}
                      <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-200' : ''}`} />
                      <span className="tracking-wide uppercase">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {mode !== 'forgotPassword' && (
                <div className="h-10 flex items-center">
                  <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium px-4 w-full animate-in fade-in duration-500" key={activeRole}>
                    {getRoleHelpText()}
                  </p>
                </div>
              )}

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
                {/* Name Input (Sign Up Only) */}
                {mode === 'signUp' && (
                  <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-11 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                      required
                    />
                  </div>
                )}

                {/* Email Input (All modes) */}
                {(mode !== 'signIn' || activeRole !== 'Viewer') && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full pl-11 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                      required
                    />
                  </div>
                )}

                {/* Password Input (Sign In / Sign Up) */}
                {mode !== 'forgotPassword' && (mode !== 'signIn' || activeRole !== 'Viewer') && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
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
                )}

                {/* Confirm Password Input (Sign Up Only) */}
                {mode === 'signUp' && (
                  <div className="relative group animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
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
                )}
              </div>

              {/* Forgot Password Link (Sign In Only) */}
              {mode === 'signIn' && activeRole !== 'Viewer' && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgotPassword');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-all cursor-pointer font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] rounded-xl text-sm font-black tracking-widest uppercase cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 border border-indigo-400/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'signIn' 
                        ? (activeRole === 'Viewer' ? 'Enter Live Hub' : 'Authenticate') 
                        : mode === 'signUp' ? 'Create Account' : 'Send Reset Link'}
                    </span>
                    {mode === 'forgotPassword' ? <Send className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </>
                )}
              </button>
            </form>

            {/* OAUTH AREA (Only for Sign In and Co-Admin/Admin roles) */}
            {mode === 'signIn' && activeRole !== 'Viewer' && (
              <div className="w-full flex flex-col space-y-4 pt-2">
                <div className="flex items-center justify-between w-full">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/10" />
                  <span className="px-3 text-[9px] font-bold text-slate-600 uppercase tracking-widest">Single Sign-On</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/10" />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setError(null);
                    setMessage(null);
                    setLoading(true);

                    try {
                      if (isSupabaseConfigured && supabase) {
                        const { error: oauthError } = await supabase.auth.signInWithOAuth({
                          provider: 'google',
                          options: {
                            redirectTo: window.location.origin + basePath + '/auth/callback',
                          },
                        });
                        if (oauthError) {
                          setError(oauthError.message);
                        }
                      } else {
                        // Mock Google Auth Flow
                        const targetEmail = email.trim() || `${activeRole.toLowerCase()}@senshikarate.com`;
                        login(activeRole, targetEmail);
                        window.location.href = `${basePath}/`;
                      }
                    } catch (err: any) {
                      setError(err?.message || 'Google Auth Error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full py-3.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer text-slate-300 hover:text-white group disabled:opacity-50"
                >
                  <svg className="h-4 w-4 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            )}

            {/* SWITCH MODE FOOTER */}
            <div className="w-full pt-4 border-t border-white/5 flex flex-col items-center justify-center space-y-3">
              {mode === 'signIn' ? (
                activeRole !== 'Viewer' && (
                  <p className="text-xs text-slate-500">
                    Need a tournament account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signUp');
                        setError(null);
                        setMessage(null);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer transition-all"
                    >
                      Sign Up
                    </button>
                  </p>
                )
              ) : mode === 'signUp' ? (
                <p className="text-xs text-slate-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signIn');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer transition-all"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signIn');
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer flex items-center gap-1 transition-all"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to Sign In</span>
                </button>
              )}
            </div>

          </div>
        </div>
        
        {/* System Status / Version Indicator */}
        <div className="absolute -bottom-16 left-0 right-0 text-center text-[9px] text-slate-600 font-mono tracking-widest uppercase flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Senshi Core v3.0.1
        </div>
      </div>
    </div>
  );
}

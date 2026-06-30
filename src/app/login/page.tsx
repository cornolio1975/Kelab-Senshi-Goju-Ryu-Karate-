'use client';

import React, { useState } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { Users, Eye, Mail, Lock, EyeOff, Shield } from 'lucide-react';
import { supabase, isSupabaseConfigured, basePath } from '@/db/dbClient';

export default function LoginPage() {
  const { login, usersList } = useTournament();
  
  // Tab roles: 'Admin' | 'Co-Admin' | 'Viewer'
  const [activeRole, setActiveRole] = useState<'Admin' | 'Co-Admin' | 'Viewer'>('Viewer');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (activeRole === 'Viewer') {
      const viewerUser = usersList.find(u => u.role === 'Viewer');
      const targetEmail = email || viewerUser?.email || 'spectator@senshikarate.com';
      
      login('Viewer', 'spectator@senshikarate.com');
      window.location.href = `${basePath}/public`;
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    // Check if user exists
    const userObj = usersList.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!userObj) {
      setError(`No account found for ${email}. Please contact the administrator.`);
      return;
    }

    // Check if suspended
    if (userObj.status === 'Suspended') {
      setError('Your access has been suspended by the Tournament Director.');
      return;
    }

    // Check role match
    if (userObj.role !== activeRole) {
      setError(`Access denied. Your account is registered as a ${userObj.role}, not ${activeRole}.`);
      return;
    }

    // Mock successful authentication for testing
    login(activeRole, userObj.email);
    window.location.href = `${basePath}/`;
  };

  const getRoleHelpText = () => {
    switch (activeRole) {
      case 'Admin':
        return 'Full tournament control. Create events, manage students, categories, and generate brackets. Unlimited device access.';
      case 'Co-Admin':
        return 'Tournament setup and bout scoring access. Help run matches, schedules, and record results.';
      case 'Viewer':
        return 'Public spectator scoreboard. Real-time draw brackets, standings, medal tallies, and live streaming.';
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-tr from-[#eef2f6] to-[#dce4ec] dark:from-[#0a0f1d] dark:to-[#0f172a] flex items-center justify-center p-4 text-foreground">
      
      <div className="w-full max-w-[440px] bg-white dark:bg-[#111827] border border-[#e2e8f0] dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden p-8 flex flex-col items-center space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col items-center space-y-2 text-center">
          {/* Emblem Karate silhouette custom logo.jpg */}
          <div className="h-14 w-14 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs mb-1">
            <img src={`${basePath}/logo.jpg`} alt="Logo" className="h-full w-full object-cover" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground dark:text-white">Karate Tournament App</h2>
          <span className="text-xs text-muted-foreground font-semibold">Choose your role to continue</span>
        </div>

        {/* TABS GRID */}
        <div className="grid grid-cols-3 gap-2 bg-[#f1f5f9] dark:bg-[#1f2937] p-1.5 rounded-2xl w-full border border-[#e2e8f0]/40 dark:border-slate-700/50">
          {[
            { id: 'Viewer', label: 'Viewer', icon: Eye },
            { id: 'Co-Admin', label: 'Co-Admin', icon: Users },
            { id: 'Admin', label: 'Admin', icon: Shield }
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
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#1d4ed8] text-white shadow-md'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#e2e8f0]/50 dark:hover:bg-[#374151]/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* HELPER CARD */}
        <div className="bg-[#eff6ff] dark:bg-[#1e3a8a]/20 border border-[#bfdbfe]/50 dark:border-[#1e3a8a]/40 rounded-2xl p-4 w-full flex gap-3 items-start">
          <div className="h-8 w-8 bg-[#dbeafe] dark:bg-[#1e3a8a]/40 text-[#1d4ed8] dark:text-[#60a5fa] rounded-xl flex items-center justify-center shrink-0">
            {activeRole === 'Admin' ? <Shield className="h-4 w-4" /> : activeRole === 'Co-Admin' ? <Users className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </div>
          <p className="text-xs text-[#3b82f6] dark:text-[#93c5fd] leading-relaxed font-semibold">
            {getRoleHelpText()}
          </p>
        </div>

        {/* FORM FIELDS */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-500 rounded-xl text-center">
              {error}
            </div>
          )}

          {activeRole !== 'Viewer' ? (
            <>
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full pl-11 pr-4 py-3 bg-[#f1f5f9] dark:bg-[#1f2937] border border-[#e2e8f0] dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder-[#94a3b8]"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94a3b8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-11 pr-11 py-3 bg-[#f1f5f9] dark:bg-[#1f2937] border border-[#e2e8f0] dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder-[#94a3b8]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-foreground cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </>
          ) : null}

          {/* Action button */}
          <button
            type="submit"
            className="w-full py-3.5 bg-[#1d4ed8] text-white hover:bg-[#1e40af] shadow-md rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-98"
          >
            {activeRole === 'Viewer' ? 'Access Spectator Live Hub' : 'Login'}
          </button>
        </form>

        {/* OR DIVIDER */}
        {activeRole !== 'Viewer' && (
          <div className="w-full flex items-center justify-between py-1 shrink-0">
            <hr className="w-[43%] border-[#e2e8f0] dark:border-slate-800" />
            <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">or</span>
            <hr className="w-[43%] border-[#e2e8f0] dark:border-slate-800" />
          </div>
        )}

        {/* GOOGLE SIGN IN */}
        {activeRole !== 'Viewer' && (
          <button
            type="button"
            onClick={async () => {
              setError(null);

              if (isSupabaseConfigured && supabase) {
                const { error: oauthError } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin + '/auth/callback',
                  },
                });
                if (oauthError) {
                  setError(oauthError.message);
                }
                return;
              }
              
              const targetEmail = email.trim()
                ? email.trim()
                : (activeRole === 'Admin' 
                    ? 'admin@senshikarate.com' 
                    : activeRole === 'Co-Admin' 
                      ? 'coadmin@senshikarate.com' 
                      : 'spectator@senshikarate.com');
              
              const userObj = usersList.find(u => u.email.toLowerCase() === targetEmail.toLowerCase());
              if (userObj) {
                if (userObj.status === 'Suspended') {
                  setError('Your access has been suspended by the Tournament Director.');
                  return;
                }
                if (userObj.role !== activeRole) {
                  setError(`Access denied. Your account is registered as a ${userObj.role}, not ${activeRole}.`);
                  return;
                }
              } else {
                if (email.trim()) {
                  setError(`No account found for ${targetEmail}. Please contact the administrator.`);
                  return;
                }
              }
              login(activeRole, targetEmail);
              window.location.href = `${basePath}/`;
            }}
            className="w-full py-3 bg-white dark:bg-[#1f2937] hover:bg-gray-50 dark:hover:bg-[#374151] border border-[#cbd5e1] dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer text-foreground"
          >
          {/* Google Logo SVG */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>
        )}

        {/* FOOTER LINKS */}
        <div className="w-full flex items-center justify-between text-xs font-bold text-[#1d4ed8] dark:text-blue-400 pt-2 shrink-0">
          <a href="#" onClick={(e) => { e.preventDefault(); alert('Registration feature under development. In this local mock server, you can use role tabs above to sign in instantly.'); }} className="hover:underline">
            Create Account
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); alert('Password recovery email service is under development. In this local mock server, you can sign in directly.'); }} className="hover:underline">
            Forgot Password?
          </a>
        </div>

      </div>
    </div>
  );
}

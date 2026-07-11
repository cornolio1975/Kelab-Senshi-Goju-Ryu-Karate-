'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, Flame, Users, Calendar, MapPin, ArrowRight, ShieldCheck, 
  Tv, LogIn, ExternalLink, Activity, Info, Award
} from 'lucide-react';
import { basePath } from '@/db/dbClient';
import { formatLocalDate } from '@/lib/dateUtils';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  
  // Dynamic upcoming tournament details from settings/localStorage
  const [upcomingName, setUpcomingName] = useState('Kelab Senshi Goju-Ryu Open Karate Championship 2026');
  const [upcomingDate, setUpcomingDate] = useState('2026-08-15');
  const [upcomingTime, setUpcomingTime] = useState('08:00');
  const [upcomingVenue, setUpcomingVenue] = useState('Dewan Serbaguna Petaling Jaya');
  const [upcomingCity, setUpcomingCity] = useState('Petaling Jaya, Selangor');

  // Countdown timer values
  const [days, setDays] = useState('00');
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');

  useEffect(() => {
    setMounted(true);

    // Retrieve customized event parameters if set in admin console
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('ts_upcoming_name');
      if (storedName !== null) setUpcomingName(storedName);
      const storedDate = localStorage.getItem('ts_upcoming_date');
      if (storedDate !== null) setUpcomingDate(storedDate);
      const storedTime = localStorage.getItem('ts_upcoming_time');
      if (storedTime !== null) setUpcomingTime(storedTime);
      const storedVenue = localStorage.getItem('ts_upcoming_venue');
      if (storedVenue !== null) setUpcomingVenue(storedVenue);
      const storedCity = localStorage.getItem('ts_upcoming_city');
      if (storedCity !== null) setUpcomingCity(storedCity);
    }
  }, []);

  // Update countdown clock
  useEffect(() => {
    if (!mounted) return;
    
    if (!upcomingDate || !upcomingTime) {
      setDays('00');
      setHours('00');
      setMinutes('00');
      setSeconds('00');
      return;
    }

    const targetIso = `${upcomingDate}T${upcomingTime}:00`;
    const target = new Date(targetIso).getTime();

    if (isNaN(target)) {
      setDays('00');
      setHours('00');
      setMinutes('00');
      setSeconds('00');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        clearInterval(interval);
        setDays('00');
        setHours('00');
        setMinutes('00');
        setSeconds('00');
      } else {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);

        setDays(String(d).padStart(2, '0'));
        setHours(String(h).padStart(2, '0'));
        setMinutes(String(m).padStart(2, '0'));
        setSeconds(String(s).padStart(2, '0'));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mounted, upcomingDate, upcomingTime]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#070b15] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[35%] h-[35%] bg-indigo-900/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden border border-white/10 bg-slate-900 shrink-0">
            <img src={`${basePath}/logo.jpg`} alt="Kelab Senshi Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white leading-none">KELAB KARATE DO</h1>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">SENSHI GOJU-RYU</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/public" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Spectator Hub
          </Link>
          <Link href="/public/tournaments" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Upcoming Events
          </Link>
          <Link href="/public/past-tournaments" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            Tournament Archive
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:bg-white/5 rounded-lg text-xs font-bold uppercase tracking-wide text-white transition-all"
          >
            <LogIn size={13} />
            <span>Portal Login</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
          <Flame size={12} fill="currentColor" />
          Welcome to the Dojo
        </div>

        <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
          DISCIPLINE. RESPECT.<br />
          <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            UNLEASH THE WARRIOR WITHIN.
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Kelab Senshi Goju-Ryu Karate Do is a premier traditional Okinawan karate academy. 
          We dedicate ourselves to developing physical mastery, mental fortitude, and competitive excellence.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link 
            href="/public"
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-indigo-900/40 flex items-center gap-2"
          >
            <Tv size={14} />
            <span>Spectator Live Hub</span>
          </Link>
          <Link 
            href="/public/tournaments"
            className="px-6 py-3.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold tracking-widest uppercase text-white transition-all flex items-center gap-2"
          >
            <span>Upcoming Tournaments</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Tournament Countdown Panel */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block">Next Championship</span>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {upcomingName}
              </h3>
              
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400" />
                  <span>{upcomingDate ? `${formatLocalDate(upcomingDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${upcomingTime}` : 'TBD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-indigo-400" />
                  <span>{upcomingVenue}, {upcomingCity}</span>
                </div>
              </div>
            </div>

            {/* Live Countdown Clocks */}
            <div className="flex flex-col items-center space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">REGISTRATION COUNTDOWN</span>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono">{days}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1">Days</span>
                </div>
                <span className="text-xl text-slate-700 font-bold mb-4">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono">{hours}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1">Hours</span>
                </div>
                <span className="text-xl text-slate-700 font-bold mb-4">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono">{minutes}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1">Mins</span>
                </div>
                <span className="text-xl text-slate-700 font-bold mb-4">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-black text-white font-mono">{seconds}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1">Secs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Archives Summary Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="border-t border-white/5 pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Stat 1 */}
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 flex items-start gap-4 hover:border-white/10 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Trophy size={18} fill="currentColor" />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black text-white">88 Divisions</h4>
                <p className="text-xs text-slate-400">Archived championship event divisions from 2026 draws.</p>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 flex items-start gap-4 hover:border-white/10 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black text-white">481 Competitors</h4>
                <p className="text-xs text-slate-400">Total verified elite athletes listed across draw registries.</p>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 flex items-start gap-4 hover:border-white/10 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Award size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black text-white">75 Dojos</h4>
                <p className="text-xs text-slate-400">Participating karate clubs and regional martial art schools.</p>
              </div>
            </div>

          </div>

          <div className="text-center pt-8">
            <Link 
              href="/public/past-tournaments" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline uppercase tracking-wider"
            >
              <span>Relive past results and view champions list</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-black/60 border-t border-white/5 py-12 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="font-bold text-white block mb-1">Kelab Senshi Goju-Ryu Karate Do</span>
            <p className="max-w-sm leading-relaxed">
              Affiliated school promoting traditional values, athletic excellence, and character development in Puchong, Selangor.
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-1 text-right">
            <span className="font-bold text-white">© 2026 KarateTech</span>
            <span>Developed by <span className="font-semibold text-slate-300">SP Sport Data Solution</span></span>
            <span>Professional Karate Tournament Management System</span>
            <span>All Rights Reserved.</span>
            <span className="text-[10px] mt-1 text-slate-650">Contact Dojo: <a href="mailto:senshikarate@gmail.com" className="text-indigo-400 hover:underline">senshikarate@gmail.com</a></span>
          </div>
        </div>
      </footer>

    </div>
  );
}

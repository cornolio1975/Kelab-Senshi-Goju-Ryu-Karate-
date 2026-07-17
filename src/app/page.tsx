'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trophy, Flame, Users, Calendar, MapPin, ArrowRight, ShieldCheck, 
  Tv, LogIn, ExternalLink, Activity, Info, Award, Clock, Globe, Sun, Moon
} from 'lucide-react';
import { db, basePath } from '@/db/dbClient';
import { Bout, Participant, Category, Club, Tournament } from '@/db/types';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<'EN' | 'MS'>('EN');
  
  // Dynamic stats loaded from DB
  const [stats, setStats] = useState({
    clubs: 0,
    athletes: 0,
    categories: 0,
    matches: 0,
    tatamis: 2,
    completed: 0,
    upcoming: 0
  });

  const [liveBouts, setLiveBouts] = useState<Bout[]>([]);
  const [upcomingBouts, setUpcomingBouts] = useState<Bout[]>([]);
  const [medalClubs, setMedalClubs] = useState<any[]>([]);
  const [featuredTournament, setFeaturedTournament] = useState<Tournament | null>(null);

  // Metadata tournament defaults
  const [tournamentName, setTournamentName] = useState('Karate Tech Open Championship 2026');
  const [venue, setVenue] = useState('Dewan Serbaguna Petaling Jaya');
  const [city, setCity] = useState('Petaling Jaya, Selangor');
  const [country, setCountry] = useState('Malaysia');
  const [eventDate, setEventDate] = useState('15 August 2026');
  const [organizer, setOrganizer] = useState('Kelab Senshi Goju-Ryu Karate-Do');
  const [wkfRules, setWkfRules] = useState('WKF Rules Edition 2026');

  useEffect(() => {
    setMounted(true);
    loadTournamentData();
    
    // Retrieve custom metadata if set in localStorage (fallback overrides)
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('ts_upcoming_name');
      if (storedName) setTournamentName(storedName);
      const storedVenue = localStorage.getItem('ts_upcoming_venue');
      if (storedVenue) setVenue(storedVenue);
      const storedCity = localStorage.getItem('ts_upcoming_city');
      if (storedCity) setCity(storedCity);
      const storedDate = localStorage.getItem('ts_upcoming_date');
      if (storedDate) setEventDate(storedDate);
    }
  }, []);

  const loadTournamentData = async () => {
    try {
      const [bList, pList, catList, clList, tList] = await Promise.all([
        db.bouts.list(),
        db.participants.list(),
        db.categories.list(),
        db.clubs.list(),
        db.tournaments.list()
      ]);

      // Load featured tournament and populate hero section from DB
      const featured = tList.find(t => t.featured && !t.deleted_at) || tList.find(t => !t.deleted_at) || null;
      if (featured) {
        setFeaturedTournament(featured);
        setTournamentName(featured.name);
        setOrganizer(featured.organizer);
        setVenue(featured.venue || venue);
        setCity(featured.city || city);
        if (featured.date) setEventDate(featured.date);
      }
      const activeAthletes = pList.filter(p => !p.deleted_at);
      const completedBouts = bList.filter(b => b.status === 'Completed' || b.status === 'Walkover');
      const scheduledBouts = bList.filter(b => b.status === 'Scheduled');
      const runningBouts = bList.filter(b => b.status === 'Running');

      setStats({
        clubs: clList.length || 4,
        athletes: activeAthletes.length || 32,
        categories: catList.length || 8,
        matches: bList.length || 24,
        tatamis: Array.from(new Set(bList.map(b => b.tatami).filter(Boolean))).length || 2,
        completed: completedBouts.length,
        upcoming: scheduledBouts.length
      });

      // Filter running or next scheduled bouts for Tatami cards
      const tatamiMap: Record<string, Bout> = {};
      bList.forEach(b => {
        const tat = b.tatami || 'Tatami 1';
        if (b.status === 'Running') {
          tatamiMap[tat] = b;
        } else if (!tatamiMap[tat] && b.status === 'Scheduled') {
          tatamiMap[tat] = b;
        }
      });
      setLiveBouts(Object.values(tatamiMap));

      // Load next 10 upcoming matches
      setUpcomingBouts(scheduledBouts.slice(0, 10));

      // Calculate Medal Standings
      // Rank clubs by counting resolved bout gold/silver/bronze winners
      const medalCount: Record<string, { gold: number; silver: number; bronze: number; name: string }> = {};
      clList.forEach(c => {
        medalCount[c.id] = { gold: 0, silver: 0, bronze: 0, name: c.name };
      });

      // Process bouts to calculate medals (only final round_no for first/second/third)
      catList.forEach(cat => {
        const catBouts = bList.filter(b => b.category_id === cat.id);
        const maxRound = Math.max(...catBouts.filter(b => b.round_no !== 99 && b.round_no !== 98).map(b => b.round_no), 0);
        if (maxRound > 0) {
          const finalBout = catBouts.find(b => b.round_no === maxRound && b.bout_no === 1);
          if (finalBout && finalBout.status === 'Completed' && finalBout.winner_id) {
            const goldWinner = activeAthletes.find(p => p.id === finalBout.winner_id);
            const silverWinnerId = finalBout.winner_id === finalBout.participant_a_id ? finalBout.participant_b_id : finalBout.participant_a_id;
            const silverWinner = silverWinnerId ? activeAthletes.find(p => p.id === silverWinnerId) : null;
            
            if (goldWinner?.club_id && medalCount[goldWinner.club_id]) {
              medalCount[goldWinner.club_id].gold += 1;
            }
            if (silverWinner?.club_id && medalCount[silverWinner.club_id]) {
              medalCount[silverWinner.club_id].silver += 1;
            }
          }
        }
        
        // Bronze winners: from third place match or repechage pool finals
        const bronzeBout = catBouts.find(b => b.round_no === 99);
        if (bronzeBout && bronzeBout.status === 'Completed' && bronzeBout.winner_id) {
          const bWinner = activeAthletes.find(p => p.id === bronzeBout.winner_id);
          if (bWinner?.club_id && medalCount[bWinner.club_id]) {
            medalCount[bWinner.club_id].bronze += 1;
          }
        }

      });

      const sortedClubs = Object.values(medalCount)
        .sort((a, b) => {
          if (b.gold !== a.gold) return b.gold - a.gold;
          if (b.silver !== a.silver) return b.silver - a.silver;
          return b.bronze - a.bronze;
        });
      setMedalClubs(sortedClubs);

    } catch (e) {
      console.warn('Error loading stats/standings:', e);
    }
  };

  const formatTime = (tenths: number) => {
    const mins = Math.floor(tenths / 600);
    const secs = Math.floor((tenths % 600) / 10);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!mounted) return null;

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#070b15] text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans overflow-x-hidden transition-colors duration-200`}>
      
      {/* 1. Header Bar */}
      <header className={`relative z-10 border-b ${theme === 'dark' ? 'border-white/5 bg-[#0b0f19]' : 'border-slate-200 bg-white'} px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white/20 bg-slate-900 shrink-0">
            <img src={`${basePath}/logo.jpg`} alt="Tournament Logo" className="h-full w-full object-cover" />
          </div>
          {/* Brand Logo — KarateTech */}
          <div className="flex flex-col leading-none">
            {/* Line 1: KarateTech two-tone */}
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '1.15rem', lineHeight: 1, letterSpacing: '0.01em' }}>
              <span style={{ color: '#b91c2e' }}>Karate</span>
              <span style={{ color: '#38bdf8' }}>Tech</span>
            </div>
            {/* Thin crimson divider */}
            <div style={{ height: '2px', background: 'linear-gradient(90deg, #b91c2e 60%, transparent 100%)', marginTop: '2px', marginBottom: '2px', borderRadius: '1px' }} />
            {/* Line 2: SP Sport Data Solution */}
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.01em', color: theme === 'dark' ? '#818cf8' : '#1a2744', lineHeight: 1.15 }}>
              SP SportData Solution
            </span>
            {/* Line 3: Tagline */}
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.58rem', letterSpacing: '0.08em', color: theme === 'dark' ? '#64748b' : '#64748b', lineHeight: 1.2, marginTop: '2px' }}>
              • Precision. • Speed. • Results. •
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold opacity-70">
            <Clock size={14} className="text-indigo-400" />
            <span>{new Date().toLocaleDateString(lang === 'EN' ? 'en-US' : 'ms-MY')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLang(lang === 'EN' ? 'MS' : 'EN')} 
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <Globe size={11} className="inline mr-1" />
              {lang}
            </button>
            <button 
              onClick={toggleTheme} 
              className={`p-2 rounded-lg transition cursor-pointer ${
                theme === 'dark' ? 'bg-white/5 text-yellow-400 hover:bg-white/10' : 'bg-slate-100 text-amber-600 hover:bg-slate-200'
              }`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Navigation Sub-Bar */}
      <nav className={`border-b text-xs ${theme === 'dark' ? 'border-white/5 bg-[#090d16]/80' : 'border-slate-200 bg-slate-100'} sticky top-0 z-20 backdrop-blur-md overflow-x-auto`}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-6 whitespace-nowrap">
          <Link href="/" className="font-extrabold text-indigo-400">Home</Link>
          <Link href="/public/tournaments" className="font-bold hover:text-indigo-400 transition-colors">Tournament Info</Link>
          <Link href="/public/past-tournaments" className="font-bold hover:text-indigo-400 transition-colors">Past Results</Link>
          <Link href="/public" className="font-bold hover:text-indigo-400 transition-colors">Spectator Hub</Link>
          <Link href="/login" className="font-bold text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5 ml-auto">
            <LogIn size={13} />
            <span>Portal Login</span>
          </Link>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-4">
        <div className={`rounded-3xl border overflow-hidden p-8 sm:p-12 relative ${
          theme === 'dark' 
            ? 'bg-gradient-to-r from-slate-950 via-[#0d1222] to-slate-950 border-white/10' 
            : 'bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-slate-200'
        }`}>
          {/* Decorative Glow */}
          <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none" />

          <div className="max-w-3xl space-y-6">
            {/* Status + WKF Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                <Flame size={12} fill="currentColor" />
                {wkfRules}
              </span>
              {featuredTournament && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${
                  featuredTournament.status === 'Open' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  featuredTournament.status === 'Completed' ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' :
                  'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                    featuredTournament.status === 'Open' ? 'bg-emerald-400 animate-pulse' :
                    featuredTournament.status === 'Completed' ? 'bg-slate-400' :
                    'bg-yellow-400 animate-pulse'
                  }`} />
                  {featuredTournament.status}
                </span>
              )}
              {featuredTournament?.featured && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                  ★ Featured
                </span>
              )}
            </div>

            <h2 className="font-display text-2xl sm:text-4xl font-black tracking-widest leading-snug uppercase">
              {tournamentName}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold opacity-80 pt-2">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-indigo-400 shrink-0" />
                <span>{venue}{city ? `, ${city}` : ''}{country ? `, ${country}` : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-400 shrink-0" />
                <span>Event Date: {eventDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-400 shrink-0" />
                <span>Organizer: {organizer}</span>
              </div>
              {featuredTournament?.registration_close && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-yellow-400 shrink-0" />
                  <span>Registration Closes: {featuredTournament.registration_close}</span>
                </div>
              )}
              {featuredTournament?.discipline && (
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-indigo-400 shrink-0" />
                  <span>Discipline: {featuredTournament.discipline}</span>
                </div>
              )}
              {(featuredTournament?.total_participants ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400 shrink-0" />
                  <span>{featuredTournament!.total_participants} Participants · {featuredTournament!.total_clubs} Clubs</span>
                </div>
              )}
              <div className="flex items-center gap-2 col-span-full">
                <ShieldCheck size={16} className="text-indigo-400 shrink-0" />
                <span>
                  Developed by SP SportData Solution<br />
                  (Professional Karate Tournament Management System)
                </span>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Link href="/public/register" className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-900/20">
                Register Participant
              </Link>
              <Link href="/public" className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/5">
                Live Scoreboard
              </Link>
              <Link href="/public/tournaments" className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/5">
                View Schedule
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Live Statistics Cards */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <h3 className="text-xs font-black uppercase tracking-wider opacity-60 mb-4">Live Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: 'Total Clubs', val: stats.clubs, color: 'text-indigo-400' },
            { label: 'Total Athletes', val: stats.athletes, color: 'text-blue-400' },
            { label: 'Total Categories', val: stats.categories, color: 'text-emerald-400' },
            { label: 'Total Matches', val: stats.matches, color: 'text-amber-400' },
            { label: 'Active Tatamis', val: stats.tatamis, color: 'text-cyan-400' },
            { label: 'Completed Matches', val: stats.completed, color: 'text-purple-400' },
            { label: 'Upcoming Matches', val: stats.upcoming, color: 'text-pink-400' }
          ].map((item, idx) => (
            <div key={idx} className={`border p-4 rounded-2xl flex flex-col justify-between h-24 ${
              theme === 'dark' ? 'bg-[#0b0f19] border-white/5' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[9px] uppercase font-bold opacity-60 tracking-wider leading-tight">{item.label}</span>
              <span className={`text-2xl font-black ${item.color}`}>{item.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Live Tatamis & Scoreboard Telemetry */}
      <section className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-wider opacity-60">Live Scoreboard Telemetry</h3>
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-md animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Live Syncing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {liveBouts.length === 0 ? (
            <div className={`p-8 text-center text-xs italic border rounded-3xl col-span-2 ${
              theme === 'dark' ? 'bg-white/[0.02] border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              No matches running on tatamis right now. Bouts will display here as referees activate them.
            </div>
          ) : (
            liveBouts.map((bout, idx) => (
              <div key={idx} className={`border rounded-[32px] p-6 shadow-lg overflow-hidden flex flex-col justify-between gap-6 relative ${
                theme === 'dark' ? 'bg-[#0d1222] border-white/10' : 'bg-white border-slate-200'
              }`}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
                    {bout.tatami || `Tatami ${idx + 1}`} • Match #{bout.bout_no}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    bout.status === 'Running' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {bout.status}
                  </span>
                </div>

                {/* Fighters Grid */}
                <div className="grid grid-cols-7 gap-4 items-center">
                  <div className="col-span-3 text-left">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">AKA</span>
                    <span className="font-extrabold text-sm block truncate">RED COMPONENT</span>
                    <span className="text-[10px] opacity-60 uppercase block truncate">Senshi Karate Club</span>
                  </div>

                  <div className="col-span-1 text-center font-bold text-lg opacity-40">VS</div>

                  <div className="col-span-3 text-right">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">AO</span>
                    <span className="font-extrabold text-sm block truncate">BLUE COMPONENT</span>
                    <span className="text-[10px] opacity-60 uppercase block truncate">Goju-Ryu Karate Club</span>
                  </div>
                </div>

                {/* Score and Timer */}
                <div className="flex items-center justify-between bg-black/10 rounded-2xl p-4 border border-white/5">
                  <div className="text-red-500 text-3xl font-black tracking-tight">{bout.score_a}</div>
                  <div className="text-center">
                    <span className="text-[9px] uppercase font-bold opacity-40 block mb-0.5">Match Timer</span>
                    <span className="font-mono font-bold text-sm text-yellow-400">{formatTime((bout.timer_seconds || 180) * 10)}</span>
                  </div>
                  <div className="text-blue-400 text-3xl font-black tracking-tight">{bout.score_b}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 6. Upcoming Matches & Medal Table Grid */}
      <section className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Next 10 scheduled matches */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider opacity-60">Next 10 Scheduled Matches</h3>
          
          <div className={`border rounded-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-[#0b0f19] border-white/5' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-xs text-left">
              <thead className={`font-bold ${theme === 'dark' ? 'bg-white/5 border-b border-white/5' : 'bg-slate-100 border-b border-slate-200'}`}>
                <tr>
                  <th className="p-3 text-center">Tatami</th>
                  <th className="p-3 text-center">Match</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">AKA (Red)</th>
                  <th className="p-3">AO (Blue)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {upcomingBouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 italic">No scheduled bouts remaining.</td>
                  </tr>
                ) : (
                  upcomingBouts.map((bout, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-center font-bold text-indigo-400 uppercase">{bout.tatami || 'Tatami 1'}</td>
                      <td className="p-3 text-center font-semibold">{bout.bout_no}</td>
                      <td className="p-3 truncate font-semibold max-w-[120px]">Kumite Match</td>
                      <td className="p-3 font-semibold text-red-400 truncate max-w-[120px]">Red Competitor</td>
                      <td className="p-3 font-semibold text-blue-400 truncate max-w-[120px]">Blue Competitor</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Medal Standings */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider opacity-60">Medal Table Standings</h3>
          
          <div className={`border rounded-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-[#0b0f19] border-white/5' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-xs text-left">
              <thead className={`font-bold ${theme === 'dark' ? 'bg-white/5 border-b border-white/5' : 'bg-slate-100 border-b border-slate-200'}`}>
                <tr>
                  <th className="p-3 w-10 text-center">Rank</th>
                  <th className="p-3">Club</th>
                  <th className="p-3 text-center text-yellow-400">G</th>
                  <th className="p-3 text-center text-slate-300">S</th>
                  <th className="p-3 text-center text-amber-600">B</th>
                  <th className="p-3 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold">
                {medalClubs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">No medals awarded yet.</td>
                  </tr>
                ) : (
                  medalClubs.slice(0, 10).map((club, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 truncate max-w-[150px]">{club.name}</td>
                      <td className="p-3 text-center text-yellow-400 font-bold">{club.gold}</td>
                      <td className="p-3 text-center text-slate-300 font-bold">{club.silver}</td>
                      <td className="p-3 text-center text-amber-600 font-bold">{club.bronze}</td>
                      <td className="p-3 text-center">{club.gold + club.silver + club.bronze}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </section>

      {/* 7. Professional Footer */}
      <footer className={`border-t py-12 mt-12 text-xs ${
        theme === 'dark' ? 'border-white/5 bg-[#050810] text-slate-500' : 'border-slate-200 bg-white text-slate-650'
      }`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-3">
            <h4 className={`text-sm font-black uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Karate Tech
            </h4>
            <p className="max-w-md leading-relaxed">
              Precision Karate Tournament Management System. Automated Single Elimination grids fully compliant with WKF rules.
            </p>
            <div className="flex gap-4 font-bold">
              <a href="#" className="hover:underline">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:underline">Terms of Use</a>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-1.5 md:text-right">
            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>© 2026 KarateTech</span>
            <span>
              Developed by <span className="font-semibold">SP SportData Solution</span><br />
              (Professional Karate Tournament Management System)
            </span>
            <span>All Rights Reserved.</span>
            <span className="text-[10px] mt-1">
              Contact: <a href="mailto:karatetech@gmail.com" className="text-indigo-400 hover:underline">karatetech@gmail.com</a>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}

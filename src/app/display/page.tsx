'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, supabase } from '@/db/dbClient';
import { Bout, Participant, Category, Club } from '@/db/types';
import { ShieldAlert, Zap, Award, Trophy, Volume2, Maximize2, Minimize2 } from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';

function SpectatorDisplayContent() {
  const searchParams = useSearchParams();
  const boutId = searchParams.get('boutId');
  const { tournamentName } = useTournament();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Competitor info
  const [akaName, setAkaName] = useState<string>('AKA');
  const [akaClub, setAkaClub] = useState<string>('Senshi Karate Academy');
  const [aoName, setAoName] = useState<string>('AO');
  const [aoClub, setAoClub] = useState<string>('Goju-Ryu Karate Club');

  // Match details
  const [categoryName, setCategoryName] = useState<string>('Kumite Championship');
  const [tatamiName, setTatamiName] = useState<string>('Tatami 1');
  const [boutNo, setBoutNo] = useState<number>(1);
  const [roundNo, setRoundNo] = useState<number>(1);

  // Live scoreboard states
  const [scoreAka, setScoreAka] = useState<number>(0);
  const [scoreAo, setScoreAo] = useState<number>(0);
  const [senshuAka, setSenshuAka] = useState<boolean>(false);
  const [senshuAo, setSenshuAo] = useState<boolean>(false);
  const [penaltiesAka, setPenaltiesAka] = useState<string[]>([]);
  const [penaltiesAo, setPenaltiesAo] = useState<string[]>([]);

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [goldenScore, setGoldenScore] = useState<boolean>(false);

  // Winner banner
  const [winnerSide, setWinnerSide] = useState<'aka' | 'ao' | null>(null);
  const [winMethod, setWinMethod] = useState<string>('');

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const soundBuzzerRef = useRef<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Auto-hide controls after 3s idle
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current); };
  }, []);

  // Web Audio buzzer sound
  const playBuzzer = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(320, audioCtx.currentTime); // Deep buzzer tone
      
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.2);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  const playBeep = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Higher pitch (A5 tone)
      
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15); // Short beep

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  // Setup broadcast channel receiver
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('wkf-scoreboard-sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'MATCH_FINISHED') {
          setWinnerSide(data.winnerSide);
          setWinMethod('Completed');
          playBuzzer();
          return;
        }

        if (data.boutId === boutId) {
          setAkaName(data.akaName);
          setAkaClub(data.akaClub);
          setAoName(data.aoName);
          setAoClub(data.aoClub);
          setScoreAka(data.scoreAka);
          setScoreAo(data.scoreAo);
          setSenshuAka(data.senshuAka);
          setSenshuAo(data.senshuAo);
          setPenaltiesAka(data.penaltiesAka || []);
          setPenaltiesAo(data.penaltiesAo || []);
          setTimeLeft(data.timeLeft);
          setTimerActive(data.timerActive);
          setGoldenScore(data.goldenScore);
          setWinnerSide(data.winner);
          setWinMethod(data.winMethod);
        }
      };
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [boutId]);

  // Initial load from Database client
  useEffect(() => {
    if (!mounted || !boutId) return;

    const fetchBout = async () => {
      try {
        setLoading(true);
        const [boutsList, partsList, categoriesList] = await Promise.all([
          db.bouts.list(),
          db.participants.list(),
          db.categories.list()
        ]);

        const bout = boutsList.find(b => b.id === boutId);
        if (bout) {
          const compAka = partsList.find(p => p.id === bout.participant_a_id);
          const compAo = partsList.find(p => p.id === bout.participant_b_id);
          const cat = categoriesList.find(c => c.id === bout.category_id);

          setAkaName(compAka?.full_name || 'TBD AKA');
          setAkaClub(compAka?.club_id ? 'Senshi Karate Academy' : 'Senshi Club');
          setAoName(compAo?.full_name || 'TBD AO');
          setAoClub(compAo?.club_id ? 'Goju-Ryu Karate Club' : 'Goju-Ryu Club');
          
          setCategoryName(cat?.name || 'Kumite Open Division');
          setTatamiName(bout.tatami || 'Tatami 1');
          setBoutNo(bout.bout_no);
          setRoundNo(bout.round_no);

          setScoreAka(bout.score_a ?? 0);
          setScoreAo(bout.score_b ?? 0);
          setSenshuAka(bout.senshu_a ?? false);
          setSenshuAo(bout.senshu_b ?? false);
          setPenaltiesAka(bout.penalties_a ? bout.penalties_a.split(',').filter(Boolean) : []);
          setPenaltiesAo(bout.penalties_b ? bout.penalties_b.split(',').filter(Boolean) : []);
          setTimeLeft((bout.timer_seconds ?? 180) * 10);
          setTimerActive(bout.timer_active ?? false);
        }
      } catch (e) {
        console.error('Fetch bout error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBout();
  }, [mounted, boutId]);

  // Supabase Realtime fallback subscription
  useEffect(() => {
    if (!supabase || !boutId) return;

    const channel = supabase
      .channel(`display-bout-${boutId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bouts', filter: `id=eq.${boutId}` },
        async (payload: any) => {
          const updated = payload.new;
          if (updated) {
            setScoreAka(updated.score_a ?? 0);
            setScoreAo(updated.score_b ?? 0);
            setSenshuAka(updated.senshu_a ?? false);
            setSenshuAo(updated.senshu_b ?? false);
            setPenaltiesAka(updated.penalties_a ? updated.penalties_a.split(',').filter(Boolean) : []);
            setPenaltiesAo(updated.penalties_b ? updated.penalties_b.split(',').filter(Boolean) : []);
            setTimeLeft((updated.timer_seconds ?? 180) * 10);
            setTimerActive(updated.timer_active ?? false);
            
            if (updated.status === 'Completed') {
              setWinnerSide(updated.winner_id === updated.participant_a_id ? 'aka' : 'ao');
              setWinMethod('Completed');
              playBuzzer();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [boutId]);

  // Clock Countdown interval (for displays running timer locally)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            playBuzzer();
            return 0;
          }
          const nextVal = prev - 1;
          // Beep on whole seconds in the last 5 seconds
          if (nextVal <= 50 && nextVal > 0 && nextVal % 10 === 0) {
            playBeep();
          }
          return nextVal;
        });
      }, 100);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);

  // Format countdown clock
  const formatTime = (tenths: number) => {
    const mins = Math.floor(tenths / 600);
    const secs = Math.floor((tenths % 600) / 10);
    const decs = tenths % 10;
    return `${mins}:${secs.toString().padStart(2, '0')}.${decs}`;
  };

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans p-8 relative"
      onMouseMove={resetHideTimer}
    >
      {/* Floating Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer backdrop-blur-sm border ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        } ${
          isFullscreen
            ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            : 'bg-yellow-400/20 border-yellow-400/40 text-yellow-400 hover:bg-yellow-400/30'
        }`}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
      {/* Top Details bar (Projector optimized size) */}
      <div className="flex justify-between items-center border-b-2 border-white/10 pb-6 mb-6">
        <div>
          <span className="text-yellow-400 font-black tracking-widest text-lg uppercase">
            {tatamiName} • BOUT #{boutNo} • ROUND {roundNo}
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white/80 line-clamp-1 mt-1">
            {categoryName}
          </h1>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
            TOURNAMENT HUB
          </span>
          <p className="text-lg font-black text-white/70 tracking-tight">
            {tournamentName || 'Kelab Karate Do Senshi Goju-Ryu'}
          </p>
        </div>
      </div>

      {/* Main Scoreboard Arena Grid */}
      <div className="flex-1 grid grid-cols-12 gap-8 items-center">
        {/* AKA RED CARD */}
        <div className="col-span-5 h-full bg-[#150000] border-4 border-red-600/40 rounded-[40px] p-8 flex flex-col justify-between relative shadow-[0_0_80px_rgba(239,68,68,0.1)]">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-black uppercase text-red-500 tracking-widest">赤 AKA</span>
              {senshuAka && (
                <span className="bg-yellow-400 text-black font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-widest animate-pulse border-2 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  先取 SENSHU
                </span>
              )}
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mt-6 truncate">
              {akaName}
            </h2>
            <p className="text-red-400/50 text-base font-bold mt-1.5 uppercase tracking-wider">
              {akaClub}
            </p>
          </div>

          {/* Huge Score */}
          <div className="flex justify-center my-6">
            <span className="text-[12rem] lg:text-[15rem] font-black leading-none font-mono text-red-500 select-none tracking-tight drop-shadow-[0_0_55px_rgba(239,68,68,0.3)]">
              {scoreAka}
            </span>
          </div>

          {/* AKA Warnings Row */}
          <div>
            <div className="border-t-2 border-red-900/30 pt-6">
              <div className="flex justify-between items-center gap-3">
                {['C1', 'C2', 'C3', 'HC'].map((key) => {
                  const isActive = penaltiesAka.includes(key);
                  return (
                    <div
                      key={key}
                      className={`flex-1 text-center py-3.5 rounded-2xl text-lg font-black transition-all duration-300 border-2 ${
                        isActive
                          ? 'bg-red-500 text-black border-red-400 font-black shadow-[0_0_25px_rgba(239,68,68,0.35)]'
                          : 'bg-transparent text-white/10 border-white/5'
                      }`}
                    >
                      {key}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: TIMER */}
        <div className="col-span-2 flex flex-col justify-center items-center h-full text-center">
          <span className="text-xs uppercase font-black text-white/30 tracking-widest mb-3">
            MATCH TIME
          </span>
          
          {/* Giant digital timer */}
          <div className={`text-6xl lg:text-7xl font-black font-mono leading-none tracking-tighter transition-all duration-300 select-none ${
            timeLeft <= 150 && timeLeft > 0 
              ? 'text-red-500 scale-110 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
              : 'text-yellow-400'
          }`}>
            {formatTime(timeLeft)}
          </div>

          <div className="mt-6 flex flex-col items-center gap-1">
            <span className={`w-3.5 h-3.5 rounded-full ${timerActive ? 'bg-green-500 animate-ping' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black uppercase text-white/40 tracking-wider mt-2.5">
              {timerActive ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>

          {goldenScore && (
            <div className="mt-8 bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest animate-pulse">
              Golden Score
            </div>
          )}
        </div>

        {/* AO BLUE CARD */}
        <div className="col-span-5 h-full bg-[#000515] border-4 border-blue-600/40 rounded-[40px] p-8 flex flex-col justify-between relative shadow-[0_0_80px_rgba(59,130,246,0.1)]">
          <div>
            <div className="flex justify-between items-center flex-row-reverse">
              <span className="text-2xl font-black uppercase text-blue-400 tracking-widest">青 AO</span>
              {senshuAo && (
                <span className="bg-yellow-400 text-black font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-widest animate-pulse border-2 border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  先取 SENSHU
                </span>
              )}
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mt-6 truncate text-right">
              {aoName}
            </h2>
            <p className="text-blue-400/50 text-base font-bold mt-1.5 uppercase tracking-wider text-right">
              {aoClub}
            </p>
          </div>

          {/* Huge Score */}
          <div className="flex justify-center my-6">
            <span className="text-[12rem] lg:text-[15rem] font-black leading-none font-mono text-blue-400 select-none tracking-tight drop-shadow-[0_0_55px_rgba(59,130,246,0.3)]">
              {scoreAo}
            </span>
          </div>

          {/* AO Warnings Row */}
          <div>
            <div className="border-t-2 border-blue-900/30 pt-6">
              <div className="flex justify-between items-center gap-3">
                {['C1', 'C2', 'C3', 'HC'].map((key) => {
                  const isActive = penaltiesAo.includes(key);
                  return (
                    <div
                      key={key}
                      className={`flex-1 text-center py-3.5 rounded-2xl text-lg font-black transition-all duration-300 border-2 ${
                        isActive
                          ? 'bg-blue-500 text-black border-blue-400 font-black shadow-[0_0_25px_rgba(59,130,246,0.35)]'
                          : 'bg-transparent text-white/10 border-white/5'
                      }`}
                    >
                      {key}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Winner Overlap Card */}
      {winnerSide && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex flex-col justify-center items-center z-50 p-6 animate-fade-in">
          <div className="relative p-12 bg-white/[0.02] border border-white/10 max-w-2xl w-full rounded-[45px] text-center shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-yellow-400/5 opacity-50" />
            
            <Trophy className="h-20 w-20 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]" />
            
            <span className="text-xs font-black uppercase text-yellow-400 tracking-widest mb-1.5 block">
              Match Completed
            </span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-2">
              Winner Declared
            </h2>
            <p className="text-gray-400 text-sm mb-8">Win Method: {winMethod || 'Points Advantage'}</p>

            <div className={`p-8 rounded-3xl border-4 ${
              winnerSide === 'aka' 
                ? 'bg-[#250000] border-red-600/40 text-red-500' 
                : 'bg-[#000525] border-blue-600/40 text-blue-400'
            } mb-4`}>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Champion
              </span>
              <h3 className="text-3xl lg:text-4xl font-black tracking-tight mt-1">
                {winnerSide === 'aka' ? akaName : aoName}
              </h3>
              <p className="text-white/60 text-xs font-bold mt-1 uppercase tracking-wider">
                {winnerSide === 'aka' ? akaClub : aoClub}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SpectatorDisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/40 text-xl font-black tracking-widest animate-pulse">LOADING DISPLAY...</div>
      </div>
    }>
      <SpectatorDisplayContent />
    </Suspense>
  );
}


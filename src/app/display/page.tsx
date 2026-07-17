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
  const [akaName, setAkaName] = useState<string>('TBD Red');
  const [akaClub, setAkaClub] = useState<string>('Senshi Karate Academy');
  const [aoName, setAoName] = useState<string>('TBD Blue');
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

  // Detailed WKF warnings states: C1, C2, C3, HC, H (1 to 5)
  const [c1Aka, setC1Aka] = useState<number>(0);
  const [c1Ao, setC1Ao] = useState<number>(0);
  const [eventsAka, setEventsAka] = useState<{ fighter: string; points: number; technique: string; timestamp: number; matchId: string }[]>([]);
  const [eventsAo, setEventsAo] = useState<{ fighter: string; points: number; technique: string; timestamp: number; matchId: string }[]>([]);
  const [showPointHistory, setShowPointHistory] = useState(false);

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
  const soundPlayedRef = useRef<string | null>(null);

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

  // Trigger Superior Points fanfare or Hansoku alarm when winner is declared
  useEffect(() => {
    if (winnerSide && winMethod === 'HANSOKU' && soundPlayedRef.current !== winnerSide + '-hansoku') {
      soundPlayedRef.current = winnerSide + '-hansoku';
      playHansokuAlarm();
    } else if (winnerSide && winMethod === 'Superior Points' && soundPlayedRef.current !== winnerSide + '-superior') {
      soundPlayedRef.current = winnerSide + '-superior';
      playSuperiorPointsSound();
    } else if (!winnerSide) {
      soundPlayedRef.current = null;
    }
  }, [winnerSide, winMethod]);

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
      
      const playBellRing = (startTime: number) => {
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + 0.6);
        gainNode.connect(audioCtx.destination);

        const freqs = [880, 1200, 1760];
        freqs.forEach((f) => {
          const osc = audioCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, audioCtx.currentTime + startTime);
          osc.connect(gainNode);
          osc.start(audioCtx.currentTime + startTime);
          osc.stop(audioCtx.currentTime + startTime + 0.6);
        });
      };

      playBellRing(0);
      playBellRing(0.4);
      playBellRing(0.8);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  const playSuperiorPointsSound = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + duration);
      };

      playTone(523.25, 0, 0.15);
      playTone(659.25, 0.15, 0.15);
      playTone(783.99, 0.3, 0.15);
      playTone(1046.50, 0.45, 0.35);
    } catch (err) {
      console.warn('Audio Context sound error:', err);
    }
  };

  const playHansokuAlarm = () => {
    if (!soundBuzzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playAlarmTone = (start: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + start);
        gain.gain.setValueAtTime(0.8, audioCtx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + start + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + start);
        osc.stop(audioCtx.currentTime + start + 0.4);
      };

      playAlarmTone(0);
      playAlarmTone(0.5);
      playAlarmTone(1.0);
    } catch (err) {
      console.warn('Alarm sound error:', err);
    }
  };

  // Setup broadcast channel receiver
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('wkf-scoreboard-sync');
      broadcastChannelRef.current = channel;

      const isStream = searchParams.get('stream') === 'true' || searchParams.get('overlay') === 'true';
      const key = isStream ? 'ts_show_point_history_stream' : 'ts_show_point_history_public';
      setShowPointHistory(localStorage.getItem(key) === 'true');

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
          setC1Aka(data.c1Aka || 0);
          setC1Ao(data.c1Ao || 0);
          setEventsAka(data.eventsAka || []);
          setEventsAo(data.eventsAo || []);
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
  }, [boutId, searchParams]);

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

          setAkaName(compAka?.full_name || 'TBD Red');
          setAkaClub(compAka?.club_id ? 'Senshi Karate Academy' : 'Senshi Club');
          setAoName(compAo?.full_name || 'TBD Blue');
          setAoClub(compAo?.club_id ? 'Goju-Ryu Karate Club' : 'Goju-Ryu Club');
          
          setCategoryName(cat?.name || 'Kumite Open Division');
          setTatamiName(bout.tatami || 'Tatami 1');
          setBoutNo(bout.bout_no);
          setRoundNo(bout.round_no);

          setScoreAka(bout.score_a ?? 0);
          setScoreAo(bout.score_b ?? 0);
          setSenshuAka(bout.senshu_a ?? false);
          setSenshuAo(bout.senshu_b ?? false);
          let parsedEventsAka: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];
          let parsedEventsAo: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];

          if (bout.points_aka_history) {
            if (bout.points_aka_history.startsWith('[')) {
              try {
                parsedEventsAka = JSON.parse(bout.points_aka_history);
              } catch (e) {
                console.error(e);
              }
            } else {
              const pointsList = bout.points_aka_history.split(',').map(Number).filter(Boolean);
              parsedEventsAka = pointsList.map((pts: number) => ({
                fighter: 'AKA',
                points: pts,
                technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
                timestamp: 0,
                matchId: bout.id
              }));
            }
          }

          if (bout.points_ao_history) {
            if (bout.points_ao_history.startsWith('[')) {
              try {
                parsedEventsAo = JSON.parse(bout.points_ao_history);
              } catch (e) {
                console.error(e);
              }
            } else {
              const pointsList = bout.points_ao_history.split(',').map(Number).filter(Boolean);
              parsedEventsAo = pointsList.map((pts: number) => ({
                fighter: 'AO',
                points: pts,
                technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
                timestamp: 0,
                matchId: bout.id
              }));
            }
          }

          setEventsAka(parsedEventsAka);
          setEventsAo(parsedEventsAo);
          setPenaltiesAka(bout.penalties_a ? bout.penalties_a.split(',').filter(Boolean) : []);
          setPenaltiesAo(bout.penalties_b ? bout.penalties_b.split(',').filter(Boolean) : []);
          
          setC1Aka(bout.penalties_c1_a ? parseInt(bout.penalties_c1_a) || 0 : 0);
          setC1Ao(bout.penalties_c1_b ? parseInt(bout.penalties_c1_b) || 0 : 0);

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
            let parsedEventsAka: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];
            let parsedEventsAo: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];

            if (updated.points_aka_history) {
              if (updated.points_aka_history.startsWith('[')) {
                try {
                  parsedEventsAka = JSON.parse(updated.points_aka_history);
                } catch (e) {
                  console.error(e);
                }
              } else {
                const pointsList = updated.points_aka_history.split(',').map(Number).filter(Boolean);
                parsedEventsAka = pointsList.map((pts: number) => ({
                  fighter: 'AKA',
                  points: pts,
                  technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
                  timestamp: 0,
                  matchId: boutId!
                }));
              }
            }

            if (updated.points_ao_history) {
              if (updated.points_ao_history.startsWith('[')) {
                try {
                  parsedEventsAo = JSON.parse(updated.points_ao_history);
                } catch (e) {
                  console.error(e);
                }
              } else {
                const pointsList = updated.points_ao_history.split(',').map(Number).filter(Boolean);
                parsedEventsAo = pointsList.map((pts: number) => ({
                  fighter: 'AO',
                  points: pts,
                  technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
                  timestamp: 0,
                  matchId: boutId!
                }));
              }
            }

            setEventsAka(parsedEventsAka);
            setEventsAo(parsedEventsAo);
            setPenaltiesAka(updated.penalties_a ? updated.penalties_a.split(',').filter(Boolean) : []);
            setPenaltiesAo(updated.penalties_b ? updated.penalties_b.split(',').filter(Boolean) : []);
            
            setC1Aka(updated.penalties_c1_a ? parseInt(updated.penalties_c1_a) || 0 : 0);
            setC1Ao(updated.penalties_c1_b ? parseInt(updated.penalties_c1_b) || 0 : 0);

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
          // Beep once when exactly 15 seconds remaining
          if (nextVal === 150) {
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
  const formatMainTime = (tenths: number) => {
    const mins = Math.floor(tenths / 600);
    const secs = Math.floor((tenths % 600) / 10);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDecsTime = (tenths: number) => {
    const decs = tenths % 10;
    return `.${decs}0`;
  };

  if (!mounted) return null;

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col justify-between overflow-hidden select-none font-sans p-8 relative"
      onMouseMove={resetHideTimer}
    >
      {/* Hansoku Disqualification Blinking Banner */}
      {(c1Aka >= 5 || c1Ao >= 5) && (
        <div className="bg-red-600 text-white font-black text-center py-5 text-4xl animate-pulse tracking-widest uppercase border-b-2 border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.6)] z-20">
          🚨 HANSOKU – {c1Aka >= 5 ? 'AKA' : 'AO'} 🚨
        </div>
      )}
      {/* Floating Fullscreen Button */}
      <button
        onClick={toggleFullscreen}
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer backdrop-blur-sm border ${
          showControls || !isFullscreen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
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
        <div className={`col-span-5 h-full rounded-[40px] p-8 flex flex-col justify-between relative shadow-[0_0_80px_rgba(239,68,68,0.1)] transition-all duration-500 ${
          winnerSide === 'aka' && winMethod === 'Superior Points'
            ? 'bg-[#051a05] border-4 border-green-500 shadow-[0_0_80px_rgba(34,197,94,0.4)] text-green-400'
            : 'bg-[#150000] border-4 border-red-600/40 text-white'
        }`}>
          <div>
            <div className="flex justify-between items-center">
              <span className={`text-4xl lg:text-5xl font-black uppercase tracking-wider ${
                winnerSide === 'aka' && winMethod === 'Superior Points' ? 'text-green-400' : 'text-red-500'
              }`}>AKA - RED</span>
              {senshuAka && (
                <span className="bg-blue-600 text-white font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-widest animate-pulse border-2 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                  先取 SENSHU
                </span>
              )}
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mt-6 truncate">
              {akaName}
            </h2>
            <p className={`${
              winnerSide === 'aka' && winMethod === 'Superior Points' ? 'text-green-400/50' : 'text-red-400/50'
            } text-base font-bold mt-1.5 uppercase tracking-wider`}>
              {akaClub}
            </p>
          </div>

          {/* Huge Score */}
          <div className="flex flex-col items-center justify-center my-6">
            <span className={`text-[12rem] lg:text-[15rem] font-black leading-none font-mono select-none tracking-tight transition-all duration-300 ${
              winnerSide === 'aka' && winMethod === 'Superior Points'
                ? 'text-green-400 animate-pulse drop-shadow-[0_0_80px_rgba(34,197,94,0.7)]'
                : scoreAka - scoreAo >= 8 
                  ? 'text-red-500 animate-pulse scale-105 drop-shadow-[0_0_80px_rgba(239,68,68,0.7)]' 
                  : 'text-red-500 drop-shadow-[0_0_55px_rgba(239,68,68,0.3)]'
            }`}>
              {scoreAka}
            </span>
            {showPointHistory && eventsAka.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center max-w-[90%]">
                {eventsAka.map((ev, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded bg-red-950/80 border border-red-500/30 text-[10px] font-black text-red-400 uppercase tracking-wider"
                  >
                    +{ev.points} {ev.technique}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AKA Warnings Row */}
          <div className="border-t-2 border-red-900/30 pt-4">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[9px] font-bold text-red-500/70 w-8 text-left">PEN</span>
              <div className="flex-1 grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((level) => {
                  const isActive = c1Aka >= level;
                  const labels = ['', 'C1', 'C2', 'C3', 'HC', 'H'];
                  return (
                    <div
                      key={level}
                      className={`text-center py-1.5 rounded-lg text-xs font-black transition-all border ${
                        isActive
                          ? 'bg-red-500 text-black border-red-400 font-black shadow-[0_0_10px_rgba(239,68,68,0.35)]'
                          : 'bg-transparent text-white/10 border-white/5'
                      }`}
                    >
                      {labels[level]}
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
          <div className={`text-6xl lg:text-7xl font-black font-mono leading-none tracking-tighter transition-all duration-300 select-none flex items-baseline justify-center ${
            timeLeft <= 150 && timeLeft > 0 
              ? 'text-red-500 scale-110 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
              : 'text-yellow-400'
          }`}>
            <span>{formatMainTime(timeLeft)}</span>
            <span className={`text-3xl lg:text-4xl font-bold ml-1 ${
              timeLeft <= 150 && timeLeft > 0 ? 'text-red-500/60' : 'text-white/50'
            }`}>
              {formatDecsTime(timeLeft)}
            </span>
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

          {Math.abs(scoreAka - scoreAo) >= 8 && (
            <div className="mt-8 bg-red-500/20 text-red-500 border border-red-500/30 px-5 py-2.5 rounded-full font-black text-sm uppercase tracking-widest animate-bounce">
              8-Point Gap Decision
            </div>
          )}
        </div>

        {/* AO BLUE CARD */}
        <div className={`col-span-5 h-full rounded-[40px] p-8 flex flex-col justify-between relative shadow-[0_0_80px_rgba(59,130,246,0.1)] transition-all duration-500 ${
          winnerSide === 'ao' && winMethod === 'Superior Points'
            ? 'bg-[#051a05] border-4 border-green-500 shadow-[0_0_80px_rgba(34,197,94,0.4)] text-green-400'
            : 'bg-[#000515] border-4 border-blue-600/40 text-white'
        }`}>
          <div>
            <div className="flex justify-between items-center flex-row-reverse">
              <span className={`text-4xl lg:text-5xl font-black uppercase tracking-wider ${
                winnerSide === 'ao' && winMethod === 'Superior Points' ? 'text-green-400' : 'text-blue-400'
              }`}>AO - BLUE</span>
              {senshuAo && (
                <span className="bg-blue-600 text-white font-black text-xs uppercase px-4 py-1.5 rounded-full tracking-widest animate-pulse border-2 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                  先取 SENSHU
                </span>
              )}
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mt-6 truncate text-right">
              {aoName}
            </h2>
            <p className={`${
              winnerSide === 'ao' && winMethod === 'Superior Points' ? 'text-green-400/50' : 'text-blue-400/50'
            } text-base font-bold mt-1.5 uppercase tracking-wider text-right`}>
              {aoClub}
            </p>
          </div>

          {/* Huge Score */}
          <div className="flex flex-col items-center justify-center my-6">
            <span className={`text-[12rem] lg:text-[15rem] font-black leading-none font-mono select-none tracking-tight transition-all duration-300 ${
              winnerSide === 'ao' && winMethod === 'Superior Points'
                ? 'text-green-400 animate-pulse drop-shadow-[0_0_80px_rgba(34,197,94,0.7)]'
                : scoreAo - scoreAka >= 8 
                  ? 'text-blue-400 animate-pulse scale-105 drop-shadow-[0_0_80px_rgba(59,130,246,0.7)]' 
                  : 'text-blue-400 drop-shadow-[0_0_55px_rgba(59,130,246,0.3)]'
            }`}>
              {scoreAo}
            </span>
            {showPointHistory && eventsAo.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center max-w-[90%]">
                {eventsAo.map((ev, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/30 text-[10px] font-black text-blue-400 uppercase tracking-wider"
                  >
                    +{ev.points} {ev.technique}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AO Warnings Row */}
          <div className="border-t-2 border-blue-900/30 pt-4">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[9px] font-bold text-blue-400/70 w-8 text-left">PEN</span>
              <div className="flex-1 grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((level) => {
                  const isActive = c1Ao >= level;
                  const labels = ['', 'C1', 'C2', 'C3', 'HC', 'H'];
                  return (
                    <div
                      key={level}
                      className={`text-center py-1.5 rounded-lg text-xs font-black transition-all border ${
                        isActive
                          ? 'bg-blue-500 text-black border-blue-400 font-black shadow-[0_0_10px_rgba(59,130,246,0.35)]'
                          : 'bg-transparent text-white/10 border-white/5'
                      }`}
                    >
                      {labels[level]}
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
            <div className={`border rounded-2xl p-4 mb-8 text-lg font-black uppercase tracking-wider ${
              winMethod === 'Superior Points' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400 animate-bounce' 
                : winMethod === 'HANSOKU'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            }`}>
              🎉 Winner by {
                winMethod === 'Points' ? 'Points Advantage' :
                winMethod === 'SENSHU' ? 'Senshu Advantage' :
                winMethod === 'Superior Points' ? 'Superior Points' :
                winMethod === 'Hantei' ? 'Hantei Decision' :
                winMethod === 'HANSOKU' ? 'Hansoku Disqualification' :
                winMethod === 'Kiken' ? 'Kiken (Withdrawal)' :
                winMethod || 'Points Advantage'
              } 🎉
            </div>

            <div className={`p-8 rounded-3xl border-4 ${
              winMethod === 'Superior Points'
                ? 'bg-[#002500] border-green-500/60 text-green-400 shadow-[0_0_40px_rgba(34,197,94,0.3)]'
                : winnerSide === 'aka' 
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


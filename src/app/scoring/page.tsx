'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { db, supabase } from '@/db/dbClient';
import { Category, Bout, Participant } from '@/db/types';
import { Play, Square, RotateCcw, ChevronDown, Maximize2, Minimize2, Zap } from 'lucide-react';

const MATCH_DURATION_SECS = 120; // 2 minutes default

export default function ScoringPage() {
  const { tournamentName, logoUrl } = useTournament();
  const searchParams = useSearchParams();

  /* ── Data lists ── */
  const [categories, setCategories] = useState<Category[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [mounted, setMounted] = useState(false);

  /* ── Bout selection ── */
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedBoutId, setSelectedBoutId] = useState<string>('');

  /* ── Live scoring state ── */
  const [scoreAo, setScoreAo] = useState(0);   // AO = Blue
  const [scoreAka, setScoreAka] = useState(0); // AKA = Red
  const [c1Ao, setC1Ao] = useState<number>(0);
  const [c1Aka, setC1Aka] = useState<number>(0);
  const [senshuAo, setSenshuAo] = useState(false);
  const [senshuAka, setSenshuAka] = useState(false);
  const [firstScorer, setFirstScorer] = useState<'aka' | 'ao' | 'none' | null>(null);
  const [stoppageScorers, setStoppageScorers] = useState<('aka' | 'ao')[]>([]);

  // Advanced scoring history and decision state
  const [historyAo, setHistoryAo] = useState<number[]>([]);
  const [historyAka, setHistoryAka] = useState<number[]>([]);
  const [eventsAo, setEventsAo] = useState<{ fighter: string; points: number; technique: string; timestamp: number; matchId: string }[]>([]);
  const [eventsAka, setEventsAka] = useState<{ fighter: string; points: number; technique: string; timestamp: number; matchId: string }[]>([]);
  const [showPointHistory, setShowPointHistory] = useState(false);
  const [superiorWinner, setSuperiorWinner] = useState<'ao' | 'aka' | null>(null);
  const [blinkWinner, setBlinkWinner] = useState<'ao' | 'aka' | null>(null);
  const [showSuperiorPopup, setShowSuperiorPopup] = useState(false);

  // Derive Senshu state from firstScorer
  useEffect(() => {
    if (firstScorer === 'aka') {
      setSenshuAka(true);
      setSenshuAo(false);
    } else if (firstScorer === 'ao') {
      setSenshuAo(true);
      setSenshuAka(false);
    } else {
      setSenshuAka(false);
      setSenshuAo(false);
    }
  }, [firstScorer]);

  /* ── Timer ── */
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION_SECS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [matchDuration, setMatchDuration] = useState(MATCH_DURATION_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear stoppageScorers when the timer starts running
  useEffect(() => {
    if (timerRunning) {
      setStoppageScorers([]);
    }
  }, [timerRunning]);

  /* ── UI ── */
  const [fullscreen, setFullscreen] = useState(false);
  const [winner, setWinner] = useState<'ao' | 'aka' | null>(null);
  const [winMethod, setWinMethod] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setShowPointHistory(localStorage.getItem('ts_show_point_history_referee') === 'true');
    }
  }, []);

  /* Load data */
  useEffect(() => {
    if (!mounted) return;
    const catParam = searchParams.get('cat');
    Promise.all([db.categories.list(), db.bouts.list(), db.participants.list()])
      .then(([cats, bts, parts]) => {
        setCategories(cats);
        setBouts(bts);
        setParticipants(parts);
        // If a category was passed via ?cat=, prefer it; else fall back to first with bouts
        const preferredCat = catParam
          ? cats.find(c => c.id === catParam && bts.some(b => b.category_id === c.id))
          : null;
        const targetCat = preferredCat || cats.find(c => bts.some(b => b.category_id === c.id));
        if (targetCat) {
          setSelectedCatId(targetCat.id);
          const firstBout = bts.find(b => b.category_id === targetCat.id);
          if (firstBout) setSelectedBoutId(firstBout.id);
        }
      });
  }, [mounted]);

  /* ── Load bout scores when bout changes ── */
  const currentBout = bouts.find(b => b.id === selectedBoutId);
  const aoComp = participants.find(p => p.id === currentBout?.participant_a_id);
  const akaComp = participants.find(p => p.id === currentBout?.participant_b_id);
  const catBouts = bouts.filter(b => b.category_id === selectedCatId && b.round_no !== 99).sort((a, b) => {
    if (a.round_no !== b.round_no) return a.round_no - b.round_no;
    return a.bout_no - b.bout_no;
  });

  useEffect(() => {
    if (currentBout) {
      setScoreAo(currentBout.score_a ?? 0);
      setScoreAka(currentBout.score_b ?? 0);
      setC1Ao(currentBout.penalties_c1_b ? parseInt(currentBout.penalties_c1_b) || 0 : 0);
      setC1Aka(currentBout.penalties_c1_a ? parseInt(currentBout.penalties_c1_a) || 0 : 0);

      const sAo = currentBout.senshu_b ?? false;
      const sAka = currentBout.senshu_a ?? false;
      setSenshuAo(sAo);
      setSenshuAka(sAka);
      
      let parsedEventsAo: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];
      let parsedEventsAka: { fighter: string; points: number; technique: string; timestamp: number; matchId: string }[] = [];
      let savedPointsAo: number[] = [];
      let savedPointsAka: number[] = [];

      if (currentBout.points_ao_history) {
        if (currentBout.points_ao_history.startsWith('[')) {
          try {
            parsedEventsAo = JSON.parse(currentBout.points_ao_history);
            savedPointsAo = parsedEventsAo.map(e => e.points);
          } catch (e) {
            console.error(e);
          }
        } else {
          savedPointsAo = currentBout.points_ao_history.split(',').map(Number).filter(Boolean);
          parsedEventsAo = savedPointsAo.map(pts => ({
            fighter: 'AO',
            points: pts,
            technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
            timestamp: 0,
            matchId: currentBout.id
          }));
        }
      }

      if (currentBout.points_aka_history) {
        if (currentBout.points_aka_history.startsWith('[')) {
          try {
            parsedEventsAka = JSON.parse(currentBout.points_aka_history);
            savedPointsAka = parsedEventsAka.map(e => e.points);
          } catch (e) {
            console.error(e);
          }
        } else {
          savedPointsAka = currentBout.points_aka_history.split(',').map(Number).filter(Boolean);
          parsedEventsAka = savedPointsAka.map(pts => ({
            fighter: 'AKA',
            points: pts,
            technique: pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point',
            timestamp: 0,
            matchId: currentBout.id
          }));
        }
      }

      setHistoryAo(savedPointsAo);
      setHistoryAka(savedPointsAka);
      setEventsAo(parsedEventsAo);
      setEventsAka(parsedEventsAka);

      if (sAo) {
        setFirstScorer('ao');
      } else if (sAka) {
        setFirstScorer('aka');
      } else {
        if (savedPointsAo.length > 0 && savedPointsAka.length > 0) {
          setFirstScorer('none');
        } else {
          setFirstScorer(null);
        }
      }
      setStoppageScorers([]);

      setWinner(null);
      setWinMethod('');
      setSuperiorWinner(null);
      setBlinkWinner(null);
      setShowSuperiorPopup(false);
      resetTimer();
    }
  }, [selectedBoutId]);

  /* ── Tiebreaker calculation helpers ── */
  const getWinnerBySuperiorPoints = (histAo: number[], histAka: number[]): 'ao' | 'aka' | 'draw' => {
    // 1. Compare number of 3-point scores (Ippon)
    const countAo3 = histAo.filter(x => x === 3).length;
    const countAka3 = histAka.filter(x => x === 3).length;
    if (countAo3 !== countAka3) return countAo3 > countAka3 ? 'ao' : 'aka';

    // 2. Compare number of 2-point scores (Waza-ari)
    const countAo2 = histAo.filter(x => x === 2).length;
    const countAka2 = histAka.filter(x => x === 2).length;
    if (countAo2 !== countAka2) return countAo2 > countAka2 ? 'ao' : 'aka';

    // 3. Compare number of 1-point scores (Yuko)
    const countAo1 = histAo.filter(x => x === 1).length;
    const countAka1 = histAka.filter(x => x === 1).length;
    if (countAo1 !== countAka1) return countAo1 > countAka1 ? 'ao' : 'aka';

    return 'draw';
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // First beep (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 587.33;
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);

      // Second beep (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 880;
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.25);
      gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  };

  /* ── Timer control ── */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimeLeft(matchDuration);
    setSuperiorWinner(null);
    setBlinkWinner(null);
    setShowSuperiorPopup(false);
  }, [matchDuration]);


  const startTimer = () => {
    if (timerRunning || timeLeft <= 0) return;
    setTimerRunning(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  /* Format time */
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  /* ── Scoring actions ── */
  type Side = 'ao' | 'aka';

  const addScore = (side: Side, pts: number) => {
    if (winner) return;
    let finalAo = scoreAo;
    let finalAka = scoreAka;
    const technique = pts === 1 ? 'Yuko' : pts === 2 ? 'Waza-ari' : pts === 3 ? 'Ippon' : 'Point';
    const timestamp = timeLeft;
    const newEvent = {
      fighter: side.toUpperCase(),
      points: pts,
      technique,
      timestamp,
      matchId: selectedBoutId
    };

    if (side === 'ao') {
      const newScore = Math.max(0, scoreAo + pts);
      setScoreAo(newScore);
      setHistoryAo(prev => [...prev, pts]);
      setEventsAo(prev => [...prev, newEvent]);
      finalAo = newScore;
    } else {
      const newScore = Math.max(0, scoreAka + pts);
      setScoreAka(newScore);
      setHistoryAka(prev => [...prev, pts]);
      setEventsAka(prev => [...prev, newEvent]);
      finalAka = newScore;
    }

    // Determine Senshu state based on current scores and custom rules
    if (pts > 0) {
      if (!timerRunning) {
        setStoppageScorers((prev) => {
          const next = prev.includes(side) ? prev : [...prev, side];
          if (next.includes('ao') && next.includes('aka')) {
            // Rule 4: Both fighters score in the same stoppage sequence -> Senshu remains OFF
            setFirstScorer('none');
          } else if (firstScorer === null || firstScorer === 'none') {
            // Only one scored in this stoppage sequence and Senshu was OFF -> award Senshu to them
            setFirstScorer(side);
          }
          return next;
        });
      } else {
        // Active play: immediately award Senshu to the scorer if Senshu was OFF
        if (firstScorer === null || firstScorer === 'none') {
          setFirstScorer(side);
        }
      }
    }
  };

  const undoScore = (side: Side, pts: number) => {
    if (winner) return;
    let finalAo = scoreAo;
    let finalAka = scoreAka;

    if (side === 'ao') {
      finalAo = Math.max(0, scoreAo - pts);
      setScoreAo(finalAo);
      setHistoryAo(prev => {
        const next = [...prev];
        let p = pts;
        while (p > 0 && next.length > 0) {
          const last = next[next.length - 1];
          if (last <= p) {
            p -= last;
            next.pop();
          } else {
            next[next.length - 1] = last - p;
            p = 0;
          }
        }
        return next;
      });
      setEventsAo(prev => {
        const next = [...prev];
        let p = pts;
        while (p > 0 && next.length > 0) {
          const last = { ...next[next.length - 1] };
          if (last.points <= p) {
            p -= last.points;
            next.pop();
          } else {
            last.points -= p;
            last.technique = last.points === 1 ? 'Yuko' : last.points === 2 ? 'Waza-ari' : last.points === 3 ? 'Ippon' : 'Point';
            next[next.length - 1] = last;
            p = 0;
          }
        }
        return next;
      });
    } else {
      finalAka = Math.max(0, scoreAka - pts);
      setScoreAka(finalAka);
      setHistoryAka(prev => {
        const next = [...prev];
        let p = pts;
        while (p > 0 && next.length > 0) {
          const last = next[next.length - 1];
          if (last <= p) {
            p -= last;
            next.pop();
          } else {
            next[next.length - 1] = last - p;
            p = 0;
          }
        }
        return next;
      });
      setEventsAka(prev => {
        const next = [...prev];
        let p = pts;
        while (p > 0 && next.length > 0) {
          const last = { ...next[next.length - 1] };
          if (last.points <= p) {
            p -= last.points;
            next.pop();
          } else {
            last.points -= p;
            last.technique = last.points === 1 ? 'Yuko' : last.points === 2 ? 'Waza-ari' : last.points === 3 ? 'Ippon' : 'Point';
            next[next.length - 1] = last;
            p = 0;
          }
        }
        return next;
      });
    }

    // Determine Senshu state after score subtraction
    if (finalAo > 0 && finalAka === 0) {
      setFirstScorer('ao');
      setStoppageScorers((prev) => prev.filter(s => s !== 'aka'));
    } else if (finalAka > 0 && finalAo === 0) {
      setFirstScorer('aka');
      setStoppageScorers((prev) => prev.filter(s => s !== 'ao'));
    } else if (finalAo === 0 && finalAka === 0) {
      setFirstScorer(null);
      setStoppageScorers([]);
    } else {
      // Both have scores > 0 after subtraction
      if (side === 'ao' && finalAo === 0) {
        setStoppageScorers((prev) => prev.filter(s => s !== 'ao'));
      } else if (side === 'aka' && finalAka === 0) {
        setStoppageScorers((prev) => prev.filter(s => s !== 'aka'));
      }
    }
  };

  const addPenalty = (side: Side, level: number) => {
    if (winner) return;
    const isAo = side === 'ao';
    let nextVal = 0;
    if (isAo) {
      nextVal = c1Ao === level ? Math.max(0, level - 1) : level;
      setC1Ao(nextVal);
    } else {
      nextVal = c1Aka === level ? Math.max(0, level - 1) : level;
      setC1Aka(nextVal);
    }

    if (nextVal === 5) {
      declareWinner(isAo ? 'aka' : 'ao', 'Hansoku (Disqualification)');
    }
  };

  const declareWinner = (side: Side, method: string) => {
    stopTimer();
    setWinner(side);
    setWinMethod(method);
  };

  /* ── Save to Supabase ── */
  const saveResult = async () => {
    if (!selectedBoutId || !winner || !currentBout) return;
    const winnerId = winner === 'ao' ? currentBout.participant_a_id : currentBout.participant_b_id;
    if (!winnerId) return;
    setSaving(true);
    try {
      await db.bouts.updateBoutState(selectedBoutId, {
        status: 'Completed',
        winner_id: winnerId,
        score_a: scoreAo,
        score_b: scoreAka,
        senshu_a: senshuAka,
        senshu_b: senshuAo,
        penalties_c1_a: String(c1Aka),
        penalties_c1_b: String(c1Ao),
        penalties_c2_a: '0',
        penalties_c2_b: '0',
        penalties_c3_a: '0',
        penalties_c3_b: '0',
        victory_method: winMethod,
        points_ao_history: JSON.stringify(eventsAo),
        points_aka_history: JSON.stringify(eventsAka)
      });
      // Refresh bouts
      const updated = await db.bouts.list();
      setBouts(updated);
    } catch (e: any) {
      alert('Save error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Automatic end of match decision when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !winner && selectedBoutId) {
      // 1. If one fighter has a higher score, they win normally
      if (scoreAo > scoreAka) {
        declareWinner('ao', 'Score');
      } else if (scoreAka > scoreAo) {
        declareWinner('aka', 'Score');
      } else {
        // 2. Same score -> compare highest scoring techniques
        const superior = getWinnerBySuperiorPoints(historyAo, historyAka);
        if (superior === 'ao' || superior === 'aka') {
          setSuperiorWinner(superior);
          setBlinkWinner(superior);
          setShowSuperiorPopup(true);
          playNotificationSound();
          declareWinner(superior, 'Superior Points');
        } else {
          // 3. Same techniques -> check Senshu
          if (senshuAo) {
            declareWinner('ao', 'Senshu');
          } else if (senshuAka) {
            declareWinner('aka', 'Senshu');
          } else {
            // Equal on all counts -> Hantei (must be manually decided)
          }
        }
      }
    }
  }, [timeLeft, winner, selectedBoutId, scoreAo, scoreAka, historyAo, historyAka, senshuAo, senshuAka]);


  /* ── Real-time Supabase subscription ── */
  useEffect(() => {
    if (!supabase || !selectedBoutId) return;
    const channel = supabase
      .channel(`bout-score-${selectedBoutId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bouts', filter: `id=eq.${selectedBoutId}` },
        (payload: any) => {
          const updated = payload.new;
          if (updated) {
            setScoreAo(updated.score_a ?? 0);
            setScoreAka(updated.score_b ?? 0);
          }
        }
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [selectedBoutId]);

  if (!mounted) return null;

  const isMatchOver = winner !== null || timeLeft === 0;
  const fmtTimeFull = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const PenDot = ({ filled }: { filled: boolean }) => (
    <div className={`w-3.5 h-3.5 rounded-full border ${filled ? 'bg-yellow-400 border-yellow-300' : 'border-white/30 bg-transparent'}`} />
  );

  const PenaltyRow = ({
    side, val, color
  }: {
    side: Side; val: number; color: 'aka' | 'ao'
  }) => {
    const accentColor = color === 'aka' ? 'text-red-400' : 'text-[#00d4ff]';
    return (
      <div className="flex items-center h-10 px-6 gap-0" style={{ background: color === 'aka' ? '#1a0505' : '#050f1a' }}>
        <span
          className={`text-xs font-black uppercase tracking-widest mr-8 ${accentColor}`}
          style={{ letterSpacing: '0.15em' }}
        >
          PENALTIES
        </span>
        {/* Penalty columns: C1 C2 C3 HC H */}
        {[1, 2, 3, 4, 5].map((level) => {
          const label = ['C1', 'C2', 'C3', 'HC', 'H'][level - 1];
          const filled = val >= level;
          return (
            <button
              key={level}
              onClick={() => addPenalty(side, level)}
              disabled={!!winner}
              className="flex flex-col items-center justify-center w-16 h-full border-l border-white/10 cursor-pointer hover:bg-white/5 disabled:cursor-default transition"
              title={`${side.toUpperCase()} Penalty: ${label}`}
            >
              <span className="text-[10px] text-white/30 font-bold mb-0.5">{label}</span>
              <PenDot filled={filled} />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-black text-white overflow-hidden select-none ${
      fullscreen ? 'fixed inset-0 z-[200]' : 'h-[calc(100vh-64px)]'
    }`}>

      {/* ══ TOP CONTROL BAR ══ */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0a0a0f] border-b border-gray-800 shrink-0 flex-wrap z-10">
        <div className="flex items-center gap-1.5 mr-2">
          <Zap className="h-4 w-4 text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-widest text-yellow-400">LIVE SCORING</span>
        </div>

        {/* Category */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-gray-400 font-bold uppercase">Category</label>
          <div className="relative">
            <select
              value={selectedCatId}
              onChange={e => {
                setSelectedCatId(e.target.value);
                const first = bouts.find(b => b.category_id === e.target.value);
                if (first) setSelectedBoutId(first.id);
                resetTimer();
              }}
              className="appearance-none pl-3 pr-7 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {categories.filter(c => bouts.some(b => b.category_id === c.id)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Bout */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-gray-400 font-bold uppercase">Bout</label>
          <div className="relative">
            <select
              value={selectedBoutId}
              onChange={e => { setSelectedBoutId(e.target.value); resetTimer(); }}
              className="appearance-none pl-3 pr-7 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {catBouts.map(b => {
                const compA = participants.find(p => p.id === b.participant_a_id);
                const compB = participants.find(p => p.id === b.participant_b_id);
                const roundLabel = catBouts.filter(x => x.round_no === b.round_no).length === 1 ? 'Final' :
                  catBouts.filter(x => x.round_no === b.round_no).length === 2 ? 'SF' : `R${b.round_no}`;
                return (
                  <option key={b.id} value={b.id}>
                    {roundLabel} B{b.bout_no} — {compA?.full_name?.split(' ')[0] || 'TBD'} vs {compB?.full_name?.split(' ')[0] || 'TBD'}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] text-gray-400 font-bold uppercase">Duration</label>
          <select
            value={matchDuration}
            onChange={e => { setMatchDuration(Number(e.target.value)); setTimeLeft(Number(e.target.value)); }}
            className="pl-3 pr-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs font-semibold text-white focus:outline-none cursor-pointer"
            disabled={timerRunning}
          >
            <option value={60}>1:00</option>
            <option value={90}>1:30</option>
            <option value={120}>2:00</option>
            <option value={180}>3:00</option>
          </select>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={startTimer}
            disabled={timerRunning || timeLeft === 0 || !!winner}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg font-black text-[10px] tracking-wider transition cursor-pointer"
          >
            <Play className="h-3 w-3 fill-white" /> START
          </button>
          <button
            onClick={stopTimer}
            disabled={!timerRunning}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg font-black text-[10px] tracking-wider transition cursor-pointer"
          >
            <Square className="h-3 w-3 fill-white" /> STOP
          </button>
          <button
            onClick={resetTimer}
            disabled={timerRunning}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg font-black text-[10px] tracking-wider transition cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" /> RESET
          </button>
        </div>

        {/* Fullscreen */}
        <button
          onClick={() => setFullscreen(f => !f)}
          className="ml-auto p-1.5 hover:bg-gray-700 rounded-lg transition cursor-pointer text-gray-400 hover:text-white"
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* ══ MAIN SCOREBOARD — WKF SET POINT PANEL STYLE ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── AKA SIDE (TOP / RED) ── */}
        <div 
          className={`flex-1 flex flex-col transition-all duration-300 ${
            blinkWinner === 'aka' ? 'animate-score-blink' : ''
          } ${
            superiorWinner === 'aka' ? 'border-4 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : ''
          }`} 
          style={{ 
            background: superiorWinner === 'aka' 
              ? 'linear-gradient(180deg, #022c22 0%, #064e3b 100%)' 
              : 'linear-gradient(180deg, #1a0000 0%, #0d0000 100%)' 
          }}
        >
          {/* Name + Score Row */}
          <div className="flex-1 flex items-center justify-between px-8 py-3 relative">
            {/* AKA label + name */}
            <div className="flex flex-col">
              <span
                className="font-black leading-none"
                style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', color: '#ff1a1a', textShadow: '0 0 40px rgba(255,0,0,0.4)', letterSpacing: '-0.01em' }}
              >
                AKA
              </span>
              <span className="text-white/60 text-sm font-semibold mt-1 tracking-wide truncate max-w-xs">
                {akaComp?.full_name || '— Competitor —'}
              </span>
              {senshuAka && (
                <span className="mt-1 bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse w-fit border border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                  先取 SENSHU
                </span>
              )}
            </div>

            {/* AKA Score */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-col items-end">
                <span
                  className="font-black tabular-nums leading-none"
                  style={{ fontSize: 'clamp(5rem, 14vw, 11rem)', color: '#ff1a1a', textShadow: '0 0 60px rgba(255,0,0,0.5)' }}
                >
                  {scoreAka}
                </span>
                {showPointHistory && eventsAka.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 justify-end max-w-[300px]">
                    {eventsAka.map((ev, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-sm bg-red-950/80 border border-red-500/30 text-[9px] font-black text-red-400 whitespace-nowrap"
                      >
                        +{ev.points} {ev.technique}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Scoring buttons */}
              <div className="flex gap-1.5">
                {[
                  { label: 'IPPON +3', pts: 3, color: 'bg-red-700 hover:bg-red-600' },
                  { label: 'WAZA +2', pts: 2, color: 'bg-red-800 hover:bg-red-700' },
                  { label: 'YUKO +1', pts: 1, color: 'bg-red-900 hover:bg-red-800' },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onMouseDown={() => addScore('aka', btn.pts)}
                    disabled={!!winner}
                    className={`${btn.color} text-white px-2.5 py-1 rounded font-black text-[10px] tracking-wider transition active:scale-95 cursor-pointer disabled:opacity-40 border border-white/10`}
                  >
                    {btn.label}
                  </button>
                ))}
                <button
                  onMouseDown={() => undoScore('aka', 1)}
                  disabled={!!winner || scoreAka === 0}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-2.5 py-1 rounded font-bold text-[10px] transition active:scale-95 cursor-pointer disabled:opacity-30 border border-white/10"
                >
                  ↩ UNDO
                </button>
              </div>
            </div>
          </div>

          {/* AKA Penalty row */}
          <PenaltyRow side="aka" val={c1Aka} color="aka" />
        </div>

        {/* ── DIVIDER LINE ── */}
        <div className="h-px bg-white/10 shrink-0" />

        {/* ── AO SIDE (BOTTOM / BLUE) ── */}
        <div 
          className={`flex-1 flex flex-col transition-all duration-300 ${
            blinkWinner === 'ao' ? 'animate-score-blink' : ''
          } ${
            superiorWinner === 'ao' ? 'border-4 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]' : ''
          }`} 
          style={{ 
            background: superiorWinner === 'ao' 
              ? 'linear-gradient(180deg, #022c22 0%, #064e3b 100%)' 
              : 'linear-gradient(180deg, #00001a 0%, #000d1a 100%)' 
          }}
        >
          {/* AO Penalty row (at top of AO section) */}
          <PenaltyRow side="ao" val={c1Ao} color="ao" />

          {/* Name + Score Row */}
          <div className="flex-1 flex items-center justify-between px-8 py-3 relative">
            {/* AO label + name */}
            <div className="flex flex-col">
              <span
                className="font-black leading-none"
                style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', color: '#00d4ff', textShadow: '0 0 40px rgba(0,180,255,0.4)', letterSpacing: '-0.01em' }}
              >
                AO
              </span>
              <span className="text-white/60 text-sm font-semibold mt-1 tracking-wide truncate max-w-xs">
                {aoComp?.full_name || '— Competitor —'}
              </span>
              {senshuAo && (
                <span className="mt-1 bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse w-fit border border-blue-400 shadow-[0_0_10px_rgba(37,99,235,0.4)] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>
                  先取 SENSHU
                </span>
              )}
            </div>

            {/* AO Score */}
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-col items-end">
                <span
                  className="font-black tabular-nums leading-none"
                  style={{ fontSize: 'clamp(5rem, 14vw, 11rem)', color: '#00d4ff', textShadow: '0 0 60px rgba(0,200,255,0.5)' }}
                >
                  {scoreAo}
                </span>
                {showPointHistory && eventsAo.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 justify-end max-w-[300px]">
                    {eventsAo.map((ev, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-sm bg-blue-950/80 border border-blue-500/30 text-[9px] font-black text-blue-400 whitespace-nowrap"
                      >
                        +{ev.points} {ev.technique}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Scoring buttons */}
              <div className="flex gap-1.5">
                {[
                  { label: 'IPPON +3', pts: 3, color: 'bg-blue-700 hover:bg-blue-600' },
                  { label: 'WAZA +2', pts: 2, color: 'bg-blue-800 hover:bg-blue-700' },
                  { label: 'YUKO +1', pts: 1, color: 'bg-blue-900 hover:bg-blue-800' },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onMouseDown={() => addScore('ao', btn.pts)}
                    disabled={!!winner}
                    className={`${btn.color} text-white px-2.5 py-1 rounded font-black text-[10px] tracking-wider transition active:scale-95 cursor-pointer disabled:opacity-40 border border-white/10`}
                  >
                    {btn.label}
                  </button>
                ))}
                <button
                  onMouseDown={() => undoScore('ao', 1)}
                  disabled={!!winner || scoreAo === 0}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-2.5 py-1 rounded font-bold text-[10px] transition active:scale-95 cursor-pointer disabled:opacity-30 border border-white/10"
                >
                  ↩ UNDO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM BAR — KARATE TECH TIMER ── */}
        <div className="shrink-0 flex items-center bg-black border-t border-white/10" style={{ height: '90px' }}>
          {/* KARATE TECH Logo area */}
          <div className="flex flex-col items-center justify-center px-6 border-r border-white/10 h-full" style={{ minWidth: '200px' }}>
            <div className="flex items-center gap-3">
              {/* Tournament logo */}
              <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shrink-0 bg-white/5">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {/* Brand Logo — KarateTech */}
              <div className="flex flex-col leading-none">
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '0.95rem', lineHeight: 1, letterSpacing: '0.01em' }}>
                  <span style={{ color: '#b91c2e' }}>Karate</span>
                  <span style={{ color: '#38bdf8' }}>Tech</span>
                </div>
                <div style={{ height: '1.5px', background: 'linear-gradient(90deg, #b91c2e 60%, transparent 100%)', marginTop: '1.5px', marginBottom: '1.5px', borderRadius: '1px' }} />
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.01em', color: '#818cf8', lineHeight: 1.15 }}>
                  SP SportData Solution
                </span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.45rem', letterSpacing: '0.08em', color: '#64748b', lineHeight: 1.2, marginTop: '1.5px' }}>
                  • Precision. • Speed. • Results. •
                </span>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="flex-1 flex items-center justify-center">
            <span
              className={`font-black tabular-nums ${
                timeLeft <= 30 && timerRunning ? 'text-red-400 animate-pulse' :
                timeLeft === 0 ? 'text-red-500' : 'text-white'
              }`}
              style={{
                fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                textShadow: timeLeft <= 30 && timerRunning ? '0 0 30px rgba(239,68,68,0.7)' : '0 0 20px rgba(255,255,255,0.2)',
                letterSpacing: '-0.02em'
              }}
            >
              {fmtTimeFull(timeLeft)}
              <span className="text-2xl text-white/50">.0</span>
            </span>
          </div>

          {/* Win declaration + save */}
          <div className="flex flex-col gap-1 px-4 border-l border-white/10 h-full justify-center">
            {!winner ? (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <button onClick={() => declareWinner('aka', 'Score')} disabled={!!winner} className="text-[9px] font-black px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded cursor-pointer disabled:opacity-40 transition">🏆 AKA Win</button>
                  <button onClick={() => declareWinner('ao', 'Score')} disabled={!!winner} className="text-[9px] font-black px-2 py-1 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded cursor-pointer disabled:opacity-40 transition">🏆 AO Win</button>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => declareWinner('aka', 'Hantei')} disabled={!!winner} className="text-[9px] font-black px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded cursor-pointer disabled:opacity-40 transition">⚖️ Hantei AKA</button>
                  <button onClick={() => declareWinner('ao', 'Hantei')} disabled={!!winner} className="text-[9px] font-black px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded cursor-pointer disabled:opacity-40 transition">⚖️ Hantei AO</button>
                </div>
              </div>
            ) : (
              <div className={`text-center px-3 py-2 rounded-lg border ${winner === 'aka' ? 'bg-red-900/60 border-red-500' : 'bg-blue-900/60 border-blue-400'}`}>
                <div className="text-[9px] text-white/70 font-bold uppercase">WINNER</div>
                <div className={`text-xl font-black ${winner === 'aka' ? 'text-red-300' : 'text-[#00d4ff]'}`}>{winner.toUpperCase()}</div>
                <div className="text-[8px] text-white/50">{winMethod}</div>
                <button
                  onClick={saveResult}
                  disabled={saving}
                  className="mt-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[9px] font-black rounded transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving…' : '💾 Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ SUPERIOR POINTS WINNER MODAL/POPUP ══ */}
      {showSuperiorPopup && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#111827] border border-emerald-500 rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center animate-scale-in">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🏆</span>
            </div>
            <h3 className="text-2xl font-black text-emerald-400 uppercase tracking-wide mb-2">
              Winner by Superior Points
            </h3>
            <p className="text-sm text-gray-300 mb-6">
              The match ended in a tie, and the decision was automatically determined by WKF Superior Scoring Points rules.
            </p>
            <div className="bg-black/40 rounded-xl p-4 mb-6 border border-white/5">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">AKA ({akaComp?.full_name?.split(' ')[0] || 'Aka'})</div>
                  <div className="text-xs text-white mt-1">
                    Ippons (3): {historyAka.filter(x => x === 3).length} <br />
                    Waza-aris (2): {historyAka.filter(x => x === 2).length} <br />
                    Yukos (1): {historyAka.filter(x => x === 1).length}
                  </div>
                </div>
                <div className="text-left border-l border-white/10 pl-4">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">AO ({aoComp?.full_name?.split(' ')[0] || 'Ao'})</div>
                  <div className="text-xs text-white mt-1">
                    Ippons (3): {historyAo.filter(x => x === 3).length} <br />
                    Waza-aris (2): {historyAo.filter(x => x === 2).length} <br />
                    Yukos (1): {historyAo.filter(x => x === 1).length}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowSuperiorPopup(false);
                setBlinkWinner(null); // Stop blinking after dismiss
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition duration-200 shadow-lg shadow-emerald-700/30 cursor-pointer active:scale-95 animate-pulse"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

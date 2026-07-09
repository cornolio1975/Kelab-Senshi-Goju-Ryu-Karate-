'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/db/dbClient';
import { Bout, Participant, Category, Club } from '@/db/types';
import { 
  Zap, Play, Square, RotateCcw, X, ShieldAlert, Award, Timer, 
  ChevronLeft, Volume2, VolumeX, RefreshCw, Undo, Save, Check, Award as MedalIcon
} from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';

export default function ScoreboardControlPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boutId = searchParams.get('boutId');
  const { tournamentName } = useTournament();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bout, setBout] = useState<Bout | null>(null);
  const [competitorAka, setCompetitorAka] = useState<Participant | null>(null); // AKA = Red (cols[0] or participant_b_id / participant_a_id)
  const [competitorAo, setCompetitorAo] = useState<Participant | null>(null);   // AO = Blue

  // Live scoring state
  const [scoreAka, setScoreAka] = useState<number>(0);
  const [scoreAo, setScoreAo] = useState<number>(0);
  const [senshuAka, setSenshuAka] = useState<boolean>(false);
  const [senshuAo, setSenshuAo] = useState<boolean>(false);
  
  // Penalties: Chukoku(C1), Keikoku(C2), Hansoku-Chui(C3), Hansoku(HC)
  const [penaltiesAka, setPenaltiesAka] = useState<string[]>([]);
  const [penaltiesAo, setPenaltiesAo] = useState<string[]>([]);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 3 minutes default (1800 deciseconds)
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [matchDuration, setMatchDuration] = useState<number>(180);
  const [goldenScore, setGoldenScore] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasTimerRun, setHasTimerRun] = useState<boolean>(false);

  // History stack for Undo
  const [history, setHistory] = useState<any[]>([]);

  // Modal / Saving states
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
  const [winnerSide, setWinnerSide] = useState<'aka' | 'ao' | null>(null);
  const [winMethod, setWinMethod] = useState<string>('Points');
  const [saving, setSaving] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Setup broadcast channel
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      broadcastChannelRef.current = new BroadcastChannel('wkf-scoreboard-sync');
    }
    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Fetch bout data
  const loadBoutData = useCallback(async () => {
    if (!boutId) return;
    try {
      setLoading(true);
      const [bList, pList] = await Promise.all([
        db.bouts.list(),
        db.participants.list()
      ]);
      const currentBout = bList.find(b => b.id === boutId);
      if (currentBout) {
        setBout(currentBout);
        
        // Match competitor A (represented as AKA in typical matches) and competitor B (represented as AO)
        const compAka = pList.find(p => p.id === currentBout.participant_a_id) || null;
        const compAo = pList.find(p => p.id === currentBout.participant_b_id) || null;
        setCompetitorAka(compAka);
        setCompetitorAo(compAo);

        // Load persisted scoring state if exists
        setScoreAka(currentBout.score_a ?? 0);
        setScoreAo(currentBout.score_b ?? 0);
        setSenshuAka(currentBout.senshu_a ?? false);
        setSenshuAo(currentBout.senshu_b ?? false);
        setPenaltiesAka(currentBout.penalties_a ? currentBout.penalties_a.split(',').filter(Boolean) : []);
        setPenaltiesAo(currentBout.penalties_b ? currentBout.penalties_b.split(',').filter(Boolean) : []);
        setTimeLeft((currentBout.timer_seconds ?? 180) * 10);
        setMatchDuration(currentBout.timer_seconds ?? 180);
        setHasTimerRun(false);
      }
    } catch (err) {
      console.error('Error loading scoreboard bout details:', err);
    } finally {
      setLoading(false);
    }
  }, [boutId]);

  useEffect(() => {
    if (mounted) {
      loadBoutData();
    }
  }, [mounted, loadBoutData]);

  // Broadcast function to sync displays
  const broadcastState = useCallback(() => {
    if (!broadcastChannelRef.current) return;
    broadcastChannelRef.current.postMessage({
      boutId,
      akaName: competitorAka?.full_name || 'TBD AKA',
      akaClub: competitorAka?.club_id ? 'Senshi Karate Academy' : 'Senshi Club',
      aoName: competitorAo?.full_name || 'TBD AO',
      aoClub: competitorAo?.club_id ? 'Goju-Ryu Karate Club' : 'Goju-Ryu Club',
      scoreAka,
      scoreAo,
      senshuAka,
      senshuAo,
      penaltiesAka,
      penaltiesAo,
      timeLeft,
      timerActive,
      goldenScore,
      winner: winnerSide,
      winMethod,
      matchDuration
    });
  }, [
    boutId, competitorAka, competitorAo, scoreAka, scoreAo,
    senshuAka, senshuAo, penaltiesAka, penaltiesAo, timeLeft,
    timerActive, goldenScore, winnerSide, winMethod, matchDuration
  ]);

  // Broadcast state updates in real-time
  useEffect(() => {
    if (mounted && bout) {
      broadcastState();
      
      // Auto save draft to db in background periodically
      const saveDraft = async () => {
        try {
          await db.bouts.updateBoutState(boutId!, {
            score_a: scoreAka,
            score_b: scoreAo,
            senshu_a: senshuAka,
            senshu_b: senshuAo,
            penalties_a: penaltiesAka.join(','),
            penalties_b: penaltiesAo.join(','),
            timer_seconds: Math.round(timeLeft / 10),
            timer_active: timerActive
          });
        } catch (e) {
          console.warn('Background draft save error', e);
        }
      };
      
      const debounceTimeout = setTimeout(saveDraft, 2000);
      return () => clearTimeout(debounceTimeout);
    }
  }, [
    scoreAka, scoreAo, senshuAka, senshuAo, penaltiesAka,
    penaltiesAo, timeLeft, timerActive, goldenScore, winnerSide,
    winMethod, mounted, bout, broadcastState, boutId
  ]);

  // Sound generator
  const triggerBuzzer = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(320, audioCtx.currentTime); // Deep buzzer tone
      
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2); // Fade out

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.2);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  const triggerBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Higher pitch (A5 tone)
      
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15); // Short warning beep

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  };

  // Timer runner loop
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            triggerBuzzer();
            return 0;
          }
          const nextVal = prev - 1;
          // Beep on whole seconds in the last 5 seconds (5.0s, 4.0s, 3.0s, 2.0s, 1.0s)
          if (nextVal <= 50 && nextVal > 0 && nextVal % 10 === 0) {
            triggerBeep();
          }
          return nextVal;
        });
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // Save current state to history for undo operations
  // Save current state to history for undo operations
  const pushHistory = (prevScoreAka = scoreAka, prevScoreAo = scoreAo, prevPenAka = penaltiesAka, prevPenAo = penaltiesAo, prevSenshuAka = senshuAka, prevSenshuAo = senshuAo, prevHasTimerRun = hasTimerRun) => {
    setHistory((prev) => [
      ...prev,
      {
        scoreAka: prevScoreAka,
        scoreAo: prevScoreAo,
        penaltiesAka: [...prevPenAka],
        penaltiesAo: [...prevPenAo],
        senshuAka: prevSenshuAka,
        senshuAo: prevSenshuAo,
        hasTimerRun: prevHasTimerRun
      }
    ]);
  };

  // Undo action
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setScoreAka(lastState.scoreAka);
    setScoreAo(lastState.scoreAo);
    setPenaltiesAka(lastState.penaltiesAka);
    setPenaltiesAo(lastState.penaltiesAo);
    setSenshuAka(lastState.senshuAka);
    setSenshuAo(lastState.senshuAo);
    setHasTimerRun(lastState.hasTimerRun ?? false);
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  // Adjust scores
  const handleAddScore = useCallback((side: 'aka' | 'ao', points: number) => {
    if (bout?.status === 'Completed') return;
    pushHistory();
    let finalScoreAka = scoreAka;
    let finalScoreAo = scoreAo;

    if (side === 'aka') {
      const newScore = Math.max(0, scoreAka + points);
      setScoreAka(newScore);
      finalScoreAka = newScore;
      
      // Senshu rule: First scoring competitor receives Senshu if uncontested
      if (points > 0 && newScore > 0) {
        if (scoreAka === 0) { // AKA's first score
          if (scoreAo === 0) {
            setSenshuAka(true);
            setHasTimerRun(false);
          } else if (scoreAo > 0 && !hasTimerRun) {
            // Both scored in the same exchange/stoppage -> Senshu off
            setSenshuAka(false);
            setSenshuAo(false);
          }
        }
      } else if (points < 0 && newScore === 0 && senshuAka) {
        setSenshuAka(false);
      }
    } else {
      const newScore = Math.max(0, scoreAo + points);
      setScoreAo(newScore);
      finalScoreAo = newScore;
      
      if (points > 0 && newScore > 0) {
        if (scoreAo === 0) { // AO's first score
          if (scoreAka === 0) {
            setSenshuAo(true);
            setHasTimerRun(false);
          } else if (scoreAka > 0 && !hasTimerRun) {
            // Both scored in the same exchange/stoppage -> Senshu off
            setSenshuAka(false);
            setSenshuAo(false);
          }
        }
      } else if (points < 0 && newScore === 0 && senshuAo) {
        setSenshuAo(false);
      }
    }

    // Check for 8-point gap differential rule
    if (Math.abs(finalScoreAka - finalScoreAo) >= 8) {
      setTimerActive(false);
      triggerBuzzer();
      setWinnerSide(finalScoreAka > finalScoreAo ? 'aka' : 'ao');
      setWinMethod('Points'); // Points Advantage (Senshu / Gap)
      setShowFinishModal(true);
    }
  }, [scoreAka, scoreAo, senshuAka, senshuAo, hasTimerRun, triggerBuzzer]);

  // Manage Penalties WKF System (C1, C2, C3, HC)
  const handleTogglePenalty = (side: 'aka' | 'ao', penalty: string) => {
    if (bout?.status === 'Completed') return;
    pushHistory();
    const currentPens = side === 'aka' ? [...penaltiesAka] : [...penaltiesAo];
    const setPens = side === 'aka' ? setPenaltiesAka : setPenaltiesAo;
    
    let nextPens: string[] = [];
    if (currentPens.includes(penalty)) {
      // Remove it and subsequent penalties
      const idx = ['C1', 'C2', 'C3', 'HC'].indexOf(penalty);
      nextPens = currentPens.filter(p => ['C1', 'C2', 'C3', 'HC'].indexOf(p) < idx);
    } else {
      // Add it and all prior warnings
      const idx = ['C1', 'C2', 'C3', 'HC'].indexOf(penalty);
      nextPens = ['C1', 'C2', 'C3', 'HC'].slice(0, idx + 1);
    }

    setPens(nextPens);

    // Apply points according to penalty progression rules:
    // C2 (Keikoku) -> +1 point to opponent
    // C3 (Hansoku-Chui) -> +2 points to opponent
    // HC (Hansoku) -> Disqualify competitor, declare other competitor winner!
    if (nextPens.includes('HC')) {
      setTimerActive(false);
      setWinnerSide(side === 'aka' ? 'ao' : 'aka');
      setWinMethod('Hansoku');
      setShowFinishModal(true);
    }
  };

  // Manage Senshu (uncontested first score advantages)
  const handleToggleSenshu = (side: 'aka' | 'ao') => {
    if (bout?.status === 'Completed') return;
    pushHistory();
    if (side === 'aka') {
      setSenshuAka(!senshuAka);
      if (!senshuAka) setSenshuAo(false); // Only one can hold Senshu
    } else {
      setSenshuAo(!senshuAo);
      if (!senshuAo) setSenshuAka(false);
    }
  };

  // Timer controls
  const handleStartTimer = () => {
    if (timeLeft > 0) setTimerActive(true);
  };

  const handleStopTimer = () => {
    setTimerActive(false);
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    setTimeLeft(matchDuration * 10);
    setHasTimerRun(false);
  };

  // Adjust timer by adding/subtracting seconds
  const handleAdjustTime = (seconds: number) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds * 10));
  };

  // Set hasTimerRun to true when timer is active
  useEffect(() => {
    if (timerActive) {
      setHasTimerRun(true);
    }
  }, [timerActive]);

  // Keyboard Shortcuts implementation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName;
      if (activeEl === 'INPUT' || activeEl === 'TEXTAREA' || activeEl === 'SELECT') {
        return; // Prevent hotkeys triggering while writing comments/inputs
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setTimerActive(prev => !prev);
          break;
        // AKA Scoring
        case 'KeyR':
          handleAddScore('aka', 1);
          break;
        case 'KeyF':
          handleAddScore('aka', 2);
          break;
        case 'KeyV':
          handleAddScore('aka', 3);
          break;
        // AO Scoring
        case 'KeyU':
          handleAddScore('ao', 1);
          break;
        case 'KeyJ':
          handleAddScore('ao', 2);
          break;
        case 'KeyM':
          handleAddScore('ao', 3);
          break;
        // Action Undo
        case 'Backspace':
          e.preventDefault();
          handleUndo();
          break;
        // Finish Match
        case 'Enter':
          e.preventDefault();
          setTimerActive(false);
          setShowFinishModal(true);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddScore, handleUndo]);

  // Finish Match saving result
  const handleSaveResult = async () => {
    if (!boutId || !bout) return;

    let winnerId: string | null = null;
    if (winnerSide === 'aka') {
      winnerId = bout.participant_a_id;
    } else if (winnerSide === 'ao') {
      winnerId = bout.participant_b_id;
    }

    if (!winnerId) {
      alert('Please select a winner to finish this match.');
      return;
    }

    try {
      setSaving(true);

      // 1. Update bout status, scores and declare winner
      await db.bouts.updateBoutResult(boutId, winnerId, scoreAka, scoreAo);
      
      // 2. Clear state variables
      setTimerActive(false);
      setShowFinishModal(false);

      // 3. Notify display of completed match
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'MATCH_FINISHED',
          winnerName: winnerSide === 'aka' ? competitorAka?.full_name : competitorAo?.full_name,
          winnerSide
        });
      }

      // 4. Return to scoreboard selector
      router.push('/dashboard/scoreboard');
    } catch (err: any) {
      alert('Failed to save tournament result: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Rematch resets the bout back to Scheduled state
  const handleRematch = async () => {
    if (!boutId || !bout) return;

    const confirmRematch = window.confirm("Are you sure you want to reset this match and run a rematch? All current scores and penalties will be cleared in the database.");
    if (!confirmRematch) return;

    try {
      setSaving(true);

      // Reset in DB (including advancing bracket removal)
      await db.bouts.resetBoutResult(boutId, matchDuration);

      // Reset local states
      setScoreAka(0);
      setScoreAo(0);
      setSenshuAka(false);
      setSenshuAo(false);
      setPenaltiesAka([]);
      setPenaltiesAo([]);
      setTimeLeft(matchDuration * 10);
      setTimerActive(false);
      setWinnerSide(null);
      setHistory([]);
      setHasTimerRun(false);

      // Update local bout state
      setBout((prev) => prev ? {
        ...prev,
        score_a: 0,
        score_b: 0,
        senshu_a: false,
        senshu_b: false,
        penalties_a: '',
        penalties_b: '',
        timer_seconds: matchDuration,
        timer_active: false,
        winner_id: null,
        status: 'Scheduled'
      } : null);

      // Broadcast update to display screen
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          boutId,
          akaName: competitorAka?.full_name || 'TBD AKA',
          akaClub: competitorAka?.club_id ? 'Senshi Karate Academy' : 'Senshi Club',
          aoName: competitorAo?.full_name || 'TBD AO',
          aoClub: competitorAo?.club_id ? 'Goju-Ryu Karate Club' : 'Goju-Ryu Club',
          scoreAka: 0,
          scoreAo: 0,
          senshuAka: false,
          senshuAo: false,
          penaltiesAka: [],
          penaltiesAo: [],
          timeLeft: matchDuration * 10,
          timerActive: false,
          goldenScore: false,
          winner: null,
          winMethod: '',
          matchDuration
        });
      }

      alert("Match has been successfully reset. Ready for rematch!");
    } catch (err: any) {
      alert("Failed to reset match: " + err.message);
    } finally {
      setSaving(false);
    }
  };

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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-white">
        <RefreshCw className="h-8 w-8 text-yellow-400 animate-spin mr-3" />
        <span className="text-xs uppercase tracking-widest font-black text-gray-400">Loading WKF Console...</span>
      </div>
    );
  }

  if (!bout) {
    return (
      <div className="min-h-screen bg-[#07070a] flex flex-col items-center justify-center text-white p-6">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Bout Match Not Found</h2>
        <p className="text-gray-400 text-xs mt-1 mb-6">Make sure you selected a valid active match from the hub.</p>
        <Link href="/dashboard/scoreboard" className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060609] text-white flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <header className="bg-[#0b0b10] border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/scoreboard" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-[9px] font-black uppercase text-yellow-400 tracking-wider">
              {bout.tatami || 'Tatami 1'} • BOUT #{bout.bout_no} • ROUND {bout.round_no}
            </span>
            <h1 className="text-sm font-black truncate max-w-xs md:max-w-md">
              Scoreboard Controller
            </h1>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          {/* Audio toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
            title={soundEnabled ? 'Mute Arena Buzzer' : 'Enable Arena Buzzer'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-green-400" /> : <VolumeX className="h-4 w-4 text-red-400" />}
          </button>
          
          <button
            onClick={handleUndo}
            disabled={history.length === 0 || bout.status === 'Completed'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-lg text-xs font-bold transition border border-white/10 cursor-pointer"
          >
            <Undo className="h-3.5 w-3.5" /> Undo
          </button>

          <Link
            href={`/display?boutId=${bout.id}`}
            target="_blank"
            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            Spectator View
          </Link>
        </div>
      </header>

      {bout.status === 'Completed' && (
        <div className="bg-red-950/40 border-y border-red-900/30 px-6 py-3 flex items-center justify-between text-sm font-semibold shrink-0">
          <span className="text-red-400 font-bold">This match is completed. The results are locked in the database.</span>
          <button
            onClick={handleRematch}
            disabled={saving}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer border border-red-500/20"
          >
            Rematch / Reset Match
          </button>
        </div>
      )}

      {Math.abs(scoreAka - scoreAo) >= 8 && bout.status !== 'Completed' && (
        <div className="bg-yellow-950/40 border-y border-yellow-900/30 px-6 py-3 flex items-center justify-between text-sm font-semibold shrink-0 animate-pulse">
          <span className="text-yellow-400 font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
            8-POINT LEAD DIFFERENTIAL REACHED! MATCH COMPLETED
          </span>
          <button
            onClick={() => setShowFinishModal(true)}
            className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer border border-yellow-400/20"
          >
            Confirm Winner
          </button>
        </div>
      )}

      {/* Main Scoreboard Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
        {/* Left: AKA Red Side */}
        <section className="lg:col-span-5 bg-gradient-to-b from-red-950/20 via-red-950/5 to-transparent border border-red-900/30 rounded-3xl p-6 flex flex-col justify-between min-h-[400px]">
          <div>
            {/* Tag / Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-red-500">赤 AKA</span>
              <button 
                onClick={() => handleToggleSenshu('aka')}
                className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border transition cursor-pointer ${
                  senshuAka 
                    ? 'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                    : 'bg-transparent text-white/40 border-white/15 hover:border-white/30'
                }`}
              >
                SENSHU
              </button>
            </div>
            
            {/* Name */}
            <h2 className="text-2xl font-black truncate mb-1">
              {competitorAka?.full_name || 'TBD Red'}
            </h2>
            <p className="text-red-400/60 text-xs font-bold">
              {competitorAka?.club_id ? 'Senshi Karate Academy' : 'Senshi Club'}
            </p>

            {/* Score */}
            <div className="my-8 flex items-center justify-center">
              <span className={`text-9xl font-black leading-none tracking-tight font-mono select-none transition-all duration-300 ${
                scoreAka - scoreAo >= 8 
                  ? 'text-red-500 animate-pulse scale-105 drop-shadow-[0_0_45px_rgba(239,68,68,0.65)]' 
                  : 'text-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.25)]'
              }`}>
                {scoreAka}
              </span>
            </div>
          </div>

          <div>
            {/* Score Modifier Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={() => handleAddScore('aka', 1)}
                className="py-3 bg-red-900/40 hover:bg-red-900/60 border border-red-800/30 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                +1 Yuko
              </button>
              <button
                onClick={() => handleAddScore('aka', 2)}
                className="py-3 bg-red-800/40 hover:bg-red-800/60 border border-red-700/30 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                +2 Waza
              </button>
              <button
                onClick={() => handleAddScore('aka', 3)}
                className="py-3 bg-red-700/40 hover:bg-red-700/60 border border-red-600/30 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                +3 Ippon
              </button>
            </div>

            {/* Warnings WKF row */}
            <div className="border-t border-red-900/20 pt-4">
              <p className="text-[10px] uppercase font-black tracking-widest text-red-400/60 mb-2.5">
                Warnings / Penalties
              </p>
              <div className="grid grid-cols-4 gap-2">
                {['C1', 'C2', 'C3', 'HC'].map((key) => {
                  const isActive = penaltiesAka.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleTogglePenalty('aka', key)}
                      className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        isActive 
                          ? 'bg-red-500 text-black border-red-400 font-black shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                          : 'bg-transparent text-white/30 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Center: Timer & Controls */}
        <section className="lg:col-span-2 flex flex-col justify-between gap-6">
          {/* Main Clock Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 text-center flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-white/40 tracking-wider">Countdown</span>
              
              {/* Giant Digital Clock */}
              <div className={`text-5xl font-black font-mono leading-none my-6 select-none flex items-baseline justify-center ${
                timeLeft <= 150 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-yellow-400'
              }`}>
                <span>{formatMainTime(timeLeft)}</span>
                <span className={`text-2xl font-bold ml-0.5 ${
                  timeLeft <= 150 && timeLeft > 0 ? 'text-red-500/60' : 'text-white/50'
                }`}>{formatDecsTime(timeLeft)}</span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-center gap-1.5 mb-6">
                <span className={`w-2 h-2 rounded-full ${timerActive ? 'bg-green-500 animate-ping' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                  {timerActive ? 'ACTIVE RUNNING' : 'PAUSED'}
                </span>
              </div>
            </div>

            {/* Clock Controls */}
            <div className="space-y-2">
              {timerActive ? (
                <button
                  onClick={handleStopTimer}
                  disabled={bout.status === 'Completed'}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-red-950/20"
                >
                  <Square className="h-4 w-4 fill-white" /> Stop Timer
                </button>
              ) : (
                <button
                  onClick={handleStartTimer}
                  disabled={timeLeft === 0 || bout.status === 'Completed'}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-green-950/20"
                >
                  <Play className="h-4 w-4 fill-white" /> Start Timer
                </button>
              )}

              {/* Adjust time buttons (+10s and -10s) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleAdjustTime(-10)}
                  disabled={timerActive || bout.status === 'Completed'}
                  className="py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer border border-white/10"
                >
                  -10s
                </button>
                <button
                  onClick={() => handleAdjustTime(10)}
                  disabled={timerActive || bout.status === 'Completed'}
                  className="py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer border border-white/10"
                >
                  +10s
                </button>
              </div>

              <button
                onClick={handleResetTimer}
                disabled={timerActive || bout.status === 'Completed'}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/10"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Clock
              </button>
            </div>
          </div>

          {/* Time Duration selector + Golden score */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Match Time</label>
              <select
                value={matchDuration}
                onChange={e => {
                  const val = Number(e.target.value);
                  setMatchDuration(val);
                  setTimeLeft(val * 10);
                }}
                disabled={timerActive}
                className="w-full bg-[#101015] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
              >
                <option value={60}>1:00 Minute</option>
                <option value={90}>1:30 Minutes</option>
                <option value={120}>2:00 Minutes</option>
                <option value={180}>3:00 Minutes</option>
              </select>
            </div>

            {/* Golden Score toggle */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3.5">
              <span className="text-[10px] uppercase font-bold text-gray-400">Golden Score</span>
              <button
                onClick={() => setGoldenScore(!goldenScore)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition cursor-pointer border ${
                  goldenScore
                    ? 'bg-yellow-400 text-black border-yellow-300'
                    : 'bg-transparent text-white/30 border-white/5 hover:border-white/10'
                }`}
              >
                {goldenScore ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          </div>
        </section>

        {/* Right: AO Blue Side */}
        <section className="lg:col-span-5 bg-gradient-to-b from-blue-950/20 via-blue-950/5 to-transparent border border-blue-900/30 rounded-3xl p-6 flex flex-col justify-between min-h-[400px]">
          <div>
            {/* Tag / Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => handleToggleSenshu('ao')}
                className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border transition cursor-pointer ${
                  senshuAo 
                    ? 'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                    : 'bg-transparent text-white/40 border-white/15 hover:border-white/30'
                }`}
              >
                SENSHU
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-blue-400">青 AO</span>
            </div>
            
            {/* Name */}
            <h2 className="text-2xl font-black truncate text-right mb-1">
              {competitorAo?.full_name || 'TBD Blue'}
            </h2>
            <p className="text-blue-400/60 text-xs font-bold text-right">
              {competitorAo?.club_id ? 'Goju-Ryu Karate Club' : 'Goju-Ryu Club'}
            </p>

            {/* Score */}
            <div className="my-8 flex items-center justify-center">
              <span className={`text-9xl font-black leading-none tracking-tight font-mono select-none transition-all duration-300 ${
                scoreAo - scoreAka >= 8 
                  ? 'text-blue-400 animate-pulse scale-105 drop-shadow-[0_0_45px_rgba(59,130,246,0.65)]' 
                  : 'text-blue-400 drop-shadow-[0_0_35px_rgba(59,130,246,0.25)]'
              }`}>
                {scoreAo}
              </span>
            </div>
          </div>

          <div>
            {/* Score Modifier Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <button
                onClick={() => handleAddScore('ao', 1)}
                className="py-3 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-800/30 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                +1 Yuko
              </button>
              <button
                onClick={() => handleAddScore('ao', 2)}
                className="py-3 bg-blue-800/40 hover:bg-blue-800/60 border border-blue-700/30 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                +2 Waza
              </button>
              <button
                onClick={() => handleAddScore('ao', 3)}
                className="py-3 bg-blue-700/40 hover:bg-blue-700/60 border border-blue-600/30 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95"
              >
                +3 Ippon
              </button>
            </div>

            {/* Warnings WKF row */}
            <div className="border-t border-blue-900/20 pt-4">
              <p className="text-[10px] uppercase font-black tracking-widest text-blue-400/60 mb-2.5 text-right">
                Warnings / Penalties
              </p>
              <div className="grid grid-cols-4 gap-2">
                {['C1', 'C2', 'C3', 'HC'].map((key) => {
                  const isActive = penaltiesAo.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleTogglePenalty('ao', key)}
                      className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        isActive 
                          ? 'bg-blue-500 text-black border-blue-400 font-black shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                          : 'bg-transparent text-white/30 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Keyboard guide footer */}
      <footer className="bg-[#0b0b10] border-t border-white/5 px-6 py-3 flex items-center justify-between text-[10px] text-gray-500 font-semibold shrink-0 flex-wrap gap-4">
        <div className="flex gap-4 items-center">
          <span>Shortcuts:</span>
          <span><b className="text-gray-400">Space</b> Start/Stop</span>
          <span><b className="text-gray-400">R/U</b> AKA/AO +1</span>
          <span><b className="text-gray-400">F/J</b> AKA/AO +2</span>
          <span><b className="text-gray-400">V/M</b> AKA/AO +3</span>
          <span><b className="text-gray-400">Backspace</b> Undo</span>
          <span><b className="text-gray-400">Enter</b> Finish</span>
        </div>

        <button
          onClick={() => {
            setTimerActive(false);
            setWinnerSide(scoreAka > scoreAo ? 'aka' : scoreAo > scoreAka ? 'ao' : null);
            setShowFinishModal(true);
          }}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer active:scale-95 shadow-md shadow-yellow-500/10"
        >
          <Save className="h-4 w-4" /> Save Bout Result
        </button>
      </footer>

      {/* Save Result / Finish Match Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d12] border border-white/10 max-w-md w-full rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                <MedalIcon className="h-5 w-5 text-yellow-400" />
                <h3 className="text-lg font-black tracking-tight">Confirm Match Result</h3>
              </div>
              <button 
                onClick={() => setShowFinishModal(false)} 
                className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Winner */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Declare Winner</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWinnerSide('aka')}
                    className={`py-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                      winnerSide === 'aka'
                        ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/20'
                        : 'bg-transparent text-white/50 border-white/10 hover:border-white/20'
                    }`}
                  >
                    AKA ({competitorAka?.full_name?.split(' ')[0] || 'Red'})
                  </button>
                  <button
                    onClick={() => setWinnerSide('ao')}
                    className={`py-3 rounded-xl border text-xs font-black transition cursor-pointer ${
                      winnerSide === 'ao'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-950/20'
                        : 'bg-transparent text-white/50 border-white/10 hover:border-white/20'
                    }`}
                  >
                    AO ({competitorAo?.full_name?.split(' ')[0] || 'Blue'})
                  </button>
                </div>
              </div>

              {/* Win Method */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Winning Decision Method</label>
                <select
                  value={winMethod}
                  onChange={e => setWinMethod(e.target.value)}
                  className="w-full bg-[#101015] border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
                >
                  <option value="Points">Points Advantage (Senshu / Gap)</option>
                  <option value="Senshu">Senshu Advantage (First Score)</option>
                  <option value="Hantei">Hantei (Referees Decision)</option>
                  <option value="Hansoku">Hansoku (Opponent Disqualification)</option>
                  <option value="Kiken">Kiken (Opponent Withdrawal / Kiken)</option>
                </select>
              </div>

              {Math.abs(scoreAka - scoreAo) >= 8 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-xs font-black text-center animate-pulse tracking-wide uppercase">
                  ⚠️ 8-Point Lead Differential Reached!
                </div>
              )}

              {/* Score summary */}
              <div className="bg-[#121218] rounded-xl p-3 border border-white/5 flex items-center justify-between text-xs font-bold">
                <span className="text-gray-400">Final Score Summary</span>
                <span className="font-mono text-sm tracking-widest text-yellow-400">
                  {scoreAka} - {scoreAo}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResult}
                disabled={saving || !winnerSide}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Confirm & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

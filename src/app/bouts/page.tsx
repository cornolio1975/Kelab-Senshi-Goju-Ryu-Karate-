'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/db/dbClient';
import { Bout, Participant, Category, Club } from '@/db/types';
import { 
  Sword, Play, Pause, RotateCcw, X, ShieldAlert, 
  Check, Award, Timer, ChevronRight, Volume2, VolumeX, RefreshCw 
} from 'lucide-react';

import { useTournament } from '@/context/TournamentContext';

export default function BoutsAdminPage() {
  const { canModify } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // Selection/filter states
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTatami, setSelectedTatami] = useState<string>('ALL');

  // Active Scoring Match Console state
  const [activeBout, setActiveBout] = useState<Bout | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [penaltiesA, setPenaltiesA] = useState<{
    senshi: boolean;
    c1: number; // 0 to 4
    c2: number; // 0 to 4
  }>({ senshi: false, c1: 0, c2: 0 });
  const [penaltiesB, setPenaltiesB] = useState<{
    senshi: boolean;
    c1: number;
    c2: number;
  }>({ senshi: false, c1: 0, c2: 0 });

  // Countdown Timer
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 minutes default
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  // Timer runner
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            playBuzzerSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bList, pList, catList, clList] = await Promise.all([
        db.bouts.list(),
        db.participants.list(),
        db.categories.list(),
        db.clubs.list(),
      ]);
      setBouts(bList);
      setParticipants(pList);
      setCategories(catList);
      setClubs(clList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const playBuzzerSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz freq
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 800);
    } catch (e) {
      console.warn('Audio buzzer failed to play: ', e);
    }
  };

  // Scoring methods
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Launch Referee Overlay
  const startScoringSession = (bout: Bout) => {
    if (!bout.participant_a_id || !bout.participant_b_id) return;
    setActiveBout(bout);
    setScoreA(bout.score_a);
    setScoreB(bout.score_b);
    setPenaltiesA({ senshi: false, c1: 0, c2: 0 });
    setPenaltiesB({ senshi: false, c1: 0, c2: 0 });
    setTimeLeft(180); // reset to 3:00 min
    setTimerActive(false);
    
    // Set match running state in db
    updateBoutStatus(bout.id, 'Running');
  };

  const updateBoutStatus = async (boutId: string, status: Bout['status']) => {
    const list = [...bouts];
    const idx = list.findIndex(b => b.id === boutId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], status };
      setBouts(list);
      // Persist in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('ts_bouts', JSON.stringify(list));
      }
    }
  };

  const saveLiveScores = async (updatedBout: Bout) => {
    const list = [...bouts];
    const idx = list.findIndex(b => b.id === updatedBout.id);
    if (idx !== -1) {
      list[idx] = updatedBout;
      setBouts(list);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ts_bouts', JSON.stringify(list));
      }
    }
  };

  const handleScoreChange = (side: 'A' | 'B', delta: number) => {
    if (!activeBout) return;
    if (side === 'A') {
      const nextScore = Math.max(0, scoreA + delta);
      setScoreA(nextScore);
      saveLiveScores({
        ...activeBout,
        score_a: nextScore,
        score_b: scoreB
      });
    } else {
      const nextScore = Math.max(0, scoreB + delta);
      setScoreB(nextScore);
      saveLiveScores({
        ...activeBout,
        score_a: scoreA,
        score_b: nextScore
      });
    }
  };

  const handlePenaltyChange = (side: 'A' | 'B', type: 'senshi' | 'c1' | 'c2', val?: any) => {
    if (side === 'A') {
      const updated = { ...penaltiesA };
      if (type === 'senshi') updated.senshi = !updated.senshi;
      else if (type === 'c1') updated.c1 = val;
      else if (type === 'c2') updated.c2 = val;
      setPenaltiesA(updated);
    } else {
      const updated = { ...penaltiesB };
      if (type === 'senshi') updated.senshi = !updated.senshi;
      else if (type === 'c1') updated.c1 = val;
      else if (type === 'c2') updated.c2 = val;
      setPenaltiesB(updated);
    }
  };

  const handleDeclareWinner = async (winnerId: string | null) => {
    if (!activeBout) return;
    if (!winnerId) {
      alert('Must select a valid competitor as winner.');
      return;
    }

    try {
      setLoading(true);
      await db.bouts.updateBoutResult(activeBout.id, winnerId, scoreA, scoreB);
      // Reload bouts list
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
      setActiveBout(null);
      setTimerActive(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update bout winner.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScoring = () => {
    if (activeBout) {
      updateBoutStatus(activeBout.id, 'Scheduled');
    }
    setActiveBout(null);
    setTimerActive(false);
  };

  if (!mounted) return null;

  // Filtered Bouts List
  const filteredBouts = bouts.filter((b) => {
    if (selectedCatId !== 'ALL' && b.category_id !== selectedCatId) return false;
    if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
    if (selectedTatami !== 'ALL' && b.tatami !== selectedTatami) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 text-foreground w-full h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      
      {/* Title */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scoring Management</h1>
          <p className="text-sm text-muted-foreground">Admin scoring controller to run matches, track points, and advance competitor draws.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-xs shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Category Filter */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Filter Category</label>
          <select 
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Tatami Filter */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Filter Tatami</label>
          <select 
            value={selectedTatami}
            onChange={(e) => setSelectedTatami(e.target.value)}
            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="ALL">All Tatamis</option>
            <option value="Tatami 1">Tatami 1</option>
            <option value="Tatami 2">Tatami 2</option>
            <option value="Tatami 3">Tatami 3</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Filter Status</label>
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Running">Running</option>
            <option value="Completed">Completed</option>
            <option value="Walkover">Walkover</option>
          </select>
        </div>
      </div>

      {/* Bouts List Table */}
      <div className="flex-1 border border-border bg-card rounded-xl overflow-hidden flex flex-col min-h-0">
        {loading && bouts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-12 text-muted-foreground text-xs font-semibold animate-pulse">
            Loading tournament matches...
          </div>
        ) : filteredBouts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground text-xs space-y-2">
            <Sword className="h-8 w-8 text-primary/20" />
            <span className="font-bold text-foreground">No Matches Found</span>
            <span>Check filters or generate draw brackets first.</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/40 font-bold border-b border-border sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="p-3 w-16 text-center">Bout No</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Aka (Red)</th>
                  <th className="p-3 w-20 text-center">Score</th>
                  <th className="p-3">Ao (Blue)</th>
                  <th className="p-3 w-28 text-center">Tatami</th>
                  <th className="p-3 w-24 text-center">Status</th>
                  <th className="p-3 w-28 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBouts.map((b) => {
                  const competitorA = participants.find(p => p.id === b.participant_a_id);
                  const competitorB = participants.find(p => p.id === b.participant_b_id);
                  const category = categories.find(c => c.id === b.category_id);
                  
                  const isBye = !b.participant_a_id || !b.participant_b_id;

                  return (
                    <tr key={b.id} className="hover:bg-secondary/25 transition-colors">
                      <td className="p-3 text-center font-mono font-semibold text-muted-foreground">{b.bout_no}</td>
                      <td className="p-3 font-semibold text-foreground max-w-xs truncate">{category?.name || 'Category'}</td>
                      <td className="p-3">
                        {competitorA ? (
                          <span className="font-bold text-red-500">{competitorA.full_name}</span>
                        ) : (
                          <span className="italic text-muted-foreground">TBD</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-sm bg-secondary/10">
                        {b.score_a} - {b.score_b}
                      </td>
                      <td className="p-3">
                        {competitorB ? (
                          <span className="font-bold text-blue-500">{competitorB.full_name}</span>
                        ) : (
                          <span className="italic text-muted-foreground">TBD</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-semibold text-muted-foreground">{b.tatami || 'TBD'}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                          b.status === 'Running' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse' :
                          'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => startScoringSession(b)}
                          disabled={isBye || b.status === 'Completed' || !canModify}
                          className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold rounded-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1 mx-auto"
                        >
                          <Sword className="h-3 w-3" />
                          <span>{canModify ? 'Run scoring' : 'Read-Only'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACTIVE SCOREBOARD OVERLAY */}
      {activeBout && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col p-6 overflow-hidden">
          
          {/* Top Info Bar */}
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="bg-red-500 text-white px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider animate-pulse">REFEREE CONSOLE</span>
              <h2 className="font-bold text-sm text-foreground">
                {categories.find(c => c.id === activeBout.category_id)?.name} — Bout {activeBout.bout_no}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                onClick={handleCancelScoring}
                className="p-2 bg-secondary text-red-500 hover:bg-red-500/10 rounded-lg transition font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
                <span>Exit scoring</span>
              </button>
            </div>
          </div>

          {/* Main Visual Arena Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0 overflow-y-auto pb-4">
            
            {/* RED SIDE (AKA) CARD */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col justify-between items-center text-center lg:col-span-2 shadow-sm">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-red-600 text-white rounded-md text-[10px] font-extrabold uppercase tracking-widest">AKA (Red)</span>
                <h3 className="text-xl font-extrabold text-red-600 dark:text-red-400">
                  {participants.find(p => p.id === activeBout.participant_a_id)?.full_name}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {clubs.find(c => c.id === participants.find(p => p.id === activeBout.participant_a_id)?.club_id)?.name || 'Independent'}
                </span>
              </div>

              {/* Huge Score Counter */}
              <div className="my-8">
                <span className="text-8xl font-black font-mono text-red-600 dark:text-red-500 block">{scoreA}</span>
              </div>

              {/* Points Controller */}
              <div className="space-y-4 w-full">
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => handleScoreChange('A', 1)}
                    className="flex-1 max-w-[80px] py-3 bg-red-500 text-white rounded-xl text-xs font-black shadow-xs hover:bg-red-600 active:scale-95 transition cursor-pointer"
                  >
                    +1 YUKO
                  </button>
                  <button 
                    onClick={() => handleScoreChange('A', 2)}
                    className="flex-1 max-w-[80px] py-3 bg-red-500 text-white rounded-xl text-xs font-black shadow-xs hover:bg-red-600 active:scale-95 transition cursor-pointer"
                  >
                    +2 WAZA
                  </button>
                  <button 
                    onClick={() => handleScoreChange('A', 3)}
                    className="flex-1 max-w-[80px] py-3 bg-red-500 text-white rounded-xl text-xs font-black shadow-xs hover:bg-red-600 active:scale-95 transition cursor-pointer"
                  >
                    +3 IPPON
                  </button>
                </div>
                <button
                  onClick={() => handleScoreChange('A', -1)}
                  disabled={scoreA === 0}
                  className="px-4 py-2 border border-red-500/20 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500/10 active:scale-95 transition cursor-pointer disabled:opacity-40"
                >
                  Undo point (-1)
                </button>
              </div>

              {/* Karate Penalties Tracker */}
              <div className="w-full border-t border-red-500/10 pt-4 mt-4 space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">Penalties / Warns</h4>
                
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Senshi (First Advantage)</span>
                  <input
                    type="checkbox"
                    checked={penaltiesA.senshi}
                    onChange={() => handlePenaltyChange('A', 'senshi')}
                    className="rounded text-red-600 border-red-500/30 focus:ring-red-500"
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">Category 1 (Out of bounds/Contact)</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handlePenaltyChange('A', 'c1', penaltiesA.c1 === pt ? pt - 1 : pt)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black border transition ${
                          penaltiesA.c1 >= pt 
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-transparent text-muted-foreground border-red-500/20 hover:border-red-500/40'
                        }`}
                      >
                        {pt === 1 ? 'C' : pt === 2 ? 'K' : pt === 3 ? 'HC' : 'H'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">Category 2 (Feigning/Grip)</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handlePenaltyChange('A', 'c2', penaltiesA.c2 === pt ? pt - 1 : pt)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black border transition ${
                          penaltiesA.c2 >= pt 
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-transparent text-muted-foreground border-red-500/20 hover:border-red-500/40'
                        }`}
                      >
                        {pt === 1 ? 'C' : pt === 2 ? 'K' : pt === 3 ? 'HC' : 'H'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* TIMER & TIMER CONTROLLERS */}
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between items-center lg:col-span-1 min-h-[300px] shadow-xs">
              
              <div className="text-center space-y-1">
                <Timer className="h-6 w-6 text-primary mx-auto animate-bounce" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Match Timer</span>
              </div>

              {/* Huge Timer Number */}
              <div className="my-6 text-center">
                <span className={`text-6xl font-black font-mono tracking-tight block ${timeLeft <= 10 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                  {formatTime(timeLeft)}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase mt-1">Tatami: {activeBout.tatami}</span>
              </div>

              {/* Timer Buttons */}
              <div className="space-y-4 w-full">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimerActive(!timerActive)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      timerActive 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {timerActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    <span>{timerActive ? 'Pause' : 'Start'}</span>
                  </button>

                  <button
                    onClick={() => { setTimerActive(false); setTimeLeft(180); }}
                    className="p-2.5 bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition cursor-pointer"
                    title="Reset to 3m"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-1">
                  <button 
                    onClick={() => setTimeLeft(prev => Math.max(0, prev - 10))}
                    className="flex-1 py-1 bg-secondary text-foreground hover:bg-secondary/80 rounded-md text-[10px] font-bold cursor-pointer"
                  >
                    -10s
                  </button>
                  <button 
                    onClick={() => setTimeLeft(prev => prev + 10)}
                    className="flex-1 py-1 bg-secondary text-foreground hover:bg-secondary/80 rounded-md text-[10px] font-bold cursor-pointer"
                  >
                    +10s
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="w-full border-t border-border pt-4 mt-4 space-y-2">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center mb-2">Outcome actions</h4>
                
                <button
                  onClick={() => handleDeclareWinner(activeBout.participant_a_id)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  Force Aka Winner
                </button>
                <button
                  onClick={() => handleDeclareWinner(activeBout.participant_b_id)}
                  className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  Force Ao Winner
                </button>
              </div>

            </div>

            {/* BLUE SIDE (AO) CARD */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 flex flex-col justify-between items-center text-center lg:col-span-2 shadow-sm">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 bg-blue-600 text-white rounded-md text-[10px] font-extrabold uppercase tracking-widest">AO (Blue)</span>
                <h3 className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                  {participants.find(p => p.id === activeBout.participant_b_id)?.full_name}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {clubs.find(c => c.id === participants.find(p => p.id === activeBout.participant_b_id)?.club_id)?.name || 'Independent'}
                </span>
              </div>

              {/* Huge Score Counter */}
              <div className="my-8">
                <span className="text-8xl font-black font-mono text-blue-600 dark:text-blue-500 block">{scoreB}</span>
              </div>

              {/* Points Controller */}
              <div className="space-y-4 w-full">
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => handleScoreChange('B', 1)}
                    className="flex-1 max-w-[80px] py-3 bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs hover:bg-blue-600 active:scale-95 transition cursor-pointer"
                  >
                    +1 YUKO
                  </button>
                  <button 
                    onClick={() => handleScoreChange('B', 2)}
                    className="flex-1 max-w-[80px] py-3 bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs hover:bg-blue-600 active:scale-95 transition cursor-pointer"
                  >
                    +2 WAZA
                  </button>
                  <button 
                    onClick={() => handleScoreChange('B', 3)}
                    className="flex-1 max-w-[80px] py-3 bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs hover:bg-blue-600 active:scale-95 transition cursor-pointer"
                  >
                    +3 IPPON
                  </button>
                </div>
                <button
                  onClick={() => handleScoreChange('B', -1)}
                  disabled={scoreB === 0}
                  className="px-4 py-2 border border-blue-500/20 text-blue-500 text-xs font-bold rounded-lg hover:bg-blue-500/10 active:scale-95 transition cursor-pointer disabled:opacity-40"
                >
                  Undo point (-1)
                </button>
              </div>

              {/* Karate Penalties Tracker */}
              <div className="w-full border-t border-blue-500/10 pt-4 mt-4 space-y-3">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">Penalties / Warns</h4>
                
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Senshi (First Advantage)</span>
                  <input
                    type="checkbox"
                    checked={penaltiesB.senshi}
                    onChange={() => handlePenaltyChange('B', 'senshi')}
                    className="rounded text-blue-600 border-blue-500/30 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">Category 1 (Out of bounds/Contact)</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handlePenaltyChange('B', 'c1', penaltiesB.c1 === pt ? pt - 1 : pt)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black border transition ${
                          penaltiesB.c1 >= pt 
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-transparent text-muted-foreground border-blue-500/20 hover:border-blue-500/40'
                        }`}
                      >
                        {pt === 1 ? 'C' : pt === 2 ? 'K' : pt === 3 ? 'HC' : 'H'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">Category 2 (Feigning/Grip)</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => handlePenaltyChange('B', 'c2', penaltiesB.c2 === pt ? pt - 1 : pt)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black border transition ${
                          penaltiesB.c2 >= pt 
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-transparent text-muted-foreground border-blue-500/20 hover:border-blue-500/40'
                        }`}
                      >
                        {pt === 1 ? 'C' : pt === 2 ? 'K' : pt === 3 ? 'HC' : 'H'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Confirmation Area */}
          <div className="border-t border-border pt-4 mt-auto flex items-center justify-between shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span>Double check score cards before resolving the official match outcome.</span>
            </span>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const winnerId = scoreA >= scoreB ? activeBout.participant_a_id : activeBout.participant_b_id;
                  handleDeclareWinner(winnerId);
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>End Bout & Submit Score ({scoreA >= scoreB ? 'Aka' : 'Ao'} Wins)</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

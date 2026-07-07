'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db, supabase } from '@/db/dbClient';
import { Category, Bout, Participant } from '@/db/types';
import { Play, Square, RotateCcw, ChevronDown, Maximize2, Minimize2, Zap } from 'lucide-react';

/* ─── Penalty types ──────────────────────────────────────────── */
type PenaltyType = 'C' | 'K' | 'HC' | 'H';
interface Penalties { C: number; K: number; HC: number; H: number; }
const emptyPenalties = (): Penalties => ({ C: 0, K: 0, HC: 0, H: 0 });

/* Penalty gives opponent points: K→+1, HC→+2, H→Disqualified */
const penaltyPts: Record<PenaltyType, number> = { C: 0, K: 1, HC: 2, H: 0 };
const MATCH_DURATION_SECS = 120; // 2 minutes default

export default function ScoringPage() {
  const { tournamentName, logoUrl } = useTournament();

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
  const [penAo, setPenAo] = useState<Penalties>(emptyPenalties());
  const [penAka, setPenAka] = useState<Penalties>(emptyPenalties());
  const [senshuAo, setSenshuAo] = useState(false);
  const [senshuAka, setSenshuAka] = useState(false);

  /* ── Timer ── */
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION_SECS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [matchDuration, setMatchDuration] = useState(MATCH_DURATION_SECS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── UI ── */
  const [fullscreen, setFullscreen] = useState(false);
  const [winner, setWinner] = useState<'ao' | 'aka' | null>(null);
  const [winMethod, setWinMethod] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* Load data */
  useEffect(() => {
    if (!mounted) return;
    Promise.all([db.categories.list(), db.bouts.list(), db.participants.list()])
      .then(([cats, bts, parts]) => {
        setCategories(cats);
        setBouts(bts);
        setParticipants(parts);
        // Auto-select first category with bouts
        const firstCat = cats.find(c => bts.some(b => b.category_id === c.id));
        if (firstCat) {
          setSelectedCatId(firstCat.id);
          const firstBout = bts.find(b => b.category_id === firstCat.id);
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
      setPenAo(emptyPenalties());
      setPenAka(emptyPenalties());
      setSenshuAo(false);
      setSenshuAka(false);
      setWinner(null);
      setWinMethod('');
      resetTimer();
    }
  }, [selectedBoutId]);

  /* ── Timer control ── */
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimeLeft(matchDuration);
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
    if (side === 'ao') {
      const newScore = Math.max(0, scoreAo + pts);
      setScoreAo(newScore);
      if (!senshuAo && newScore > 0 && scoreAka === 0) setSenshuAo(true);
    } else {
      const newScore = Math.max(0, scoreAka + pts);
      setScoreAka(newScore);
      if (!senshuAka && newScore > 0 && scoreAo === 0) setSenshuAka(true);
    }
  };

  const addPenalty = (side: Side, type: PenaltyType) => {
    if (winner) return;
    if (side === 'ao') {
      const newPen = { ...penAo, [type]: penAo[type] + 1 };
      setPenAo(newPen);
      if (type === 'H') { declareWinner('aka', 'Hansoku (Disqualification)'); return; }
      const pts = penaltyPts[type];
      if (pts > 0) setScoreAka(s => s + pts);
    } else {
      const newPen = { ...penAka, [type]: penAka[type] + 1 };
      setPenAka(newPen);
      if (type === 'H') { declareWinner('ao', 'Hansoku (Disqualification)'); return; }
      const pts = penaltyPts[type];
      if (pts > 0) setScoreAo(s => s + pts);
    }
  };

  const undoScore = (side: Side, pts: number) => {
    if (side === 'ao') setScoreAo(s => Math.max(0, s - pts));
    else setScoreAka(s => Math.max(0, s - pts));
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
      await db.bouts.updateBoutResult(selectedBoutId, winnerId, scoreAo, scoreAka);
      // Refresh bouts
      const updated = await db.bouts.list();
      setBouts(updated);
    } catch (e: any) {
      alert('Save error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

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

  /* Penalty columns displayed: Chukoku(C)=1, Keikoku(K)=2, Hansoku Chui(HC), Hansoku(H) */
  const PEN_COLS: { key: PenaltyType; label: string }[] = [
    { key: 'C', label: '1' },
    { key: 'K', label: '2' },
    { key: 'HC', label: '3' },
    { key: 'HC', label: 'HC' },
    { key: 'H', label: 'H' },
  ];

  const PenDot = ({ filled }: { filled: boolean }) => (
    <div className={`w-3.5 h-3.5 rounded-full border ${filled ? 'bg-yellow-400 border-yellow-300' : 'border-white/30 bg-transparent'}`} />
  );

  const PenaltyRow = ({
    side, penalties, color
  }: {
    side: Side; penalties: Penalties; color: 'aka' | 'ao'
  }) => {
    const accentColor = color === 'aka' ? 'text-red-400' : 'text-[#00d4ff]';
    return (
      <div className="flex items-center h-10 px-6 gap-0" style={{ background: color === 'aka' ? '#1a0505' : '#050f1a' }}>
        <button
          onClick={() => { if (!winner) { /* toggle warning */ } }}
          className={`text-sm font-black uppercase tracking-widest mr-8 cursor-pointer ${accentColor}`}
          style={{ letterSpacing: '0.15em' }}
        >
          WARNING
        </button>
        {/* Penalty columns: 1 2 3 HC H */}
        {(['C', 'K', 'HC', 'HC', 'H'] as PenaltyType[]).map((key, i) => {
          const label = ['1', '2', '3', 'HC', 'H'][i];
          const val = penalties[key];
          const filled = val > i || (key === 'HC' && i === 3 && val >= 1) || (key === 'H' && val >= 1);
          return (
            <button
              key={`${key}-${i}`}
              onClick={() => addPenalty(side, key)}
              disabled={!!winner}
              className="flex flex-col items-center justify-center w-16 h-full border-l border-white/10 cursor-pointer hover:bg-white/5 disabled:cursor-default transition"
              title={`${side.toUpperCase()} Penalty: ${label}`}
            >
              <span className="text-[10px] text-white/30 font-bold mb-0.5">{label}</span>
              <PenDot filled={val > 0 && (
                (label === '1' && val >= 1) ||
                (label === '2' && val >= 2) ||
                (label === '3' && val >= 3) ||
                (label === 'HC' && key === 'HC' && val >= 1) ||
                (label === 'H' && val >= 1)
              )} />
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
        <div className="flex-1 flex flex-col" style={{ background: 'linear-gradient(180deg, #1a0000 0%, #0d0000 100%)' }}>
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
                <span className="mt-1 inline-block bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse w-fit">
                  先取 SENSHU
                </span>
              )}
            </div>

            {/* AKA Score */}
            <div className="flex flex-col items-end gap-3">
              <span
                className="font-black tabular-nums leading-none"
                style={{ fontSize: 'clamp(5rem, 14vw, 11rem)', color: '#ff1a1a', textShadow: '0 0 60px rgba(255,0,0,0.5)' }}
              >
                {scoreAka}
              </span>
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
          <PenaltyRow side="aka" penalties={penAka} color="aka" />
        </div>

        {/* ── DIVIDER LINE ── */}
        <div className="h-px bg-white/10 shrink-0" />

        {/* ── AO SIDE (BOTTOM / BLUE) ── */}
        <div className="flex-1 flex flex-col" style={{ background: 'linear-gradient(180deg, #00001a 0%, #000d1a 100%)' }}>
          {/* AO Penalty row (at top of AO section) */}
          <PenaltyRow side="ao" penalties={penAo} color="ao" />

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
                <span className="mt-1 inline-block bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse w-fit">
                  先取 SENSHU
                </span>
              )}
            </div>

            {/* AO Score */}
            <div className="flex flex-col items-end gap-3">
              <span
                className="font-black tabular-nums leading-none"
                style={{ fontSize: 'clamp(5rem, 14vw, 11rem)', color: '#00d4ff', textShadow: '0 0 60px rgba(0,200,255,0.5)' }}
              >
                {scoreAo}
              </span>
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
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 shrink-0 bg-white/5">
                <img
                  src={logoUrl}
                  alt="KARATE TECH"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {/* Brand text */}
              <div className="flex flex-col">
                <span className="font-black text-white leading-none" style={{ fontSize: '1.05rem', letterSpacing: '0.12em' }}>KARATE</span>
                <span className="font-black leading-none" style={{ fontSize: '1.05rem', letterSpacing: '0.12em', color: '#f59e0b' }}>TECH</span>
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
    </div>
  );
}

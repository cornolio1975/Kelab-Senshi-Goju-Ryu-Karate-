'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Participant, Category, Bout, Club } from '@/db/types';
import { 
  GitPullRequest, Check, Trophy, Trash2, Edit2, Play, 
  ChevronRight, ArrowRight, Award, Plus, Sparkles, RefreshCw, X, Printer
} from 'lucide-react';
import { SportdataBracket } from '@/components/SportdataBracket';


export default function DrawsPage() {
  const { searchQuery, triggerRefresh, canModify, tournamentName } = useTournament();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [participantCategories, setParticipantCategories] = useState<{participant_id: string; category_id: string}[]>([]);

  // Navigation / Selection states
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'CONFIRMED'>('ALL');
  
  // Generation Form configurations
  const [drawType, setDrawType] = useState<'Elimination' | 'Round-robin'>('Elimination');
  const [hasThirdPlace, setHasThirdPlace] = useState<boolean>(true);
  // Track whether the CURRENTLY DISPLAYED draw is round-robin or elimination
  const [isRoundRobinDraw, setIsRoundRobinDraw] = useState<boolean>(false);

  // Result dialog state
  const [selectedBoutToResolve, setSelectedBoutToResolve] = useState<Bout | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [chosenWinnerId, setChosenWinnerId] = useState<string>('');

  // Print state
  const [printMode, setPrintMode] = useState<'current' | 'all'>('all');
  const [printTarget, setPrintTarget] = useState<'current' | 'all'>('all');
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isPrinting) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isPrinting]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catList, pList, clList, bList, pcList] = await Promise.all([
        db.categories.list(),
        db.participants.list(),
        db.clubs.list(),
        db.bouts.list(),
        db.participantCategories.list()
      ]);
      setCategories(catList);
      setParticipants(pList);
      setClubs(clList);
      setBouts(bList);
      setParticipantCategories(pcList);
      
      // Auto select first category if none selected
      if (catList.length > 0 && !selectedCatId) {
        setSelectedCatId(catList[0].id);
      }
    } catch (e) {
      console.error('Error loading draws data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted]);

  // Sync isRoundRobinDraw when changing category (detect from existing bouts)
  useEffect(() => {
    const catBouts = bouts.filter(b => b.category_id === selectedCatId);
    if (catBouts.length > 0) {
      // Round-robin: all bouts in round 1, more than 1 bout usually
      const allRound1 = catBouts.every(b => b.round_no === 1);
      const hasMultiRound = catBouts.some(b => b.round_no > 1);
      setIsRoundRobinDraw(allRound1 && !hasMultiRound && catBouts.length > 1);
    } else {
      setIsRoundRobinDraw(false);
    }
  }, [selectedCatId, bouts]);

  if (!mounted) return null;

  const currentCategory = categories.find(c => c.id === selectedCatId);
  const categoryBouts = bouts.filter(b => b.category_id === selectedCatId);

  // Category counts info
  const getCategoryCountInfo = (catId: string) => {
    const matchedParts = participantCategories
      .filter(m => m.category_id === catId)
      .map(m => m.participant_id);
    const activeInCat = participants.filter(p => matchedParts.includes(p.id));
    const total = activeInCat.length;
    const confirmed = activeInCat.filter(p => p.status === 'Confirmed' || p.status === 'Checked In').length;
    return { confirmed, total };
  };

  // Generate Draws Trigger
  const handleGenerateDraw = async () => {
    if (!selectedCatId) return;
    try {
      setLoading(true);
      await db.bouts.generateDraw(selectedCatId, drawType, hasThirdPlace);
      // Reload lists
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
      setIsRoundRobinDraw(drawType === 'Round-robin');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Print handlers ---
  const handlePrint = () => {
    setPrintTarget('all');
    setIsPrinting(true);
  };

  const handlePrintCurrent = () => {
    setPrintTarget('current');
    setIsPrinting(true);
  };

  // Helper: group bouts by rounds for a given category's bouts
  const getBoutsByRoundsForCat = (catBouts: Bout[]) => {
    const rounds: { [key: number]: Bout[] } = {};
    catBouts.forEach(b => {
      if (b.round_no === 99) return;
      if (!rounds[b.round_no]) rounds[b.round_no] = [];
      rounds[b.round_no].push(b);
    });
    Object.keys(rounds).forEach(r => rounds[Number(r)].sort((a, b) => a.bout_no - b.bout_no));
    return rounds;
  };

  // Helper: detect round-robin for a category
  const isRoundRobinForCat = (catBouts: Bout[]) => {
    if (catBouts.length === 0) return false;
    const allRound1 = catBouts.every(b => b.round_no === 1);
    const hasMultiRound = catBouts.some(b => b.round_no > 1);
    return allRound1 && !hasMultiRound && catBouts.length > 1;
  };

  // Render a print competitor row
  const renderPrintCompetitor = (partId: string | null, score: number, isWinner: boolean, dotClass: string) => {
    const comp = partId ? participants.find(p => p.id === partId) : null;
    const club = comp ? clubs.find(c => c.id === comp.club_id) : null;
    return (
      <div className="print-competitor">
        <span className={`print-dot ${dotClass}`} />
        <span className={`print-comp-name${isWinner ? ' winner' : ''}`}>
          {comp ? comp.full_name : 'TBD'}
          {club ? ` (${club.name})` : ''}
        </span>
        <span className="print-comp-score">{partId ? score : '-'}</span>
      </div>
    );
  };

  // Clear Draws Trigger
  const handleClearDraw = async () => {
    if (!selectedCatId) return;
    try {
      setLoading(true);
      await db.bouts.clearDraw(selectedCatId);
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open resolution dialog
  const openResolveDialog = (bout: Bout) => {
    if (!bout.participant_a_id || !bout.participant_b_id) return; // cannot resolve BYE or empty match slots
    setSelectedBoutToResolve(bout);
    setScoreA(bout.score_a);
    setScoreB(bout.score_b);
    setChosenWinnerId(bout.winner_id || bout.participant_a_id);
  };

  // Submit resolved bout
  const handleResolveBout = async () => {
    if (!selectedBoutToResolve) return;
    try {
      setLoading(true);
      await db.bouts.updateBoutResult(
        selectedBoutToResolve.id,
        chosenWinnerId,
        scoreA,
        scoreB
      );
      // Reload bouts list
      const updatedBouts = await db.bouts.list();
      setBouts(updatedBouts);
      setSelectedBoutToResolve(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Grouping bouts into rounds for visual Knockout Bracket render
  const getBoutsByRounds = () => {
    const rounds: { [key: number]: Bout[] } = {};
    categoryBouts.forEach(b => {
      if (b.round_no === 99) return; // skip 3rd place for rounds calculation
      if (!rounds[b.round_no]) {
        rounds[b.round_no] = [];
      }
      rounds[b.round_no].push(b);
    });
    // Sort round lists by bout no
    Object.keys(rounds).forEach(r => {
      rounds[Number(r)].sort((a, b) => a.bout_no - b.bout_no);
    });
    return rounds;
  };

  const roundsData = getBoutsByRounds();
  const thirdPlaceMatch = categoryBouts.find(b => b.round_no === 99);

  // Helper renderer: Competitor detail
  const renderCompetitorRow = (participantId: string | null, score: number, isWinner: boolean, tagColor: string) => {
    if (!participantId) {
      return (
        <div className="flex items-center justify-between p-2 text-xs text-muted-foreground italic bg-secondary/10">
          <span>TBD / Empty Slot</span>
          <span>-</span>
        </div>
      );
    }

    const competitor = participants.find(p => p.id === participantId);
    const club = clubs.find(c => c.id === competitor?.club_id);

    return (
      <div className={`flex items-center justify-between p-2 text-xs transition-colors ${
        isWinner ? 'bg-primary/10 text-foreground font-bold' : 'text-muted-foreground'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-1.5 h-6 rounded-full shrink-0 ${tagColor}`} />
          <div className="truncate">
            <span className="block truncate">{competitor?.full_name || 'Competitor'}</span>
            <span className="text-[9px] block truncate text-muted-foreground font-normal">{club?.name || 'Independent'}</span>
          </div>
        </div>
        <span className="font-mono font-bold text-sm px-1">{score}</span>
      </div>
    );
  };

  return (
    <>
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden text-foreground bg-background no-print">
      
      {/* ======================================================== */}
      {/* LEFT COLUMN: CATEGORY NAVIGATION PANEL                   */}
      {/* ======================================================== */}
      <div className="w-72 bg-card border-r border-border h-full flex flex-col shrink-0">
        
        {/* Categories Tab selectors */}
        <div className="flex border-b border-border text-xs font-semibold shrink-0 bg-secondary/10">
          <button
            onClick={() => { setActiveCategoryTab('ALL'); setSelectedCatId(categories[0]?.id || null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
              activeCategoryTab === 'ALL'
                ? 'border-primary text-foreground bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => { setActiveCategoryTab('CONFIRMED'); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
              activeCategoryTab === 'CONFIRMED'
                ? 'border-primary text-foreground bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Check className="h-4 w-4" />
            <span>CONFIRMED</span>
          </button>
        </div>

        {/* Controller Dropdown display */}
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Controller</label>
            <select className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none">
              <option>Draw Manager</option>
              <option>Tournament Director</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold text-muted-foreground uppercase bg-secondary/30 p-2.5 rounded-lg border border-border">
            <div>
              <span className="block text-xs font-extrabold text-foreground">{categories.length}</span>
              <span>Categories</span>
            </div>
            <div>
              <span className="block text-xs font-extrabold text-foreground">
                {categories.filter(c => getCategoryCountInfo(c.id).total === 0).length}
              </span>
              <span>Empty Categories</span>
            </div>
          </div>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-secondary/5">
          {categories.map(c => {
            const { confirmed, total } = getCategoryCountInfo(c.id);
            const isSelected = selectedCatId === c.id;

            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCatId(c.id);
                }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-between border cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span className="truncate pr-2 font-semibold">{c.name}</span>
                <span className="text-[10px] shrink-0 font-bold bg-secondary/15 px-1.5 py-0.5 rounded-md">
                  ({confirmed}/{total})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: DRAW CONFIG & MATCH MATCHUPS PANEL         */}
      {/* ======================================================== */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-background overflow-hidden p-6 space-y-4">
        
        {/* Title Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Generate Draws</h2>
            <p className="text-xs text-muted-foreground">Configure knockout brackets or round-robin tables for categories.</p>
          </div>
          {/* Print button — always visible when any category has bouts */}
          {bouts.length > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer no-print"
              title="Print all categories draw sheets"
            >
              <Printer className="h-4 w-4" />
              <span>Print All Categories</span>
            </button>
          )}
        </div>

        {currentCategory ? (
          <>
            {/* Draw Parameters configuration card (KumiteTechnology style) */}
            <div className="bg-card border border-border p-5 rounded-xl shadow-xs shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider">
                  Active Bracket: <span className="text-primary normal-case">{currentCategory.name}</span>
                </h3>
                
                {/* Radio selection draws */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="drawType"
                      checked={drawType === 'Elimination'}
                      onChange={() => setDrawType('Elimination')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Single Elimination Bracket</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="drawType"
                      checked={drawType === 'Round-robin'}
                      onChange={() => setDrawType('Round-robin')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Round-robin Grid</span>
                  </label>
                </div>

                {/* Draw options checkboxes */}
                {drawType === 'Elimination' && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasThirdPlace}
                      onChange={(e) => setHasThirdPlace(e.target.checked)}
                      className="rounded text-primary border-border focus:ring-primary"
                    />
                    <span>Has bout for third place (Bronze medal match)</span>
                  </label>
                )}
              </div>

              {/* Draw generation + print buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {canModify && categoryBouts.length > 0 && (
                  <button
                    onClick={handleClearDraw}
                    disabled={loading}
                    className="px-4 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear Draw</span>
                  </button>
                )}
                {canModify && (
                  <button
                    onClick={handleGenerateDraw}
                    disabled={loading}
                    className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="h-4.5 w-4.5 text-white" />
                    <span>{categoryBouts.length > 0 ? 'Regenerate Draw' : 'Generate Draw Sheet'}</span>
                  </button>
                )}
                {categoryBouts.length > 0 && (
                  <button
                    onClick={handlePrintCurrent}
                    disabled={loading}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 no-print"
                    title="Print this bracket"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Bracket</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bracket / Matching Visualization Area */}
            <div className="flex-1 border border-border bg-card rounded-xl overflow-hidden flex flex-col min-h-0">
              
              {categoryBouts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                    <GitPullRequest className="h-6 w-6" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="font-bold text-sm">No Draws Generated</h4>
                    <p className="text-xs text-muted-foreground">
                      Bouts for this category are empty. Populate and confirm participants in this category, then select bracket formats above and generate draws.
                    </p>
                  </div>
                </div>
              ) : isRoundRobinDraw ? (
                
                // ROUND ROBIN OR BOUT INDEX GRID
                <div className="flex-1 overflow-auto p-6 space-y-6">
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-secondary/40 font-bold border-b border-border">
                        <tr>
                          <th className="p-3 w-16 text-center">Bout No</th>
                          <th className="p-3">Aka (Red Side)</th>
                          <th className="p-3 w-16 text-center">Score</th>
                          <th className="p-3">Ao (Blue Side)</th>
                          <th className="p-3 w-28 text-center">Status</th>
                          <th className="p-3 w-32 text-center">Winner</th>
                          <th className="p-3 w-24 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {categoryBouts.map((b) => {
                          const competitorA = participants.find(p => p.id === b.participant_a_id);
                          const competitorB = participants.find(p => p.id === b.participant_b_id);
                          const winner = participants.find(p => p.id === b.winner_id);

                          return (
                            <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                              <td className="p-3 text-center font-mono font-semibold text-muted-foreground">{b.bout_no}</td>
                              <td className="p-3 font-semibold text-foreground">{competitorA?.full_name || 'TBD'}</td>
                              <td className="p-3 text-center font-mono font-bold text-sm bg-secondary/10">{b.score_a} - {b.score_b}</td>
                              <td className="p-3 font-semibold text-foreground">{competitorB?.full_name || 'TBD'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.status === 'Completed'
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold text-primary">{winner?.full_name || '-'}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => openResolveDialog(b)}
                                  disabled={!b.participant_a_id || !b.participant_b_id || !canModify}
                                  className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-bold rounded-md disabled:opacity-40 cursor-pointer"
                                >
                                  Resolve
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              ) : (
                <div className="flex-1 overflow-auto p-4 bg-gray-50/20 dark:bg-gray-950/20">
                  <SportdataBracket
                    bouts={bouts}
                    participants={participants}
                    clubs={clubs}
                    categories={categories}
                    selectedCatId={selectedCatId}
                    canModify={canModify}
                    onBoutClick={openResolveDialog}
                    theme="light"
                  />
                </div>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-xs font-semibold">
            Select a weight category on the left to review match grids or run draw generations.
          </div>
        )}

      </div>

      {/* BOUT RESULTS RESOLUTION DIALOG MODAL */}
      {selectedBoutToResolve && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border max-w-md w-full rounded-2xl shadow-xl overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="font-extrabold text-sm">Resolve Match Outcome</h3>
              </div>
              <button
                onClick={() => setSelectedBoutToResolve(null)}
                className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Aka (Red Side) */}
                <div className="space-y-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full mx-auto" />
                  <span className="block text-xs font-bold text-foreground truncate">
                    {participants.find(p => p.id === selectedBoutToResolve.participant_a_id)?.full_name}
                  </span>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block">Points Score</label>
                    <input
                      type="number"
                      min={0}
                      value={scoreA}
                      onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 mx-auto px-2 py-1 bg-secondary border border-border rounded text-center text-sm font-bold text-foreground"
                    />
                  </div>
                </div>

                {/* Ao (Blue Side) */}
                <div className="space-y-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mx-auto" />
                  <span className="block text-xs font-bold text-foreground truncate">
                    {participants.find(p => p.id === selectedBoutToResolve.participant_b_id)?.full_name}
                  </span>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block">Points Score</label>
                    <input
                      type="number"
                      min={0}
                      value={scoreB}
                      onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 mx-auto px-2 py-1 bg-secondary border border-border rounded text-center text-sm font-bold text-foreground"
                    />
                  </div>
                </div>

              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Decided Winner</label>
                <select
                  value={chosenWinnerId}
                  onChange={(e) => setChosenWinnerId(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={selectedBoutToResolve.participant_a_id || ''}>
                    Red Side: {participants.find(p => p.id === selectedBoutToResolve.participant_a_id)?.full_name}
                  </option>
                  <option value={selectedBoutToResolve.participant_b_id || ''}>
                    Blue Side: {participants.find(p => p.id === selectedBoutToResolve.participant_b_id)?.full_name}
                  </option>
                </select>
              </div>

            </div>

            <div className="p-5 border-t border-border bg-secondary/15 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setSelectedBoutToResolve(null)}
                className="px-4 py-2 border border-border bg-card hover:bg-secondary rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveBout}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold cursor-pointer"
              >
                Save Outcome
              </button>
            </div>

          </div>
        </div>
      )}

    </div>

    {/* ======================================================= */}
    {/* HIDDEN PRINT AREA — rendered for @media print only      */}
    {/* ======================================================= */}
    <div id="draw-print-area" className="hidden print:block">
      {/* Print Header */}
      <div className="print-header">
        <div>
          <h1>{tournamentName}</h1>
          <p>
            {printTarget === 'current' && currentCategory
              ? `Draw Sheet — ${currentCategory.name}`
              : 'Official Draw Sheets — All Categories'}
          </p>
        </div>
        <div className="print-meta">
          <div>Printed: {new Date().toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          <div style={{ fontWeight: 700 }}>CONFIDENTIAL — TOURNAMENT USE ONLY</div>
        </div>
      </div>

      {/* One page per category — filtered by printTarget */}
      {categories
        .filter(cat => printTarget === 'current' ? cat.id === selectedCatId : true)
        .map(cat => {
        const catBouts = bouts.filter(b => b.category_id === cat.id);
        if (catBouts.length === 0) return null;

        const isRR = isRoundRobinForCat(catBouts);
        const roundsMap = getBoutsByRoundsForCat(catBouts);
        const bronze = catBouts.find(b => b.round_no === 99);
        const totalAthletes = participantCategories.filter(m => m.category_id === cat.id).length;

        return (
          <div key={cat.id} className="print-category-block">
            <div className="print-category-title">{cat.name}</div>
            <div className="print-category-meta">
              {cat.gender} · {isRR ? 'Round-Robin' : 'Single Elimination'} · {totalAthletes} Athletes
              {bronze ? ' · Bronze Medal Match included' : ''}
            </div>

            {isRR ? (
              /* Round-Robin Table */
              <table className="print-rr-table">
                <thead>
                  <tr>
                    <th style={{ width: '40pt' }}>Bout</th>
                    <th>Aka (Red)</th>
                    <th style={{ width: '40pt', textAlign: 'center' }}>Score</th>
                    <th>Ao (Blue)</th>
                    <th style={{ width: '60pt', textAlign: 'center' }}>Status</th>
                    <th style={{ width: '80pt' }}>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {catBouts.sort((a, b) => a.bout_no - b.bout_no).map(bout => {
                    const compA = participants.find(p => p.id === bout.participant_a_id);
                    const compB = participants.find(p => p.id === bout.participant_b_id);
                    const winner = participants.find(p => p.id === bout.winner_id);
                    return (
                      <tr key={bout.id}>
                        <td style={{ fontFamily: 'monospace', textAlign: 'center' }}>{bout.bout_no}</td>
                        <td style={{ fontWeight: 600 }}>{compA?.full_name || 'TBD'}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, textAlign: 'center' }}>{bout.score_a} – {bout.score_b}</td>
                        <td style={{ fontWeight: 600 }}>{compB?.full_name || 'TBD'}</td>
                        <td style={{ textAlign: 'center' }}>{bout.status}</td>
                        <td style={{ fontWeight: 700 }}>{winner?.full_name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* Elimination Bracket */
              <div className="print-bracket-wrapper" style={{ width: '1120px', height: '600px', marginTop: '10px', position: 'relative' }}>
                <SportdataBracket
                  bouts={catBouts}
                  participants={participants}
                  clubs={clubs}
                  categories={categories}
                  selectedCatId={cat.id}
                  canModify={false}
                  theme="light"
                  height="520px"
                />
              </div>
            )}

            {/* Signature block */}
            <div className="print-signatures">
              <div className="print-sig-box"><div className="print-sig-line" /><div>Draw Officer Signature</div></div>
              <div className="print-sig-box"><div className="print-sig-line" /><div>Tournament Director</div></div>
              <div className="print-sig-box"><div className="print-sig-line" /><div>Verified By</div></div>
              <div className="print-sig-box"><div className="print-sig-line" /><div>Date &amp; Stamp</div></div>
            </div>
          </div>
        );
      })}
    </div>
    </>
  );
}

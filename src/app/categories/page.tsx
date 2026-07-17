'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Category, Participant, Club, Bout } from '@/db/types';
import { basePath } from '@/db/dbClient';
import { 
  Plus, Tags, Merge, Split, Move, X, Check, AlertCircle, RefreshCw, Trash2, Monitor, ChevronRight
} from 'lucide-react';

export default function CategoriesPage() {
  const { refreshKey, triggerRefresh, canModify } = useTournament();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);

  // Dialog states
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [consoleCat, setConsoleCat] = useState<Category | null>(null); // for bout-picker modal

  // Merge state
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [mergedName, setMergedName] = useState('');

  // Split state
  const [selectedSplitId, setSelectedSplitId] = useState('');
  const [split1, setSplit1] = useState({ name: '', min_age: 18, max_age: 99, min_weight: 0, max_weight: 65, gender: 'Male' as any });
  const [split2, setSplit2] = useState({ name: '', min_age: 18, max_age: 99, min_weight: 65.01, max_weight: 999, gender: 'Male' as any });

  // Move / Drag assignment state
  const [movePartId, setMovePartId] = useState('');
  const [moveTargetCatId, setMoveTargetCatId] = useState('');
  const [moveEligibilityAlert, setMoveEligibilityAlert] = useState<{
    eligible: boolean;
    reason: string;
  } | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCat, setNewCat] = useState({
    name: '',
    gender: 'Male' as any,
    min_age: 18,
    max_age: 99,
    min_weight: 0,
    max_weight: 100,
    capacity: 32,
    status: 'Open' as any
  });

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
      setMappings(pcList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData().then(() => {
        // Auto-open Match Console Hub if returning from control page after saving
        const consoleParam = searchParams.get('console');
        if (consoleParam) {
          // Categories are loaded, find the category and open modal
          // We use a small delay to let state settle
          setTimeout(() => {
            setCategories(prev => {
              const cat = prev.find(c => c.id === consoleParam);
              if (cat) setConsoleCat(cat);
              return prev;
            });
          }, 100);
        }
      });
    }
  }, [mounted, refreshKey]);

  // Handle move participant validation preview
  useEffect(() => {
    if (!movePartId || !moveTargetCatId) {
      setMoveEligibilityAlert(null);
      return;
    }

    const p = participants.find(part => part.id === movePartId);
    const c = categories.find(cat => cat.id === moveTargetCatId);
    
    if (p && c) {
      const getAge = (dobString: string) => {
        const dob = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age;
      };

      const age = getAge(p.dob);
      const ageOk = age >= c.min_age && age <= c.max_age;
      const weightOk = p.weight >= c.min_weight && p.weight <= c.max_weight;
      const genderOk = c.gender === 'Mixed' || c.gender === p.gender;

      if (ageOk && weightOk && genderOk) {
        setMoveEligibilityAlert({
          eligible: true,
          reason: `Eligible: Athlete matches rules (Age: ${age} yr, Weight: ${p.weight}kg, Gender: ${p.gender})`
        });
      } else {
        const mismatchList: string[] = [];
        if (!ageOk) mismatchList.push(`Age: ${age} yr (expected ${c.min_age}-${c.max_age})`);
        if (!weightOk) mismatchList.push(`Weight: ${p.weight}kg (expected ${c.min_weight}-${c.max_weight}kg)`);
        if (!genderOk) mismatchList.push(`Gender: ${p.gender} (expected ${c.gender})`);
        setMoveEligibilityAlert({
          eligible: false,
          reason: `Ineligible: ${mismatchList.join(', ')}. Manual override will override auto-rules.`
        });
      }
    }
  }, [movePartId, moveTargetCatId, participants, categories]);

  if (!mounted) return null;

  // Active Category Lists
  const activeCategories = categories.filter(c => c.status !== 'Closed');

  const getParticipantsForCategory = (catId: string) => {
    const pIds = mappings.filter(m => m.category_id === catId).map(m => m.participant_id);
    return participants.filter(p => pIds.includes(p.id));
  };

  const getCategoryBracketStatus = (catId: string) => {
    const catBouts = bouts.filter(b => b.category_id === catId);
    if (catBouts.length === 0) {
      return 'non-active';
    }
    const allCompleted = catBouts.every(b => b.status === 'Completed');
    if (allCompleted) {
      return 'completed';
    }
    const hasStarted = catBouts.some(b => b.status === 'Completed' || b.status === 'Running');
    if (hasStarted) {
      return 'active';
    }
    return 'non-active';
  };

  // Actions
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMergeIds.length < 2 || !mergedName) {
      alert('Select at least 2 categories and fill in the merged name.');
      return;
    }
    
    try {
      setLoading(true);
      await db.categories.merge(selectedMergeIds, mergedName);
      alert('Merged successfully.');
      setIsMergeOpen(false);
      setSelectedMergeIds([]);
      setMergedName('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSplitId || !split1.name || !split2.name) {
      alert('Please fill in both split category names.');
      return;
    }
    
    try {
      setLoading(true);
      await db.categories.split(selectedSplitId, split1, split2);
      alert('Split successfully redistribution complete.');
      setIsSplitOpen(false);
      setSelectedSplitId('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movePartId || !moveTargetCatId) return;

    try {
      setLoading(true);
      await db.participants.assignCategoryManually(movePartId, moveTargetCatId, 'Category Admin');
      alert('Participant reassigned successfully.');
      setIsMoveOpen(false);
      setMovePartId('');
      setMoveTargetCatId('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name) {
      alert('Please fill in the category name.');
      return;
    }
    
    try {
      setLoading(true);
      await db.categories.add(newCat);
      alert('Category added successfully.');
      setIsAddOpen(false);
      setNewCat({
        name: '',
        gender: 'Male' as any,
        min_age: 18,
        max_age: 99,
        min_weight: 0,
        max_weight: 100,
        capacity: 32,
        status: 'Open' as any
      });
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category? All related bouts and mapping logs will be deleted!')) {
      return;
    }
    try {
      setLoading(true);
      await db.categories.delete(catId);
      alert('Category deleted successfully.');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 text-foreground w-full h-full overflow-y-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category Management</h1>
          <p className="text-sm text-muted-foreground">Manage athlete weight brackets, trigger merges, splits, and custom overrides.</p>
        </div>
        {canModify && (
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span>Add Category</span>
            </button>
            <button
              onClick={() => setIsMergeOpen(true)}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Merge className="h-4 w-4 text-muted-foreground" />
              <span>Merge Categories</span>
            </button>
            <button
              onClick={() => setIsSplitOpen(true)}
              className="px-3.5 py-2 bg-card hover:bg-secondary border border-border text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Split className="h-4 w-4 text-muted-foreground" />
              <span>Split Brackets</span>
            </button>
            <button
              onClick={() => setIsMoveOpen(true)}
              className="px-3.5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Move className="h-4 w-4" />
              <span>Reassign Athlete</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          <span className="text-xs">Syncing categories telemetry...</span>
        </div>
      ) : (
        /* Visual Category Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCategories.map((cat) => {
            const list = getParticipantsForCategory(cat.id);
            const count = list.length;
            const cap = cat.capacity || 32;
            const ratio = (count / cap) * 100;

            const status = getCategoryBracketStatus(cat.id);
            let cardClass = '';
            if (status === 'completed') {
              cardClass = 'bg-emerald-50/70 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/35 hover:border-emerald-400/50';
            } else if (status === 'active') {
              cardClass = 'bg-orange-50/70 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/35 hover:border-orange-400/50';
            } else {
              cardClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350';
            }

            return (
              <div key={cat.id} className={`rounded-xl p-5 border shadow-sm flex flex-col justify-between transition-all duration-200 ${cardClass}`}>
                {/* Category metadata */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        cat.gender === 'Male' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' 
                          : cat.gender === 'Female' 
                            ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' 
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {cat.gender}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 dark:bg-secondary/20 px-1.5 py-0.5 rounded border border-border/30">
                        {cat.min_weight}-{cat.max_weight}kg
                      </span>
                      {status === 'completed' && (
                        <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                      {status === 'active' && (
                        <span className="text-[9px] font-bold bg-orange-500/20 text-orange-700 dark:text-orange-450 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          Active
                        </span>
                      )}
                    </div>
                    {canModify && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 hover:bg-secondary text-muted-foreground hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Delete Category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-foreground truncate" title={cat.name}>
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Age limits: {cat.min_age} - {cat.max_age} years old
                  </span>
                </div>

                {/* Progress capacity bar */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold">Registered: {count} / {cap}</span>
                    <span className="text-muted-foreground">{Math.round(ratio)}% filled</span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        ratio >= 90 ? 'bg-red-500' : ratio >= 60 ? 'bg-amber-500' : 'bg-primary'
                      }`} 
                      style={{ width: `${Math.min(100, ratio)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quick list of participant initials */}
                {count > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1 border-t border-border/40 pt-3">
                    {list.slice(0, 5).map(p => (
                      <div 
                        key={p.id} 
                        className="text-[9px] font-bold bg-secondary px-2 py-0.5 rounded-full text-foreground border border-border"
                        title={p.full_name}
                      >
                        {p.full_name.substring(0, 8)}..
                      </div>
                    ))}
                    {count > 5 && (
                      <span className="text-[9px] text-muted-foreground font-semibold px-1 py-0.5">
                        +{count - 5} more
                      </span>
                    )}
                  </div>
                )}



                {/* Match Console Hub button — opens bout picker modal */}
                {bouts.some(b => b.category_id === cat.id) && (
                  <button
                    onClick={() => setConsoleCat(cat)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer border bg-slate-800/10 hover:bg-slate-800/20 dark:bg-white/5 dark:hover:bg-white/10 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span>Match Console Hub</span>
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- DIALOG MODALS --- */}

      {/* MATCH CONSOLE — Bout Picker Modal */}
      {consoleCat && (() => {
        const catBouts = bouts
          .filter(b => b.category_id === consoleCat.id && b.round_no !== 99)
          .sort((a, b) => a.round_no !== b.round_no ? a.round_no - b.round_no : a.bout_no - b.bout_no);

        const getRoundLabel = (roundNo: number) => {
          const roundBouts = catBouts.filter(b => b.round_no === roundNo);
          if (roundBouts.length === 1) return 'Final';
          if (roundBouts.length === 2) return 'Semi-Final';
          return `Round ${roundNo}`;
        };

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30 p-4">
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-foreground">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-border bg-secondary/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">Match Console Hub</span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[280px] block" title={consoleCat.name}>
                      {consoleCat.name} — Select a bout to open the control console
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setConsoleCat(null)}
                  className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Bout List */}
              <div className="p-4 space-y-1.5 max-h-[55vh] overflow-y-auto">
                {catBouts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No bouts found for this category.
                  </div>
                ) : (
                  catBouts.map(bout => {
                    const compA = participants.find(p => p.id === bout.participant_a_id);
                    const compB = participants.find(p => p.id === bout.participant_b_id);
                    const roundLabel = getRoundLabel(bout.round_no);
                    const isCompleted = bout.status === 'Completed';
                    const isRunning = bout.status === 'Running';

                    return (
                      <button
                        key={bout.id}
                        onClick={() => {
                          setConsoleCat(null);
                          router.push(`${basePath}/dashboard/control?boutId=${bout.id}&catId=${consoleCat.id}`);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer text-left group ${
                          isRunning
                            ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40 hover:border-orange-400/60'
                            : isCompleted
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-800/30 hover:border-emerald-400/50'
                            : 'bg-secondary/40 border-border hover:bg-secondary hover:border-border/80'
                        }`}
                      >
                        {/* Round + Bout badge */}
                        <div className="flex flex-col items-center min-w-[48px] gap-0.5">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${
                            isRunning ? 'text-orange-600 dark:text-orange-400' :
                            isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                            'text-muted-foreground'
                          }`}>
                            {roundLabel}
                          </span>
                          <span className="text-[11px] font-bold text-foreground">B{bout.bout_no}</span>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-8 bg-border/60" />

                        {/* Fighters */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-red-500 uppercase">AKA</span>
                            <span className="text-xs font-semibold text-foreground truncate">
                              {compA?.full_name || 'TBD'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-black text-blue-500 uppercase">AO</span>
                            <span className="text-xs font-semibold text-foreground truncate">
                              {compB?.full_name || 'TBD'}
                            </span>
                          </div>
                        </div>

                        {/* Status chip */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isRunning
                              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400 animate-pulse'
                              : isCompleted
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-secondary text-muted-foreground'
                          }`}>
                            {isRunning ? 'Live' : isCompleted ? 'Done' : 'Ready'}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border bg-secondary/5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{catBouts.length} bout{catBouts.length !== 1 ? 's' : ''} in this category</span>
                <button
                  onClick={() => setConsoleCat(null)}
                  className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* A. MERGE DIALOG */}
      {isMergeOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleMergeSubmit} className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Merge Event Brackets</span>
              <button type="button" onClick={() => { setIsMergeOpen(false); setSelectedMergeIds([]); }} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Combine under-populated weight groups. Checkboxes below select the categories to combine. The system redistributes mappings automatically.
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {activeCategories.map(c => (
                  <label key={c.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/40 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedMergeIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedMergeIds([...selectedMergeIds, c.id]);
                        else setSelectedMergeIds(selectedMergeIds.filter(id => id !== c.id));
                      }}
                      className="rounded border-border text-primary"
                    />
                    <div>
                      <span className="font-bold block">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground block">
                        Active count: {getParticipantsForCategory(c.id).length} athletes
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Merged Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Combined Kumite -65kg"
                  value={mergedName}
                  onChange={(e) => setMergedName(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button 
                type="button" 
                onClick={() => { setIsMergeOpen(false); setSelectedMergeIds([]); }} 
                className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedMergeIds.length < 2 || !mergedName}
                className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-bold rounded-lg cursor-pointer"
              >
                Merge Brackets
              </button>
            </div>
          </form>
        </div>
      )}

      {/* B. SPLIT DIALOG */}
      {isSplitOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleSplitSubmit} className="bg-card w-full max-w-lg rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Split Large Category</span>
              <button type="button" onClick={() => setIsSplitOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Split a crowded category into two. Athletes will be redistributed automatically based on the age/weight rules you specify for the splits.
              </p>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Select Category to Split</label>
                <select
                  required
                  value={selectedSplitId}
                  onChange={(e) => {
                    setSelectedSplitId(e.target.value);
                    const original = categories.find(c => c.id === e.target.value);
                    if (original) {
                      setSplit1({ name: `${original.name} (Light)`, min_age: original.min_age, max_age: original.max_age, min_weight: original.min_weight, max_weight: (original.min_weight + original.max_weight) / 2, gender: original.gender });
                      setSplit2({ name: `${original.name} (Heavy)`, min_age: original.min_age, max_age: original.max_age, min_weight: (original.min_weight + original.max_weight) / 2 + 0.01, max_weight: original.max_weight, gender: original.gender });
                    }
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                >
                  <option value="">Select category...</option>
                  {activeCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({getParticipantsForCategory(c.id).length} registered)
                    </option>
                  ))}
                </select>
              </div>

              {selectedSplitId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-fade-in">
                  {/* Split 1 */}
                  <div className="border border-border p-4 rounded-xl space-y-3 bg-secondary/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-primary">First Split Category</span>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={split1.name}
                        onChange={(e) => setSplit1({ ...split1, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Min Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split1.min_weight}
                          onChange={(e) => setSplit1({ ...split1, min_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Max Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split1.max_weight}
                          onChange={(e) => setSplit1({ ...split1, max_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Split 2 */}
                  <div className="border border-border p-4 rounded-xl space-y-3 bg-secondary/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-primary">Second Split Category</span>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={split2.name}
                        onChange={(e) => setSplit2({ ...split2, name: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Min Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split2.min_weight}
                          onChange={(e) => setSplit2({ ...split2, min_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Max Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={split2.max_weight}
                          onChange={(e) => setSplit2({ ...split2, max_weight: parseFloat(e.target.value) })}
                          className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button type="button" onClick={() => setIsSplitOpen(false)} className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedSplitId || !split1.name || !split2.name}
                className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-bold rounded-lg cursor-pointer"
              >
                Split Bracket & Assign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* C. MOVE ATHLETE (REASSIGNMENT) DIALOG */}
      {isMoveOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleMoveSubmit} className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Reassign Category Override</span>
              <button type="button" onClick={() => { setIsMoveOpen(false); setMovePartId(''); setMoveTargetCatId(''); }} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Select Participant</label>
                <select
                  required
                  value={movePartId}
                  onChange={(e) => setMovePartId(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                >
                  <option value="">Choose athlete...</option>
                  {participants.map(p => {
                    const cId = mappings.find(m => m.participant_id === p.id)?.category_id;
                    const cName = categories.find(cat => cat.id === cId)?.name || 'Unassigned';
                    return (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.gender}, {p.weight}kg) • Currently: {cName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Target Category</label>
                <select
                  required
                  value={moveTargetCatId}
                  onChange={(e) => setMoveTargetCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                >
                  <option value="">Choose destination category...</option>
                  {activeCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.min_weight}-{c.max_weight}kg)
                    </option>
                  ))}
                </select>
              </div>

              {/* Eligibility Preview Warning */}
              {moveEligibilityAlert && (
                <div className={`p-3.5 border rounded-lg flex gap-2 text-xs ${
                  moveEligibilityAlert.eligible 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                }`}>
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{moveEligibilityAlert.eligible ? 'Ready for Assignment' : 'Eligibility Flag Warning'}</span>
                    <span className="block mt-0.5 leading-relaxed text-[11px]">{moveEligibilityAlert.reason}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button 
                type="button" 
                onClick={() => { setIsMoveOpen(false); setMovePartId(''); setMoveTargetCatId(''); }} 
                className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!movePartId || !moveTargetCatId}
                className="px-4 py-1.5 bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/95 text-xs font-bold rounded-lg cursor-pointer"
              >
                Reassign Athlete
              </button>
            </div>
          </form>
        </div>
      )}

      {/* D. ADD CATEGORY DIALOG */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4">
          <form onSubmit={handleAddSubmit} className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border overflow-hidden animate-scale-in text-foreground">
            <div className="p-5 border-b border-border bg-secondary/10 flex justify-between items-center">
              <span className="font-bold text-sm">Add New Category</span>
              <button type="button" onClick={() => setIsAddOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cadet Male Kumite -52kg"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Gender Focus</label>
                  <select
                    value={newCat.gender}
                    onChange={(e) => setNewCat({ ...newCat, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Status</label>
                  <select
                    value={newCat.status}
                    onChange={(e) => setNewCat({ ...newCat, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                    <option value="Full">Full</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Min Age (Years)</label>
                  <input
                    type="number"
                    required
                    value={newCat.min_age}
                    onChange={(e) => setNewCat({ ...newCat, min_age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Max Age (Years)</label>
                  <input
                    type="number"
                    required
                    value={newCat.max_age}
                    onChange={(e) => setNewCat({ ...newCat, max_age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Min Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newCat.min_weight}
                    onChange={(e) => setNewCat({ ...newCat, min_weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Max Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newCat.max_weight}
                    onChange={(e) => setNewCat({ ...newCat, max_weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Capacity Limits</label>
                <input
                  type="number"
                  required
                  value={newCat.capacity}
                  onChange={(e) => setNewCat({ ...newCat, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-secondary/5">
              <button type="button" onClick={() => setIsAddOpen(false)} className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg cursor-pointer"
              >
                Add Category
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/db/dbClient';
import { Tournament } from '@/db/types';
import { useTournament } from '@/context/TournamentContext';
import { 
  Trophy, Calendar, MapPin, Plus, Trash2, Edit3, Archive, 
  RotateCcw, Sparkles, FolderHeart, ShieldAlert, Check, X, RefreshCw 
} from 'lucide-react';

export default function TournamentsAdminPage() {
  const { canModify } = useTournament();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');

  // Form states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Fields
  const [name, setName] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [date, setDate] = useState('');
  const [dateIso, setDateIso] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [regClose, setRegClose] = useState('');
  const [regCloseIso, setRegCloseIso] = useState('');
  const [status, setStatus] = useState<Tournament['status']>('Open');
  const [featured, setFeatured] = useState(false);
  const [discipline, setDiscipline] = useState('Kata, Kumite');
  const [gold, setGold] = useState(0);
  const [silver, setSilver] = useState(0);
  const [bronze, setBronze] = useState(0);
  const [participants, setParticipants] = useState(0);
  const [clubs, setClubs] = useState(0);
  const [emoji, setEmoji] = useState('🏆');

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const list = await db.tournaments.list();
      setTournaments(list);
    } catch (e) {
      console.error('Error loading tournaments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadTournaments();
  }, []);

  if (!mounted) return null;

  // Filter lists
  const activeTournaments = tournaments.filter(t => !t.deleted_at);
  const deletedTournaments = tournaments.filter(t => !!t.deleted_at);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setOrganizer('Kelab Senshi Goju-Ryu');
    setDate('');
    setDateIso(new Date().toISOString().split('T')[0]);
    setVenue('');
    setCity('');
    setRegClose('');
    setRegCloseIso(new Date().toISOString().split('T')[0]);
    setStatus('Open');
    setFeatured(false);
    setDiscipline('Kata, Kumite');
    setGold(0);
    setSilver(0);
    setBronze(0);
    setParticipants(0);
    setClubs(0);
    setEmoji('🏆');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleOpenEdit = (t: Tournament) => {
    setEditingId(t.id);
    setName(t.name);
    setOrganizer(t.organizer);
    setDate(t.date);
    const parseToInputDate = (isoStr: string | undefined | null, displayStr: string) => {
      if (!isoStr) return '';
      const parsed = new Date(isoStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      const parsedDisplay = new Date(displayStr);
      if (!isNaN(parsedDisplay.getTime())) {
        return parsedDisplay.toISOString().split('T')[0];
      }
      return '';
    };

    setDateIso(parseToInputDate(t.date_iso, t.date));
    setVenue(t.venue);
    setCity(t.city);
    setRegClose(t.registration_close);
    setRegCloseIso(parseToInputDate(t.registration_close_iso, t.registration_close));
    setStatus(t.status);
    setFeatured(!!t.featured);
    setDiscipline(t.discipline || 'Kata, Kumite');
    setGold(t.medals_gold ?? 0);
    setSilver(t.medals_silver ?? 0);
    setBronze(t.medals_bronze ?? 0);
    setParticipants(t.total_participants ?? 0);
    setClubs(t.total_clubs ?? 0);
    setEmoji(t.poster_emoji || '🏆');
    setShowFormModal(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return alert('You do not have permissions to modify tournaments.');
    
    // Auto-calculate readable display dates if empty
    const parseDisplayDate = () => {
      if (date && date.trim()) return date.trim();
      if (!dateIso) return '';
      const parsed = new Date(dateIso);
      return !isNaN(parsed.getTime()) 
        ? parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : '';
    };

    const parseDisplayReg = () => {
      if (regClose && regClose.trim()) return regClose.trim();
      if (!regCloseIso) return '';
      const parsed = new Date(regCloseIso);
      return !isNaN(parsed.getTime()) 
        ? parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) 
        : '';
    };

    const displayDate = parseDisplayDate();
    const displayReg = parseDisplayReg();

    const payload = {
      name,
      organizer,
      date: displayDate,
      date_iso: dateIso,
      venue,
      city,
      registration_close: displayReg,
      registration_close_iso: regCloseIso,
      status,
      featured,
      discipline,
      medals_gold: gold,
      medals_silver: silver,
      medals_bronze: bronze,
      total_participants: participants,
      total_clubs: clubs,
      poster_emoji: emoji,
      banner_gradient: status === 'Completed' 
        ? 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #3b82f6 100%)' 
        : 'linear-gradient(135deg, #0b0f19 0%, #1a1035 40%, #2d1a00 100%)'
    };

    try {
      if (editingId) {
        await db.tournaments.update(editingId, payload);
      } else {
        await db.tournaments.add(payload);
      }
      setShowFormModal(false);
      resetForm();
      loadTournaments();
    } catch (err) {
      console.error(err);
      alert('Failed to save tournament details.');
    }
  };

  const handleArchive = async (id: string) => {
    if (!canModify) return alert('Permission denied.');
    const confirmArch = window.confirm('Are you sure you want to mark this tournament as Completed/Ended? It will be archived and placed under Past Tournaments.');
    if (!confirmArch) return;

    try {
      await db.tournaments.update(id, { status: 'Completed' });
      loadTournaments();
    } catch (e) {
      alert('Archive failed');
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!canModify) return alert('Permission denied.');
    const confirmDel = window.confirm('Are you sure you want to delete this tournament? It will be sent to the Trash Bin where it can be recovered.');
    if (!confirmDel) return;

    try {
      await db.tournaments.update(id, { deleted_at: new Date().toISOString() });
      loadTournaments();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleRestore = async (id: string) => {
    if (!canModify) return alert('Permission denied.');
    try {
      await db.tournaments.update(id, { deleted_at: undefined });
      loadTournaments();
    } catch (e) {
      alert('Restore failed');
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!canModify) return alert('Permission denied.');
    const doubleConfirm = window.confirm('WARNING: This will permanently destroy this tournament records from the database. This action CANNOT be undone. Are you absolutely sure?');
    if (!doubleConfirm) return;

    try {
      await db.tournaments.delete(id);
      loadTournaments();
    } catch (e) {
      alert('Failed to delete permanently.');
    }
  };

  return (
    <div className="p-6 space-y-6 text-foreground w-full">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournament Maintenance</h1>
          <p className="text-sm text-muted-foreground">Manage active schedules, archive completed bouts, or restore deleted championships.</p>
        </div>
        
        {canModify && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Tournament</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs font-semibold gap-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 transition-colors border-b-2 cursor-pointer ${
            activeTab === 'active'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Active & Completed ({activeTournaments.length})
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1 cursor-pointer ${
            activeTab === 'trash'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Trash Bin</span>
          {deletedTournaments.length > 0 && (
            <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full text-[10px] font-black">
              {deletedTournaments.length}
            </span>
          )}
        </button>
      </div>

      {/* Main List Table */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>Retrieving tournament roster...</span>
          </div>
        </div>
      ) : (activeTab === 'active' ? activeTournaments : deletedTournaments).length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-xs text-muted-foreground">
          {activeTab === 'active' 
            ? 'No tournaments found. Create a new tournament to start tracking registrations.' 
            : 'Trash bin is empty. Stored records are safe.'
          }
        </div>
      ) : (
        <div className="border border-border bg-card rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-secondary/40 border-b border-border">
                <tr>
                  <th className="p-3 w-12 text-center">Icon</th>
                  <th className="p-3">Tournament Name</th>
                  <th className="p-3 w-36">Dates</th>
                  <th className="p-3 w-44">Location</th>
                  <th className="p-3 w-28 text-center">Status</th>
                  <th className="p-3 w-32 text-center">Participants / Clubs</th>
                  <th className="p-3 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(activeTab === 'active' ? activeTournaments : deletedTournaments).map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3 text-center text-lg">{t.poster_emoji || '🏆'}</td>
                    <td className="p-3 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <span>{t.name}</span>
                        {t.featured && (
                          <span className="bg-yellow-400/10 text-yellow-500 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border border-yellow-400/10">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-normal">Org: {t.organizer}</p>
                    </td>
                    <td className="p-3 text-muted-foreground font-medium">
                      {t.date || (t.date_iso ? new Date(t.date_iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No Date')}
                      <p className="text-[10px] text-gray-500 font-normal">
                        Close: {t.registration_close || (t.registration_close_iso ? new Date(t.registration_close_iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A')}
                      </p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {t.venue}
                      <p className="text-[10px] text-gray-500 font-normal">{t.city}</p>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'Completed'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : t.status === 'Open'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      <div className="font-semibold text-foreground">{t.total_participants ?? 0} Athletes</div>
                      <div className="text-[10px] text-gray-500">{t.total_clubs ?? 0} Clubs</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              onClick={() => handleOpenEdit(t)}
                              title="Edit Details"
                              className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {t.status !== 'Completed' && (
                              <button
                                onClick={() => handleArchive(t.id)}
                                title="Mark as Completed"
                                className="p-1.5 hover:bg-indigo-500/10 text-indigo-500 rounded-lg transition"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleSoftDelete(t.id)}
                              title="Delete to Trash Bin"
                              className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(t.id)}
                              title="Retrieve/Restore data"
                              className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" /> Restore
                            </button>
                            <button
                              onClick={() => handleHardDelete(t.id)}
                              title="Permanently Delete"
                              className="p-1.5 hover:bg-red-500/15 text-red-500 rounded-lg transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/10">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4.5 w-4.5 text-primary" />
                {editingId ? 'Edit Tournament Profile' : 'Initialize New Tournament'}
              </h2>
              <button 
                onClick={() => setShowFormModal(false)}
                className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground uppercase text-[10px] block">Tournament Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. 5th Kelab Senshi Goju-Ryu Open"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Organizer */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Organizer</label>
                  <input
                    type="text"
                    required
                    value={organizer}
                    onChange={e => setOrganizer(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                {/* Emoji Indicator */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Emoji Poster</label>
                  <select
                    value={emoji}
                    onChange={e => setEmoji(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none text-foreground"
                  >
                    <option value="🏆">🏆 Trophy</option>
                    <option value="🥇">🥇 Gold Medal</option>
                    <option value="🥋">🥋 Karate Gi</option>
                    <option value="🔥">🔥 Flame</option>
                    <option value="🌟">🌟 Star</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date ISO */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Start Date</label>
                  <input
                    type="date"
                    required
                    value={dateIso}
                    onChange={e => setDateIso(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                {/* Custom display date override */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Date Display override</label>
                  <input
                    type="text"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    placeholder="e.g. 15–16 Aug 2026 (Optional)"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Venue */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Venue</label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    placeholder="e.g. PJ Town Hall"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                {/* City */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">City & State</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Petaling Jaya, Selangor"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Reg Close ISO */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Reg Close Date</label>
                  <input
                    type="date"
                    required
                    value={regCloseIso}
                    onChange={e => setRegCloseIso(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                {/* Reg Close text override */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Reg Close Display override</label>
                  <input
                    type="text"
                    value={regClose}
                    onChange={e => setRegClose(e.target.value)}
                    placeholder="e.g. 31 July 2026 (Optional)"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Status */}
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none text-foreground"
                  >
                    <option value="Open">Open</option>
                    <option value="Closing Soon">Closing Soon</option>
                    <option value="Full">Full</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                {/* Disciplines */}
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-muted-foreground uppercase text-[10px] block">Disciplines</label>
                  <input
                    type="text"
                    value={discipline}
                    onChange={e => setDiscipline(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              {/* Advanced stats for completed tournament archiving */}
              <div className="border-t border-border/60 pt-4 space-y-3">
                <span className="font-bold text-muted-foreground text-[10px] uppercase block">Historical Telemetry (For Past Archives)</span>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Total Participants</label>
                    <input
                      type="number"
                      value={participants}
                      onChange={e => setParticipants(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-secondary/80 border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Total Clubs</label>
                    <input
                      type="number"
                      value={clubs}
                      onChange={e => setClubs(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-secondary/80 border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div className="space-y-1 flex items-center pt-5">
                    <label className="flex items-center gap-2 font-bold cursor-pointer text-muted-foreground select-none">
                      <input
                        type="checkbox"
                        checked={featured}
                        onChange={e => setFeatured(e.target.checked)}
                        className="rounded text-primary border-border focus:ring-primary"
                      />
                      <span>Featured</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-yellow-500 font-bold">🥇 Gold Medals</label>
                    <input
                      type="number"
                      value={gold}
                      onChange={e => setGold(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-secondary/80 border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-300 font-bold">🥈 Silver Medals</label>
                    <input
                      type="number"
                      value={silver}
                      onChange={e => setSilver(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-secondary/80 border border-border rounded-lg text-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-amber-600 font-bold">🥉 Bronze Medals</label>
                    <input
                      type="number"
                      value={bronze}
                      onChange={e => setBronze(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-secondary/80 border border-border rounded-lg text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 bg-secondary border border-border text-foreground hover:bg-secondary/80 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingId ? 'Save Profile' : 'Add Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

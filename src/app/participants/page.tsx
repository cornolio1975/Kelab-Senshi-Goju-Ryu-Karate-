'use client';

import React, { useState, useEffect } from 'react';
import { useTournament } from '@/context/TournamentContext';
import { db } from '@/db/dbClient';
import { Participant, Club, Country, Category, Coach } from '@/db/types';
import AddParticipantModal from '@/components/AddParticipantModal';
import EditParticipantDrawer from '@/components/EditParticipantDrawer';
import { 
  Check, Eye, Trash2, Edit2, ArrowUpDown, ChevronLeft, 
  ChevronRight, HelpCircle, Columns, Download, Printer, UserCheck, 
  Search, SlidersHorizontal, Trophy, Award, BadgeAlert, Plus, CheckSquare, ListFilter, X, RefreshCw
} from 'lucide-react';

export default function ParticipantsPage() {
  const {
    searchQuery,
    setSearchQuery,
    selectedIds,
    setSelectedIds,
    isAddOpen,
    setIsAddOpen,
    refreshKey,
    triggerRefresh,
    canModify
  } = useTournament();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  
  // Active states
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'CONFIRMED'>('ALL');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  
  // Custom local filter states matching KumiteTechnology demo UI
  const [statusFilter, setStatusFilter] = useState<string>('Active'); // Active / Inactive / All
  const [schoolFilter, setSchoolFilter] = useState<string>(''); // maps to Club
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Matches KT default "50"

  // Sorting
  const [sortField, setSortField] = useState<keyof Participant>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pList, cList, cntList, catList, coList] = await Promise.all([
        db.participants.list(),
        db.clubs.list(),
        db.countries.list(),
        db.categories.list(),
        db.coaches.list()
      ]);
      setParticipants(pList);
      setClubs(cList);
      setCountries(cntList);
      setCategories(catList);
      setCoaches(coList);
    } catch (e) {
      console.error('Error loading participants data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      loadData();
    }
  }, [mounted, refreshKey]);

  if (!mounted) return null;

  // Sorting Handler
  const handleSort = (field: keyof Participant) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortField(field);
    setSortOrder(isAsc ? 'desc' : 'asc');
  };

  // Helper age calculation
  const getAge = (dobString: string) => {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Get count of participants currently in a category
  const getCategoryCountInfo = (catId: string) => {
    const rawpc = localStorage.getItem('ts_participant_categories');
    const mappings = rawpc ? JSON.parse(rawpc) : [];
    const matchedParts = mappings.filter((m: any) => m.category_id === catId).map((m: any) => m.participant_id);
    const activeInCat = participants.filter(p => matchedParts.includes(p.id));
    
    const total = activeInCat.length;
    const confirmed = activeInCat.filter(p => p.status === 'Confirmed' || p.status === 'Checked In').length;
    
    return { confirmed, total };
  };

  // Bulk actions checklist selection helper
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredParticipants.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(val => val !== id));
    }
  };

  // Quick Action: Activate All (Mark Confirmed)
  const handleActivateAll = async () => {
    if (filteredParticipants.length === 0) return;
    if (confirm(`Confirm and activate all ${filteredParticipants.length} matching participants?`)) {
      try {
        for (const p of filteredParticipants) {
          await db.participants.update(p.id, { status: 'Confirmed' }, 'Admin Bulk Operation');
        }
        alert('All matching participants activated.');
        triggerRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Quick Action: Deactivate All (Mark Pending)
  const handleDeactivateAll = async () => {
    if (filteredParticipants.length === 0) return;
    if (confirm(`Reset status to pending for all ${filteredParticipants.length} matching participants?`)) {
      try {
        for (const p of filteredParticipants) {
          await db.participants.update(p.id, { status: 'Pending' }, 'Admin Bulk Operation');
        }
        alert('All matching participants status set to pending.');
        triggerRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'No,Registration No,Full Name,Gender,Age,DOB,Weight,Height,Club,Country,Status\n';
    const rows = filteredParticipants.map((p, idx) => {
      const clubName = clubs.find(c => c.id === p.club_id)?.name || 'Independent';
      const countryName = countries.find(c => c.code === p.nationality_code)?.name || 'Unknown';
      return `"${idx+1}","${p.registration_no}","${p.full_name}","${p.gender}",${getAge(p.dob)},"${p.dob}",${p.weight},${p.height},"${clubName}","${countryName}","${p.status}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `KT_Participants_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Filtering logic matching KT demo ---
  const filteredParticipants = participants.filter((p) => {
    // 1. Search Query (Name / Reg No)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!p.full_name.toLowerCase().includes(q) && !p.registration_no.toLowerCase().includes(q)) {
        return false;
      }
    }

    // 2. Left side-panel Category filter
    if (selectedCatId) {
      const rawpc = localStorage.getItem('ts_participant_categories');
      const mappings = rawpc ? JSON.parse(rawpc) : [];
      const isAssigned = mappings.some((m: any) => m.participant_id === p.id && m.category_id === selectedCatId);
      if (!isAssigned) return false;
    }

    // 3. Category Tab filter (Confirmed only vs ALL)
    if (activeCategoryTab === 'CONFIRMED' && p.status !== 'Confirmed' && p.status !== 'Checked In') {
      return false;
    }

    // 4. Active / Inactive filter dropdown
    if (statusFilter === 'Active' && p.status === 'Cancelled') return false;
    if (statusFilter === 'Inactive' && p.status !== 'Cancelled') return false;

    // 5. School/Club filter
    if (schoolFilter && p.club_id !== schoolFilter) return false;

    // 6. Country filter
    if (countryFilter && p.nationality_code !== countryFilter) return false;

    return true;
  });

  // Sort logic
  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA === undefined || valA === null) return 1;
    if (valB === undefined || valB === null) return -1;

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination bounds
  const totalItems = sortedParticipants.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedParticipants = sortedParticipants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden text-foreground bg-background">
      
      {/* ======================================================== */}
      {/* LEFT COLUMN: CATEGORY TREE SIDE-PANEL                     */}
      {/* ======================================================== */}
      <div className="w-72 bg-card border-r border-border h-full flex flex-col shrink-0">
        
        {/* Categories Tab selectors (ALL / Checked Checkmark) */}
        <div className="flex border-b border-border text-xs font-semibold shrink-0 bg-secondary/10">
          <button
            onClick={() => { setActiveCategoryTab('ALL'); setSelectedCatId(null); }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 cursor-pointer ${
              activeCategoryTab === 'ALL' && !selectedCatId
                ? 'border-primary text-foreground bg-card'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => { setActiveCategoryTab('CONFIRMED'); setSelectedCatId(null); }}
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
              <option>Tournament Manager</option>
              <option>Tatami Controller</option>
              <option>Chief Referee</option>
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

        {/* Category List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 bg-secondary/5">
          {categories.map(c => {
            const { confirmed, total } = getCategoryCountInfo(c.id);
            const isSelected = selectedCatId === c.id;

            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCatId(c.id);
                  setCurrentPage(1);
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
      {/* RIGHT COLUMN: MAIN TABLE & FILTERS PANEL                  */}
      {/* ======================================================== */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-background overflow-hidden p-6 space-y-4">
        
        {/* Title Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Participants</h2>
            <p className="text-xs text-muted-foreground">Manage status, search school/club squads, and verify weights.</p>
          </div>
          {canModify && (
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add Participant</span>
            </button>
          )}
        </div>

        {/* Filters Panel (KumiteTechnology demo structure) */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 shrink-0">
          
          {/* Search box */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Search</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Name / Reg No"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>
          </div>

          {/* Active / Inactive */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Active / Inactive</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
            >
              <option value="Active">Active Registrations</option>
              <option value="Inactive">Cancelled / Bin</option>
              <option value="All">All Dossiers</option>
            </select>
          </div>

          {/* School (Clubs) */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">School / Club</span>
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
            >
              <option value="">All Schools</option>
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Country</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
            >
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.flag_emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Region</span>
            <input
              type="text"
              placeholder="All Regions"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
            />
          </div>

          {/* City */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">City</span>
            <input
              type="text"
              placeholder="All Cities"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs focus:outline-none text-foreground"
            />
          </div>
        </div>

        {/* Action Button toolbar (KumiteTechnology demo style) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/20 border border-border px-4 py-2.5 rounded-xl shrink-0">
          {canModify && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleActivateAll}
                disabled={filteredParticipants.length === 0}
                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Activate All
              </button>
              <button
                onClick={handleDeactivateAll}
                disabled={filteredParticipants.length === 0}
                className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Deactivate All
              </button>
              <button
                onClick={() => alert('Recalculating physical index coefficients (weight/height) for seed rankings.')}
                className="px-3 py-1.5 bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border text-xs font-medium rounded-lg cursor-pointer"
              >
                Setup Physical Indexes
              </button>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredParticipants.length === 0}
            className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {/* Participant Data Table (Split layout right side) */}
        <div className="flex-1 border border-border bg-card rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-secondary/40 sticky top-0 border-b border-border z-10">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredParticipants.length > 0 && selectedIds.length === filteredParticipants.length}
                      onChange={handleSelectAll}
                      className="rounded border-border text-primary"
                    />
                  </th>
                  <th className="p-3 w-12 font-bold text-muted-foreground text-center">No</th>
                  <th className="p-3 w-32 font-bold text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('registration_no')}>
                    <div className="flex items-center gap-1">Reg No <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="p-3 w-48 font-bold text-muted-foreground cursor-pointer select-none" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-1">Participant <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="p-3 w-32 font-bold text-muted-foreground">Category Assigned</th>
                  <th className="p-3 w-28 font-bold text-muted-foreground">Date of Birth</th>
                  <th className="p-3 w-16 font-bold text-muted-foreground">Age</th>
                  <th className="p-3 w-20 font-bold text-muted-foreground">Weight</th>
                  <th className="p-3 w-36 font-bold text-muted-foreground">School / Club</th>
                  {canModify && <th className="p-3 w-24 font-bold text-muted-foreground text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-xs text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span>Loading athlete records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-xs text-muted-foreground">
                      No participants match the selected filter/search parameters.
                    </td>
                  </tr>
                ) : (
                  paginatedParticipants.map((p, idx) => {
                    const isChecked = selectedIds.includes(p.id);
                    const clubName = clubs.find(c => c.id === p.club_id)?.name || 'Independent';
                    
                    // Category Mapping client-side lookup
                    const rawMappings = localStorage.getItem('ts_participant_categories');
                    const mappings = rawMappings ? JSON.parse(rawMappings) : [];
                    const catId = mappings.find((m: any) => m.participant_id === p.id)?.category_id;
                    const cat = categories.find(c => c.id === catId);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPartId(p.id)}
                        className={`hover:bg-secondary/40 transition-colors cursor-pointer select-none ${
                          isChecked ? 'bg-secondary/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                            className="rounded border-border text-primary"
                          />
                        </td>
                        <td className="p-3 text-center text-muted-foreground font-semibold">
                          {(currentPage - 1) * pageSize + idx + 1}.
                        </td>
                        <td className="p-3 font-mono font-medium text-foreground">{p.registration_no}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 text-primary border border-border flex items-center justify-center font-bold uppercase shrink-0 text-[10px]">
                              {p.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.photo_url} alt="Profile" className="w-full h-full object-cover" />
                              ) : (
                                p.full_name.substring(0, 2)
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">{p.full_name}</span>
                              <span className="text-[10px] text-muted-foreground block font-medium">Gender: {p.gender}</span>
                            </div>
                            {p.status === 'Confirmed' || p.status === 'Checked In' ? (
                              <Check className="h-4 w-4 text-emerald-500 bg-emerald-500/10 p-0.5 rounded-full shrink-0" />
                            ) : null}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-primary hover:underline">
                          {cat ? cat.name : 'Unassigned'}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono">{p.dob}</td>
                        <td className="p-3 text-muted-foreground font-semibold font-mono">{getAge(p.dob)}</td>
                        <td className="p-3 text-muted-foreground font-mono">{p.weight} kg</td>
                        <td className="p-3 text-muted-foreground font-semibold truncate max-w-[130px]">{clubName}</td>
                        {canModify && (
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedPartId(p.id)}
                                className="p-1 text-muted-foreground hover:bg-secondary rounded-md cursor-pointer"
                                title="Edit Detail"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this athlete record?')) {
                                    await db.participants.delete(p.id, 'Admin Operations');
                                    triggerRefresh();
                                  }
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Navigation (KumiteTechnology style pagination) */}
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-secondary/15 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                className="bg-card border border-border rounded-md px-2 py-1 font-semibold text-foreground focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {(currentPage - 1) * pageSize + 1}-{Math.min(totalItems, currentPage * pageSize)} of {totalItems}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-border bg-card rounded-lg hover:text-foreground cursor-pointer disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-border bg-card rounded-lg hover:text-foreground cursor-pointer disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Add Participant Modal */}
      <AddParticipantModal />

      {/* Edit Participant Drawer */}
      <EditParticipantDrawer
        participantId={selectedPartId}
        onClose={() => setSelectedPartId(null)}
      />

    </div>
  );
}

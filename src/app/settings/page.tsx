'use client';

import React, { useState, useEffect } from 'react';
import { useTournament, SystemUser, AccessibilitySettings } from '@/context/TournamentContext';
import { db, basePath } from '@/db/dbClient';
import { 
  Save, Trash2, ShieldAlert, UserPlus, Edit2, Check, X, 
  Shield, Users, Eye, Accessibility, Info 
} from 'lucide-react';

export default function SettingsPage() {
  const { 
    tournamentName, setTournamentName, 
    liveStreamUrl, setLiveStreamUrl, 
    userRole, 
    logoUrl, setLogoUrl,
    usersList, addUser, updateUser, deleteUser,
    globalAccessibility, setGlobalAccessibility,
    canModify
  } = useTournament();

  const [localName, setLocalName] = useState(tournamentName);
  const [localStream, setLocalStream] = useState(liveStreamUrl);
  const [localLogo, setLocalLogo] = useState(logoUrl);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isCoAdmin = userRole === 'Co-Admin';

  // 1. Accessibility local state
  const [localAccessibility, setLocalAccessibility] = useState<AccessibilitySettings>(globalAccessibility);

  // 2. User creation state
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'Admin' | 'Co-Admin' | 'Viewer'>('Co-Admin');
  const [newUserStatus, setNewUserStatus] = useState<'Active' | 'Suspended'>('Active');
  const [newUserCanModify, setNewUserCanModify] = useState(false);
  
  // Custom accessibility overrides per user
  const [customizeUserAccessibility, setCustomizeUserAccessibility] = useState(false);
  const [newUserAccessibility, setNewUserAccessibility] = useState<AccessibilitySettings>({
    themeContrast: 'standard',
    textScale: 'standard',
    reducedMotion: false,
    legibilityFont: 'standard'
  });

  // 3. User editing state
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'Admin' | 'Co-Admin' | 'Viewer'>('Co-Admin');
  const [editUserStatus, setEditUserStatus] = useState<'Active' | 'Suspended'>('Active');
  const [editUserCanModify, setEditUserCanModify] = useState(false);
  const [editUserAccessibility, setEditUserAccessibility] = useState<AccessibilitySettings>({
    themeContrast: 'standard',
    textScale: 'standard',
    reducedMotion: false,
    legibilityFont: 'standard'
  });

  useEffect(() => {
    setLocalName(tournamentName);
  }, [tournamentName]);

  useEffect(() => {
    setLocalStream(liveStreamUrl);
  }, [liveStreamUrl]);

  useEffect(() => {
    setLocalLogo(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    setLocalAccessibility(globalAccessibility);
  }, [globalAccessibility]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG/JPG/SVG/WebP).');
        return;
      }
      if (file.size > 800 * 1024) {
        alert('Image is too large. Please select a logo under 800KB to optimize performance.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLocalLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      setTournamentName(localName);
      setLiveStreamUrl(localStream);
      setLogoUrl(localLogo);
      setGlobalAccessibility(localAccessibility);
      setMessage({ type: 'success', text: 'System settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    const doubleConfirm = window.confirm(
      'WARNING: This will completely wipe all bouts, schedule data, and reset all participants to seed status. This action cannot be undone. Do you wish to proceed?'
    );
    if (!doubleConfirm) return;

    setResetting(true);
    setMessage(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ts_bouts');
        localStorage.removeItem('ts_participants');
        localStorage.removeItem('ts_participant_categories');
        localStorage.removeItem('ts_seed_version'); // force re-seeding
        
        setMessage({ type: 'success', text: 'Database reset successfully. Reloading...' });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Reset failed.' });
      setResetting(false);
    }
  };

  // Accessibility selection toggler
  const handleAccessibilityChange = (key: keyof AccessibilitySettings, value: any) => {
    const updated = { ...localAccessibility, [key]: value };
    setLocalAccessibility(updated);
    setGlobalAccessibility(updated); // instant preview application
  };

  // User list actions
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      alert('Please fill in user details.');
      return;
    }
    
    // Check duplication
    if (usersList.some(u => u.email.toLowerCase() === newUserEmail.toLowerCase())) {
      alert('A user with this email address already exists.');
      return;
    }

    addUser({
      name: newUserName,
      email: newUserEmail.trim(),
      role: newUserRole,
      status: newUserStatus,
      canModify: newUserCanModify,
      accessibility: customizeUserAccessibility ? newUserAccessibility : {
        themeContrast: 'standard',
        textScale: 'standard',
        reducedMotion: false,
        legibilityFont: 'standard'
      }
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole('Co-Admin');
    setNewUserStatus('Active');
    setNewUserCanModify(false);
    setCustomizeUserAccessibility(false);
    setIsAddingUser(false);
    
    setMessage({ type: 'success', text: 'User added successfully.' });
  };

  const handleEditUserClick = (user: SystemUser) => {
    setEditingUserEmail(user.email);
    setEditUserName(user.name);
    setEditUserRole(user.role);
    setEditUserStatus(user.status);
    setEditUserCanModify(user.canModify || false);
    setEditUserAccessibility(user.accessibility || {
      themeContrast: 'standard',
      textScale: 'standard',
      reducedMotion: false,
      legibilityFont: 'standard'
    });
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserEmail) return;

    updateUser(editingUserEmail, {
      name: editUserName,
      role: editUserRole,
      status: editUserStatus,
      canModify: editUserCanModify,
      accessibility: editUserAccessibility
    });

    setEditingUserEmail(null);
    setMessage({ type: 'success', text: 'User details updated successfully.' });
  };

  const handleDeleteUserClick = (email: string) => {
    if (email === 'admin@senshikarate.com') {
      alert('Cannot delete the master Tournament Director account.');
      return;
    }
    if (confirm(`Are you sure you want to completely remove user ${email}?`)) {
      deleteUser(email);
      setMessage({ type: 'success', text: 'User deleted successfully.' });
    }
  };

  return (
    <div className="p-6 space-y-6 text-foreground w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Configure championship parameters, live broadcasting streams, and system accessibility/access controls.</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Championship Config */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            General Configuration
          </h2>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground block">Tournament Name</label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              disabled={!canModify}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
              placeholder="e.g. 1st Kelab Senshi Goju-Ryu Championship"
              required
            />
          </div>
        </div>

        {/* Branding Config */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Branding Configuration</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logo Preview */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-xs font-semibold text-muted-foreground block text-center sm:text-left w-full">Current Logo</span>
              <div className="h-24 w-24 rounded-full flex items-center justify-center overflow-hidden border border-border shadow-md bg-neutral-50 dark:bg-neutral-900 shrink-0">
                <img src={localLogo || `${basePath}/logo.jpg`} alt="Tournament Logo" className="h-full w-full object-cover" />
              </div>
            </div>
            {/* Upload fields */}
            <div className="flex-1 space-y-3 w-full">
              <label className="text-xs font-medium text-foreground block">Upload Custom Logo</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className={`px-4 py-2 border border-border hover:bg-secondary rounded-lg text-xs font-bold transition shadow-sm cursor-pointer inline-flex items-center justify-center ${!canModify ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={!canModify}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLocalLogo(`${basePath}/logo.jpg`)}
                  disabled={!canModify}
                  className="px-4 py-2 border border-red-500/20 hover:border-red-500/40 text-red-500 hover:bg-red-500/5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  Reset to Default
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Supported formats: PNG, JPG, JPEG, SVG or WebP. Max file size: 800KB.
              </p>
            </div>
          </div>
        </div>

        {/* Livestream Config */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Media & Broadcasting
          </h2>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground block">Live Stream Embed URL</label>
            <input
              type="url"
              value={localStream}
              onChange={(e) => setLocalStream(e.target.value)}
              disabled={!canModify}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
              placeholder="e.g. https://www.youtube.com/embed/live_stream_id"
            />
            <p className="text-[10px] text-muted-foreground">
              Provide an iframe-friendly embed URL (e.g. <code>https://www.youtube.com/embed/dQw4w9WgXcQ</code>).
            </p>
          </div>
        </div>

        {/* System Accessibility Config Panel */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Accessibility className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Global Accessibility Config</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contrast */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">Theme Contrast</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'standard', label: 'Standard' },
                  { id: 'high-contrast', label: 'High Contrast' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAccessibilityChange('themeContrast', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.themeContrast === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Adjust system foreground and background colors for high-contrast accessibility.</p>
            </div>

            {/* Font Scale */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">Text Scaling</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', label: '100% (Standard)' },
                  { id: 'large', label: '115% (Large)' },
                  { id: 'extra-large', label: '130% (XL)' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAccessibilityChange('textScale', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.textScale === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Enlarges UI fonts and paddings scale-proportionally across screens.</p>
            </div>

            {/* Motion */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">UI Transitions & Motion</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: false, label: 'Standard Motion' },
                  { id: true, label: 'Reduced Motion' }
                ].map((opt) => (
                  <button
                    key={opt.label as string}
                    type="button"
                    onClick={() => handleAccessibilityChange('reducedMotion', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.reducedMotion === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Disables sliding panels and scoreboard animations to reduce visual motion.</p>
            </div>

            {/* Dyslexic-Friendly Font */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">Legibility Typeface</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'standard', label: 'Standard Font' },
                  { id: 'dyslexic', label: 'Dyslexic-Friendly' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleAccessibilityChange('legibilityFont', opt.id)}
                    disabled={!canModify}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer disabled:opacity-50 ${
                      localAccessibility.legibilityFont === opt.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Switches standard fonts to highly distinct open-dyslexic typeface structures.</p>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !canModify}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Save className="h-4 w-4 text-white" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* User Management Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">User Management</h2>
          </div>
          
          {!isCoAdmin && !isAddingUser && (
            <button
              onClick={() => setIsAddingUser(true)}
              className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add System User</span>
            </button>
          )}
        </div>

        {isCoAdmin && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3 items-start">
            <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-500 block">System Access Restricted</span>
              <p className="text-[10px] text-muted-foreground">
                Only the primary Tournament Director (Admin role) can create, modify, suspend, or delete system user credentials and privileges.
              </p>
            </div>
          </div>
        )}

        {/* Inline user edit dialog */}
        {editingUserEmail && (
          <form onSubmit={handleEditUserSubmit} className="bg-secondary/40 border border-border p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Modify User: {editingUserEmail}</span>
              <button type="button" onClick={() => setEditingUserEmail(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Name</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Access Role</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Admin">Admin</option>
                  <option value="Co-Admin">Co-Admin</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Status</label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Write Permission</label>
                <select
                  value={String(editUserCanModify)}
                  onChange={(e) => setEditUserCanModify(e.target.value === 'true')}
                  disabled={editingUserEmail === 'admin@senshikarate.com'}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800 disabled:opacity-50"
                >
                  <option value="false">Read-Only (Spectator)</option>
                  <option value="true">Allowed (Modify)</option>
                </select>
              </div>
            </div>

            {/* Accessibility override per user */}
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground">Accessibility Overrides</span>
                <span className="text-[9px] text-muted-foreground italic">Custom settings apply upon user sign-in</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* User Contrast */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Contrast</span>
                  <select
                    value={editUserAccessibility.themeContrast}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, themeContrast: e.target.value as any }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="standard">Standard</option>
                    <option value="high-contrast">High Contrast</option>
                  </select>
                </div>
                {/* User Font Size */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Text Scale</span>
                  <select
                    value={editUserAccessibility.textScale}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, textScale: e.target.value as any }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="standard">100%</option>
                    <option value="large">115%</option>
                    <option value="extra-large">130%</option>
                  </select>
                </div>
                {/* User Motion */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Motion</span>
                  <select
                    value={String(editUserAccessibility.reducedMotion)}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, reducedMotion: e.target.value === 'true' }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="false">Standard</option>
                    <option value="true">Reduced</option>
                  </select>
                </div>
                {/* User Font style */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Font Legibility</span>
                  <select
                    value={editUserAccessibility.legibilityFont}
                    onChange={(e) => setEditUserAccessibility(prev => ({ ...prev, legibilityFont: e.target.value as any }))}
                    className="w-full p-1.5 bg-card border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                  >
                    <option value="standard">Standard</option>
                    <option value="dyslexic">Dyslexic</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setEditingUserEmail(null)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save User</span>
              </button>
            </div>
          </form>
        )}

        {/* Inline Add User form */}
        {isAddingUser && !isCoAdmin && (
          <form onSubmit={handleAddUserSubmit} className="bg-secondary/40 border border-border p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-xs font-bold text-foreground">Add New System User</span>
              <button type="button" onClick={() => setIsAddingUser(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Coach Lee"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Email Address</label>
                <input
                  type="email"
                  placeholder="lee@senshikarate.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Admin">Admin</option>
                  <option value="Co-Admin">Co-Admin</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Status</label>
                <select
                  value={newUserStatus}
                  onChange={(e) => setNewUserStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground block">Write Permission</label>
                <select
                  value={String(newUserCanModify)}
                  onChange={(e) => setNewUserCanModify(e.target.value === 'true')}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-xs focus:outline-none text-foreground dark:bg-neutral-800"
                >
                  <option value="false">Read-Only (Spectator)</option>
                  <option value="true">Allowed (Modify)</option>
                </select>
              </div>
            </div>

            {/* Accessibility override config toggle */}
            <div className="pt-2 border-t border-border mt-2 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customizeUserAccessibility}
                  onChange={(e) => setCustomizeUserAccessibility(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-[10px] font-bold text-muted-foreground">Customize User Accessibility Settings</span>
              </label>

              {customizeUserAccessibility && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-lg border border-border">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Contrast</span>
                    <select
                      value={newUserAccessibility.themeContrast}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, themeContrast: e.target.value as any }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="standard">Standard</option>
                      <option value="high-contrast">High Contrast</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Text Scale</span>
                    <select
                      value={newUserAccessibility.textScale}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, textScale: e.target.value as any }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="standard">100%</option>
                      <option value="large">115%</option>
                      <option value="extra-large">130%</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Motion</span>
                    <select
                      value={String(newUserAccessibility.reducedMotion)}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, reducedMotion: e.target.value === 'true' }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="false">Standard</option>
                      <option value="true">Reduced</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Font style</span>
                    <select
                      value={newUserAccessibility.legibilityFont}
                      onChange={(e) => setNewUserAccessibility(prev => ({ ...prev, legibilityFont: e.target.value as any }))}
                      className="w-full p-1.5 bg-secondary border border-border rounded-md text-[10px] focus:outline-none dark:bg-neutral-800 text-foreground"
                    >
                      <option value="standard">Standard</option>
                      <option value="dyslexic">Dyslexic</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer font-semibold"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save User</span>
              </button>
            </div>
          </form>
        )}

        {/* User table list */}
        <div className="overflow-x-auto border border-border rounded-xl bg-card">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/40 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4">Write Access</th>
                <th className="py-3 px-4">Accessibility Preferences</th>
                {!isCoAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {usersList.map((user) => {
                const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                
                const customAccessibility = user.accessibility && (
                  user.accessibility.themeContrast !== 'standard' || 
                  user.accessibility.textScale !== 'standard' || 
                  user.accessibility.reducedMotion || 
                  user.accessibility.legibilityFont !== 'standard'
                );

                return (
                  <tr key={user.email} className="hover:bg-secondary/15 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-border shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold block text-foreground leading-snug">{user.name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{user.email}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        user.role === 'Admin' 
                          ? 'bg-blue-500/5 text-blue-500 border-blue-500/20'
                          : user.role === 'Co-Admin'
                            ? 'bg-purple-500/5 text-purple-500 border-purple-500/20'
                            : 'bg-neutral-500/5 text-muted-foreground border-border'
                      }`}>
                        {user.role === 'Admin' ? <Shield className="h-3 w-3" /> : user.role === 'Co-Admin' ? <Users className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        user.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.status}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        user.canModify || user.role === 'Admin'
                          ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                          : 'bg-neutral-500/5 text-muted-foreground border-border'
                      }`}>
                        {user.canModify || user.role === 'Admin' ? 'Read & Write' : 'Read-Only'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground text-[10px] font-semibold">
                      {customAccessibility ? (
                        <div className="flex flex-wrap gap-1.5">
                          {user.accessibility.themeContrast !== 'standard' && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">High Contrast</span>
                          )}
                          {user.accessibility.textScale !== 'standard' && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">Scale: {user.accessibility.textScale}</span>
                          )}
                          {user.accessibility.reducedMotion && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">No Motion</span>
                          )}
                          {user.accessibility.legibilityFont !== 'standard' && (
                            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border text-[9px]">Dyslexic Font</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-[10px] font-normal">Using system defaults</span>
                      )}
                    </td>

                    {!isCoAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditUserClick(user)}
                            className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-md transition cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUserClick(user.email)}
                            disabled={user.email === 'admin@senshikarate.com'}
                            className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-md transition disabled:opacity-30 cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dangerous Zone */}
      {isCoAdmin ? (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-6 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">Access Restricted</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Co-Admins are not permitted to perform database resets. Please contact the primary Tournament Director for full system updates.
          </p>
        </div>
      ) : (
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-red-500">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider">Danger Zone</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Perform administrative database resets. This clears the cache and refreshes state telemetry back to initial parameters.
          </p>
          <div>
            <button
              onClick={handleResetDatabase}
              disabled={resetting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>{resetting ? 'Resetting...' : 'Reset Database Cache'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

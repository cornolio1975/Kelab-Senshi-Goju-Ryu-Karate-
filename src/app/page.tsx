'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/db/dbClient';
import { Participant, Club, Country } from '@/db/types';
import { 
  Users, UserCheck, Flame, HeartPulse, CreditCard, ShieldAlert, 
  MapPin, Landmark, ArrowRight, ArrowUpRight, TrendingUp, RefreshCw 
} from 'lucide-react';

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pList, cList, cntList] = await Promise.all([
        db.participants.list(),
        db.clubs.list(),
        db.countries.list()
      ]);
      setParticipants(pList);
      setClubs(cList);
      setCountries(cntList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  if (!mounted) return null;

  // Compute Statistics
  const total = participants.length;
  const male = participants.filter(p => p.gender === 'Male').length;
  const female = participants.filter(p => p.gender === 'Female').length;
  
  const confirmed = participants.filter(p => p.status === 'Confirmed').length;
  const checkedIn = participants.filter(p => p.status === 'Checked In').length;
  const pending = participants.filter(p => p.status === 'Pending').length;
  
  const paid = participants.filter(p => p.payment_status === 'Paid').length;
  const unpaid = participants.filter(p => p.payment_status === 'Unpaid').length;
  const pendingPayment = participants.filter(p => p.payment_status === 'Pending').length;
  
  const medicalIssues = participants.filter(p => p.medical_status === 'Action Required').length;
  const reviewNeeded = participants.filter(p => p.medical_status === 'Review Needed').length;

  const uniqueClubsCount = Array.from(new Set(participants.map(p => p.club_id).filter(Boolean))).length;
  const uniqueCountriesCount = Array.from(new Set(participants.map(p => p.nationality_code).filter(Boolean))).length;

  // Recent 5 participants
  const recentParticipants = [...participants]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'Checked In': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Disqualified': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  // SVG Registration Trend line coordinates (Simulating last 7 days of registrations)
  const chartPoints = "10,120 75,90 140,110 205,60 270,80 335,40 400,20";

  return (
    <div className="p-6 space-y-6 text-foreground w-full">
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tournament Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time participation telemetry and registration insight metrics</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Data</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-secondary/35 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Widget Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Total Registrants */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between relative group hover:border-muted-foreground/35 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Total Participants</span>
                <span className="text-3xl font-extrabold block">{total}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="text-emerald-500 font-semibold">{male} Male</span> • <span>{female} Female</span>
                </span>
              </div>
              <div className="h-10 w-10 bg-primary/5 text-primary rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </div>

            {/* 2. Confirmed & Checked In */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between relative group hover:border-muted-foreground/35 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Checked In / Confirmed</span>
                <span className="text-3xl font-extrabold block">{checkedIn} <span className="text-sm font-semibold text-muted-foreground">/ {confirmed}</span></span>
                <span className="text-[10px] text-muted-foreground block">
                  {pending} registration(s) pending approval
                </span>
              </div>
              <div className="h-10 w-10 bg-emerald-500/5 text-emerald-500 rounded-lg flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            {/* 3. Payments Paid */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between relative group hover:border-muted-foreground/35 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Payment Settlement</span>
                <span className="text-3xl font-extrabold block">{paid} <span className="text-sm font-semibold text-muted-foreground">Paid</span></span>
                <span className="text-[10px] text-muted-foreground block">
                  {unpaid} unpaid • {pendingPayment} pending checkout
                </span>
              </div>
              <div className="h-10 w-10 bg-blue-500/5 text-blue-500 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            {/* 4. Medical Flags */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between relative group hover:border-muted-foreground/35 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Medical Conditions Alert</span>
                <span className={`text-3xl font-extrabold block ${medicalIssues > 0 ? 'text-red-500' : ''}`}>{medicalIssues}</span>
                <span className="text-[10px] text-muted-foreground block">
                  {reviewNeeded} dossier(s) awaiting clinical verification
                </span>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${medicalIssues > 0 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/5 text-amber-500'}`}>
                {medicalIssues > 0 ? <ShieldAlert className="h-5 w-5 animate-bounce" /> : <HeartPulse className="h-5 w-5" />}
              </div>
            </div>
          </div>

          {/* Secondary stats & quick summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick stats on Geography & Clubs */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-500/5 text-indigo-500 flex items-center justify-center">
                  <Landmark className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground block">Participating Clubs</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">{uniqueClubsCount} club dojos</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Active in system</span>
                <span className="text-xs font-semibold block text-indigo-500">{clubs.length} total registered</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-violet-500/5 text-violet-500 flex items-center justify-center">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground block">Represented Countries</span>
                  <span className="text-xl font-bold text-foreground mt-0.5 block">{uniqueCountriesCount} nations</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Countries available</span>
                <span className="text-xs font-semibold block text-violet-500">{countries.length} total flags</span>
              </div>
            </div>
          </div>

          {/* Chart & Recent Activity List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Chart (SVG based registration trend) */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs lg:col-span-2 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Registration Velocity Trend</h4>
                  <p className="text-[11px] text-muted-foreground">Volume of registrations recorded over the last 7 days</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                  <TrendingUp className="h-3 w-3" />
                  <span>+14% Increase</span>
                </div>
              </div>
              
              {/* Custom SVG Line Chart */}
              <div className="flex-1 w-full min-h-[220px] flex items-center justify-center relative pt-4">
                <svg className="w-full h-[180px]" viewBox="0 0 410 130" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="20" x2="410" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                  <line x1="0" y1="60" x2="410" y2="60" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                  <line x1="0" y1="100" x2="410" y2="100" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                  
                  {/* Gradient fill */}
                  <defs>
                    <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={`M 10,130 L ${chartPoints} L 400,130 Z`} fill="url(#chart-grad)" />

                  {/* Trend line */}
                  <polyline
                    fill="none"
                    stroke="var(--foreground)"
                    strokeWidth="2.5"
                    points={chartPoints}
                  />

                  {/* Dots */}
                  <circle cx="10" cy="120" r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
                  <circle cx="75" cy="90" r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
                  <circle cx="140" cy="110" r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
                  <circle cx="205" cy="60" r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
                  <circle cx="270" cy="80" r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
                  <circle cx="335" cy="40" r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
                  <circle cx="400" cy="20" r="4.5" fill="var(--card)" stroke="var(--foreground)" strokeWidth="2" />
                </svg>

                {/* Day Labels */}
                <div className="flex justify-between w-full text-[10px] text-muted-foreground px-1.5 mt-1 font-semibold">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>

            {/* Recent Registrations Feed */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Recent Registrations</h4>
                  <p className="text-[11px] text-muted-foreground">Latest athletes onboarded to the championship</p>
                </div>
                <Link 
                  href="/participants" 
                  prefetch={false}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* List */}
              <div className="flex-1 space-y-3.5 overflow-y-auto">
                {recentParticipants.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">
                    No registered participants found.
                  </div>
                ) : (
                  recentParticipants.map((p) => {
                    const countryFlag = countries.find(c => c.code === p.nationality_code)?.flag_emoji || '🏳️';
                    const clubName = clubs.find(c => c.id === p.club_id)?.name || 'Independent';

                    return (
                      <div key={p.id} className="flex items-start justify-between border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex gap-2.5 min-w-0">
                          <div className="h-8.5 w-8.5 rounded-full bg-secondary text-foreground font-bold flex items-center justify-center text-xs shrink-0 uppercase border border-border">
                            {p.full_name.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-foreground block truncate hover:underline">
                              {p.full_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              {countryFlag} {clubName}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                          <span className="text-[9px] text-muted-foreground block mt-0.5 font-mono">
                            {p.registration_no}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

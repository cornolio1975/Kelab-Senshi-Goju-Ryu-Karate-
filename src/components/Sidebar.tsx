'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, UsersRound, Tags, GitPullRequest, 
  CalendarDays, Sword, ShieldCheck, Award, FileText, Settings, Trophy, Tv, LogOut, Zap,
  CalendarCheck, History
} from 'lucide-react';
import { useTournament } from '@/context/TournamentContext';
import { basePath } from '@/db/dbClient';

const MENU_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { name: 'Participants', icon: Users, path: '/participants' },
  { name: 'Teams', icon: UsersRound, path: '/teams' },
  { name: 'Dojos', icon: Award, path: '/clubs' },
  { name: 'Categories', icon: Tags, path: '/categories' },
  { name: 'Draws', icon: GitPullRequest, path: '/draws', badge: 'Draft' },
  { name: 'Schedule', icon: CalendarDays, path: '/schedule' },
  { name: 'Bouts', icon: Sword, path: '/bouts' },
  { name: 'Scoring Board', icon: Zap, path: '/dashboard/scoreboard', badge: 'WKF' },
  { name: 'Officials', icon: ShieldCheck, path: '/officials' },
  { name: 'Public Scoreboard', icon: Tv, path: '/public', badge: 'Live' },
  { name: 'Upcoming Tournaments', icon: CalendarCheck, path: '/public/tournaments', badge: 'New' },
  { name: 'Past Tournaments', icon: History, path: '/public/past-tournaments' },
  { name: 'Tournaments Admin', icon: Trophy, path: '/admin/tournaments', badge: 'Admin' },
  { name: 'Reports', icon: FileText, path: '/reports' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userRole, userEmail, logout, logoUrl } = useTournament();

  const getInitials = () => {
    if (!userRole) return 'AD';
    if (userRole === 'Co-Admin') return 'CO';
    return 'AD';
  };

  return (
    <aside
      className={`
        no-print
        w-64 bg-card border-r border-border h-screen flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        fixed top-0 left-0 z-40
        md:static md:z-auto md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
        <div className="h-10 w-10 rounded-full overflow-hidden border border-white/20 bg-slate-900 shrink-0">
          <img src={logoUrl || `${basePath}/logo.jpg`} alt="Logo" className="h-full w-full object-cover" />
        </div>
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

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.path}
              prefetch={false}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-secondary text-foreground shadow-sm border-l-2 border-primary pl-2.5'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              }`} />
              <span className="truncate">{item.name}</span>
              
              {item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-secondary/20 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
            {getInitials()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-xs block text-foreground truncate">{userRole || 'Admin'} Director</span>
            <span className="text-[10px] text-muted-foreground truncate block">{userEmail || 'admin@senshikarate.com'}</span>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-border text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

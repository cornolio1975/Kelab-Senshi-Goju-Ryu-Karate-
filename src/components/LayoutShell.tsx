'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TournamentProvider, useTournament } from '@/context/TournamentContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ImportModal from './ImportModal';
import LoginPage from '@/app/login/page';

function LayoutShellContent({ children }: { children: React.ReactNode }) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, userRole } = useTournament();

  // Auto-minimize sidebar on mobile: start closed on small screens
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsSidebarOpen(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsSidebarOpen(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Auto-close sidebar when navigating on mobile
  useEffect(() => {
    const isMobile = !window.matchMedia('(min-width: 768px)').matches;
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const isPublicOrAuthRoute = pathname?.startsWith('/public') || pathname?.startsWith('/auth');

  // If public or auth route, render directly without admin frame
  if (isPublicOrAuthRoute) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <main className="flex-1 overflow-y-auto bg-background focus:outline-none relative text-foreground">
          {children}
        </main>
      </div>
    );
  }

  // If not logged in, force render the login screen
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // Standard Admin layout for logged in Admin/Co-Admin
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Mobile backdrop overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <TopBar
          onImportClick={() => setIsImportOpen(true)}
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto bg-background focus:outline-none relative">
          {children}
        </main>
      </div>

      {/* Global Import Modal */}
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <TournamentProvider>
      <LayoutShellContent>{children}</LayoutShellContent>
    </TournamentProvider>
  );
}

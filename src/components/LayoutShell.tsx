'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { TournamentProvider, useTournament } from '@/context/TournamentContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ImportModal from './ImportModal';
import LoginPage from '@/app/login/page';

function LayoutShellContent({ children }: { children: React.ReactNode }) {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const pathname = usePathname();
  const { isLoggedIn, userRole } = useTournament();

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
      {/* Sidebar */}
      <Sidebar />

      {/* Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <TopBar onImportClick={() => setIsImportOpen(true)} />

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

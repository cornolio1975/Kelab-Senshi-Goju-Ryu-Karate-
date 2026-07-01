'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTournament } from '@/context/TournamentContext';
import { supabase } from '@/db/dbClient';

export default function AuthCallback() {
  const router = useRouter();
  const { login, usersList, addUser } = useTournament();
  const [statusMessage, setStatusMessage] = useState('Completing authentication, please wait...');

  useEffect(() => {
    if (!supabase) {
      router.push('/login');
      return;
    }

    let isTriggered = false;

    const checkSessionAndHandle = async (session: any) => {
      if (isTriggered) return;
      if (!session?.user) return;

      isTriggered = true;
      const email = session.user.email;
      if (email) {
        // Find matched user
        const matchedUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (matchedUser) {
          if (matchedUser.status === 'Suspended') {
            setStatusMessage('Your account is suspended. Logging out...');
            if (supabase) await supabase.auth.signOut();
            setTimeout(() => router.push('/login?error=suspended'), 3000);
            return;
          }

          login(matchedUser.role, matchedUser.email);
          setStatusMessage(`Logged in as ${matchedUser.role}. Redirecting...`);
          router.push(matchedUser.role === 'Viewer' ? '/public' : '/');
        } else {
          // Extract OAuth user metadata
          const oauthRole = session.user.user_metadata?.role || 'Viewer';
          const oauthName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];
          
          // Register new OAuth user locally
          const newUser = {
            name: oauthName,
            email: email,
            role: oauthRole as 'Admin' | 'Co-Admin' | 'Viewer',
            status: 'Active' as const,
            accessibility: {
              themeContrast: 'standard' as const,
              textScale: 'standard' as const,
              reducedMotion: false,
              legibilityFont: 'standard' as const,
            }
          };
          
          addUser(newUser);
          login(oauthRole, email);
          
          setStatusMessage(`Account registered. Logged in as ${oauthRole}. Redirecting...`);
          router.push(oauthRole === 'Viewer' ? '/public' : '/');
        }
      }
    };

    // 1. Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkSessionAndHandle(session);
      }
    });

    // 2. Listen to state changes (in case session is set asynchronously from hash/code parsing)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        checkSessionAndHandle(session);
      }
    });

    // 3. Fallback timeout if no session is detected after 4 seconds
    const timeoutId = setTimeout(() => {
      if (!isTriggered) {
        setStatusMessage('No active session found. Redirecting to login...');
        router.push('/login');
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [usersList, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold tracking-tight text-foreground">Google Authentication</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{statusMessage}</p>
        </div>
      </div>
    </div>
  );
}

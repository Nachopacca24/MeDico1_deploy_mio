// src/shared/hooks/useInvitationBadges.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { colleaguesService } from '@/services/colleaguesService';
import { useAuth } from '@/shared/contexts/AuthContext';

const POLL_INTERVAL_MS = 60_000;

export const CASE_INVITATIONS_EVENT = 'medico:caseInvitationsViewed';
export const COLLEAGUE_REQUESTS_EVENT = 'medico:colleagueRequestsViewed';

interface InvitationBadges {
  hasPendingCases: boolean;
  hasPendingColleagues: boolean;
}

export function useInvitationBadges(): InvitationBadges {
  const { isAuthenticated, user } = useAuth();
  const [hasPendingCases, setHasPendingCases] = useState(false);
  const [hasPendingColleagues, setHasPendingColleagues] = useState(false);
  const mountedRef = useRef(true);

  const canFetch = isAuthenticated && user?.is_email_verified;

  const fetchBadges = useCallback(async () => {
    if (!canFetch) return;
    try {
      const [casesRes, colleaguesRes] = await Promise.allSettled([
        surgicalCaseService.getAssistedCases(),
        colleaguesService.getFriendRequests(),
      ]);

      if (!mountedRef.current) return;

      if (casesRes.status === 'fulfilled') {
        setHasPendingCases(casesRes.value.total_pending > 0);
      }
      if (colleaguesRes.status === 'fulfilled') {
        setHasPendingColleagues(colleaguesRes.value.received.count > 0);
      }
    } catch {
      // silently fail — badges are non-critical
    }
  }, [canFetch]);

  useEffect(() => {
    mountedRef.current = true;
    fetchBadges();
    const interval = setInterval(fetchBadges, POLL_INTERVAL_MS);

    const onCasesSeen = () => setHasPendingCases(false);
    const onColleaguesSeen = () => setHasPendingColleagues(false);

    window.addEventListener(CASE_INVITATIONS_EVENT, onCasesSeen);
    window.addEventListener(COLLEAGUE_REQUESTS_EVENT, onColleaguesSeen);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener(CASE_INVITATIONS_EVENT, onCasesSeen);
      window.removeEventListener(COLLEAGUE_REQUESTS_EVENT, onColleaguesSeen);
    };
  }, [fetchBadges]);

  return { hasPendingCases, hasPendingColleagues };
}

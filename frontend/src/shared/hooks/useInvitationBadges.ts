// src/shared/hooks/useInvitationBadges.ts

import { useState, useEffect, useRef } from 'react';
import { surgicalCaseService } from '@/services/surgicalCaseService';
import { colleaguesService } from '@/services/colleaguesService';

const POLL_INTERVAL_MS = 60_000;

export const CASE_INVITATIONS_EVENT = 'medico:caseInvitationsViewed';
export const COLLEAGUE_REQUESTS_EVENT = 'medico:colleagueRequestsViewed';

interface InvitationBadges {
  hasPendingCases: boolean;
  hasPendingColleagues: boolean;
}

export function useInvitationBadges(): InvitationBadges {
  const [hasPendingCases, setHasPendingCases] = useState(false);
  const [hasPendingColleagues, setHasPendingColleagues] = useState(false);
  const mountedRef = useRef(true);

  const fetchBadges = async () => {
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
  };

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
  }, []);

  return { hasPendingCases, hasPendingColleagues };
}

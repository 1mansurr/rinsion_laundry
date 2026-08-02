import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { apiPost } from '@/lib/api';
import { RIDER_ROLE } from '@/constants/statuses';

/**
 * Registers this device for push once, for a field rider account only —
 * admins manage the roster/queue and aren't a push target in this milestone.
 * Best-effort: a denied permission or Expo Go's lack of push support just
 * means no token gets saved, the in-app rider_notifications badge still works.
 */
export function useRegisterRiderPush() {
  const { profile } = useAuth();
  const isFieldRider = profile?.kind === 'rider' && profile.role === RIDER_ROLE.RIDER;

  useEffect(() => {
    if (!isFieldRider) return;
    let cancelled = false;

    registerForPushNotificationsAsync().then(token => {
      if (!cancelled && token) {
        apiPost('/api/mobile/rider/push-token', { token }).catch(() => null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isFieldRider]);
}

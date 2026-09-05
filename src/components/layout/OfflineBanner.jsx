import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Sparkles } from 'lucide-react';

/**
 * Hook to track online/offline status with graceful reconnection timers
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        const timer = setTimeout(() => {
          setShowReconnected(false);
          setWasOffline(false);
        }, 3500);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, showReconnected };
}

/**
 * Spec 3.3: Discrete Offline & Reconnection Status Banner
 */
export default function OfflineBanner() {
  const { isOnline, showReconnected } = useNetworkStatus();

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full transition-all duration-500 z-40 border-b backdrop-blur-md px-4 py-2 flex items-center justify-center gap-2 text-xs font-medium shadow-md ${
        !isOnline
          ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
          : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span>⚡ Nincs internetkapcsolat – a ruhatárad és mentett szettjeid offline is böngészhetők</span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>✓ Újra online – minden AI stylist és döntéstámogató funkció aktív</span>
        </>
      )}
    </div>
  );
}

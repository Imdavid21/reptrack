import { useEffect, useState } from 'react';

export function CompactRestBar({ duration, startedAt, onDismiss }: { duration: number; startedAt: number | null; onDismiss: () => void }) {
  const [adjustment, setAdjustment] = useState(0); const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!startedAt) return; setAdjustment(0); const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, [startedAt]);
  if (!startedAt) return null;
  const remaining = Math.max(0, duration + adjustment - Math.floor((now - startedAt) / 1000)); const time = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  return <div className="fixed z-40 bottom-[calc(68px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[min(94vw,620px)] rounded-full bg-foreground text-background shadow-lg px-4 py-2 flex items-center gap-2"><span className="text-xs font-semibold">Rest</span><span className="font-bold tabular-nums text-lg flex-1">{time}</span><button onClick={() => setAdjustment(value => value - 15)} className="h-11 px-2 text-xs font-bold">−15</button><button onClick={() => setAdjustment(value => value + 15)} className="h-11 px-2 text-xs font-bold">+15</button><button onClick={onDismiss} className="h-11 px-2 text-xs font-bold">Skip</button></div>;
}

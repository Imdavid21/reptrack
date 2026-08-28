import { MainLayout } from '@/components/layout/MainLayout';

function Block({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  return <MainLayout>
    <div className="mx-auto grid w-full max-w-[680px] gap-5 pb-5" aria-label="Loading dashboard" role="status">
      <div className="flex items-center justify-between gap-3">
        <Block className="h-10 w-36 rounded-xl" />
        <div className="flex gap-2"><Block className="h-11 w-11 rounded-full" /><Block className="h-11 w-11 rounded-full" /></div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-card divide-y divide-border">
        {[0, 1, 2].map(row => <div key={row} className="flex min-h-14 items-center justify-between px-4 py-3"><Block className="h-4 w-24" /><Block className="h-5 w-20" /></div>)}
      </div>

      <div className="rounded-[20px] border border-border bg-card p-4">
        <div className="flex items-center justify-between"><Block className="h-4 w-24" /><Block className="h-6 w-20" /></div>
        <Block className="mt-4 h-2 w-full rounded-full" />
        <div className="mt-4 grid grid-cols-3 gap-3"><Block className="h-16" /><Block className="h-16" /><Block className="h-16" /></div>
      </div>

      <div className="rounded-[20px] border border-border bg-card p-4">
        <div className="flex items-center justify-between"><Block className="h-4 w-28" /><Block className="h-5 w-16" /></div>
        <div className="mt-4 grid grid-cols-2 gap-3"><Block className="h-16" /><Block className="h-16" /></div>
      </div>
      <span className="sr-only">Loading today&apos;s data</span>
    </div>
  </MainLayout>;
}

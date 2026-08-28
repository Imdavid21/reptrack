import type { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from './DataroomRangeSelector';

export function DataroomPageShell({ title, description, children, wide = true }: { title: string; eyebrow?: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <DataroomRangeProvider><MainLayout showBack backTo="/app/dataroom" wide={wide}>
    <div className="mx-auto w-full max-w-[1040px] pb-12">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h1 className="type-page-title">{title}</h1>{description && <p className="type-supporting mt-1 max-w-2xl">{description}</p>}</div><div className="shrink-0"><DataroomRangeSelector /></div></header>
      {children}
    </div>
  </MainLayout></DataroomRangeProvider>;
}

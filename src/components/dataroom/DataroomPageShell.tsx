import type { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from './DataroomRangeSelector';

export function DataroomPageShell({ title, eyebrow, description, children, wide = true }: { title: string; eyebrow?: string; description?: string; children: ReactNode; wide?: boolean }) {
  return <DataroomRangeProvider><MainLayout showBack backTo="/app/dataroom" wide={wide}>
    <div className="mx-auto w-full max-w-[980px] pb-12">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div>{eyebrow && <div className="type-eyebrow">{eyebrow}</div>}<h1 className="type-page-title mt-1">{title}</h1>{description && <p className="type-supporting mt-1 max-w-2xl">{description}</p>}</div><DataroomRangeSelector /></header>
      {children}
    </div>
  </MainLayout></DataroomRangeProvider>;
}

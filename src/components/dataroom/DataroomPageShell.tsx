import { ReactNode, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataroomRangeProvider } from '@/contexts/DataroomRangeContext';
import { DataroomRangeSelector } from './DataroomRangeSelector';
import { cn } from '@/lib/utils';

export function DataroomPageShell({
  title,
  eyebrow,
  description,
  children,
  wide = true,
  stickyRange = true,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
  stickyRange?: boolean;
}) {
  return <DataroomRangeProvider><MainLayout showBack backTo="/app/dataroom" wide={wide}>
    <DataroomPageShellInner title={title} eyebrow={eyebrow} description={description} stickyRange={stickyRange}>
      {children}
    </DataroomPageShellInner>
  </MainLayout></DataroomRangeProvider>;
}

function DataroomPageShellInner({
  title,
  eyebrow,
  description,
  children,
  stickyRange,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  stickyRange: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!stickyRange) return;
    const onScroll = () => setScrolled(window.scrollY > 72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [stickyRange]);

  return <div className="mx-auto w-full max-w-[980px] pb-12">
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="type-eyebrow">{eyebrow}</div>}
        <h1 className="type-page-title mt-1">{title}</h1>
        {description && <p className="type-supporting mt-1 max-w-2xl">{description}</p>}
      </div>
      <div className="hidden sm:block"><DataroomRangeSelector /></div>
    </header>

    <div className={cn(
      'sm:hidden -mx-4 px-4 mb-6 transition-colors',
      stickyRange && 'sticky top-0 z-30 py-2',
      stickyRange && scrolled && 'bg-background/95 backdrop-blur border-b border-border',
    )}>
      <DataroomRangeSelector />
    </div>

    {children}
  </div>;
}

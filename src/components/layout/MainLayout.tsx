import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  hideHeader?: boolean;
}

export function MainLayout({ children, title, hideHeader }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-24">
      {!hideHeader && <Header title={title} />}
      <main className="px-5 py-6 max-w-lg mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
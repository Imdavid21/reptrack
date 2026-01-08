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
    <div className="min-h-screen bg-background pb-20">
      {!hideHeader && <Header title={title} />}
      <main className="px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Blog</h1>
        <p className="text-muted-foreground mb-12">Training tips, product updates, and fitness insights.</p>

        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">Coming soon.</p>
        </div>
      </main>

      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Logo size="sm" />
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}

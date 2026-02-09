import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { blogPosts } from '@/data/blogPosts';


export default function Blog() {
  const sortedPosts = [...blogPosts].sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());

  return (
    <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Blog</h1>
          <p className="text-muted-foreground mb-12">Practical guides on progressive overload, workout logging, and building a training system that lasts.</p>

          <div className="grid gap-6 md:grid-cols-2">
            {sortedPosts.map(post => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group block rounded-lg border border-border overflow-hidden hover:border-foreground/20 transition-colors"
              >
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={post.heroImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {post.funnel === 'tofu' ? 'Fundamentals' : post.funnel === 'mofu' ? 'Systems' : 'Tools'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(post.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-foreground group-hover:underline leading-snug mb-1">
                    {post.title}
                  </h2>
                  <p className="text-xs text-muted-foreground line-clamp-2">{post.tldr}</p>
                </div>
              </Link>
            ))}
          </div>
        </main>

        <footer className="py-8 px-4 border-t border-border">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Logo size="sm" />
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Back to home
            </Link>
          </div>
        </footer>
      </div>
  );
}

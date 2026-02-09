import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Tag, ArrowRight, X } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { getBlogPostBySlug, blogPosts } from '@/data/blogPosts';
import { useSEO } from '@/hooks/useSEO';

function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-lg font-semibold mt-8 mb-3">{line.slice(4)}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-xl md:text-2xl font-bold mt-10 mb-4">{line.slice(3)}</h2>);
      i++;
      continue;
    }

    // Table
    if (line.includes('|') && lines[i + 1]?.includes('---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
      const rows = tableLines.slice(2).map(row => row.split('|').filter(c => c.trim()).map(c => c.trim()));
      elements.push(
        <div key={key++} className="overflow-x-auto my-6">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-4 py-3 text-left font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-t border-border">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 text-muted-foreground">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Checklist items
    if (line.startsWith('- [ ] ')) {
      const checkItems: string[] = [];
      while (i < lines.length && lines[i].startsWith('- [ ] ')) {
        checkItems.push(lines[i].slice(6));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-4 space-y-2">
          {checkItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="w-4 h-4 mt-0.5 rounded border border-border flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-4 space-y-2 list-decimal list-inside">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm text-muted-foreground leading-relaxed">{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list / bullet points
    if (line.startsWith('- **')) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].startsWith('- **')) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-4 space-y-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
              <span className="text-foreground mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // FAQ Q&A
    if (line.startsWith('**Q:')) {
      const question = line.replace(/\*\*/g, '');
      i++;
      const answer = lines[i]?.startsWith('A:') ? lines[i].slice(3) : '';
      i++;
      elements.push(
        <div key={key++} className="my-4">
          <p className="text-sm font-semibold text-foreground">{question}</p>
          <p className="text-sm text-muted-foreground mt-1">{answer}</p>
        </div>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(<p key={key++} className="text-sm text-muted-foreground leading-relaxed my-3">{renderInline(line)}</p>);
    i++;
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Handle bold text
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;
  const [showBar, setShowBar] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useSEO({
    title: post?.metaTitle ?? 'RepTrack Blog',
    description: post?.metaDescription ?? '',
    canonical: post ? `https://reps-and-reminders.lovable.app/blog/${post.slug}` : undefined,
  });

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setShowBar(scrolled > 0.3);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [dismissed]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const relatedPosts = post.internalLinks
    .map(s => blogPosts.find(p => p.slug === s))
    .filter(Boolean) as typeof blogPosts;

  return (
    <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link to="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">All posts</span>
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-12 md:py-20">
          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(post.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{post.funnel.toUpperCase()}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">{post.title}</h1>

          {/* TLDR */}
          <div className="bg-muted rounded-lg p-4 mb-8 border border-border">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">TLDR</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{post.tldr}</p>
          </div>

          {/* Hero Image */}
          <div className="rounded-lg overflow-hidden mb-10 aspect-video bg-muted">
            <img src={post.heroImage} alt={post.title} className="w-full h-full object-cover" loading="lazy" />
          </div>

          {/* Content */}
          <article className="prose-none">
            {renderMarkdown(post.content)}
          </article>

          {/* Subtle inline CTA */}
          <div className="my-12 py-6 border-y border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ready to put this into practice?{' '}
              <Link to="/sign-up" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
                Start logging with RepTrack
              </Link>
              {' '}and see your progression automatically.
            </p>
          </div>

          {/* Internal links */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 pt-8 border-t border-border">
              <h3 className="text-lg font-semibold mb-4">Related Posts</h3>
              <div className="space-y-3">
                {relatedPosts.map(rp => (
                  <Link
                    key={rp.slug}
                    to={`/blog/${rp.slug}`}
                    className="block p-4 rounded-lg border border-border hover:border-foreground/20 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{rp.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rp.metaDescription}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
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

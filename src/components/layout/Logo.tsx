export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { text: 'text-xs', svg: 'w-6 h-3' },
    md: { text: 'text-sm', svg: 'w-8 h-4' },
    lg: { text: 'text-lg', svg: 'w-12 h-6' },
  };

  return (
    <div className="flex items-center gap-2">
      {/* Heartbeat SVG */}
      <svg
        viewBox="0 0 48 24"
        className={sizes[size].svg}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline
          points="0,12 12,12 16,12 20,4 24,20 28,12 32,12 48,12"
          className="text-foreground"
        />
      </svg>
      <div className={`font-bold tracking-[0.2em] ${sizes[size].text}`}>
        <span className="text-foreground">HEALTH</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground">OS</span>
      </div>
    </div>
  );
}

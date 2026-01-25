export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  return (
    <div className={`font-bold tracking-[0.3em] ${sizes[size]}`}>
      <span className="text-foreground">HEALTH</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-foreground">OS</span>
    </div>
  );
}

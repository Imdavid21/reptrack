import logoHeart from '@/assets/logo-heart.png';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { img: 'w-5 h-5', text: 'text-xs' },
    md: { img: 'w-6 h-6', text: 'text-sm' },
    lg: { img: 'w-10 h-10', text: 'text-lg' },
  };

  return (
    <div className="flex items-center gap-2">
      <img 
        src={logoHeart} 
        alt="HEALTH/OS" 
        className={`${sizes[size].img} object-contain`}
      />
      <div className={`font-bold tracking-[0.2em] ${sizes[size].text}`}>
        <span className="text-foreground">HEALTH</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground">OS</span>
      </div>
    </div>
  );
}

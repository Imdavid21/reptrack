const logoHeart = '/favicon.png';

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
        alt="Reptrack Fitness"
        className={`${sizes[size].img} object-contain rounded-md`}
      />
      <div className={`font-bold tracking-[0.15em] ${sizes[size].text}`}>
        <span className="text-foreground">Reptrack</span>
        <span className="text-muted-foreground"> </span>
        <span className="text-foreground">Fitness</span>
      </div>
    </div>
  );
}

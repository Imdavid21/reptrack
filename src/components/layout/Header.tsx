interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-widest">{title || 'Reptrack Fitness'}</h1>
      </div>
    </header>
  );
}

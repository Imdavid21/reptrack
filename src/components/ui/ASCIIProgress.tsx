interface ASCIIProgressProps {
  value: number;
  max: number;
  width?: number;
  showPercent?: boolean;
}

export function ASCIIProgress({ 
  value, 
  max, 
  width = 20, 
  showPercent = true 
}: ASCIIProgressProps) {
  const percent = Math.min(Math.round((value / max) * 100), 100);
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  return (
    <span className="font-mono text-sm">
      {bar}
      {showPercent && <span className="ml-2 tabular-nums">{percent}%</span>}
    </span>
  );
}

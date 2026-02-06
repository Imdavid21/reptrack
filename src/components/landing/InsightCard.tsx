interface InsightCardProps {
  label: string;
  text: string;
  meta?: string;
}

export default function InsightCard({ label, text, meta }: InsightCardProps) {
  return (
    <div className="border border-border rounded-xl p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm mb-2">{text}</div>
      {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}

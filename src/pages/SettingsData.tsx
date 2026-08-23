import { useState } from 'react';
import { ChevronRight, Download, FileUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataManagementSection } from '@/components/settings/DataManagementSection';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useNavigate } from 'react-router-dom';

function Row({ icon: Icon, title, detail, onClick }: { icon: typeof Download; title: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full min-h-14 px-4 py-3 text-left flex items-center gap-3 hover:bg-muted/30"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block type-caption mt-0.5">{detail}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground"/></button>;
}

export default function SettingsData() {
  const [expanded, setExpanded] = useState(false);
  const advanced = useAdvancedMode();
  const navigate = useNavigate();

  return <MainLayout showBack backTo="/app/settings" hideNav>
    <div className="mx-auto max-w-[760px] pb-12">
      <header className="mb-6"><div className="type-eyebrow">Settings</div><h1 className="type-page-title mt-1">Health & data</h1></header>

      {advanced.settings.enabled && <>
        <div className="type-eyebrow px-1 mb-2">Exports</div>
        <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
          <Row icon={Download} title="Coach Report" detail="Markdown + JSON" onClick={() => navigate('/app/settings/data/coach-report')} />
        </section>

        <div className="type-eyebrow px-1 mb-2">Imports</div>
        <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-5">
          <Row icon={FileUp} title="Strong / Hevy" detail="Workout CSV" onClick={() => navigate('/app/settings/data/import-workouts')} />
        </section>
      </>}

      <div className="type-eyebrow px-1 mb-2">RepTrack data</div>
      <DataManagementSection isExpanded={expanded} onToggle={() => setExpanded(value => !value)} />
    </div>
  </MainLayout>;
}

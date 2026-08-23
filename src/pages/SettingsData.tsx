import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataManagementSection } from '@/components/settings/DataManagementSection';

export default function SettingsData() {
  const [expanded, setExpanded] = useState(true);

  return <MainLayout showBack backTo="/app/settings" hideNav>
    <div className="mx-auto max-w-[760px] pb-12">
      <header className="mb-6"><div className="type-eyebrow">Settings</div><h1 className="type-page-title mt-1">Health & data</h1><p className="type-supporting mt-1">Export or import existing RepTrack records. This does not create a second fitness-data model.</p></header>
      <DataManagementSection isExpanded={expanded} onToggle={() => setExpanded(value => !value)} />
    </div>
  </MainLayout>;
}

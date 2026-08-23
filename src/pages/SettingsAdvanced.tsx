import { ChevronRight, RefreshCw, Server, Smartphone, Workflow } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';

function Row({ icon: Icon, title, detail, onClick }: { icon: typeof Server; title: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30"><span className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center"><Icon className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block type-caption mt-0.5">{detail}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground"/></button>;
}

export default function SettingsAdvanced() {
  const navigate = useNavigate();
  const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));

  const forceUpdate = async () => {
    if (!window.confirm('Reload RepTrack from the latest cached application files? Finish or safely pause any active workout first.')) return;
    toast.info('Refreshing application files…');
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
    } catch (error) {
      console.error('Force update failed', error);
    } finally {
      window.location.reload();
    }
  };

  return <MainLayout showBack backTo="/app/settings" hideNav>
    <div className="mx-auto max-w-[700px] pb-12">
      <header className="mb-6"><div className="type-eyebrow">Settings</div><h1 className="type-page-title mt-1">Advanced</h1><p className="type-supporting mt-1">Integrations, adaptive diagnostics, installation, and application maintenance.</p></header>

      <section className="rounded-[20px] border border-border bg-card overflow-hidden divide-y divide-border mb-6">
        <Row icon={Server} title="ChatGPT data connection" detail="MCP status, available tools, and setup" onClick={() => navigate('/app/settings/mcp')} />
        <Row icon={Workflow} title="Adaptive lifecycle" detail="Inspect lifecycle and progression diagnostics" onClick={() => navigate('/app/settings/advanced/lifecycle')} />
      </section>

      {!standalone && <section className="border-y border-border py-5 mb-6"><div className="flex items-start gap-3"><Smartphone className="h-5 w-5 mt-0.5"/><div><h2 className="text-sm font-semibold">Install RepTrack</h2><p className="type-caption mt-1">On iPhone Safari use Share → Add to Home Screen. On Android Chrome use the browser menu → Install app / Add to Home screen.</p></div></div></section>}

      <section className="border-y border-border py-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><RefreshCw className="h-4 w-4"/><h2 className="text-sm font-semibold">Force application refresh</h2></div><p className="type-caption mt-1 max-w-lg">Clears application caches and reloads. This is a maintenance control, not part of the normal Settings path.</p></div><button onClick={forceUpdate} className="min-h-11 rounded-xl bg-muted px-4 text-xs font-semibold shrink-0">Refresh</button></div></section>
    </div>
  </MainLayout>;
}

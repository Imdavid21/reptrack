import { useNavigate } from 'react-router-dom';
import { ChevronRight, Database, Dumbbell, Link2, Moon, ShieldCheck, SlidersHorizontal, Sun, UserRound, Wrench } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';

function SettingsRow({ icon: Icon, title, detail, onClick }: { icon: typeof UserRound; title: string; detail?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30">
      <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span>{detail && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export default function SettingsHome() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isDark, setIsDark } = useTheme();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) navigate('/signin', { replace: true });
  };

  return (
    <MainLayout showBack backTo="/app">
      <div className="mx-auto w-full max-w-[680px] space-y-7 pb-8">
        <header>
          <p className="type-eyebrow">Administration</p>
          <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.03em]">Settings</h1>
        </header>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Account</h2>
          <div className="overflow-hidden rounded-[18px] border border-border bg-card divide-y divide-border">
            <SettingsRow icon={UserRound} title="Account and profile" detail={user?.email || 'Profile, goals, units'} onClick={() => navigate('/app/settings/advanced#account')} />
            <SettingsRow icon={ShieldCheck} title="Health and data" detail="Connections, export, import, data controls" onClick={() => navigate('/app/settings/data')} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Preferences</h2>
          <div className="overflow-hidden rounded-[18px] border border-border bg-card divide-y divide-border">
            <div className="flex min-h-16 items-center gap-3 px-4 py-3">
              {isDark ? <Moon className="h-4.5 w-4.5 text-muted-foreground" /> : <Sun className="h-4.5 w-4.5 text-muted-foreground" />}
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Appearance</span><span className="mt-0.5 block text-xs text-muted-foreground">{isDark ? 'Dark' : 'Light'} mode</span></span>
              <div className="inline-flex rounded-xl bg-muted p-1" role="group" aria-label="Appearance">
                <button aria-pressed={!isDark} onClick={() => setIsDark(false)} className={`min-h-9 rounded-lg px-3 text-xs font-medium ${!isDark ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Light</button>
                <button aria-pressed={isDark} onClick={() => setIsDark(true)} className={`min-h-9 rounded-lg px-3 text-xs font-medium ${isDark ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Dark</button>
              </div>
            </div>
            <SettingsRow icon={Dumbbell} title="Training" detail="Rest timer, adaptive training, workout preferences" onClick={() => navigate('/app/settings/advanced#training')} />
            <SettingsRow icon={SlidersHorizontal} title="Units and goals" detail="Existing body, nutrition, hydration and training targets" onClick={() => navigate('/app/settings/advanced#goals')} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Advanced</h2>
          <div className="overflow-hidden rounded-[18px] border border-border bg-card divide-y divide-border">
            <SettingsRow icon={Link2} title="Integrations" detail="Connected tools and MCP" onClick={() => navigate('/app/settings/mcp')} />
            <SettingsRow icon={Database} title="Data tools" detail="Existing export, import and maintenance utilities" onClick={() => navigate('/app/settings/data')} />
            <SettingsRow icon={Wrench} title="Diagnostics and all settings" detail="Lifecycle, adaptive diagnostics and legacy controls" onClick={() => navigate('/app/settings/advanced')} />
          </div>
        </section>

        <button onClick={handleSignOut} className="min-h-12 px-1 text-sm font-medium text-destructive">Sign out</button>
      </div>
    </MainLayout>
  );
}

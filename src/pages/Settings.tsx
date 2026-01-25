import { MainLayout } from '@/components/layout/MainLayout';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

export default function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();

  return (
    <MainLayout title="SETTINGS">
      <div className="space-y-6 pb-20">
        {/* Account */}
        <div>
          <div className="label-v3 mb-3">ACCOUNT</div>
          <div className="stat-v3">
            <div className="text-sm text-muted-foreground">SIGNED IN AS</div>
            <div className="font-mono text-sm mt-1">{user?.email || 'Unknown'}</div>
          </div>
        </div>

        <div className="divider-v3" />

        {/* Appearance */}
        <div>
          <div className="label-v3 mb-3">APPEARANCE</div>
          <button 
            onClick={toggleTheme}
            className="btn-v3 w-full flex items-center justify-between"
          >
            <span>THEME</span>
            <span className="text-muted-foreground">{isDark ? 'DARK' : 'LIGHT'}</span>
          </button>
        </div>

        <div className="divider-v3" />

        {/* Data */}
        <div>
          <div className="label-v3 mb-3">DATA</div>
          <div className="space-y-2">
            <button className="btn-v3 w-full text-left">
              EXPORT ALL DATA
            </button>
          </div>
        </div>

        <div className="divider-v3" />

        {/* Sign out */}
        <button 
          onClick={() => signOut()}
          className="btn-v3 w-full"
        >
          SIGN OUT
        </button>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground font-mono mt-8">
          V3.0.0 · BRUTALIST EDITION
        </div>
      </div>
    </MainLayout>
  );
}

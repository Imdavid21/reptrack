import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { DataroomSubnav } from '@/components/dataroom/DataroomSubnav';

interface MainLayoutProps {
  children: ReactNode;
  showBack?: boolean;
  backTo?: string;
  hideNav?: boolean;
  /** Wider analytical layouts without changing the mobile mental model. */
  wide?: boolean;
}

const NARROW_CONTENT_WIDTH = 680;
const WIDE_CONTENT_WIDTH = 1040;
const PAGE_GUTTER = { xs: 2, sm: 2.5, md: 3 } as const;

const DATAROOM_TOP_LEVEL = new Set([
  '/app/dataroom',
  '/app/dataroom/body',
  '/app/dataroom/training',
  '/app/dataroom/nutrition',
  '/app/dataroom/recovery',
  '/app/dataroom/activity',
  '/app/dataroom/history',
  '/app/dataroom/records',
  '/app/dataroom/explore',
  '/app/dataroom/lab',
]);

export function MainLayout({ children, showBack, backTo, hideNav = false, wide = false }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const showDataroomSubnav = DATAROOM_TOP_LEVEL.has(location.pathname);
  const isDataroom = location.pathname.startsWith('/app/dataroom');
  const contentMaxWidth = wide ? WIDE_CONTENT_WIDTH : NARROW_CONTENT_WIDTH;
  // Top-level Dataroom pages already have persistent section navigation.
  // Hiding the redundant back row keeps every section on the same vertical grid.
  const showBackHeader = Boolean(showBack && !showDataroomSubnav);

  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <Box
      data-app-layout={wide ? 'wide' : 'narrow'}
      data-dataroom-layout={isDataroom ? 'true' : undefined}
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        pb: hideNav ? 'max(16px, env(safe-area-inset-bottom))' : 'calc(60px + env(safe-area-inset-bottom))',
      }}
    >
      {showBackHeader && (
        <Box component="header" sx={{ px: PAGE_GUTTER, py: 1.5, width: '100%' }}>
          <Box sx={{ width: '100%', maxWidth: contentMaxWidth, mx: 'auto' }}>
            <button
              onClick={handleBack}
              aria-label="Go back"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          </Box>
        </Box>
      )}
      <Box component="main" sx={{ px: PAGE_GUTTER, py: { xs: 2, md: 3 }, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
        {showDataroomSubnav && (
          <Box sx={{ width: '100%', maxWidth: WIDE_CONTENT_WIDTH, mx: 'auto' }}>
            <DataroomSubnav />
          </Box>
        )}
        <Box sx={{ width: '100%', maxWidth: contentMaxWidth, mx: 'auto', minWidth: 0 }}>
          {children}
        </Box>
      </Box>
      {!hideNav && <BottomNav />}
    </Box>
  );
}

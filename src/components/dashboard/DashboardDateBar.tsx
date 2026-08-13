import { useLogDate } from '@/contexts/LogDateContext';
import { LogDateChip } from '@/components/common/LogDateChip';

/**
 * The single home-screen date control. Sets the shared log date that every
 * dashboard tracker (water, food, activity, sleep, weight) reads for both
 * display and logging.
 */
export function DashboardDateBar() {
  const { logDate, setLogDate } = useLogDate();

  return (
    <div className="flex items-center">
      <LogDateChip date={logDate} onChange={setLogDate} align="start" />
    </div>
  );
}

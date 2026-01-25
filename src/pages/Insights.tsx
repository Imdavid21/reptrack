import { MainLayout } from '@/components/layout/MainLayout';
import { useWorkouts } from '@/hooks/useWorkouts';
import { ASCIIProgress } from '@/components/ui/ASCIIProgress';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = 'performance' | 'volume' | 'strength';

// ASCII chart component
function ASCIIChart({ data, height = 6 }: { data: number[]; height?: number }) {
  if (data.length === 0) return <div className="text-muted-foreground">NO DATA</div>;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const chars = ['·', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  return (
    <div className="font-mono text-sm">
      <div className="flex items-end gap-0.5 h-16">
        {data.map((value, i) => {
          const normalized = (value - min) / range;
          const charIndex = Math.floor(normalized * (chars.length - 1));
          return (
            <span key={i} className="text-lg">
              {chars[charIndex]}
            </span>
          );
        })}
      </div>
      <div className="flex justify-between text-muted-foreground mt-1">
        <span>W1</span>
        <span>W{data.length}</span>
      </div>
    </div>
  );
}

function PerformanceTab() {
  const { workouts } = useWorkouts();

  const totalSessions = workouts.length;
  const progressPercent = Math.round((totalSessions / 72) * 100);
  const currentWeek = Math.ceil(totalSessions / 6) || 1;

  // Placeholder data for weekly volume
  const weeklyVolume = [6000, 7200, 8100, 8800, 9200, 9800, 10240];
  const currentVolume = weeklyVolume[weeklyVolume.length - 1] || 0;
  const avgVolume = Math.round(weeklyVolume.reduce((a, b) => a + b, 0) / weeklyVolume.length);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="stat-v3 text-center">
          <div className="stat-v3-value">{progressPercent}%</div>
          <div className="stat-v3-label">PROGRESS</div>
        </div>
        <div className="stat-v3 text-center">
          <div className="stat-v3-value">{currentWeek}</div>
          <div className="stat-v3-label">WEEK</div>
        </div>
        <div className="stat-v3 text-center">
          <div className="stat-v3-value">{totalSessions}</div>
          <div className="stat-v3-label">SESSIONS</div>
        </div>
      </div>

      <div className="divider-v3" />

      {/* Volume trend */}
      <div>
        <div className="label-v3 mb-4">WEEKLY VOLUME TREND</div>
        <ASCIIChart data={weeklyVolume} />
        <div className="mt-4 space-y-1 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">CURRENT:</span>
            <span>{currentVolume}KG (+8.2% WOW)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">AVERAGE:</span>
            <span>{avgVolume}KG</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">PEAK:</span>
            <span>{currentVolume}KG (THIS WEEK)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrengthTab() {
  // Placeholder strength data
  const lifts = [
    { name: 'SQUAT', current: 185, target: 200, change: '+2.7%' },
    { name: 'BENCH PRESS', current: 115, target: 140, change: '+4.5%' },
    { name: 'DEADLIFT', current: 205, target: 220, change: '+2.5%' },
  ];

  return (
    <div className="space-y-6">
      <div className="label-v3">STRENGTH PROGRESSION (KG)</div>
      
      {lifts.map(lift => (
        <div key={lift.name} className="space-y-2">
          <div className="flex items-center justify-between font-mono text-sm">
            <span>{lift.name}</span>
            <span>{lift.current} → {lift.current} ({lift.change})</span>
          </div>
          <ASCIIProgress value={lift.current} max={lift.target} showPercent={false} />
          <div className="text-xs text-muted-foreground text-right">
            {lift.current}/{lift.target}
          </div>
        </div>
      ))}

      <button className="btn-v3 w-full mt-4">
        VIEW ALL EXERCISES
      </button>
    </div>
  );
}

function VolumeTab() {
  // Placeholder volume by muscle group
  const muscleGroups = [
    { name: 'CHEST', sets: 16, target: 20 },
    { name: 'BACK', sets: 18, target: 20 },
    { name: 'SHOULDERS', sets: 12, target: 15 },
    { name: 'LEGS', sets: 20, target: 24 },
    { name: 'ARMS', sets: 10, target: 12 },
  ];

  return (
    <div className="space-y-6">
      <div className="label-v3">WEEKLY SETS BY MUSCLE GROUP</div>
      
      {muscleGroups.map(group => (
        <div key={group.name} className="space-y-1">
          <div className="flex items-center justify-between font-mono text-sm">
            <span>{group.name}</span>
            <span className="tabular-nums">{group.sets}/{group.target}</span>
          </div>
          <ASCIIProgress value={group.sets} max={group.target} showPercent={false} />
        </div>
      ))}
    </div>
  );
}

export default function Insights() {
  const [activeTab, setActiveTab] = useState<Tab>('performance');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'performance', label: 'PERF' },
    { key: 'volume', label: 'VOLUME' },
    { key: 'strength', label: 'STRENGTH' },
  ];

  return (
    <MainLayout title="INSIGHTS">
      <div className="space-y-6 pb-20">
        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "toggle-v3 flex-1 py-2",
                activeTab === tab.key && "toggle-v3-selected"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'performance' && <PerformanceTab />}
        {activeTab === 'volume' && <VolumeTab />}
        {activeTab === 'strength' && <StrengthTab />}
      </div>
    </MainLayout>
  );
}

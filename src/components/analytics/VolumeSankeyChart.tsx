import { useMemo } from 'react';
import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { Layers } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { Sankey, Tooltip, Layer, Rectangle, ResponsiveContainer } from 'recharts';
import { useExerciseSets } from '@/hooks/useExerciseSets';
import { useDateRange } from '@/contexts/DateRangeContext';

interface SankeyNode {
  name: string;
  category?: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

// Grayscale color palette
const CATEGORY_COLORS: Record<string, string> = {
  push: 'hsl(0, 0%, 30%)',
  pull: 'hsl(0, 0%, 50%)',
  legs: 'hsl(0, 0%, 70%)',
};

const EXERCISE_SHADES: Record<string, string[]> = {
  push: ['hsl(0, 0%, 25%)', 'hsl(0, 0%, 32%)', 'hsl(0, 0%, 39%)', 'hsl(0, 0%, 46%)', 'hsl(0, 0%, 53%)'],
  pull: ['hsl(0, 0%, 45%)', 'hsl(0, 0%, 52%)', 'hsl(0, 0%, 59%)', 'hsl(0, 0%, 66%)', 'hsl(0, 0%, 73%)'],
  legs: ['hsl(0, 0%, 65%)', 'hsl(0, 0%, 72%)', 'hsl(0, 0%, 79%)', 'hsl(0, 0%, 86%)', 'hsl(0, 0%, 90%)'],
};

const DARK_CATEGORY_COLORS: Record<string, string> = {
  push: 'hsl(0, 0%, 80%)',
  pull: 'hsl(0, 0%, 60%)',
  legs: 'hsl(0, 0%, 40%)',
};

const DARK_EXERCISE_SHADES: Record<string, string[]> = {
  push: ['hsl(0, 0%, 85%)', 'hsl(0, 0%, 78%)', 'hsl(0, 0%, 71%)', 'hsl(0, 0%, 64%)', 'hsl(0, 0%, 57%)'],
  pull: ['hsl(0, 0%, 65%)', 'hsl(0, 0%, 58%)', 'hsl(0, 0%, 51%)', 'hsl(0, 0%, 44%)', 'hsl(0, 0%, 37%)'],
  legs: ['hsl(0, 0%, 45%)', 'hsl(0, 0%, 38%)', 'hsl(0, 0%, 31%)', 'hsl(0, 0%, 24%)', 'hsl(0, 0%, 20%)'],
};

export function VolumeSankeyChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { dateRange } = useDateRange();
  const { data, isLoading } = useExerciseSets(dateRange);

  const { sankeyData, totalVolume } = useMemo(() => {
    if (!data?.sets || data.sets.length === 0) {
      return { sankeyData: null, totalVolume: 0 };
    }

    // Aggregate volume by exercise
    const exerciseVolumes = new Map<string, { volume: number; category: string }>();
    
    data.sets.forEach(set => {
      if (!set.actual_weight || !set.actual_reps) return;
      
      const volume = set.actual_weight * set.actual_reps;
      const existing = exerciseVolumes.get(set.exercise_name);
      
      if (existing) {
        existing.volume += volume;
      } else {
        exerciseVolumes.set(set.exercise_name, {
          volume,
          category: set.exercise_category,
        });
      }
    });

    if (exerciseVolumes.size === 0) {
      return { sankeyData: null, totalVolume: 0 };
    }

    // Group by category
    const categoryVolumes = { push: 0, pull: 0, legs: 0 };
    const exercisesByCategory: Record<string, { name: string; volume: number }[]> = {
      push: [],
      pull: [],
      legs: [],
    };

    exerciseVolumes.forEach((data, name) => {
      const cat = data.category as 'push' | 'pull' | 'legs';
      categoryVolumes[cat] += data.volume;
      exercisesByCategory[cat].push({ name, volume: data.volume });
    });

    // Sort exercises by volume descending within each category
    Object.values(exercisesByCategory).forEach(arr => {
      arr.sort((a, b) => b.volume - a.volume);
    });

    // Build nodes: [Total, Push, Pull, Legs, ...exercises]
    const nodes: SankeyNode[] = [{ name: 'Total Volume' }];
    const nodeIndexMap = new Map<string, number>();
    nodeIndexMap.set('Total Volume', 0);

    // Add category nodes
    ['push', 'pull', 'legs'].forEach((cat, i) => {
      if (categoryVolumes[cat as keyof typeof categoryVolumes] > 0) {
        nodes.push({ name: cat.charAt(0).toUpperCase() + cat.slice(1), category: cat });
        nodeIndexMap.set(cat, nodes.length - 1);
      }
    });

    // Add exercise nodes
    Object.entries(exercisesByCategory).forEach(([cat, exercises]) => {
      exercises.forEach(ex => {
        nodes.push({ name: ex.name, category: cat });
        nodeIndexMap.set(`${cat}-${ex.name}`, nodes.length - 1);
      });
    });

    // Build links
    const links: SankeyLink[] = [];
    
    // Total → Categories
    ['push', 'pull', 'legs'].forEach(cat => {
      const catVolume = categoryVolumes[cat as keyof typeof categoryVolumes];
      if (catVolume > 0) {
        links.push({
          source: 0,
          target: nodeIndexMap.get(cat)!,
          value: catVolume,
        });
      }
    });

    // Categories → Exercises
    Object.entries(exercisesByCategory).forEach(([cat, exercises]) => {
      const catIndex = nodeIndexMap.get(cat);
      if (catIndex === undefined) return;
      
      exercises.forEach(ex => {
        const exIndex = nodeIndexMap.get(`${cat}-${ex.name}`);
        if (exIndex !== undefined) {
          links.push({
            source: catIndex,
            target: exIndex,
            value: ex.volume,
          });
        }
      });
    });

    const total = categoryVolumes.push + categoryVolumes.pull + categoryVolumes.legs;

    return {
      sankeyData: { nodes, links },
      totalVolume: total,
    };
  }, [data?.sets]);

  const formatVolume = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toLocaleString();
  };

  const getNodeColor = (node: SankeyNode, index: number) => {
    if (node.name === 'Total Volume') {
      return isDark ? 'hsl(0, 0%, 90%)' : 'hsl(0, 0%, 20%)';
    }
    
    const colors = isDark ? DARK_CATEGORY_COLORS : CATEGORY_COLORS;
    const shades = isDark ? DARK_EXERCISE_SHADES : EXERCISE_SHADES;
    
    if (['Push', 'Pull', 'Legs'].includes(node.name)) {
      return colors[node.name.toLowerCase()];
    }
    
    // Exercise node - use shade based on category
    const cat = node.category || 'push';
    const catShades = shades[cat];
    const exerciseIndex = index % catShades.length;
    return catShades[exerciseIndex];
  };

  // Custom node component
  const CustomNode = ({ x, y, width, height, index, payload }: any) => {
    const node = sankeyData?.nodes[index];
    if (!node) return null;
    
    const color = getNodeColor(node, index);
    const isTotal = node.name === 'Total Volume';
    const isCategory = ['Push', 'Pull', 'Legs'].includes(node.name);
    
    return (
      <g>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          fillOpacity={0.9}
          rx={4}
          ry={4}
        />
        {height > 16 && (
          <text
            x={isTotal ? x + width + 6 : isCategory ? x - 6 : x + width + 6}
            y={y + height / 2}
            textAnchor={isTotal ? 'start' : isCategory ? 'end' : 'start'}
            dominantBaseline="middle"
            fill={isDark ? 'hsl(0, 0%, 80%)' : 'hsl(0, 0%, 30%)'}
            fontSize={isTotal || isCategory ? 11 : 9}
            fontWeight={isTotal || isCategory ? 600 : 400}
          >
            {node.name}
          </text>
        )}
      </g>
    );
  };

  // Custom link component
  const CustomLink = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index }: any) => {
    const link = sankeyData?.links[index];
    if (!link) return null;
    
    const sourceNode = sankeyData?.nodes[link.source];
    const targetNode = sankeyData?.nodes[link.target];
    
    let color = isDark ? 'hsl(0, 0%, 50%)' : 'hsl(0, 0%, 60%)';
    if (targetNode?.category) {
      const colors = isDark ? DARK_CATEGORY_COLORS : CATEGORY_COLORS;
      color = colors[targetNode.category];
    }

    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={color}
        strokeWidth={linkWidth}
        strokeOpacity={0.4}
      />
    );
  };

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload;
    const node = data.payload;
    
    return (
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2,
        border: 1,
        borderColor: 'divider',
        p: 1.5,
        minWidth: 120,
      }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {node?.name || 'Volume'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatVolume(data.value)} kg
        </Typography>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Layers size={16} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Volume Breakdown</Typography>
        </Box>
        <Skeleton variant="rounded" height={300} />
      </MuiCard>
    );
  }

  if (!sankeyData) {
    return (
      <MuiCard>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Layers size={16} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Volume Breakdown</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Complete workouts with weights to see volume distribution
        </Typography>
      </MuiCard>
    );
  }

  return (
    <MuiCard>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Layers size={14} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Volume Breakdown
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatVolume(totalVolume)} kg total
        </Typography>
      </Box>

      <Box sx={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={8}
            nodeWidth={12}
            margin={{ top: 10, right: 120, bottom: 10, left: 10 }}
          >
            <Tooltip content={renderTooltip} />
          </Sankey>
        </ResponsiveContainer>
      </Box>

      {/* Legend */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 3, 
        pt: 2, 
        mt: 1,
        borderTop: 1, 
        borderColor: 'divider' 
      }}>
        {['Push', 'Pull', 'Legs'].map(cat => {
          const colors = isDark ? DARK_CATEGORY_COLORS : CATEGORY_COLORS;
          return (
            <Box key={cat} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ 
                width: 10, 
                height: 10, 
                borderRadius: '50%', 
                bgcolor: colors[cat.toLowerCase()] 
              }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {cat}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </MuiCard>
  );
}

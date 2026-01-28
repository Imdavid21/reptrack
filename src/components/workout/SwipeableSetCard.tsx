import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { WorkoutExercise, ExerciseSet } from '@/hooks/useWorkouts';
import { SwipeableCard } from '@/components/ui/SwipeableCard';
import { haptic } from '@/lib/haptics';
import { getEquipmentType, getWeightLabel } from '@/lib/exerciseVariants';
import { Plus, Minus, Check, Trophy, ChevronUp } from 'lucide-react';

interface PersonalRecord {
  maxWeight: number;
  reps: string;
  date: string;
}

interface LastUsedData {
  weight: number;
  reps: number;
}

interface SwipeableSetCardProps {
  exercise: WorkoutExercise;
  exerciseIndex: number;
  totalExercises: number;
  currentSetIndex: number;
  onChange: (exercise: WorkoutExercise) => void;
  onSetComplete: () => void;
  onSkipSet: () => void;
  onNextExercise: () => void;
  personalRecord?: PersonalRecord;
  lastUsed?: LastUsedData;
}

export function SwipeableSetCard({
  exercise,
  exerciseIndex,
  totalExercises,
  currentSetIndex,
  onChange,
  onSetComplete,
  onSkipSet,
  onNextExercise,
  personalRecord,
  lastUsed,
}: SwipeableSetCardProps) {
  const currentSet = exercise.sets[currentSetIndex];
  const prevSet = currentSetIndex > 0 ? exercise.sets[currentSetIndex - 1] : null;
  const isLastSet = currentSetIndex === exercise.sets.length - 1;
  const equipmentType = getEquipmentType(exercise.name);
  const weightLabel = getWeightLabel(equipmentType);

  // Smart defaults
  const getBaseWeight = (): number => {
    if (currentSet.actualWeight) return parseFloat(currentSet.actualWeight);
    if (prevSet?.actualWeight) return parseFloat(prevSet.actualWeight);
    if (lastUsed?.weight) return lastUsed.weight;
    return parseFloat(currentSet.targetWeight) || 20;
  };

  const getBaseReps = (): number => {
    if (currentSet.actualReps) return parseInt(currentSet.actualReps);
    if (prevSet?.actualReps) return parseInt(prevSet.actualReps);
    if (lastUsed?.reps) return lastUsed.reps;
    return parseInt(currentSet.targetReps) || 8;
  };

  const [weight, setWeight] = useState(getBaseWeight());
  const [reps, setReps] = useState(getBaseReps());
  const [showHint, setShowHint] = useState(true);

  // Update when set changes
  useEffect(() => {
    setWeight(getBaseWeight());
    setReps(getBaseReps());
  }, [currentSetIndex, exercise.name]);

  // Hide hint after first interaction
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const updateExercise = (newWeight: number, newReps: number) => {
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = {
      ...updated.sets[currentSetIndex],
      actualWeight: newWeight.toString(),
      actualReps: newReps.toString(),
    };
    onChange(updated);
  };

  const adjustWeight = (delta: number) => {
    haptic('light');
    const newWeight = Math.max(0, weight + delta);
    setWeight(newWeight);
    updateExercise(newWeight, reps);
  };

  const adjustReps = (delta: number) => {
    haptic('light');
    const newReps = Math.max(1, Math.min(99, reps + delta));
    setReps(newReps);
    updateExercise(weight, newReps);
  };

  const handleSwipeRight = () => {
    // Complete the set
    const updated = { ...exercise };
    updated.sets = [...updated.sets];
    updated.sets[currentSetIndex] = {
      ...updated.sets[currentSetIndex],
      actualWeight: weight.toString(),
      actualReps: reps.toString(),
      completed: true,
    };
    onChange(updated);
    onSetComplete();
  };

  const handleSwipeLeft = () => {
    onSkipSet();
  };

  const handleSwipeUp = () => {
    if (isLastSet) {
      onNextExercise();
    }
  };

  const completedSets = exercise.sets.filter(s => s.completed).length;
  const isNewPR = personalRecord && weight > personalRecord.maxWeight;

  return (
    <SwipeableCard
      onSwipeRight={handleSwipeRight}
      onSwipeLeft={handleSwipeLeft}
      onSwipeUp={isLastSet ? handleSwipeUp : undefined}
      rightLabel={`LOG ${weight}${weightLabel}×${reps}`}
      leftLabel="SKIP"
      upLabel={isLastSet ? "NEXT EXERCISE" : undefined}
    >
      <Box
        sx={{
          p: 3,
          borderRadius: 4,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: currentSet.completed ? 'primary.main' : 'divider',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Swipe hint */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute',
                top: 8,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Chip
                size="small"
                icon={<ChevronUp size={14} />}
                label="Swipe right to log"
                sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'primary.contrastText',
                  fontSize: '0.65rem',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exercise progress dots */}
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mb: 2, mt: showHint ? 4 : 0 }}>
          {Array.from({ length: totalExercises }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: i === exerciseIndex ? 24 : 6,
                height: 6,
                borderRadius: 3,
                bgcolor: i < exerciseIndex ? 'primary.main' : i === exerciseIndex ? 'primary.main' : 'action.hover',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </Box>

        {/* Exercise name with PR badge */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            {exercise.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Set {currentSetIndex + 1} of {exercise.sets.length}
            </Typography>
            {personalRecord && !isNewPR && (
              <Chip
                size="small"
                label={`PR ${personalRecord.maxWeight}${weightLabel}×${personalRecord.reps}`}
                sx={{ height: 20, fontSize: '0.6rem', bgcolor: 'action.hover' }}
              />
            )}
            {isNewPR && (
              <Chip
                size="small"
                icon={<Trophy size={12} />}
                label="NEW PR!"
                color="primary"
                sx={{ height: 20, fontSize: '0.6rem' }}
              />
            )}
          </Box>
        </Box>

        {/* Weight selector */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
              WEIGHT ({weightLabel})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 1 }}>
              <IconButton
                onClick={() => adjustWeight(-2.5)}
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'action.hover',
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                <Minus size={20} />
              </IconButton>
              <motion.div
                key={weight}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Typography 
                  variant="h2" 
                  fontWeight={800}
                  sx={{ 
                    minWidth: 100, 
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {weight % 1 === 0 ? weight : weight.toFixed(1)}
                </Typography>
              </motion.div>
              <IconButton
                onClick={() => adjustWeight(2.5)}
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'action.hover',
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                <Plus size={20} />
              </IconButton>
            </Box>
          </Box>

          {/* Reps selector */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2 }}>
              REPS
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 1 }}>
              <IconButton
                onClick={() => adjustReps(-1)}
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'action.hover',
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                <Minus size={20} />
              </IconButton>
              <motion.div
                key={reps}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Typography 
                  variant="h2" 
                  fontWeight={800}
                  sx={{ 
                    minWidth: 60, 
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {reps}
                </Typography>
              </motion.div>
              <IconButton
                onClick={() => adjustReps(1)}
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: 'action.hover',
                  '&:active': { transform: 'scale(0.95)' },
                }}
              >
                <Plus size={20} />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Set progress dots */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
          {exercise.sets.map((set, idx) => (
            <Box
              key={idx}
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: set.completed 
                  ? 'primary.main' 
                  : idx === currentSetIndex 
                    ? 'primary.light' 
                    : 'action.hover',
                color: set.completed || idx === currentSetIndex ? 'primary.contrastText' : 'text.secondary',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: idx === currentSetIndex ? 2 : 0,
                borderColor: 'primary.main',
              }}
            >
              {set.completed ? <Check size={14} /> : idx + 1}
            </Box>
          ))}
        </Box>
      </Box>
    </SwipeableCard>
  );
}
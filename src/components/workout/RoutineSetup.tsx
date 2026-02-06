import { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { Check, Calendar, Dumbbell, Zap, Layout } from 'lucide-react';
import { useUserPreferences, TrainingSplit } from '@/hooks/useUserPreferences';
import { toast } from '@/lib/toast';

interface RoutineSetupProps {
    onComplete: () => void;
}

const SPLIT_OPTIONS: {
    id: TrainingSplit;
    name: string;
    days: number;
    description: string;
    icon: React.ElementType;
}[] = [
        {
            id: 'full_body3',
            name: 'Full Body',
            days: 3,
            description: 'Perfect for busy schedules. hit every muscle group 3x/week.',
            icon: Zap,
        },
        {
            id: 'upper_lower4',
            name: 'Upper / Lower',
            days: 4,
            description: 'Balanced frequency. 2 Upper days, 2 Lower days.',
            icon: Layout,
        },
        {
            id: 'ppl5',
            name: 'Hybrid PPL',
            days: 5,
            description: 'Push / Pull / Legs + Upper / Lower. Great intensity.',
            icon: Dumbbell,
        },
        {
            id: 'ppl6',
            name: 'PPL x2',
            days: 6,
            description: 'High volume. Push / Pull / Legs twice a week.',
            icon: Calendar,
        },
    ];

export function RoutineSetup({ onComplete }: RoutineSetupProps) {
    const { updatePreferences } = useUserPreferences();
    const [selectedSplit, setSelectedSplit] = useState<TrainingSplit | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedSplit) return;

        setIsSubmitting(true);
        try {
            await updatePreferences.mutateAsync({
                training_split: selectedSplit,
                routine_setup_completed: true,
            });
            toast.success('Routine configured!');
            onComplete();
        } catch (error) {
            toast.error('Failed to save routine');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600, mx: 'auto', p: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                    Choose Your Split
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    How many days per week can you train?
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {SPLIT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedSplit === option.id;

                    return (
                        <motion.div
                            key={option.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Paper
                                onClick={() => setSelectedSplit(option.id)}
                                sx={{
                                    p: 3,
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: isSelected ? 'primary.main' : 'divider',
                                    bgcolor: isSelected ? 'action.hover' : 'background.paper',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    height: '100%',
                                }}
                            >
                                {isSelected && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 12,
                                            right: 12,
                                            color: 'primary.main',
                                        }}
                                    >
                                        <Check size={20} strokeWidth={3} />
                                    </Box>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: isSelected ? 'primary.main' : 'action.selected',
                                            color: isSelected ? 'primary.contrastText' : 'text.primary',
                                        }}
                                    >
                                        <Icon size={24} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>
                                            {option.name}
                                        </Typography>
                                        <Typography variant="caption" fontWeight={600} color="primary.main">
                                            {option.days} DAYS / WEEK
                                        </Typography>
                                    </Box>
                                </Box>

                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {option.description}
                                </Typography>
                            </Paper>
                        </motion.div>
                    );
                })}
            </Box>

            <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={!selectedSplit || isSubmitting}
                onClick={handleSubmit}
                sx={{
                    mt: 2,
                    py: 2,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    fontWeight: 700,
                }}
            >
                {isSubmitting ? 'Saving...' : 'Start Training'}
            </Button>
        </Box>
    );
}

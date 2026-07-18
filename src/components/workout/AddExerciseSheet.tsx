import { useState } from 'react';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AddExerciseSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (exercise: {
        name: string;
        category: string;
        targetReps: string;
        targetWeight: string;
        sets: number
    }) => Promise<void>;
}

const CATEGORIES = ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Other'];

export function AddExerciseSheet({ open, onOpenChange, onAdd }: AddExerciseSheetProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Other');
    const [targetReps, setTargetReps] = useState('10');
    const [targetWeight, setTargetWeight] = useState('');
    const [sets, setSets] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name) return;
        setIsSubmitting(true);
        try {
            await onAdd({ name, category, targetReps, targetWeight, sets });
            // Reset form
            setName('');
            setCategory('Other');
            setTargetReps('10');
            setTargetWeight('');
            setSets(3);
        } catch (e) {
            // Error handled in parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Add Exercise</DrawerTitle>
                    <DrawerDescription>
                        Add an exercise to this workout.
                    </DrawerDescription>
                </DrawerHeader>

                <div className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Exercise Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Bicep Curls"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Sets</Label>
                            <Input
                                type="number"
                                value={sets}
                                onChange={(e) => setSets(parseInt(e.target.value) || 1)}
                                min={1}
                                max={10}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Reps</Label>
                            <Input
                                value={targetReps}
                                onChange={(e) => setTargetReps(e.target.value)}
                                placeholder="e.g. 8-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Target Weight</Label>
                            <Input
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(e.target.value)}
                                placeholder="e.g. 20kg"
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full mt-4"
                        onClick={handleSubmit}
                        disabled={!name || isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Add Exercise
                    </Button>
                </div>

                <DrawerFooter>
                    <DrawerClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}

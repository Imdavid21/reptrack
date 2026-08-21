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
import { Loader2, Plus, Trash2 } from 'lucide-react';

export interface NewSetRow {
    weight: string;
    reps: string;
}

interface AddExerciseSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (exercise: {
        name: string;
        category: string;
        sets: NewSetRow[];
    }) => Promise<void>;
}

const CATEGORIES = ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Other'];

const emptyRows = (): NewSetRow[] => [
    { weight: '', reps: '10' },
    { weight: '', reps: '10' },
    { weight: '', reps: '10' },
];

export function AddExerciseSheet({ open, onOpenChange, onAdd }: AddExerciseSheetProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Other');
    const [rows, setRows] = useState<NewSetRow[]>(emptyRows);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateRow = (index: number, patch: Partial<NewSetRow>) =>
        setRows(current => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

    const addRow = () =>
        setRows(current => [...current, { ...(current[current.length - 1] ?? { weight: '', reps: '10' }) }]);

    const removeRow = (index: number) =>
        setRows(current => (current.length > 1 ? current.filter((_, i) => i !== index) : current));

    const handleSubmit = async () => {
        if (!name.trim()) return;
        setIsSubmitting(true);
        try {
            await onAdd({ name: name.trim(), category, sets: rows });
            setName('');
            setCategory('Other');
            setRows(emptyRows());
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
                        Every set can carry its own weight and reps.
                    </DrawerDescription>
                </DrawerHeader>

                <div className="p-4 space-y-4 overflow-y-auto">
                    <div className="space-y-2">
                        <Label>Exercise Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Bicep Curls"
                            autoFocus
                        />
                    </div>

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
                        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-1 type-caption">
                            <span className="text-center">#</span>
                            <span className="text-center">Weight</span>
                            <span className="text-center">Reps</span>
                            <span />
                        </div>
                        {rows.map((row, index) => (
                            <div key={index} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
                                <span className="text-xs text-center text-muted-foreground tabular-nums">{index + 1}</span>
                                <Input
                                    value={row.weight}
                                    onChange={(e) => updateRow(index, { weight: e.target.value })}
                                    placeholder="kg"
                                    inputMode="decimal"
                                    className="h-9 text-center"
                                    aria-label={`Set ${index + 1} weight`}
                                />
                                <Input
                                    value={row.reps}
                                    onChange={(e) => updateRow(index, { reps: e.target.value })}
                                    placeholder="reps"
                                    inputMode="numeric"
                                    className="h-9 text-center"
                                    aria-label={`Set ${index + 1} reps`}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeRow(index)}
                                    disabled={rows.length === 1}
                                    aria-label={`Remove set ${index + 1}`}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addRow}
                            className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Set
                        </button>
                    </div>

                    <Button
                        className="w-full mt-2"
                        onClick={handleSubmit}
                        disabled={!name.trim() || isSubmitting}
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

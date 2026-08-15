import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose
} from '@/components/ui/drawer';
import { useWorkouts, Workout } from '@/hooks/useWorkouts';
import { toast } from '@/lib/toast';
import { Edit, Trash2, Moon, Clock } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { parseDateKey } from '@/lib/dateKey';
import { SessionTimeDialog } from '@/components/workout/SessionTimeDialog';

interface WorkoutEditSheetProps {
    workout: Workout | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEditVitals?: () => void;
    dateStr?: string;
}

export function WorkoutEditSheet({ workout, open, onOpenChange, onEditVitals, dateStr }: WorkoutEditSheetProps) {
    const navigate = useNavigate();
    const { deleteWorkout, updateWorkout } = useWorkouts();
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);
    const [showTimeDialog, setShowTimeDialog] = useState(false);

    const handleSaveTime = async (start: Date, mins: number) => {
        if (!workout) return;
        try {
            await updateWorkout({
                id: workout.id,
                started_at: start.toISOString(),
                completed_at: new Date(start.getTime() + mins * 60000).toISOString(),
                workout_duration_minutes: mins,
            });
            toast.success('Session time updated');
            onOpenChange(false);
        } catch (e) {
            toast.error('Failed to update session time');
        }
    };

    const handleEdit = () => {
        if (workout) {
            navigate(`/app/history/${workout.id}`);
            onOpenChange(false);
        }
    };

    const handleDelete = async () => {
        if (!workout) return;
        try {
            await deleteWorkout(workout.id);
            toast.success('Workout deleted');
            setShowDeleteAlert(false);
            onOpenChange(false);
        } catch (e) {
            toast.error('Failed to delete workout');
        }
    };

    const displayDate = workout
        ? format(parseDateKey(workout.date), 'MMM d, yyyy')
        : dateStr
            ? format(parseDateKey(dateStr), 'MMM d, yyyy')
            : '';

    const title = workout ? workout.day_name : 'Edit Day';

    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-md">
                        <DrawerHeader className="pb-2">
                            <DrawerTitle className="text-base font-bold">{title}</DrawerTitle>
                            <DrawerDescription className="text-xs text-muted-foreground">
                                {displayDate}
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="px-4 pb-2 space-y-2">
                            {/* Edit Vitals — always available */}
                            {onEditVitals && (
                                <button
                                    onClick={onEditVitals}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                                >
                                    <Moon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Edit Sleep & Weight</span>
                                </button>
                            )}

                            {/* Workout-specific actions */}
                            {workout && (
                                <>
                                    <button
                                        onClick={handleEdit}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                                    >
                                        <Edit className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Edit Exercises</span>
                                    </button>

                                    <button
                                        onClick={() => setShowTimeDialog(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                                    >
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Edit Time & Duration</span>
                                        {workout.workout_duration_minutes ? (
                                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{workout.workout_duration_minutes}m</span>
                                        ) : null}
                                    </button>



                                    <button
                                        onClick={() => setShowDeleteAlert(true)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors text-left"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="text-sm font-medium text-destructive">Delete Workout</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <DrawerFooter className="pt-2">
                            <DrawerClose asChild>
                                <button className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                                    Cancel
                                </button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete workout?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this workout and all its exercises.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

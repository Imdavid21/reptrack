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
import { Button } from '@/components/ui/button';
import { useWorkouts, Workout } from '@/hooks/useWorkouts';
import { toast } from '@/lib/toast';
import { Edit, Trash2, Ban, AlertTriangle, EyeOff } from 'lucide-react';
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

interface WorkoutEditSheetProps {
    workout: Workout | null; // Expected full workout object
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WorkoutEditSheet({ workout, open, onOpenChange }: WorkoutEditSheetProps) {
    const navigate = useNavigate();
    const { deleteWorkout, updateWorkout } = useWorkouts();
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    if (!workout) return null;

    const handleEdit = () => {
        navigate(`/history/${workout.id}`);
        onOpenChange(false);
    };

    const handleToggleSkip = async () => {
        try {
            // Assuming is_skipped is a field we want to toggle. 
            // Need to cast to any if TS definition isn't updated yet or update the type.
            const isSkipped = (workout as any).is_skipped;

            await updateWorkout({
                id: workout.id,
                is_skipped: !isSkipped
            } as any);

            toast.success(isSkipped ? 'Marked as completed' : 'Marked as skipped');
            onOpenChange(false);
        } catch (e) {
            toast.error('Failed to update workout');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteWorkout(workout.id);
            toast.success('Workout deleted');
            setShowDeleteAlert(false);
            onOpenChange(false);
        } catch (e) {
            toast.error('Failed to delete workout');
        }
    };

    const isSkipped = (workout as any).is_skipped;

    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Manage Workout</DrawerTitle>
                        <DrawerDescription>
                            {workout.day_name} • {new Date(workout.date).toLocaleDateString()}
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start h-12 text-lg"
                            onClick={handleEdit}
                        >
                            <Edit className="mr-3 h-5 w-5" />
                            Edit Details & Exercises
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-start h-12 text-lg"
                            onClick={handleToggleSkip}
                        >
                            {isSkipped ? (
                                <>
                                    <Ban className="mr-3 h-5 w-5 text-green-500" />
                                    Unmark as Skipped
                                </>
                            ) : (
                                <>
                                    <EyeOff className="mr-3 h-5 w-5 text-orange-500" />
                                    Mark as Skipped / Rest
                                </>
                            )}
                        </Button>

                        <div className="pt-4 mt-2 border-t">
                            <Button
                                variant="destructive"
                                className="w-full justify-start h-12 text-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
                                onClick={() => setShowDeleteAlert(true)}
                            >
                                <Trash2 className="mr-3 h-5 w-5" />
                                Delete Entry
                            </Button>
                        </div>
                    </div>

                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this workout record.
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

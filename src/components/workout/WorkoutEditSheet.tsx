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
import { Edit, Trash2 } from 'lucide-react';
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
    workout: Workout | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WorkoutEditSheet({ workout, open, onOpenChange }: WorkoutEditSheetProps) {
    const navigate = useNavigate();
    const { deleteWorkout } = useWorkouts();
    const [showDeleteAlert, setShowDeleteAlert] = useState(false);

    if (!workout) return null;

    const handleEdit = () => {
        navigate(`/app/history/${workout.id}`);
        onOpenChange(false);
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

    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-md">
                        <DrawerHeader className="pb-2">
                            <DrawerTitle className="text-base font-bold">{workout.day_name}</DrawerTitle>
                            <DrawerDescription className="text-xs text-muted-foreground">
                                {new Date(workout.date).toLocaleDateString()}
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="px-4 pb-2 space-y-2">
                            <button
                                onClick={handleEdit}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
                            >
                                <Edit className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Edit Details & Exercises</span>
                            </button>

                            <button
                                onClick={() => setShowDeleteAlert(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors text-left"
                            >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span className="text-sm font-medium text-destructive">Delete Entry</span>
                            </button>
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

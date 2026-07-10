import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle } from 'lucide-react';
import { MuiCard } from '@/components/ui/MuiCard';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/lib/toast';

const CONFIRM_WORD = 'DELETE';

/**
 * Permanently deletes the user's account + all data via the delete_my_account
 * RPC, satisfying the Privacy Policy's "right to be forgotten" commitment.
 * Guarded by a type-to-confirm dialog so it can't be triggered accidentally.
 */
export function DangerZoneSection() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) return;
    setDeleting(true);
    try {
      // Cast because the generated types can lag behind schema migrations.
      const { error } = await (supabase.rpc as any)('delete_my_account');
      if (error) throw error;
      // Session belongs to a now-deleted user; clear it and leave the app.
      await signOut();
      toast.success('Your account and all data have been deleted');
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Account deletion failed:', err);
      toast.error('Could not delete your account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <MuiCard>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle size={16} className="text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Delete account</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanently erase your account and all workouts, meals, and metrics. This can't be undone — export your data first if you want a copy.
          </p>
          <button
            onClick={() => { setConfirmText(''); setOpen(true); }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:opacity-70 transition-opacity"
          >
            <Trash2 size={14} />
            Delete my account
          </button>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={(o) => { if (!deleting) setOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and every workout, meal, metric, and photo.
              It cannot be reversed. Type <strong>{CONFIRM_WORD}</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            aria-label={`Type ${CONFIRM_WORD} to confirm account deletion`}
            className="mt-1"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting || confirmText.trim().toUpperCase() !== CONFIRM_WORD}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MuiCard>
  );
}

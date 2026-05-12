import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { DiagramExample } from '@/data/types';
import {
  getDocumentDisplayName,
  getPendingNavigationLabel,
} from './document-helpers';
import type { AppError, PendingNavigation } from './types';

export function DraftNamingDialog({
  onConfirm,
  pendingDraftName,
  setDraftNamingOpen,
  setPendingDraftName,
  draftNamingOpen,
}: {
  draftNamingOpen: boolean;
  onConfirm: () => void;
  pendingDraftName: string;
  setDraftNamingOpen: (open: boolean) => void;
  setPendingDraftName: (name: string) => void;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        setDraftNamingOpen(open);

        if (!open) {
          setPendingDraftName('');
        }
      }}
      open={draftNamingOpen}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Name draft</DialogTitle>
          <DialogDescription>
            Choose the label shown in the Drafts list and workspace header.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="draft-display-name"
          >
            Draft name
          </label>
          <Input
            autoFocus
            id="draft-display-name"
            onChange={(event) => setPendingDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') {
                return;
              }

              event.preventDefault();
              onConfirm();
            }}
            placeholder="Enter draft name"
            value={pendingDraftName}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              setDraftNamingOpen(false);
              setPendingDraftName('');
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={pendingDraftName.trim().length === 0}
            onClick={onConfirm}
            type="button"
          >
            Clone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DiscardNavigationDialog({
  currentDocument,
  onDiscardAndContinue,
  onStay,
  pendingNavigation,
}: {
  currentDocument: DiagramExample;
  onDiscardAndContinue: () => void;
  onStay: () => void;
  pendingNavigation: PendingNavigation | null;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onStay();
        }
      }}
      open={pendingNavigation !== null}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            {pendingNavigation
              ? `You have unsaved changes in ${getDocumentDisplayName(currentDocument)}. Continue to ${getPendingNavigationLabel(pendingNavigation)} and discard them?`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={onStay}
            type="button"
            variant="outline"
          >
            Stay here
          </Button>
          <Button
            onClick={onDiscardAndContinue}
            type="button"
            variant="destructive"
          >
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FatalErrorDialog({
  fatalError,
  setFatalError,
}: {
  fatalError: AppError | null;
  setFatalError: (error: AppError | null) => void;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          setFatalError(null);
        }
      }}
      open={fatalError !== null}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fatalError?.title ?? 'Error'}</DialogTitle>
          <DialogDescription>{fatalError?.detail}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setFatalError(null)} type="button">Dismiss</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

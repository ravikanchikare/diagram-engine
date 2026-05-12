import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DeleteInspectorFooter({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  return (
    <div className="diagram-edge-inspector__footer">
      <Button onClick={onDelete} size="sm" type="button" variant="destructive">
        <Trash2 />
        {label}
      </Button>
    </div>
  );
}

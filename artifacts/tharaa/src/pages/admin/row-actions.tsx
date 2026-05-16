import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RowActions({
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 text-[var(--error-400)] border-[var(--error-400)]/40 hover:bg-[var(--error-400)]/10"
        onClick={onDelete}
        disabled={deleteDisabled}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

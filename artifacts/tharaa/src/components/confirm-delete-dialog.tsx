import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** وصف الخطوة الأولى */
  description?: string;
  /** اسم العنصر (كتاب، مشارك، دفعة…) يظهر في النص */
  entityLabel: string;
  /** تنفيذ الحذف الفعلي بعد إكمال الخطوتين */
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "تأكيد الحذف",
  description,
  entityLabel,
  onConfirm,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const [step, setStep] = React.useState<1 | 2>(1);

  React.useEffect(() => {
    if (!open) setStep(1);
  }, [open]);

  const close = () => onOpenChange(false);

  const handleContinue = () => setStep(2);

  const handleFinalDelete = async () => {
    await onConfirm();
  };

  const step1Text =
    description ??
    `سيتم حذف «${entityLabel}» نهائياً من النظام. هل تريد المتابعة؟`;

  const step2Text = `أنت على وشك حذف «${entityLabel}» بشكل نهائي ولا يمكن التراجع. تأكيد الحذف؟`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--error-400)]/15">
            <AlertTriangle className="h-6 w-6 text-[var(--error-400)]" />
          </div>
          <DialogHeader className="space-y-2 text-center sm:text-center">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-balance">
              {step === 1 ? step1Text : step2Text}
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="gap-3 sm:justify-center">
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" className="min-w-[120px]" onClick={close}>
                تراجع
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-w-[140px]"
                onClick={handleContinue}
                disabled={isLoading}
              >
                متابعة الحذف
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-w-[120px]"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                رجوع
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-w-[140px]"
                onClick={handleFinalDelete}
                disabled={isLoading}
              >
                {isLoading ? "جاري الحذف…" : "حذف نهائي"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

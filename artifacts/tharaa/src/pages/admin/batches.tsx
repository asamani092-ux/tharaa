import { useState } from "react";
import { useListBatches } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

export default function AdminBatches() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading, refetch } = useListBatches();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [form, setForm] = useState({ name: "" });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const createBatch = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/batches.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const text = await res.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch {
        throw new Error("لم يتمكن السيرفر من معالجة الطلب");
      }
      if (!res.ok) throw new Error(jsonData.error || "فشل الإضافة");
      return jsonData;
    },
  });

  const updateBatch = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/batches.php?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id }),
      });
      const text = await res.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch {
        throw new Error("لم يتمكن السيرفر من معالجة التحديث");
      }
      if (!res.ok) throw new Error(jsonData.error || "فشل التحديث");
      return jsonData;
    },
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/batches.php?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      return res.json();
    },
  });

  const openDeleteBatch = (batch: { id: number; name: string }) => {
    setDeleteTarget({ id: batch.id, label: batch.name });
    setDeleteOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editBatch) {
      updateBatch.mutate(
        { id: editBatch.id, data: form },
        {
          onSuccess: () => {
            toast.success("تم التحديث بنجاح ✅");
            setIsModalOpen(false);
            refetch();
          },
          onError: (err: any) => toast.error(err.message),
        }
      );
    } else {
      createBatch.mutate(form, {
        onSuccess: () => {
          toast.success("تمت الإضافة بنجاح ✅");
          setIsModalOpen(false);
          refetch();
        },
        onError: (err: any) => toast.error(err.message),
      });
    }
  };

  return (
    <AdminLayout>
      <div  className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-[var(--secondary-400)] flex items-center gap-2">
            <Users className="w-6 h-6" />
            إدارة الدفعات
          </h2>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              setEditBatch(null);
              setForm({ name: "" });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            إضافة دفعة جديدة
          </Button>
        </div>

        <div className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-md)]">
          <Table>
            <TableHeader className="bg-[var(--bg-secondary)]">
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold px-6 py-4">
                  اسم الدفعة
                </TableHead>
                <TableHead className="text-left text-[var(--text-secondary)] font-semibold px-6">
                  الإجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-[var(--secondary-400)] w-6 h-6" />
                  </TableCell>
                </TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <TableCell className="text-right px-6 font-semibold text-[var(--text-primary)] py-4 text-lg">
                      {batch.name}
                    </TableCell>
                    <TableCell className="text-left px-6 w-32">
                      <div  className="flex justify-start gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          onClick={() => {
                            setEditBatch(batch);
                            setForm({ name: batch.name });
                            setIsModalOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9 text-[var(--error-400)] border-[var(--error-400)]/40 hover:bg-[var(--error-400)]/10"
                          onClick={() => openDeleteBatch(batch)}
                          disabled={deleteBatch.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div >
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[400px] text-right" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editBatch ? "تعديل اسم الدفعة" : "إنشاء دفعة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label className="text-[var(--text-secondary)]">اسم الدفعة</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-lg"
                  required
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                disabled={createBatch.isPending || updateBatch.isPending}
              >
                {createBatch.isPending || updateBatch.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : editBatch ? (
                  "حفظ التعديل"
                ) : (
                  "إضافة الدفعة"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteTarget(null);
          }}
          title="تأكيد حذف الدفعة"
          description={
            deleteTarget
              ? `سيتم حذف دفعة «${deleteTarget.label}» وجميع المشاركين المرتبطين بها نهائياً. هل تريد المتابعة؟`
              : undefined
          }
          entityLabel={deleteTarget?.label ?? ""}
          isLoading={deleteLoading}
          onConfirm={async () => {
            if (!deleteTarget) return;
            setDeleteLoading(true);
            try {
              await deleteBatch.mutateAsync(deleteTarget.id);
              toast.success("تم حذف الدفعة وجميع المشاركين فيها بنجاح");
              setDeleteOpen(false);
              setDeleteTarget(null);
              await refetch();
              queryClient.invalidateQueries({ queryKey: ["list-users"] });
            } catch (e: any) {
              toast.error(e?.message ?? "تعذر حذف الدفعة");
            } finally {
              setDeleteLoading(false);
            }
          }}
        />
      </div>
    </AdminLayout>
  );
}

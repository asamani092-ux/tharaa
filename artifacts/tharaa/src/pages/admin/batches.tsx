import { useState } from "react";
import { useListBatches, useCreateBatch, useUpdateBatch, useDeleteBatch, getListBatchesQueryKey, getListUsersQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Calendar, Layers, Pencil, Trash2 } from "lucide-react";

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };

export default function AdminBatches() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading } = useListBatches();
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteBatch = useDeleteBatch();

  const [newBatchName, setNewBatchName] = useState("");

  const [editBatch, setEditBatch] = useState<{ id: number; name: string } | null>(null);
  const [editName, setEditName] = useState("");

  const [deleteBatchTarget, setDeleteBatchTarget] = useState<{ id: number; name: string } | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    createBatch.mutate({ data: { name: newBatchName.trim() } }, {
      onSuccess: () => {
        toast.success("تم إنشاء الدفعة بنجاح");
        setNewBatchName("");
        queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
      },
      onError: () => toast.error("حدث خطأ أثناء الإنشاء")
    });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatch || !editName.trim()) return;
    updateBatch.mutate(
      { id: editBatch.id, data: { name: editName.trim() } },
      {
        onSuccess: () => {
          toast.success("تم تحديث اسم الدفعة بنجاح");
          setEditBatch(null);
          queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
        },
        onError: () => toast.error("حدث خطأ أثناء التحديث"),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteBatchTarget) return;
    const toastId = toast.loading("جاري حذف الدفعة...");
    deleteBatch.mutate(
      { id: deleteBatchTarget.id },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success("تم حذف الدفعة بنجاح");
          setDeleteBatchTarget(null);
          queryClient.invalidateQueries({ queryKey: getListBatchesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => {
          toast.dismiss(toastId);
          toast.error("حدث خطأ أثناء الحذف");
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>إدارة الدفعات</h2>

        {/* Create new batch */}
        <div className="rounded-xl p-5 max-w-md" style={{ ...cardStyle, border: '1px solid hsl(217,36%,20%)' }}>
          <p className="text-sm font-semibold mb-3 text-muted-foreground">إنشاء دفعة جديدة</p>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              data-testid="input-batch-name"
              placeholder="اسم الدفعة (مثال: الدفعة الأولى - 1445)"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              className="rounded-xl flex-1"
            />
            <Button
              data-testid="button-create-batch"
              type="submit"
              className="rounded-xl gap-1 shrink-0"
              disabled={createBatch.isPending || !newBatchName.trim()}
            >
              {createBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </Button>
          </form>
        </div>

        {/* Edit Batch Dialog */}
        <Dialog open={!!editBatch} onOpenChange={(open) => { if (!open) setEditBatch(null); }}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl" style={{ backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Cairo, sans-serif' }}>تعديل اسم الدفعة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">اسم الدفعة</Label>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={updateBatch.isPending || !editName.trim()}>
                {updateBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Batch Confirmation Dialog */}
        <Dialog open={!!deleteBatchTarget} onOpenChange={(open) => { if (!open) setDeleteBatchTarget(null); }}>
          <DialogContent className="sm:max-w-[420px] rounded-2xl" style={{ backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' }}>
            <DialogHeader>
              <DialogTitle className="text-red-400" style={{ fontFamily: 'Cairo, sans-serif' }}>تأكيد حذف الدفعة</DialogTitle>
            </DialogHeader>
            <div className="pt-2 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                سيتم حذف الدفعة <strong className="text-foreground">"{deleteBatchTarget?.name}"</strong> ومعها جميع المشاركين المسجلين فيها وسجلات قراءتهم. هل أنت متأكد؟
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setDeleteBatchTarget(null)}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  onClick={handleDelete}
                  disabled={deleteBatch.isPending}
                >
                  {deleteBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف نهائي"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Batches grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : batches?.length === 0 ? (
            <div className="col-span-full py-12 text-center rounded-xl text-muted-foreground" style={{ ...cardStyle, border: '1px solid hsl(217,36%,20%)' }}>
              لا توجد دفعات مضافة حتى الآن
            </div>
          ) : (
            batches?.map(batch => (
              <Card key={batch.id} className="rounded-xl border" style={cardStyle}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base truncate" style={{ fontFamily: 'Cairo, sans-serif' }}>{batch.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(batch.createdAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        data-testid={`button-edit-batch-${batch.id}`}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-blue-400 hover:bg-blue-400/10"
                        onClick={() => { setEditBatch(batch); setEditName(batch.name); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        data-testid={`button-delete-batch-${batch.id}`}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:bg-red-400/10"
                        onClick={() => setDeleteBatchTarget(batch)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

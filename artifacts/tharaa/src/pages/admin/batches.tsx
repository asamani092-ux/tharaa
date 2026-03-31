import { useState } from "react";
import { useListBatches, useCreateBatch, getListBatchesQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Calendar, Layers } from "lucide-react";

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };

export default function AdminBatches() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading } = useListBatches();
  const createBatch = useCreateBatch();

  const [newBatchName, setNewBatchName] = useState("");

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
                    <div>
                      <h3 className="font-bold text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>{batch.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(batch.createdAt).toLocaleDateString('ar-SA')}</span>
                      </div>
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

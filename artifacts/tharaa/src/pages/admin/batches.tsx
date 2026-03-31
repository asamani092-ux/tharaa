import { useState } from "react";
import { useListBatches, useCreateBatch, getListBatchesQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Calendar } from "lucide-react";

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
        <h2 className="text-3xl font-bold">إدارة الدفعات</h2>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>إنشاء دفعة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-2">
              <Input 
                data-testid="input-batch-name"
                placeholder="اسم الدفعة (مثال: الدفعة الأولى - 1445)" 
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
              />
              <Button data-testid="button-create-batch" type="submit" disabled={createBatch.isPending || !newBatchName.trim()}>
                {createBatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إضافة
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin m-4" />
          ) : batches?.map(batch => (
            <Card key={batch.id} className="bg-card">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2 text-primary">{batch.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                  <Calendar className="w-4 h-4" />
                  <span>تاريخ الإنشاء: {new Date(batch.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {batches?.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-lg border border-border">
              لا توجد دفعات مضافة حتى الآن
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

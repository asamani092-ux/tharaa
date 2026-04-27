import { useState } from "react";
import { useListBatches } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";

export default function AdminBatches() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading, refetch } = useListBatches();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [form, setForm] = useState({ name: "", status: "active" });

  const createBatch = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/batches.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });

  const updateBatch = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await fetch(`/api/batches.php?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id })
      });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });

  const deleteBatch = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/batches.php?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("فشل الحذف");
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم حذف الدفعة وجميع المشاركين فيها بنجاح 🗑️");
      refetch();
      // تحديث قوائم الطلاب تلقائياً بعد الحذف
      queryClient.invalidateQueries({ queryKey: ['list-users'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editBatch) {
      updateBatch.mutate({ id: editBatch.id, data: form }, {
        onSuccess: () => { toast.success("تم التحديث بنجاح ✅"); setIsModalOpen(false); refetch(); }
      });
    } else {
      createBatch.mutate(form, {
        onSuccess: () => { toast.success("تمت الإضافة بنجاح ✅"); setIsModalOpen(false); refetch(); }
      });
    }
  };

  // 🌟 رسالة التحذير القوية قبل الحذف
  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`⚠️ تحذير خطير جداً!\n\nهل أنت متأكد من حذف دفعة "${name}"؟\nهذا الإجراء سيقوم بمسح الدفعة وحذف جميع (الطلاب) المسجلين داخلها من النظام نهائياً ولا يمكن التراجع عنه.`)) {
      deleteBatch.mutate(id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <Users className="w-6 h-6" /> إدارة الدفعات
          </h2>
          <Button 
            onClick={() => { setEditBatch(null); setForm({ name: "", status: "active" }); setIsModalOpen(true); }} 
            className="rounded-xl gap-2 font-bold h-11 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
          >
            <Plus className="w-4 h-4"/> إضافة دفعة جديدة
          </Button>
        </div>

        <div className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#0f172a] shadow-2xl">
          <Table>
            <TableHeader className="bg-[#161e2f]">
              <TableRow className="border-[#1e293b]">
                <TableHead className="text-right text-[#94a3b8] font-bold px-6 py-4">اسم الدفعة</TableHead>
                <TableHead className="text-center text-[#94a3b8] font-bold">الحالة</TableHead>
                <TableHead className="text-left text-[#94a3b8] font-bold px-6">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-[#D4AF37] w-6 h-6"/></TableCell></TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow key={batch.id} className="border-[#1e293b] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-right px-6 font-bold text-white py-4 text-lg">
                      {batch.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`font-medium border-white/10 ${batch.status === 'active' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                        {batch.status === 'active' ? 'نشطة' : 'مغلقة'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left px-6">
                      <div className="flex justify-start gap-2">
                        <Button size="icon" variant="ghost" onClick={() => { setEditBatch(batch); setForm({ name: batch.name, status: batch.status }); setIsModalOpen(true); }} className="text-blue-400 hover:bg-blue-400/10 h-9 w-9"><Pencil className="w-4 h-4"/></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(batch.id, batch.name)} className="text-red-400 hover:bg-red-400/10 h-9 w-9" disabled={deleteBatch.isPending}><Trash2 className="w-4 h-4"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[450px] rounded-3xl bg-[#0d1425] border-[#1e293b] text-right" dir="rtl">
            <DialogHeader><DialogTitle className="text-right text-xl font-bold text-white">{editBatch ? "تعديل بيانات الدفعة" : "إنشاء دفعة جديدة"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label className="text-[#94a3b8]">اسم الدفعة</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-xl bg-[#161e2f] border-[#1e293b] h-12 text-lg" required autoFocus/>
              </div>
              <div className="space-y-2">
                <Label className="text-[#94a3b8]">حالة التسجيل</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="rounded-xl bg-[#161e2f] border-[#1e293b] h-12"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="active">نشطة (متاح للتسجيل)</SelectItem><SelectItem value="inactive">مغلقة (لا يمكن للطلاب الانضمام)</SelectItem></SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full rounded-2xl font-bold h-12 mt-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black" disabled={createBatch.isPending || updateBatch.isPending}>
                {createBatch.isPending || updateBatch.isPending ? <Loader2 className="animate-spin w-5 h-5"/> : (editBatch ? "حفظ التعديلات" : "اعتماد الدفعة")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

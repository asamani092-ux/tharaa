import { useState } from "react";
import { useListBatches } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Users, AlertTriangle } from "lucide-react";

export default function AdminBatches() {
  const queryClient = useQueryClient();
  const { data: batches, isLoading, refetch } = useListBatches();
  
  // حالات الإضافة والتعديل
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [form, setForm] = useState({ name: "" }); // إزالة الحالة والاكتفاء بالاسم فقط

  // حالة رسالة تأكيد الحذف الأنيقة
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: number | null; name: string }>({
    isOpen: false,
    id: null,
    name: ""
  });

  const createBatch = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/batches.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status: 'active' }) // إرسال الحالة افتراضياً بالخلفية فقط
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
        body: JSON.stringify({ ...data, id, status: 'active' }) // إرسال الحالة افتراضياً
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
      setDeleteDialog({ isOpen: false, id: null, name: "" }); // إغلاق رسالة الحذف
      refetch();
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

  const confirmDelete = () => {
    if (deleteDialog.id) {
      deleteBatch.mutate(deleteDialog.id);
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
            onClick={() => { setEditBatch(null); setForm({ name: "" }); setIsModalOpen(true); }} 
            className="rounded-xl gap-2 font-bold h-11 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
          >
            <Plus className="w-4 h-4"/> إضافة دفعة جديدة
          </Button>
        </div>

        {/* الجدول مع المحاذاة المضبوطة (اليمين للاسم، واليسار للإجراءات) */}
        <div className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#0f172a] shadow-2xl">
          <Table>
            <TableHeader className="bg-[#161e2f]">
              <TableRow className="border-[#1e293b]">
                <TableHead className="text-right text-[#94a3b8] font-bold px-6 py-4">اسم الدفعة</TableHead>
                <TableHead className="text-left text-[#94a3b8] font-bold px-6">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={2} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-[#D4AF37] w-6 h-6"/></TableCell></TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow key={batch.id} className="border-[#1e293b] hover:bg-white/[0.02] transition-colors">
                    <TableCell className="text-right px-6 font-bold text-white py-4 text-lg">
                      {batch.name}
                    </TableCell>
                    <TableCell className="text-left px-6 w-32">
                      <div className="flex justify-start gap-2">
                        <Button size="icon" variant="ghost" onClick={() => { setEditBatch(batch); setForm({ name: batch.name }); setIsModalOpen(true); }} className="text-blue-400 hover:bg-blue-400/10 h-9 w-9"><Pencil className="w-4 h-4"/></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteDialog({ isOpen: true, id: batch.id, name: batch.name })} className="text-red-400 hover:bg-red-400/10 h-9 w-9" disabled={deleteBatch.isPending}><Trash2 className="w-4 h-4"/></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* نافذة الإضافة والتعديل المصغرة */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-3xl bg-[#0d1425] border-[#1e293b] text-right" dir="rtl">
            <DialogHeader><DialogTitle className="text-right text-xl font-bold text-white">{editBatch ? "تعديل اسم الدفعة" : "إنشاء دفعة جديدة"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label className="text-[#94a3b8]">اسم الدفعة</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="rounded-xl bg-[#161e2f] border-[#1e293b] h-12 text-lg" required autoFocus/>
              </div>
              <Button type="submit" className="w-full rounded-2xl font-bold h-12 mt-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black" disabled={createBatch.isPending || updateBatch.isPending}>
                {createBatch.isPending || updateBatch.isPending ? <Loader2 className="animate-spin w-5 h-5"/> : (editBatch ? "حفظ التعديل" : "إضافة الدفعة")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* 🌟 رسالة الحذف الأنيقة (بديل window.confirm المزعج) */}
        <Dialog open={deleteDialog.isOpen} onOpenChange={(isOpen) => !deleteBatch.isPending && setDeleteDialog(prev => ({ ...prev, isOpen }))}>
          <DialogContent className="sm:max-w-[400px] rounded-3xl bg-[#0f172a] border border-red-500/20 text-center flex flex-col items-center pt-8 pb-6 px-6" dir="rtl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white text-center">تحذير الحذف النهائي!</DialogTitle>
              <DialogDescription className="text-muted-foreground text-center mt-2 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف دفعة <strong className="text-white">"{deleteDialog.name}"</strong>؟ <br/>
                هذا الإجراء سيقوم أيضاً بحذف جميع المشاركين المرتبطين بها ولا يمكن التراجع عنه.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 w-full mt-6">
              <Button onClick={() => setDeleteDialog({ isOpen: false, id: null, name: "" })} variant="outline" className="flex-1 rounded-xl h-11 border-[#1e293b] hover:bg-white/5" disabled={deleteBatch.isPending}>
                إلغاء
              </Button>
              <Button onClick={confirmDelete} variant="destructive" className="flex-1 rounded-xl h-11 font-bold bg-red-600 hover:bg-red-700" disabled={deleteBatch.isPending}>
                {deleteBatch.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : "نعم، احذف الدفعة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}

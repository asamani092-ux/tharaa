import { useState } from "react";
import {
  useListUsers,
  useDeleteUser,
  useUpdateUser,
  useBulkCreateUsers,
  useListBatches,
  getListUsersQueryKey,
  getGetAnalyticsOverviewQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Check, Trash2, Search, Pencil, AlertTriangle } from "lucide-react";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkBatchId, setBulkBatchId] = useState<string>("");
  const [bulkPhase, setBulkPhase] = useState<string>("1");

  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    password: "", 
    batchId: "",
    phaseNumber: "",
    status: "active",
  });

  const { data: users, isLoading } = useListUsers({
    batchId: filterBatch !== "all" ? parseInt(filterBatch) : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const { data: batches } = useListBatches();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();
  const bulkCreate = useBulkCreateUsers();

  const filteredUsers = users?.filter((u) => u.role === 'student' && (u.name.includes(search) || u.phone.includes(search))) || [];

  // إصلاح 2.6: التفعيل المباشر عبر الزر الأخضر
  const handleDirectApprove = (id: number) => {
    updateUser.mutate({ id, data: { status: 'active' } }, {
      onSuccess: () => {
        toast.success("تم تنشيط المشارك");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    });
  };

  const confirmDelete = () => {
    if (!isDeleteModalOpen) return;
    deleteUser.mutate({ id: isDeleteModalOpen }, {
      onSuccess: () => {
        toast.success("تم حذف المشارك بنجاح");
        setIsDeleteModalOpen(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsOverviewQueryKey() });
      },
    });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate({
      id: editUser.id,
      data: {
        name: editForm.name,
        phone: editForm.phone,
        ...(editForm.password ? { password: editForm.password } : {}),
        batchId: parseInt(editForm.batchId),
        phaseNumber: parseInt(editForm.phaseNumber),
        status: editForm.status,
      },
    }, {
      onSuccess: () => {
        toast.success("تم التحديث بنجاح");
        setEditUser(null);
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkBatchId || !bulkText.trim()) return;
    bulkCreate.mutate({
      data: {
        batchId: parseInt(bulkBatchId),
        phaseNumber: parseInt(bulkPhase),
        levelType: "basic",
        rawText: bulkText,
      },
    }, {
      onSuccess: (res) => {
        toast.success(`تم إنشاء ${res.created} مشارك.`);
        setIsBulkModalOpen(false);
        setBulkText("");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#D4AF37]">إدارة المشاركين</h2>
          <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
            <DialogTrigger asChild><Button className="rounded-xl bg-primary hover:bg-primary/90 gap-2 font-bold"><Plus className="w-4 h-4"/> إضافة مشاركين</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl bg-[#0d1425] border-[#1e293b]">
              <DialogHeader><DialogTitle className="text-right">إضافة مجموعة مشاركين</DialogTitle></DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4 pt-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الدفعة</Label>
                    <Select value={bulkBatchId} onValueChange={setBulkBatchId} required><SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر"/></SelectTrigger>
                    <SelectContent>{batches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>المرحلة</Label><Input type="number" value={bulkPhase} onChange={e => setBulkPhase(e.target.value)} className="rounded-xl"/></div>
                </div>
                <div className="space-y-2"><Label>البيانات (الاسم الجوال كلمة_المرور)</Label><Textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="h-32 rounded-xl" placeholder="أحمد 0500000000 pass123"/></div>
                <Button type="submit" className="w-full rounded-xl h-11 font-bold" disabled={bulkCreate.isPending}>{bulkCreate.isPending ? <Loader2 className="animate-spin" /> : "اعتماد الإضافة"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-3 p-4 rounded-xl border border-[#1e293b] bg-[#0f172a]">
          <div className="flex-1 relative"><Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground"/><Input placeholder="بحث بالاسم أو الجوال..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 rounded-xl"/></div>
          <Select value={filterBatch} onValueChange={setFilterBatch}><SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="الدفعات"/></SelectTrigger><SelectContent><SelectItem value="all">كل الدفعات</SelectItem>{batches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent></Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="الحالة"/></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="active">نشط</SelectItem><SelectItem value="pending">معلق</SelectItem></SelectContent></Select>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#0f172a] shadow-lg">
          <Table>
            <TableHeader className="bg-[#161e2f]">
              <TableRow className="border-[#1e293b] hover:bg-transparent">
                <TableHead className="text-right text-[#94a3b8] font-bold w-[30%] px-6">الاسم</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold w-[20%]">رقم الجوال</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold w-[15%]">الدفعة</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold w-[15%]">المرحلة</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold w-[10%]">الحالة</TableHead>
                <TableHead className="text-center text-[#94a3b8] font-bold w-[10%]">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (<TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>) : 
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="border-[#1e293b] hover:bg-white/[0.02]">
                  <TableCell className="text-right px-6 font-medium">{user.name}</TableCell>
                  <TableCell className="text-right font-mono text-sm" dir="ltr">{user.phone}</TableCell>
                  <TableCell className="text-right">{batches?.find(b => b.id === user.batchId)?.name || "-"}</TableCell>
                  <TableCell className="text-right">م.{user.phaseNumber}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}>{user.status === 'active' ? 'نشط' : 'معلق'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      {user.status === 'pending' && <Button size="icon" variant="ghost" className="text-emerald-400 h-8 w-8" onClick={() => handleDirectApprove(user.id)}><Check className="w-4 h-4"/></Button>}
                      <Button size="icon" variant="ghost" className="text-blue-400 h-8 w-8" onClick={() => { setEditUser(user); setEditForm({name: user.name, phone: user.phone, password: "", batchId: user.batchId?.toString() || "", phaseNumber: user.phaseNumber?.toString() || "", status: user.status}) }}><Pencil className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" className="text-red-400 h-8 w-8" onClick={() => setIsDeleteModalOpen(user.id)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Delete Confirmation Modal (2.4) */}
        <Dialog open={!!isDeleteModalOpen} onOpenChange={() => setIsDeleteModalOpen(null)}>
          <DialogContent className="sm:max-w-[400px] rounded-2xl bg-[#0d1425] border-red-500/20 text-center">
            <div className="flex flex-col items-center pt-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4"><AlertTriangle className="text-red-500 w-6 h-6"/></div>
              <h3 className="text-lg font-bold">تأكيد الحذف</h3>
              <p className="text-muted-foreground text-sm mt-2">هل أنت متأكد من حذف هذا المشارك نهائياً؟</p>
            </div>
            <DialogFooter className="gap-2 mt-6 flex-row">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(null)} className="flex-1 rounded-xl">تراجع</Button>
              <Button variant="destructive" onClick={confirmDelete} className="flex-1 rounded-xl">حذف نهائي</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal (2.3) */}
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl bg-[#0d1425] border-[#1e293b] text-right">
            <DialogHeader><DialogTitle className="text-right">تعديل بيانات المشارك</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>الاسم</Label><Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="rounded-xl"/></div>
                <div className="space-y-1.5"><Label>رقم الجوال</Label><Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="rounded-xl"/></div>
              </div>
              <div className="space-y-1.5"><Label>كلمة المرور الجديدة (اختياري)</Label><Input type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="rounded-xl" placeholder="اتركه فارغاً لعدم التغيير"/></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>الدفعة</Label>
                  <Select value={editForm.batchId} onValueChange={v => setEditForm({...editForm, batchId: v})}><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger><SelectContent>{batches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1.5"><Label>المرحلة</Label><Input type="number" value={editForm.phaseNumber} onChange={e => setEditForm({...editForm, phaseNumber: e.target.value})} className="rounded-xl"/></div>
              </div>
              <div className="space-y-1.5"><Label>الحالة</Label><Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="pending">معلق</SelectItem></SelectContent></Select></div>
              <Button type="submit" className="w-full rounded-xl font-bold h-11">حفظ التعديلات</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

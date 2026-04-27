import { useState } from "react";
import {
  useListUsers,
  useApproveUser,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Check, Trash2, Search, Pencil } from "lucide-react";

type UserRow = {
  id: number;
  name: string;
  phone: string;
  batchId: number | null;
  phaseNumber: number | null;
  status: string;
};

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  // حالات نافذة الإضافة الجماعية
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBatchId, setBulkBatchId] = useState<string>("");
  const [bulkPhase, setBulkPhase] = useState<string>("1");

  // حالات تعديل مشارك واحد
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    batchId: "",
    phaseNumber: "",
    status: "active",
  });

  const { data: users, isLoading } = useListUsers({
    batchId: filterBatch !== "all" ? parseInt(filterBatch) : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const { data: batches } = useListBatches();

  const approveUser = useApproveUser();
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();
  const bulkCreate = useBulkCreateUsers();

  const filteredUsers =
    users?.filter((u) => u.name.includes(search) || u.phone.includes(search)) ||
    [];

  const handleApprove = (id: number) => {
    approveUser.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("تم تفعيل المشارك بنجاح");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAnalyticsOverviewQueryKey() });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشارك؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    
    const toastId = toast.loading("جاري حذف المشارك...");
    deleteUser.mutate(
      { id },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success("تم حذف المشارك بنجاح");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAnalyticsOverviewQueryKey() });
        },
        onError: (err: any) => {
          toast.dismiss(toastId);
          toast.error(err?.error || "فشل حذف المشارك");
        },
      },
    );
  };

  const openEditDialog = (user: any) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      phone: user.phone,
      batchId: user.batchId?.toString() || "",
      phaseNumber: user.phaseNumber?.toString() || "",
      status: user.status,
    });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    updateUser.mutate(
      {
        id: editUser.id,
        data: {
          name: editForm.name,
          phone: editForm.phone,
          batchId: editForm.batchId ? parseInt(editForm.batchId) : null,
          phaseNumber: editForm.phaseNumber ? parseInt(editForm.phaseNumber) : null,
          status: editForm.status,
        },
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث بيانات المشارك بنجاح");
          setEditUser(null);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: (err: any) => {
          toast.error(err?.error || "فشل تحديث البيانات");
        },
      }
    );
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkBatchId || !bulkText.trim()) return;

    bulkCreate.mutate(
      {
        data: {
          batchId: parseInt(bulkBatchId),
          phaseNumber: parseInt(bulkPhase),
          levelType: "basic", // قيمة افتراضية ثابتة في الخلفية
          rawText: bulkText,
        },
      },
      {
        onSuccess: (res) => {
          toast.success(`تم إنشاء ${res.created} مشارك بنجاح.`);
          setIsBulkModalOpen(false);
          setBulkText("");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAnalyticsOverviewQueryKey() });
        },
        onError: (err: any) => {
          toast.error(err?.error || "حدث خطأ أثناء الإضافة");
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "Cairo, sans-serif", color: '#D4AF37' }}>
              إدارة المشاركين
            </h2>
          </div>
          <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Plus className="w-4 h-4" />
                إضافة مشاركين
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-2xl" style={{ backgroundColor: "hsl(218,39%,12%)", borderColor: "hsl(217,36%,20%)" }}>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "Cairo, sans-serif" }}>إضافة مجموعة مشاركين</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4 text-right">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">الدفعة</Label>
                    <Select value={bulkBatchId} onValueChange={setBulkBatchId} required>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر الدفعة" /></SelectTrigger>
                      <SelectContent>
                        {batches?.map((b) => (<SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">المرحلة الحالية</Label>
                    <Input type="number" min="1" value={bulkPhase} onChange={(e) => setBulkPhase(e.target.value)} required className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Label className="text-sm text-muted-foreground">بيانات المشاركين (الاسم رقم_الجوال كلمة_المرور — كل مشارك في سطر)</Label>
                  <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"خالد 0501112223 pass123\nفهد 0504445556 pass456"} className="h-40 rounded-xl" dir="rtl" required />
                </div>
                <Button type="submit" className="w-full rounded-xl font-bold h-11" disabled={bulkCreate.isPending}>
                  {bulkCreate.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "اعتماد الإضافة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-3 p-4 rounded-xl border" style={{ backgroundColor: "hsl(218,39%,12%)", borderColor: "hsl(217,36%,20%)" }}>
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو رقم الجوال..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 rounded-xl" />
          </div>
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-full md:w-44 rounded-xl"><SelectValue placeholder="كل الدفعات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدفعات</SelectItem>
              {batches?.map((b) => (<SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40 rounded-xl"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
              <SelectItem value="suspended">موقوف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table Section - FIXED ALIGNMENT */}
        <div className="rounded-xl overflow-hidden border shadow-sm" style={{ backgroundColor: "hsl(218,39%,12%)", borderColor: "hsl(217,36%,20%)" }}>
          <Table>
            <TableHeader>
              <TableRow style={{ borderBottomColor: "hsl(217,36%,20%)", backgroundColor: "hsl(218,42%,10%)" }}>
                <TableHead className="text-right text-muted-foreground font-bold">الاسم</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold">رقم الجوال</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold">الدفعة</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold">المرحلة</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold">الحالة</TableHead>
                <TableHead className="text-left text-muted-foreground font-bold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">لا يوجد مستخدمين مضافين حالياً</TableCell></TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-white/[0.02]" style={{ borderBottomColor: "hsl(217,36%,18%)" }}>
                    <TableCell className="font-medium text-right">{user.name}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground" dir="ltr">{user.phone}</TableCell>
                    <TableCell className="text-right text-sm">{batches?.find((b) => b.id === user.batchId)?.name || "—"}</TableCell>
                    <TableCell className="text-right text-sm">المرحلة {user.phaseNumber}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={user.status === 'active' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' : 'bg-amber-600/20 text-amber-400 border-amber-600/30'}>
                        {user.status === 'active' ? 'نشط' : user.status === 'pending' ? 'معلق' : 'موقوف'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-start gap-2">
                        {user.status === "pending" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 hover:bg-emerald-400/10" onClick={() => handleApprove(user.id)} disabled={approveUser.isPending}><Check className="w-4 h-4" /></Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:bg-blue-400/10" onClick={() => openEditDialog(user)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-400/10" onClick={() => handleDelete(user.id)} disabled={deleteUser.isPending}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl text-right" style={{ backgroundColor: "hsl(218,39%,12%)", borderColor: "hsl(217,36%,20%)" }}>
            <DialogHeader><DialogTitle style={{ fontFamily: "Cairo, sans-serif" }}>تعديل بيانات المشارك</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">الاسم</Label><Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required className="rounded-xl" /></div>
                <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">رقم الجوال</Label><Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr" className="rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">الدفعة</Label>
                  <Select value={editForm.batchId} onValueChange={v => setEditForm({ ...editForm, batchId: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر الدفعة" /></SelectTrigger>
                    <SelectContent>{batches?.map(b => (<SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">رقم المرحلة</Label><Input type="number" min="1" value={editForm.phaseNumber} onChange={e => setEditForm({ ...editForm, phaseNumber: e.target.value })} className="rounded-xl" /></div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">حالة الحساب</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="suspended">موقوف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full rounded-xl font-bold h-11" disabled={updateUser.isPending}>
                {updateUser.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

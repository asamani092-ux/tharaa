import { useState } from "react";
import {
  useListUsers,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Check, Trash2, Search, Pencil } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users.php?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const text = await res.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch {
        throw new Error("لم يتمكن السيرفر من معالجة طلب الحذف");
      }
      if (!res.ok) throw new Error(jsonData.error || "حدث خطأ أثناء الحذف");
      return jsonData;
    },
  });

  const updateUser = useUpdateUser();
  const bulkCreate = useBulkCreateUsers();

  const filteredUsers =
    users?.filter(
      (u) => u.role === "student" && (u.name.includes(search) || u.phone.includes(search))
    ) || [];

  const openDeleteUser = (user: { id: number; name: string }) => {
    setDeleteTarget({ id: user.id, label: user.name });
    setDeleteOpen(true);
  };

  const handleDirectApprove = (id: number) => {
    updateUser.mutate(
      { id, data: { status: "active" } },
      {
        onSuccess: () => {
          toast.success("تم تنشيط المشارك");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
      }
    );
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser.mutate(
      {
        id: editUser.id,
        data: {
          name: editForm.name,
          phone: editForm.phone,
          ...(editForm.password ? { password: editForm.password } : {}),
          batchId: parseInt(editForm.batchId),
          phaseNumber: parseInt(editForm.phaseNumber),
          status: editForm.status,
        },
      },
      {
        onSuccess: () => {
          toast.success("تم التحديث بنجاح");
          setEditUser(null);
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => toast.error("تعذر تحديث البيانات"),
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
          levelType: "basic",
          rawText: bulkText,
        },
      },
      {
        onSuccess: (res) => {
          toast.success(`تم إنشاء ${res.created} مشارك.`);
          setIsBulkModalOpen(false);
          setBulkText("");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => toast.error("تعذر إضافة المشاركين"),
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-[var(--secondary-400)]">إدارة المشاركين</h2>
          <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة مشاركين
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] text-right" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">إضافة مجموعة مشاركين</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">الدفعة</Label>
                    <Select value={bulkBatchId} onValueChange={setBulkBatchId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches?.map((b) => (
                          <SelectItem key={b.id} value={b.id.toString()}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[var(--text-secondary)]">المرحلة</Label>
                    <Input type="number" value={bulkPhase} onChange={(e) => setBulkPhase(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[var(--text-secondary)]">البيانات (الاسم الجوال كلمة_المرور)</Label>
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="min-h-32"
                    placeholder="أحمد 0500000000 pass123"
                  />
                </div>
                <Button type="submit" className="w-full" variant="secondary" disabled={bulkCreate.isPending}>
                  {bulkCreate.isPending ? <Loader2 className="animate-spin" /> : "اعتماد الإضافة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-3 p-4 rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-sm)]">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <Input
              placeholder="بحث بالاسم أو الجوال..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="الدفعات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدفعات</SelectItem>
              {batches?.map((b) => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-md)]">
          <Table>
            <TableHeader className="bg-[var(--bg-secondary)]">
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold w-[30%] px-6">
                  الاسم
                </TableHead>
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold w-[20%]">
                  رقم الجوال
                </TableHead>
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold w-[15%]">
                  الدفعة
                </TableHead>
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold w-[15%]">
                  المرحلة
                </TableHead>
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold w-[10%]">
                  الحالة
                </TableHead>
                <TableHead className="text-center text-[var(--text-secondary)] font-semibold w-[10%]">
                  الإجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto text-[var(--secondary-400)]" />
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]">
                    <TableCell className="text-right px-6 font-medium text-[var(--text-primary)]">
                      {user.name}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-[var(--text-primary)]" dir="ltr">
                      {user.phone}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-primary)]">
                      {batches?.find((b) => b.id === user.batchId)?.name || "-"}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-primary)]">م.{user.phaseNumber}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        className={
                          user.status === "active"
                            ? "bg-[var(--success-600)]/10 text-[var(--success-600)] border-transparent"
                            : "bg-[var(--secondary-400)]/10 text-[var(--secondary-600)] border-transparent"
                        }
                      >
                        {user.status === "active" ? "نشط" : "معلق"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        {user.status === "pending" && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-[var(--success-600)] border-[var(--success-600)]/40"
                            onClick={() => handleDirectApprove(user.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditUser(user);
                            setEditForm({
                              name: user.name,
                              phone: user.phone,
                              password: "",
                              batchId: user.batchId?.toString() || "",
                              phaseNumber: user.phaseNumber?.toString() || "",
                              status: user.status,
                            });
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-[var(--error-400)] border-[var(--error-400)]/40 hover:bg-[var(--error-400)]/10"
                          onClick={() => openDeleteUser(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteTarget(null);
          }}
          title="تأكيد حذف المشارك"
          entityLabel={deleteTarget?.label ?? ""}
          isLoading={deleteLoading}
          onConfirm={async () => {
            if (!deleteTarget) return;
            setDeleteLoading(true);
            try {
              await deleteUser.mutateAsync(deleteTarget.id);
              toast.success("تم حذف المشارك بنجاح");
              setDeleteOpen(false);
              setDeleteTarget(null);
              queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
              queryClient.invalidateQueries({ queryKey: getGetAnalyticsOverviewQueryKey() });
            } catch (e: any) {
              toast.error(e?.message ?? "تعذر حذف المشارك");
            } finally {
              setDeleteLoading(false);
            }
          }}
        />

        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="sm:max-w-[500px] text-right" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">تعديل بيانات المشارك</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">الاسم</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">رقم الجوال</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--text-secondary)]">كلمة المرور الجديدة (اختياري)</Label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="اتركه فارغاً لعدم التغيير"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">الدفعة</Label>
                  <Select value={editForm.batchId} onValueChange={(v) => setEditForm({ ...editForm, batchId: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {batches?.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">المرحلة</Label>
                  <Input
                    type="number"
                    value={editForm.phaseNumber}
                    onChange={(e) => setEditForm({ ...editForm, phaseNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[var(--text-secondary)]">الحالة</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" variant="secondary" disabled={updateUser.isPending}>
                {updateUser.isPending ? <Loader2 className="animate-spin" /> : "حفظ التعديلات"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Shield } from "lucide-react";
import { isSupervisorRole } from "@/lib/roles";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

type AdminUser = {
  id: number;
  name: string;
  phone: string;
  status?: string;
};

const ADMINS_KEY = ["admin-accounts"] as const;

async function fetchAdmins(): Promise<AdminUser[]> {
  const res = await fetch("/api/users.php?id=admins", { credentials: "include" });
  if (!res.ok) throw new Error("فشل جلب المشرفين");
  return res.json();
}

export default function AdminSupervisors() {
  const { data: session } = useGetMe();
  const role = session?.user?.role;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", password: "" });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const { data: admins, isLoading } = useQuery({
    queryKey: ADMINS_KEY,
    queryFn: fetchAdmins,
    enabled: isSupervisorRole(role),
  });

  const createAdmin = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users.php?id=admin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الإنشاء");
      return data;
    },
    onSuccess: () => {
      toast.success("تم إنشاء حساب المشرف");
      setCreateOpen(false);
      setForm({ name: "", phone: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ADMINS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAdmin = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const res = await fetch(`/api/users.php?id=${editUser.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل التحديث");
    },
    onSuccess: () => {
      toast.success("تم تحديث المشرف");
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ADMINS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAdmin = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users.php?id=${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
    },
    onSuccess: () => {
      toast.success("تم حذف المشرف");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ADMINS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isSupervisorRole(role)) {
    return (
      <AdminLayout>
        <p className="text-center py-20 text-[var(--text-secondary)]">
          هذه الصفحة متاحة لحساب السوبرفايزر فقط.
        </p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-[var(--secondary-400)] flex items-center gap-2">
            <Shield className="w-6 h-6" />
            إدارة حسابات المشرفين
          </h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Plus className="w-4 h-4 ml-2" />
                مشرف جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مشرف</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>الاسم</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>الجوال</Label>
                  <Input
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>كلمة المرور</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createAdmin.mutate()}
                  disabled={createAdmin.isPending}
                >
                  {createAdmin.isPending ? <Loader2 className="animate-spin" /> : "إنشاء"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">قائمة المشرفين</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الجوال</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : (
                  (admins ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell dir="ltr" className="text-left">
                        {a.phone}
                      </TableCell>
                      <TableCell className="text-center space-x-2 space-x-reverse">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditUser(a);
                            setEditForm({ name: a.name, phone: a.phone, password: "" });
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(a)}
                        >
                          حذف
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تعديل مشرف</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                dir="ltr"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
              <Input
                type="password"
                placeholder="كلمة مرور جديدة (اختياري)"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
              <Button
                className="w-full"
                onClick={() => updateAdmin.mutate()}
                disabled={updateAdmin.isPending}
              >
                حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDeleteDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="حذف المشرف"
          entityLabel={deleteTarget?.name ?? "المشرف"}
          onConfirm={() => deleteTarget && deleteAdmin.mutate(deleteTarget.id)}
          isLoading={deleteAdmin.isPending}
        />
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import {
  useListUsers,
  useApproveUser,
  useDeleteUser,
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
import { Loader2, Plus, Check, Trash2, Search } from "lucide-react";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkBatchId, setBulkBatchId] = useState<string>("");
  const [bulkPhase, setBulkPhase] = useState<string>("1");
  const [bulkLevel, setBulkLevel] = useState<string>("basic");

  const { data: users, isLoading } = useListUsers({
    batchId: filterBatch !== "all" ? parseInt(filterBatch) : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const { data: batches } = useListBatches();

  const approveUser = useApproveUser();
  const deleteUser = useDeleteUser();
  const bulkCreate = useBulkCreateUsers();

  const filteredUsers =
    users?.filter((u) => u.name.includes(search) || u.phone.includes(search)) ||
    [];

  const handleApprove = (id: number) => {
    approveUser.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("تم تفعيل المستخدم");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          queryClient.invalidateQueries({
            queryKey: getGetAnalyticsOverviewQueryKey(),
          });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
      deleteUser.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("تم الحذف بنجاح");
            queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
            queryClient.invalidateQueries({
              queryKey: getGetAnalyticsOverviewQueryKey(),
            });
          },
        },
      );
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkBatchId || !bulkText.trim()) return;

    bulkCreate.mutate(
      {
        data: {
          batchId: parseInt(bulkBatchId),
          phaseNumber: parseInt(bulkPhase),
          levelType: bulkLevel,
          rawText: bulkText,
        },
      },
      {
        onSuccess: (res) => {
          toast.success(
            `تم إنشاء ${res.created} مستخدم بنجاح. فشل: ${res.failed}`,
          );
          setIsBulkModalOpen(false);
          setBulkText("");
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          queryClient.invalidateQueries({
            queryKey: getGetAnalyticsOverviewQueryKey(),
          });
        },
        onError: (err: any) => {
          toast.error(err?.error || "حدث خطأ أثناء الاستيراد");
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ fontFamily: "Cairo, sans-serif" }}
            >
              إدارة المستخدمين
            </h2>
          </div>
          <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-bulk-import"
                className="gap-2 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                إضافة مشاركين
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[600px] rounded-2xl"
              style={{
                backgroundColor: "hsl(218,39%,12%)",
                borderColor: "hsl(217,36%,20%)",
              }}
            >
              <DialogHeader>
                <DialogTitle style={{ fontFamily: "Cairo, sans-serif" }}>
                  استيراد مجموعة مشاركين
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBulkSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      الدفعة
                    </Label>
                    <Select
                      value={bulkBatchId}
                      onValueChange={setBulkBatchId}
                      required
                    >
                      <SelectTrigger
                        data-testid="select-bulk-batch"
                        className="rounded-xl"
                      >
                        <SelectValue placeholder="اختر الدفعة" />
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
                    <Label className="text-sm text-muted-foreground">
                      المرحلة
                    </Label>
                    <Input
                      data-testid="input-bulk-phase"
                      type="number"
                      min="1"
                      value={bulkPhase}
                      onChange={(e) => setBulkPhase(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    المستوى
                  </Label>
                  <Select value={bulkLevel} onValueChange={setBulkLevel}>
                    <SelectTrigger
                      data-testid="select-bulk-level"
                      className="rounded-xl"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">أساسي</SelectItem>
                      <SelectItem value="optional">اختياري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    البيانات (الاسم رقم_الجوال كلمة_المرور — كل مشارك في سطر)
                  </Label>
                  <Textarea
                    data-testid="textarea-bulk-users"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={
                      "أحمد 0501234567 pass123\nمحمد 0507654321 pass456"
                    }
                    className="h-40 rounded-xl"
                    dir="rtl"
                    required
                  />
                </div>
                <Button
                  data-testid="button-bulk-submit"
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={bulkCreate.isPending}
                >
                  {bulkCreate.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "استيراد"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div
          className="flex flex-col md:flex-row gap-3 p-4 rounded-xl"
          style={{
            backgroundColor: "hsl(218,39%,12%)",
            border: "1px solid hsl(217,36%,20%)",
          }}
        >
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-search-users"
              placeholder="بحث بالاسم أو رقم الجوال..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 rounded-xl"
            />
          </div>
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger
              data-testid="select-filter-batch"
              className="w-full md:w-44 rounded-xl"
            >
              <SelectValue placeholder="كل الدفعات" />
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
            <SelectTrigger
              data-testid="select-filter-status"
              className="w-full md:w-40 rounded-xl"
            >
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
              <SelectItem value="suspended">موقوف</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "hsl(218,39%,12%)",
            border: "1px solid hsl(217,36%,20%)",
          }}
        >
          <Table>
            <TableHeader>
              <TableRow
                style={{
                  borderBottomColor: "hsl(217,36%,20%)",
                  backgroundColor: "hsl(218,42%,10%)",
                }}
              >
                <TableHead className="text-muted-foreground text-xs font-semibold">
                  الاسم
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold">
                  رقم الجوال
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold">
                  الدفعة
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold">
                  المرحلة / المستوى
                </TableHead>
                <TableHead className="text-muted-foreground text-xs font-semibold">
                  الحالة
                </TableHead>
                <TableHead className="text-left text-muted-foreground text-xs font-semibold">
                  الإجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-muted-foreground"
                  >
                    لا يوجد مستخدمين
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    data-testid={`row-user-${user.id}`}
                    style={{ borderBottomColor: "hsl(217,36%,18%)" }}
                    className="hover:bg-white/[0.02]"
                  >
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell
                      dir="ltr"
                      className="text-right text-sm text-muted-foreground"
                    >
                      {user.phone}
                    </TableCell>
                    <TableCell className="text-sm">
                      {batches?.find((b) => b.id === user.batchId)?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      م.{user.phaseNumber} —{" "}
                      {user.levelType === "basic" ? "أساسي" : "اختياري"}
                    </TableCell>
                    <TableCell>
                      {user.status === "active" && (
                        <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 text-xs">
                          نشط
                        </Badge>
                      )}
                      {user.status === "pending" && (
                        <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30 text-xs">
                          معلق
                        </Badge>
                      )}
                      {user.status === "suspended" && (
                        <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-xs">
                          موقوف
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex justify-end gap-2">
                        {user.status === "pending" && (
                          <Button
                            data-testid={`button-approve-${user.id}`}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-400 hover:bg-emerald-400/10"
                            onClick={() => handleApprove(user.id)}
                            disabled={approveUser.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          data-testid={`button-delete-${user.id}`}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDelete(user.id)}
                          disabled={deleteUser.isPending}
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
      </div>
    </AdminLayout>
  );
}

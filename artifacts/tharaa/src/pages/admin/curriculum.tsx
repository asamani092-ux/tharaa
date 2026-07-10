import { useState, useEffect, useMemo } from "react";
import { useListCurriculum } from "@workspace/api-client-react";
import { useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, BookOpen } from "lucide-react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

type TrackType = "full" | "simplified" | "both";

const TRACK_OPTIONS: { value: TrackType; label: string }[] = [
  { value: "full", label: "كامل" },
  { value: "simplified", label: "ميسر" },
  { value: "both", label: "كلاهما" },
];

function trackTypeLabel(value?: string): string {
  return TRACK_OPTIONS.find((o) => o.value === value)?.label ?? "كلاهما";
}

function compareBookCodes(a: string | undefined, b: string | undefined): number {
  return String(a ?? "").localeCompare(String(b ?? ""), "ar", {
    numeric: true,
    sensitivity: "base",
  });
}

export default function AdminCurriculum() {
  const { data: curriculum, isLoading, refetch } = useListCurriculum();

  const sortedCurriculum = useMemo(() => {
    if (!curriculum?.length) return [];
    return [...curriculum].sort((a, b) => compareBookCodes(a.bookCode, b.bookCode));
  }, [curriculum]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editBook, setEditBook] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    phaseNumber: "1",
    levelType: "basic",
    trackType: "both" as TrackType,
    totalPages: "",
    author: "",
    pdfUrl: "",
    bookCode: "",
  });

  useEffect(() => {
    if (form.phaseNumber && curriculum) {
      if (!editBook || (editBook && editBook.phaseNumber !== parseInt(form.phaseNumber))) {
        const booksInPhase = curriculum.filter((b) => b.phaseNumber === parseInt(form.phaseNumber)).length;
        const nextSequence = booksInPhase + 1;
        const generatedCode = `P${form.phaseNumber}-${nextSequence}`;
        setForm((prev) => ({ ...prev, bookCode: generatedCode }));
      }
    }
  }, [form.phaseNumber, curriculum, editBook]);

  const createBook = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const updateBook = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/curriculum?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id }),
      });
      const text = await res.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch {
        throw new Error("لم يتمكن السيرفر من معالجة طلب التعديل");
      }
      if (!res.ok) throw new Error(jsonData.error || "حدث خطأ أثناء التحديث");
      return jsonData;
    },
  });

  const deleteBook = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/curriculum?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("حدث خطأ أثناء الحذف");
      return res.json();
    },
  });

  const openDeleteBook = (book: { id: number; title: string }) => {
    setDeleteTarget({ id: book.id, label: book.title });
    setDeleteOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      phaseNumber: parseInt(form.phaseNumber),
      totalPages: parseInt(form.totalPages),
    };

    if (editBook) {
      updateBook.mutate(
        { id: editBook.id, data: payload },
        {
          onSuccess: () => {
            toast.success("تم تحديث الكتاب بنجاح ✅");
            setEditBook(null);
            setIsAddModalOpen(false);
            refetch();
          },
          onError: (err: any) => toast.error(err.message),
        }
      );
    } else {
      createBook.mutate(payload, {
        onSuccess: () => {
          toast.success("تمت إضافة الكتاب بنجاح ✅");
          setIsAddModalOpen(false);
          refetch();
        },
        onError: () => toast.error("حدث خطأ أثناء الإضافة"),
      });
    }
  };

  const levelBadgeClass =
    "rounded-full border-0 font-medium " +
    "bg-[var(--bg-tertiary)] text-[var(--text-primary)] " +
    "light:bg-white light:text-[var(--primary-600)] light:border light:border-[var(--border-default)]";

  const trackBadgeClass =
    "rounded-full border-0 font-medium " +
    "bg-[var(--bg-tertiary)] text-[var(--text-primary)] " +
    "light:bg-white light:text-[var(--primary-600)] light:border light:border-[var(--border-default)]";

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h2 className="text-2xl font-bold text-[var(--secondary-400)]">المنهج الدراسي</h2>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              setEditBook(null);
              setForm({
                title: "",
                phaseNumber: "1",
                levelType: "basic",
                trackType: "both",
                totalPages: "",
                author: "",
                pdfUrl: "",
                bookCode: "",
              });
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            إضافة كتاب جديد
          </Button>
        </div >

        <div className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-md)]">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px] table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[20%]" />
              </colgroup>
              <TableHeader className="bg-[var(--bg-secondary)]">
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="align-middle text-right text-[var(--text-secondary)] font-semibold px-6 py-4">
                    اسم الكتاب
                  </TableHead>
                  <TableHead className="align-middle text-center text-[var(--text-secondary)] font-semibold px-4 py-4">
                    الرمز
                  </TableHead>
                  <TableHead className="align-middle text-center text-[var(--text-secondary)] font-semibold px-4 py-4">
                    المرحلة
                  </TableHead>
                  <TableHead className="align-middle text-center text-[var(--text-secondary)] font-semibold px-4 py-4">
                    المستوى
                  </TableHead>
                  <TableHead className="align-middle text-center text-[var(--text-secondary)] font-semibold px-4 py-4">
                    المسار
                  </TableHead>
                  <TableHead className="align-middle text-center text-[var(--text-secondary)] font-semibold px-4 py-4">
                    عدد الصفحات
                  </TableHead>
                  <TableHead className="align-middle text-left text-[var(--text-secondary)] font-semibold px-6 py-4">
                    الإجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="animate-spin mx-auto text-[var(--secondary-400)]" />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCurriculum.map((book) => (
                    <TableRow
                      key={book.id}
                      className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <TableCell className="align-middle px-6 py-4 text-right">
                        <div className="flex flex-row-reverse items-center gap-3">
                          <span className="min-w-0 flex-1 truncate font-semibold text-[var(--text-primary)]">
                            {book.title}
                          </span>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
                            <BookOpen className="h-4 w-4 text-[var(--secondary-400)]" />
                          </div >
                        </div>
                      </TableCell>
                      <TableCell className="align-middle px-4 py-4 text-center">
                        <span className="inline-flex rounded-full px-3 py-1 text-sm font-mono font-semibold bg-[var(--bg-tertiary)] text-[var(--secondary-400)] border border-[var(--border-subtle)] light:bg-white light:border-[var(--border-default)]">
                          {book.bookCode}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle px-4 py-4 text-center text-[var(--text-primary)]">
                        المرحلة {book.phaseNumber}
                      </TableCell>
                      <TableCell className="align-middle px-4 py-4 text-center">
                        <Badge className={levelBadgeClass}>
                          {book.levelType === "basic" ? "أساسي" : "اختياري"}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle px-4 py-4 text-center">
                        <Badge className={trackBadgeClass}>
                          {trackTypeLabel((book as { trackType?: string }).trackType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle px-4 py-4 text-center font-mono text-[var(--text-primary)]">
                        {book.totalPages}
                      </TableCell>
                      <TableCell className="align-middle px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditBook(book);
                              setForm({
                                title: book.title,
                                phaseNumber: book.phaseNumber.toString(),
                                levelType: book.levelType,
                                trackType: ((book as { trackType?: TrackType }).trackType ?? "both") as TrackType,
                                totalPages: book.totalPages.toString(),
                                author: book.author || "",
                                pdfUrl: book.pdfUrl || "",
                                bookCode: book.bookCode,
                              });
                              setIsAddModalOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-[var(--error-400)] border-[var(--error-400)]/40 hover:bg-[var(--error-400)]/10"
                            onClick={() => openDeleteBook(book)}
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
          </div >
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[550px] text-right" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">
                {editBook ? "تعديل بيانات الكتاب" : "إضافة كتاب جديد للمنهج"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">اسم الكتاب</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div >
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">المؤلف</Label>
                  <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">رقم المرحلة</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.phaseNumber}
                    onChange={(e) => setForm({ ...form, phaseNumber: e.target.value })}
                    required
                  />
                </div >
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">عدد الصفحات</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.totalPages}
                    onChange={(e) => setForm({ ...form, totalPages: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">المستوى</Label>
                  <Select value={form.levelType} onValueChange={(v) => setForm({ ...form, levelType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">أساسي</SelectItem>
                      <SelectItem value="optional">اختياري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[var(--text-secondary)]">مسار الكتاب</Label>
                  <Select
                    value={form.trackType}
                    onValueChange={(v) => setForm({ ...form, trackType: v as TrackType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRACK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div >
              <div className="space-y-1.5">
                <Label className="text-[var(--text-secondary)]">رابط الكتاب (PDF / Drive)</Label>
                <Input
                  value={form.pdfUrl}
                  onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-secondary)] flex justify-between items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)]">رمز الكتاب المولّد:</span>
                <span className="font-mono text-lg font-bold text-[var(--secondary-400)] tracking-wide">
                  {form.bookCode}
                </span>
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={createBook.isPending || updateBook.isPending}>
                {createBook.isPending || updateBook.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : editBook ? (
                  "حفظ التعديلات"
                ) : (
                  "اعتماد إضافة الكتاب"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open);
            if (!open) setDeleteTarget(null);
          }}
          title="تأكيد حذف الكتاب"
          entityLabel={deleteTarget?.label ?? ""}
          isLoading={deleteLoading}
          onConfirm={async () => {
            if (!deleteTarget) return;
            setDeleteLoading(true);
            try {
              await deleteBook.mutateAsync(deleteTarget.id);
              toast.success("تم حذف الكتاب بنجاح");
              setDeleteOpen(false);
              setDeleteTarget(null);
              await refetch();
            } catch (e: any) {
              toast.error(e?.message ?? "تعذر حذف الكتاب");
            } finally {
              setDeleteLoading(false);
            }
          }}
        />
      </div>
    </AdminLayout>
  );
}

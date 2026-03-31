import { useState } from "react";
import { useListCurriculum, useCreateCurriculumBook, useDeleteCurriculumBook, useUpdateCurriculumBook, getListCurriculumQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };

type BookRow = {
  id: number;
  phaseNumber: number;
  phaseName: string;
  levelType: string;
  bookCode: string;
  title: string;
  totalPages: number;
  author?: string | null;
  pdfUrl?: string | null;
  orderInLevel: number;
};

const emptyForm = {
  phaseNumber: 1,
  phaseName: "",
  levelType: "basic",
  bookCode: "",
  title: "",
  totalPages: 100,
  author: "",
  pdfUrl: "",
  orderInLevel: 1
};

export default function AdminCurriculum() {
  const queryClient = useQueryClient();
  const { data: books, isLoading } = useListCurriculum();
  const createBook = useCreateCurriculumBook();
  const deleteBook = useDeleteCurriculumBook();
  const updateBook = useUpdateCurriculumBook();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  const [editBook, setEditBook] = useState<BookRow | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBook.mutate({ data: formData }, {
      onSuccess: () => {
        toast.success("تمت إضافة الكتاب بنجاح");
        setIsAddOpen(false);
        queryClient.invalidateQueries({ queryKey: getListCurriculumQueryKey() });
        setFormData({ ...emptyForm });
      },
      onError: () => toast.error("حدث خطأ أثناء الإضافة")
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("تأكيد حذف هذا الكتاب من المنهج؟")) {
      deleteBook.mutate({ id }, {
        onSuccess: () => {
          toast.success("تم الحذف بنجاح");
          queryClient.invalidateQueries({ queryKey: getListCurriculumQueryKey() });
        }
      });
    }
  };

  const openEditDialog = (book: BookRow) => {
    setEditBook(book);
    setEditForm({
      phaseNumber: book.phaseNumber,
      phaseName: book.phaseName,
      levelType: book.levelType,
      bookCode: book.bookCode,
      title: book.title,
      totalPages: book.totalPages,
      author: book.author || "",
      pdfUrl: book.pdfUrl || "",
      orderInLevel: book.orderInLevel,
    });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBook) return;
    updateBook.mutate(
      { id: editBook.id, data: editForm },
      {
        onSuccess: () => {
          toast.success("تم تحديث الكتاب بنجاح");
          setEditBook(null);
          queryClient.invalidateQueries({ queryKey: getListCurriculumQueryKey() });
        },
        onError: () => toast.error("حدث خطأ أثناء التحديث"),
      }
    );
  };

  const phases = Array.from(new Set(books?.map(b => b.phaseNumber))).sort((a, b) => a - b);

  const bookFormFields = (data: typeof emptyForm, setData: (d: typeof emptyForm) => void) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">المرحلة (رقم)</Label>
          <Input type="number" value={data.phaseNumber} onChange={e => setData({ ...data, phaseNumber: parseInt(e.target.value) })} required className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">اسم المرحلة</Label>
          <Input value={data.phaseName} onChange={e => setData({ ...data, phaseName: e.target.value })} required className="rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">المستوى</Label>
          <Select value={data.levelType} onValueChange={v => setData({ ...data, levelType: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">أساسي</SelectItem>
              <SelectItem value="optional">اختياري</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">رمز الكتاب</Label>
          <Input value={data.bookCode} onChange={e => setData({ ...data, bookCode: e.target.value })} required className="rounded-xl" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">عنوان الكتاب</Label>
        <Input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} required className="rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">المؤلف</Label>
          <Input value={data.author} onChange={e => setData({ ...data, author: e.target.value })} className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">عدد الصفحات</Label>
          <Input type="number" value={data.totalPages} onChange={e => setData({ ...data, totalPages: parseInt(e.target.value) })} required className="rounded-xl" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">رابط PDF</Label>
        <Input value={data.pdfUrl} onChange={e => setData({ ...data, pdfUrl: e.target.value })} dir="ltr" className="rounded-xl" />
      </div>
    </>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>المنهج الدراسي</h2>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-book" className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> إضافة كتاب</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl" style={{ backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' }}>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Cairo, sans-serif' }}>إضافة كتاب جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {bookFormFields(formData, setFormData)}
                <Button data-testid="button-save-book" type="submit" className="w-full rounded-xl" disabled={createBook.isPending}>
                  {createBook.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ الكتاب"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Book Dialog */}
        <Dialog open={!!editBook} onOpenChange={(open) => { if (!open) setEditBook(null); }}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl" style={{ backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Cairo, sans-serif' }}>تعديل بيانات الكتاب</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4 pt-2">
              {bookFormFields(editForm, setEditForm)}
              <Button type="submit" className="w-full rounded-xl" disabled={updateBook.isPending}>
                {updateBook.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ التعديلات"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : books?.length === 0 ? (
          <div className="py-12 text-center rounded-xl text-muted-foreground" style={{ ...cardStyle, border: '1px solid hsl(217,36%,20%)' }}>
            لا يوجد كتب في المنهج
          </div>
        ) : (
          <div className="space-y-6">
            {phases.map(phase => (
              <div key={phase} className="space-y-3">
                <h3 className="text-base font-bold text-primary" style={{ fontFamily: 'Cairo, sans-serif' }}>المرحلة {phase}</h3>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(217,36%,20%)' }}>
                  <Table>
                    <TableHeader>
                      <TableRow style={{ backgroundColor: 'hsl(218,42%,10%)', borderBottomColor: 'hsl(217,36%,20%)' }}>
                        <TableHead className="text-xs text-muted-foreground">الرمز</TableHead>
                        <TableHead className="text-xs text-muted-foreground text-center">العنوان</TableHead>
                        <TableHead className="text-xs text-muted-foreground">المستوى</TableHead>
                        <TableHead className="text-xs text-muted-foreground">الصفحات</TableHead>
                        <TableHead className="text-left text-xs text-muted-foreground">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {books?.filter(b => b.phaseNumber === phase).sort((a, b) => a.orderInLevel - b.orderInLevel).map(book => (
                        <TableRow key={book.id} style={{ borderBottomColor: 'hsl(217,36%,18%)', backgroundColor: 'hsl(218,39%,12%)' }} className="hover:bg-white/[0.02]">
                          <TableCell className="font-mono text-xs text-muted-foreground">{book.bookCode}</TableCell>
                          <TableCell className="font-medium text-sm">{book.title}</TableCell>
                          <TableCell className="text-sm">{book.levelType === 'basic' ? 'أساسي' : 'اختياري'}</TableCell>
                          <TableCell className="text-sm">{book.totalPages}</TableCell>
                          <TableCell className="text-left">
                            <div className="flex justify-end gap-1">
                              <Button
                                data-testid={`button-edit-book-${book.id}`}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-blue-400 hover:bg-blue-400/10"
                                onClick={() => openEditDialog(book)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                data-testid={`button-delete-book-${book.id}`}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-400 hover:bg-red-400/10"
                                onClick={() => handleDelete(book.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

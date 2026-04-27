import { useState, useMemo } from "react";
import { useListUsers, useListCurriculum, useGetMyLogs, useListBatches } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Users, BookCheck, Award, FileSpreadsheet, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminAnalytics() {
  const { data: users } = useListUsers();
  const { data: batches } = useListBatches();
  const { data: curriculum } = useListCurriculum();
  const [selectedBatch, setSelectedBatch] = useState<string>("all");

  // 1. معالجة البيانات ذكياً (حل مشكلة الإنجاز السابق 1.1)
  const stats = useMemo(() => {
    if (!users || !curriculum) return [];
    
    return users.filter(u => u.role === 'student').map(user => {
      const completedIds = user.completedBooks || [];
      const completedPages = curriculum
        .filter(b => completedIds.includes(b.id))
        .reduce((sum, b) => sum + b.totalPages, 0);

      // نسبة الإنجاز بناءً على إجمالي كتب المنهج (لنفرض المنهج الكامل 1000 صفحة)
      const totalCurriculumPages = curriculum.reduce((sum, b) => sum + b.totalPages, 0);
      const completionRate = totalCurriculumPages > 0 ? (completedPages / totalCurriculumPages) * 100 : 0;

      return {
        ...user,
        totalReadPages: completedPages, // شامل الإنجاز السابق
        completedCount: completedIds.length,
        completionRate: Math.round(completionRate)
      };
    });
  }, [users, curriculum]);

  const filteredStats = selectedBatch === "all" 
    ? stats 
    : stats.filter(s => s.batchId === parseInt(selectedBatch));

  // 2. إحصائيات النخبة (نقطة 5.5)
  const topByPages = [...filteredStats].sort((a, b) => b.totalReadPages - a.totalReadPages).slice(0, 3);
  const topByBooks = [...filteredStats].sort((a, b) => b.completedCount - a.completedCount).slice(0, 3);

// دالة التصدير الذكية إلى إكسل (تضمن توزيع الأعمدة بشكل مثالي)
  const exportToExcel = () => {
    const headers = ["اسم المشارك", "الدفعة", "إجمالي الصفحات", "الكتب المنجزة", "نسبة الإنجاز"];
    const rows = filteredStats.map(s => [
      s.name,
      batches?.find(b => b.id === s.batchId)?.name || "بدون",
      s.totalReadPages,
      s.completedCount,
      `${s.completionRate}%`
    ]);

    // بناء هيكل ملف إكسل متوافق تماماً مع جميع الأجهزة
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40" dir="rtl">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead>
              <tr>${headers.map(h => `<th style="background-color:#161e2f; color:#D4AF37; font-weight:bold; height:40px;">${h}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows.map(row => `<tr>${row.map(cell => `<td style="text-align:center; height:30px;">${cell}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    // حفظ الملف بصيغة إكسل رسمية
    link.download = `إحصائيات_الرصد_${new Date().toLocaleDateString('en-GB')}.xls`;
    link.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> الإحصائيات
          </h2>
          <div className="flex gap-3">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="تصفية بالدفعة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الدفعات</SelectItem>
                {batches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
           <Button onClick={exportToExcel} variant="outline" className="rounded-xl gap-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 h-11">
              <FileSpreadsheet className="w-4 h-4" /> تصدير لإكسل
            </Button>
          </div>
        </div>

        {/* 4. البطاقات الرئيسية (تصحيح المسميات 1.3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-lg">
            <CardContent className="pt-6 text-right">
              <Users className="text-blue-400 mb-2" />
              <p className="text-muted-foreground text-sm">إجمالي المشاركين</p>
              <h3 className="text-2xl font-bold">{filteredStats.length}</h3>
            </CardContent>
          </Card>
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-lg">
            <CardContent className="pt-6 text-right">
              <BookCheck className="text-emerald-400 mb-2" />
              <p className="text-muted-foreground text-sm">عدد الكتب المنجزة</p>
              <h3 className="text-2xl font-bold">{filteredStats.reduce((sum, s) => sum + s.completedCount, 0)}</h3>
            </CardContent>
          </Card>
          <Card className="bg-[#0f172a] border-[#D4AF37]/30 rounded-2xl shadow-lg">
            <CardContent className="pt-6 text-right">
              <Award className="text-[#D4AF37] mb-2" />
              <p className="text-muted-foreground text-sm">متوسط نسبة الإنجاز (للصنف)</p>
              <h3 className="text-2xl font-bold text-[#D4AF37]">
                {filteredStats.length > 0 ? Math.round(filteredStats.reduce((sum, s) => sum + s.completionRate, 0) / filteredStats.length) : 0}%
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* 5. قائمة النخبة (نقطة 5.5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl">
              <CardHeader className="border-b border-white/5"><CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-[#D4AF37]"/> الأعلى قراءة (صفحات)</CardTitle></CardHeader>
              <CardContent className="p-0">
                {topByPages.map((s, i) => (
                  <div key={s.id} className="flex justify-between p-4 border-b border-white/5 last:border-0">
                    <span className="font-medium">{i+1}. {s.name}</span>
                    <span className="text-[#D4AF37] font-bold">{s.totalReadPages} صفحة</span>
                  </div>
                ))}
              </CardContent>
           </Card>
           <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl">
              <CardHeader className="border-b border-white/5"><CardTitle className="text-sm flex items-center gap-2"><BookCheck className="w-4 h-4 text-emerald-400"/> الأكثر إنجازاً (كتب)</CardTitle></CardHeader>
              <CardContent className="p-0">
                {topByBooks.map((s, i) => (
                  <div key={s.id} className="flex justify-between p-4 border-b border-white/5 last:border-0">
                    <span className="font-medium">{i+1}. {s.name}</span>
                    <span className="text-emerald-400 font-bold">{s.completedCount} كتب</span>
                  </div>
                ))}
              </CardContent>
           </Card>
        </div>

        {/* 6. جدول الرصد التفصيلي (نقطة 5.2 و 5.4) */}
        <div className="rounded-xl border border-[#1e293b] bg-[#0f172a] overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-[#161e2f]">
              <TableRow className="border-[#1e293b]">
                <TableHead className="text-right text-[#94a3b8] font-bold px-6">اسم المشارك</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold">الدفعة</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold">إجمالي الصفحات</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold">الكتب المنجزة</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold w-[200px]">نسبة الإنجاز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((s) => (
                <TableRow key={s.id} className="border-[#1e293b] hover:bg-white/[0.02]">
                  <TableCell className="text-right px-6 font-medium">{s.name}</TableCell>
                  <TableCell className="text-right">{batches?.find(b => b.id === s.batchId)?.name || "-"}</TableCell>
                  <TableCell className="text-right font-bold text-[#D4AF37]">{s.totalReadPages}</TableCell>
                  <TableCell className="text-right">{s.completedCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2">
                      <Progress value={s.completionRate} className="h-1.5 flex-1" />
                      <span className="text-xs w-8">{s.completionRate}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}

import { useState, useMemo } from "react";
import { useListUsers, useListCurriculum, useListBatches } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, TrendingUp, Users, BookCheck, Award, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminAnalytics() {
  const { data: users } = useListUsers();
  const { data: batches } = useListBatches();
  const { data: curriculum } = useListCurriculum();
  const [selectedBatch, setSelectedBatch] = useState<string>("all");

  // O(U * C) for stats (U=number of users, C=number of curriculum items)
  const stats = useMemo(() => {
    if (!users || !curriculum) return [];

    const totalCurriculumPages = curriculum.reduce((sum, b) => sum + b.totalPages, 0);

    return users
      .filter((u: any) => u.role === "student")
      .map((user: any) => {
        const completedIds: number[] = user.completedBooks || [];

        const completedPages = curriculum
          .filter((b: any) => completedIds.includes(b.id))
          .reduce((sum: number, b: any) => sum + b.totalPages, 0);

        const completionRate =
          totalCurriculumPages > 0 ? (completedPages / totalCurriculumPages) * 100 : 0;

        return {
          ...user,
          totalReadPages: completedPages,
          completedCount: completedIds.length,
          completionRate: Math.round(completionRate),
        };
      });
  }, [users, curriculum]);

  const filteredStats =
    selectedBatch === "all"
      ? stats
      : stats.filter((s: any) => s.batchId === parseInt(selectedBatch));

  // O(N log N) where N is filteredStats length
  const topByPages = [...filteredStats]
    .sort((a: any, b: any) => b.totalReadPages - a.totalReadPages)
    .slice(0, 3);

  const topByBooks = [...filteredStats]
    .sort((a: any, b: any) => b.completedCount - a.completedCount)
    .slice(0, 3);

  const exportToExcel = () => {
    const headers = ["اسم المشارك", "الدفعة", "إجمالي الصفحات", "الكتب المنجزة", "نسبة الإنجاز"];
    const rows = filteredStats.map((s: any) => [
      s.name,
      batches?.find((b: any) => b.id === s.batchId)?.name || "بدون",
      s.totalReadPages,
      s.completedCount,
      `${s.completionRate}%`,
    ]);

    // ألوان متوافقة مع الهوية (بدون الاعتماد على tokens داخل html)
    const excelBg = "#1a2136"; // primary-800
    const excelGold = "#caa264"; // secondary-400

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40" dir="rtl">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1" style="border-collapse:collapse; width:100%;">
            <thead>
              <tr>
                ${headers
                  .map(
                    (h) =>
                      `<th style="background-color:${excelBg}; color:${excelGold}; font-weight:bold; height:40px;">${h}</th>`
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr>${row
                      .map((cell) => `<td style="text-align:center; height:30px;">${cell}</td>`)
                      .join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `إحصائيات_الرصد_${new Date().toLocaleDateString("en-GB")}.xls`;
    link.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center gap-4">
          <h2 className="text-[var(--font-xl)] font-bold text-[var(--secondary-400)] flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            الإحصائيات
          </h2>

          <div className="flex gap-3 items-center">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-44 rounded-[var(--radius-lg)]">
                <SelectValue placeholder="تصفية بالدفعة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الدفعات</SelectItem>
                {batches?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={exportToExcel}
              variant="outline"
              className="rounded-[var(--radius-lg)] gap-2 h-11"
            >
              <FileSpreadsheet className="w-4 h-4" />
              تصدير لإكسل
            </Button>
          </div>
        </div>

        {/* Main cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-[var(--radius-xl)]">
            <CardContent className="pt-6 text-right">
              <Users className="text-[var(--primary-600)] mb-2" />
              <p className="text-[var(--text-secondary)] text-sm">إجمالي المشاركين</p>
              <h3 className="text-2xl font-bold">{filteredStats.length}</h3>
            </CardContent>
          </Card>

          <Card className="rounded-[var(--radius-xl)]">
            <CardContent className="pt-6 text-right">
              <BookCheck className="text-[var(--success-600)] mb-2" />
              <p className="text-[var(--text-secondary)] text-sm">عدد الكتب المنجزة</p>
              <h3 className="text-2xl font-bold">
                {filteredStats.reduce((sum: number, s: any) => sum + s.completedCount, 0)}
              </h3>
            </CardContent>
          </Card>

          <Card className="rounded-[var(--radius-xl)]">
            <CardContent className="pt-6 text-right">
              <Award className="text-[var(--secondary-400)] mb-2" />
              <p className="text-[var(--text-secondary)] text-sm">متوسط نسبة الإنجاز (للصنف)</p>
              <h3 className="text-2xl font-bold text-[var(--secondary-400)]">
                {filteredStats.length > 0
                  ? Math.round(
                      filteredStats.reduce((sum: number, s: any) => sum + s.completionRate, 0) /
                        filteredStats.length
                    )
                  : 0}
                %
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Elite */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-[var(--radius-xl)]">
            <CardHeader className="border-b border-[var(--border-subtle)]">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-[var(--secondary-400)]" />
                الأعلى قراءة (صفحات)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topByPages.map((s: any, i: number) => (
                <div
                  key={s.id}
                  className="flex justify-between p-4 border-b border-[var(--border-subtle)] last:border-0"
                >
                  <span className="font-medium">
                    {i + 1}. {s.name}
                  </span>
                  <span className="text-[var(--secondary-400)] font-bold">{s.totalReadPages} صفحة</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[var(--radius-xl)]">
            <CardHeader className="border-b border-[var(--border-subtle)]">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookCheck className="w-4 h-4 text-[var(--success-600)]" />
                الأكثر إنجازاً (كتب)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topByBooks.map((s: any, i: number) => (
                <div
                  key={s.id}
                  className="flex justify-between p-4 border-b border-[var(--border-subtle)] last:border-0"
                >
                  <span className="font-medium">
                    {i + 1}. {s.name}
                  </span>
                  <span className="text-[var(--success-600)] font-bold">{s.completedCount} كتب</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="rounded-[var(--radius-xl)] overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4">
              <Table>
                <TableHeader className="bg-[var(--bg-tertiary)]">
                  <TableRow>
                    <TableHead>اسم المشارك</TableHead>
                    <TableHead>الدفعة</TableHead>
                    <TableHead>إجمالي الصفحات</TableHead>
                    <TableHead>الكتب المنجزة</TableHead>
                    <TableHead className="w-[200px]">نسبة الإنجاز</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredStats.map((s: any) => (
                    <TableRow key={s.id} className="hover:bg-[var(--bg-tertiary)]/50">
                      <TableCell className="text-right font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">
                        {batches?.find((b: any) => b.id === s.batchId)?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[var(--secondary-400)]">
                        {s.totalReadPages}
                      </TableCell>
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

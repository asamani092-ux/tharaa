import { useState, useMemo } from "react";
import { useListUsers, useListCurriculum, useListBatches } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, TrendingUp, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function StatCard({
  label,
  value,
  valueClassName = "text-[var(--text-primary)]",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6 pb-6 px-6 text-right">
        <p className="text-[var(--font-sm)] text-[var(--text-secondary)] mb-2">{label}</p>
        <p className={`text-3xl font-bold ${valueClassName}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { data: users } = useListUsers();
  const { data: batches } = useListBatches();
  const { data: curriculum } = useListCurriculum();
  const [selectedBatch, setSelectedBatch] = useState<string>("all");

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
    selectedBatch === "all" ? stats : stats.filter((s: any) => s.batchId === parseInt(selectedBatch));

  const topByPages = [...filteredStats]
    .sort((a: any, b: any) => b.totalReadPages - a.totalReadPages)
    .slice(0, 3);

  const topByBooks = [...filteredStats]
    .sort((a: any, b: any) => b.completedCount - a.completedCount)
    .slice(0, 3);

  const avgCompletion =
    filteredStats.length > 0
      ? Math.round(
          filteredStats.reduce((sum: number, s: any) => sum + s.completionRate, 0) / filteredStats.length
        )
      : 0;

  const totalBooksCompleted = filteredStats.reduce((sum: number, s: any) => sum + s.completedCount, 0);

  const exportToExcel = () => {
    const headers = ["اسم المشارك", "الدفعة", "إجمالي الصفحات", "الكتب المنجزة", "نسبة الإنجاز"];
    const rows = filteredStats.map((s: any) => [
      s.name,
      batches?.find((b: any) => b.id === s.batchId)?.name || "بدون",
      s.totalReadPages,
      s.completedCount,
      `${s.completionRate}%`,
    ]);

    const excelBg = "#1a2136";
    const excelGold = "#caa264";

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-[var(--font-xl)] font-bold text-[var(--secondary-400)] flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              الإحصائيات
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              تقارير تفصيلية مع تصفية حسب الدفعة وتصدير إكسل.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-44">
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

            <Button variant="secondary" className="gap-2" onClick={exportToExcel}>
              <FileSpreadsheet className="w-4 h-4" />
              تصدير لإكسل
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="إجمالي المشاركين" value={filteredStats.length} />
          <StatCard label="عدد الكتب المنجزة" value={totalBooksCompleted} />
          <StatCard
            label="متوسط نسبة الإنجاز (للصنف)"
            value={`${avgCompletion}%`}
            valueClassName="text-[var(--secondary-400)]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="border-b border-[var(--border-subtle)] py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Star className="w-4 h-4 text-[var(--secondary-400)]" />
                الأعلى قراءة (صفحات)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topByPages.length === 0 ? (
                <p className="p-4 text-sm text-[var(--text-secondary)] text-center">لا توجد بيانات</p>
              ) : (
                topByPages.map((s: any, i: number) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-tertiary)]"
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {i + 1}. {s.name}
                    </span>
                    <span className="text-[var(--secondary-400)] font-bold">{s.totalReadPages} صفحة</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-[var(--border-subtle)] py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Star className="w-4 h-4 text-[var(--secondary-400)]" />
                الأكثر إنجازاً (كتب)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topByBooks.length === 0 ? (
                <p className="p-4 text-sm text-[var(--text-secondary)] text-center">لا توجد بيانات</p>
              ) : (
                topByBooks.map((s: any, i: number) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-tertiary)]"
                  >
                    <span className="font-medium text-[var(--text-primary)]">
                      {i + 1}. {s.name}
                    </span>
                    <span className="text-[var(--secondary-400)] font-bold">{s.completedCount} كتب</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[var(--bg-secondary)]">
                <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                  <TableHead className="text-right text-[var(--text-secondary)] font-semibold">
                    اسم المشارك
                  </TableHead>
                  <TableHead className="text-right text-[var(--text-secondary)] font-semibold">الدفعة</TableHead>
                  <TableHead className="text-right text-[var(--text-secondary)] font-semibold">
                    إجمالي الصفحات
                  </TableHead>
                  <TableHead className="text-right text-[var(--text-secondary)] font-semibold">
                    الكتب المنجزة
                  </TableHead>
                  <TableHead className="text-right text-[var(--text-secondary)] font-semibold w-[200px]">
                    نسبة الإنجاز
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.map((s: any) => (
                  <TableRow key={s.id} className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]">
                    <TableCell className="text-right font-medium text-[var(--text-primary)]">{s.name}</TableCell>
                    <TableCell className="text-right text-[var(--text-primary)]">
                      {batches?.find((b: any) => b.id === s.batchId)?.name || "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[var(--secondary-400)]">
                      {s.totalReadPages}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-primary)]">{s.completedCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2">
                        <Progress value={s.completionRate} className="h-1.5 flex-1" />
                        <span className="text-xs w-8 text-[var(--text-secondary)]">{s.completionRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

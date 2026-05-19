import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListBatches } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, TrendingUp, Star, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6 pb-6 px-6 text-right">
        <p className="text-sm text-[var(--text-secondary)] mb-2">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics() {
  const { data: batches } = useListBatches();
  const [selectedBatch, setSelectedBatch] = useState("all");
  const [selectedTrack, setSelectedTrack] = useState("all");

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics-full", selectedBatch, selectedTrack],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBatch !== "all") params.set("batchId", selectedBatch);
      if (selectedTrack !== "all") params.set("track", selectedTrack);
      const qs = params.toString();
      const res = await fetch(`/api/analytics.php${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("فشل جلب الإحصائيات");
      return res.json();
    },
  });

  const rows = analytics?.usersDetail ?? [];
  const discipline = analytics?.disciplineLeaderboard ?? [];
  const elite = analytics?.eliteReadersLeaderboard ?? [];

  const avgStage =
    rows.length > 0
      ? Math.round(rows.reduce((s: number, r: any) => s + (r.stageCompletionRate ?? 0), 0) / rows.length)
      : 0;

  const exportToExcel = () => {
    const headers = ["الاسم", "الدفعة", "إنجاز مرحلي %", "تحفيز صفحات", "التزام"];
    const dataRows = rows.map((s: any) => [
      s.name,
      s.batchName,
      s.stageCompletionRate,
      s.gamificationPages,
      s.commitmentIndex,
    ]);
    const html = `<html dir="rtl"><body><table border="1">${headers
      .map((h) => `<th>${h}</th>`)
      .join("")}${dataRows
      .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
      .join("")}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "analytics.xls";
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h2 className="text-2xl font-bold text-[var(--secondary-400)] flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            الإحصائيات
          </h2>
          <div className="flex flex-wrap gap-3">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الدفعة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الدفعات</SelectItem>
                {batches?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="المسار" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المسارات</SelectItem>
                <SelectItem value="full">كامل</SelectItem>
                <SelectItem value="simplified">ميسر</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={exportToExcel}>
              <FileSpreadsheet className="w-4 h-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="المشاركون" value={isLoading ? "..." : rows.length} />
          <StatCard label="متوسط الإنجاز المرحلي" value={`${avgStage}%`} />
          <StatCard
            label="متوسط التزام"
            value={
              rows.length
                ? (
                    rows.reduce((s: number, r: any) => s + r.commitmentIndex, 0) / rows.length
                  ).toFixed(2)
                : "0"
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                فرسان الانضباط
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {discipline.map((u: any, i: number) => (
                <div key={u.id} className="flex justify-between p-4 border-b last:border-0">
                  <span>
                    {i + 1}. {u.name}
                  </span>
                  <span className="font-bold text-[var(--secondary-400)]">{u.commitmentIndex}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4" />
                نخبة القراء
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {elite.map((u: any, i: number) => (
                <div key={u.id} className="flex justify-between p-4 border-b last:border-0">
                  <span>
                    {i + 1}. {u.name}
                  </span>
                  <span className="font-bold text-[var(--secondary-400)]">{u.gamificationPages} ص</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[var(--bg-secondary)]">
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الدفعة</TableHead>
                  <TableHead className="text-center">إنجاز مرحلي</TableHead>
                  <TableHead className="text-center">تحفيز</TableHead>
                  <TableHead className="text-center">التزام</TableHead>
                  <TableHead className="text-right w-[180px]">شريط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.batchName}</TableCell>
                      <TableCell className="text-center">{s.stageCompletionRate}%</TableCell>
                      <TableCell className="text-center">{s.gamificationPages}</TableCell>
                      <TableCell className="text-center">{s.commitmentIndex}</TableCell>
                      <TableCell>
                        <Progress value={s.stageCompletionRate} className="h-2" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

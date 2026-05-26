import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListBatches } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  TrendingUp,
  Star,
  Shield,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { buildAnalyticsUrl } from "@/lib/analyticsQuery";
import { downloadAnalyticsExcel } from "@/lib/exportAnalyticsExcel";

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
      const res = await fetch(buildAnalyticsUrl(selectedBatch, selectedTrack));
      if (!res.ok) throw new Error("فشل جلب الإحصائيات");
      return res.json();
    },
  });

  const rows = analytics?.usersDetail ?? [];
  const discipline = analytics?.disciplineLeaderboard ?? [];
  const elite = analytics?.eliteReadersLeaderboard ?? [];
  const atRisk = analytics?.supervisorIndicators?.atRisk;
  const bottleneck = analytics?.supervisorIndicators?.bookBottleneck;

  const avgStage =
    rows.length > 0
      ? Math.round(
          rows.reduce((s: number, r: { stageCompletionRate?: number }) => s + (r.stageCompletionRate ?? 0), 0) /
            rows.length
        )
      : 0;

  const avgBatch =
    rows.length > 0
      ? Math.round(
          rows.reduce((s: number, r: { batchCumulativeRate?: number }) => s + (r.batchCumulativeRate ?? 0), 0) /
            rows.length
        )
      : 0;

  const batchLabel =
    selectedBatch === "all"
      ? "كل الدفعات"
      : batches?.find((b: { id: number }) => b.id.toString() === selectedBatch)?.name ?? selectedBatch;
  const trackLabel =
    selectedTrack === "all" ? "كل المسارات" : selectedTrack === "simplified" ? "ميسر" : "كامل";

  const exportToExcel = () => {
    downloadAnalyticsExcel(rows, { batchLabel, trackLabel });
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
                {batches?.map((b: { id: number; name: string }) => (
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
            <Button variant="secondary" onClick={exportToExcel} disabled={rows.length === 0}>
              <FileSpreadsheet className="w-4 h-4 ml-2" />
              تصدير Excel شامل
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-[var(--error-600)]/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-[var(--error-600)]">
                <AlertTriangle className="w-4 h-4" />
                المنقطعون  ({atRisk?.windowDays ?? 14} يوم)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{atRisk?.count ?? 0}</p>
              <ul className="mt-2 text-xs space-y-0.5 max-h-24 overflow-y-auto text-[var(--text-secondary)]">
                {(atRisk?.students ?? []).map((s: { id: number; name: string }) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                كتب تأخذ وقتاً 
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bottleneck ? (
                <p className="text-sm">
                  <strong>{bottleneck.title}</strong> — {bottleneck.stuckCount} عالق
                </p>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="المشاركون" value={isLoading ? "..." : rows.length} />
          <StatCard label="متوسط إنجاز الدفعة" value={`${avgBatch}%`} />
          <StatCard label="متوسط الإنجاز المرحلي" value={`${avgStage}%`} />
          <StatCard
            label="أتمّوا المسار الأساسي"
            value={analytics?.overview?.totalBooksCompleted ?? 0}
          />
          <StatCard
            label="متوسط التزام"
            value={
              rows.length
                ? (
                    rows.reduce((s: number, r: { commitmentIndex: number }) => s + r.commitmentIndex, 0) /
                    rows.length
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
                الأكثر التزاماً بالإرسال
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {discipline.map((u: { id: number; name: string; commitmentIndex: number }, i: number) => (
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
                الأكثر قراءة بعدد الصفحات
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {elite.map((u: { id: number; name: string; gamificationPages: number }, i: number) => (
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
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-[var(--bg-secondary)]">
                <TableRow>
                  <TableHead className="text-right whitespace-nowrap">الاسم</TableHead>
                  <TableHead className="text-right whitespace-nowrap">الدفعة</TableHead>
                  <TableHead className="text-center whitespace-nowrap">المسار</TableHead>
                  <TableHead className="text-center whitespace-nowrap">إنجاز مرحلي</TableHead>
                  <TableHead className="text-center whitespace-nowrap">تقدم دفعة</TableHead>
                  <TableHead className="text-center whitespace-nowrap">قراءة أساسية</TableHead>
                  <TableHead className="text-center whitespace-nowrap">قراءة اختيارية</TableHead>
                  <TableHead className="text-center whitespace-nowrap">التزام بلإرسال</TableHead>
                  <TableHead className="text-center whitespace-nowrap">اكمال مسار</TableHead>
                  <TableHead className="text-right min-w-[120px]">شريط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-[var(--text-secondary)]">
                      لا توجد بيانات للفلتر المحدد
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s: Record<string, unknown>) => (
                    <TableRow key={s.id as number}>
                      <TableCell className="font-medium whitespace-nowrap">{String(s.name)}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(s.batchName)}</TableCell>
                      <TableCell className="text-center">{String(s.trackLabelAr ?? "")}</TableCell>
                      <TableCell className="text-center">{Number(s.stageCompletionRate)}%</TableCell>
                      <TableCell className="text-center">{Number(s.batchCumulativeRate)}%</TableCell>
                      <TableCell className="text-center">{Number(s.gamificationPages)}</TableCell>
                      <TableCell className="text-center">
                        {Number(s.gamificationPagesOptional ?? 0)}
                      </TableCell>
                      <TableCell className="text-center">{Number(s.commitmentIndex)}</TableCell>
                      <TableCell className="text-center">
                        {s.trackCompleted ? "نعم" : "لا"}
                      </TableCell>
                      <TableCell>
                        <Progress value={Number(s.batchCumulativeRate)} className="h-2 min-w-[80px]" />
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

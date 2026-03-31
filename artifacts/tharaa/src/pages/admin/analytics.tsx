import { useState } from "react";
import { useGetAnalyticsOverview, useGetBatchAnalytics, useListBatches, useListUsers, useGetUserAnalytics } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };
const tableRowStyle = { borderBottomColor: 'hsl(217,36%,18%)' };

export default function AdminAnalytics() {
  const { data: batches } = useListBatches();
  const { data: users } = useListUsers({ status: "active" });

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: overview, isLoading: loadingOverview } = useGetAnalyticsOverview();

  const { data: batchAnalytics, isLoading: loadingBatch } = useGetBatchAnalytics(
    parseInt(selectedBatchId),
    { query: { enabled: !!selectedBatchId } }
  );

  const { data: userAnalytics, isLoading: loadingUser } = useGetUserAnalytics(
    parseInt(selectedUserId),
    { query: { enabled: !!selectedUserId } }
  );

  const total = (overview?.totalLogsSubmitted || 0) || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>الإحصائيات</h2>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="rounded-xl w-full justify-start" style={{ backgroundColor: 'hsl(218,39%,12%)', border: '1px solid hsl(217,36%,20%)' }}>
            <TabsTrigger data-testid="tab-overview" value="overview" className="rounded-lg">نظرة عامة</TabsTrigger>
            <TabsTrigger data-testid="tab-batch" value="batch" className="rounded-lg">حسب الدفعة</TabsTrigger>
            <TabsTrigger data-testid="tab-student" value="student" className="rounded-lg">حسب الطالب</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-6">
            {loadingOverview ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <Card className="rounded-xl border" style={cardStyle}>
                <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
                  <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>الالتزام بالتسليم</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  {[
                    { label: "في الوقت المحدد", value: overview?.onTimeSubmissions || 0, color: "bg-emerald-500", textColor: "text-emerald-400" },
                    { label: "تسليم متأخر", value: overview?.lateSubmissions || 0, color: "bg-orange-500", textColor: "text-orange-400" },
                    { label: "تسليم مفقود", value: overview?.missedSubmissions || 0, color: "bg-red-500", textColor: "text-red-400" },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between mb-1.5 text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-bold ${item.textColor}`}>{item.value} ({pct(item.value)}%)</span>
                      </div>
                      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'hsl(217,36%,20%)' }}>
                        <div className={`${item.color} h-1.5 rounded-full transition-all`} style={{ width: `${pct(item.value)}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Batch */}
          <TabsContent value="batch" className="space-y-6 mt-6">
            <div className="max-w-xs">
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger data-testid="select-analytics-batch" className="rounded-xl"><SelectValue placeholder="اختر الدفعة" /></SelectTrigger>
                <SelectContent>
                  {batches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loadingBatch && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}

            {batchAnalytics && !loadingBatch && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "عدد الطلاب", value: batchAnalytics.totalUsers },
                    { label: "الصفحات المقروءة", value: batchAnalytics.totalPagesRead },
                    { label: "متوسط القراءة", value: Math.round(batchAnalytics.avgPagesPerUser) },
                    { label: "نسبة الالتزام", value: `${batchAnalytics.onTimeRate}%`, colored: true },
                  ].map(s => (
                    <Card key={s.label} className="rounded-xl border" style={cardStyle}>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.colored ? 'text-emerald-400' : ''}`}>{s.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="rounded-xl border" style={cardStyle}>
                  <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
                    <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>أبرز القراء في الدفعة</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ backgroundColor: 'hsl(218,42%,10%)', borderBottomColor: 'hsl(217,36%,20%)' }}>
                          <TableHead className="text-xs text-muted-foreground">الطالب</TableHead>
                          <TableHead className="text-xs text-muted-foreground">الصفحات</TableHead>
                          <TableHead className="text-xs text-muted-foreground">الكتب</TableHead>
                          <TableHead className="text-xs text-muted-foreground">الالتزام</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchAnalytics.topReaders.map(reader => (
                          <TableRow key={reader.userId} style={tableRowStyle} className="hover:bg-white/[0.02]">
                            <TableCell className="font-medium text-sm">{reader.name}</TableCell>
                            <TableCell className="text-sm">{reader.totalPagesRead}</TableCell>
                            <TableCell className="text-sm">{reader.completedBooks}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${reader.complianceRate > 80 ? 'bg-emerald-600/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                {reader.complianceRate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Student */}
          <TabsContent value="student" className="space-y-6 mt-6">
            <div className="max-w-sm">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-analytics-student" className="rounded-xl"><SelectValue placeholder="ابحث واختر الطالب" /></SelectTrigger>
                <SelectContent>
                  {users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name} — {u.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loadingUser && <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}

            {userAnalytics && !loadingUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "الصفحات المقروءة", value: userAnalytics.totalPagesRead },
                    { label: "الكتب المكتملة", value: userAnalytics.completedBooks },
                    { label: "سلسلة الالتزام (أسابيع)", value: userAnalytics.currentStreak, colored: true },
                    { label: "نسبة الالتزام", value: `${userAnalytics.complianceRate}%` },
                  ].map(s => (
                    <Card key={s.label} className="rounded-xl border" style={cardStyle}>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.colored ? 'text-primary' : ''}`}>{s.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="rounded-xl border" style={cardStyle}>
                  <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
                    <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>سجل الأوراد الأخيرة</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow style={{ backgroundColor: 'hsl(218,42%,10%)', borderBottomColor: 'hsl(217,36%,20%)' }}>
                          <TableHead className="text-xs text-muted-foreground">التاريخ</TableHead>
                          <TableHead className="text-xs text-muted-foreground">الكتاب</TableHead>
                          <TableHead className="text-xs text-muted-foreground">الصفحات</TableHead>
                          <TableHead className="text-xs text-muted-foreground">حالة التسليم</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userAnalytics.recentLogs.map(log => (
                          <TableRow key={log.id} style={tableRowStyle} className="hover:bg-white/[0.02]">
                            <TableCell className="text-sm">{new Date(log.date).toLocaleDateString('ar-SA')}</TableCell>
                            <TableCell className="text-sm">{log.bookTitle}</TableCell>
                            <TableCell className="text-sm">{log.pagesRead}</TableCell>
                            <TableCell>
                              {log.submissionStatus === 'on_time' && <Badge className="bg-emerald-600/20 text-emerald-400 text-xs">في الوقت</Badge>}
                              {log.submissionStatus === 'late' && <Badge className="bg-orange-600/20 text-orange-400 text-xs">متأخر</Badge>}
                              {log.submissionStatus === 'missed' && <Badge className="bg-red-600/20 text-red-400 text-xs">مفقود</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                        {userAnalytics.recentLogs.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد أوراد مسجلة</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

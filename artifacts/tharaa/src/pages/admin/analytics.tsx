import { useState } from "react";
import { useGetAnalyticsOverview, useGetBatchAnalytics, useListBatches, useListUsers, useGetUserAnalytics } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">التحليلات التفصيلية</h2>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-card border border-border w-full justify-start overflow-x-auto">
            <TabsTrigger data-testid="tab-overview" value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger data-testid="tab-batch" value="batch">حسب الدفعة</TabsTrigger>
            <TabsTrigger data-testid="tab-student" value="student">حسب الطالب</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            {loadingOverview ? <Loader2 className="w-8 h-8 animate-spin mx-auto mt-12" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>الالتزام بالتسليم</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>في الوقت الموعد</span>
                          <span className="text-green-500 font-bold">{overview?.onTimeSubmissions}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(overview?.onTimeSubmissions || 0) / (overview?.totalLogsSubmitted || 1) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>تسليم متأخر</span>
                          <span className="text-orange-500 font-bold">{overview?.lateSubmissions}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${(overview?.lateSubmissions || 0) / (overview?.totalLogsSubmitted || 1) * 100}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1 text-sm">
                          <span>تسليم مفقود</span>
                          <span className="text-red-500 font-bold">{overview?.missedSubmissions}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(overview?.missedSubmissions || 0) / (overview?.totalLogsSubmitted || 1) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="batch" className="space-y-6 mt-6">
            <div className="max-w-xs">
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger data-testid="select-analytics-batch"><SelectValue placeholder="اختر الدفعة لعرض تحليلاتها" /></SelectTrigger>
                <SelectContent>
                  {batches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loadingBatch && <Loader2 className="w-8 h-8 animate-spin" />}
            
            {batchAnalytics && !loadingBatch && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">عدد الطلاب</p><p className="text-2xl font-bold">{batchAnalytics.totalUsers}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">الصفحات المقروءة</p><p className="text-2xl font-bold">{batchAnalytics.totalPagesRead}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">متوسط القراءة</p><p className="text-2xl font-bold">{Math.round(batchAnalytics.avgPagesPerUser)}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">نسبة الالتزام</p><p className="text-2xl font-bold text-green-500">{batchAnalytics.onTimeRate}%</p></CardContent></Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>أبرز القراء في الدفعة</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>الطالب</TableHead><TableHead>الصفحات المقروءة</TableHead><TableHead>الكتب المكتملة</TableHead><TableHead>نسبة الالتزام</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {batchAnalytics.topReaders.map(reader => (
                          <TableRow key={reader.userId}>
                            <TableCell className="font-medium">{reader.name}</TableCell>
                            <TableCell>{reader.totalPagesRead}</TableCell>
                            <TableCell>{reader.completedBooks}</TableCell>
                            <TableCell><Badge variant="outline" className={reader.complianceRate > 80 ? "text-green-500 border-green-500" : ""}>{reader.complianceRate}%</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="student" className="space-y-6 mt-6">
            <div className="max-w-sm">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-analytics-student"><SelectValue placeholder="ابحث واختر الطالب" /></SelectTrigger>
                <SelectContent>
                  {users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name} - {u.phone}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loadingUser && <Loader2 className="w-8 h-8 animate-spin" />}

            {userAnalytics && !loadingUser && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">الصفحات المقروءة</p><p className="text-2xl font-bold">{userAnalytics.totalPagesRead}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">الكتب المكتملة</p><p className="text-2xl font-bold">{userAnalytics.completedBooks}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">سلسلة الالتزام (أسابيع)</p><p className="text-2xl font-bold text-primary">{userAnalytics.currentStreak}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">نسبة الالتزام العامة</p><p className="text-2xl font-bold">{userAnalytics.complianceRate}%</p></CardContent></Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>سجل الأوراد الأخيرة</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>الكتاب</TableHead><TableHead>الصفحات</TableHead><TableHead>حالة التسليم</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userAnalytics.recentLogs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell>{new Date(log.date).toLocaleDateString('ar-SA')}</TableCell>
                            <TableCell>{log.bookTitle}</TableCell>
                            <TableCell>{log.pagesRead} ({log.startPage}-{log.endPage})</TableCell>
                            <TableCell>
                              {log.submissionStatus === 'on_time' && <Badge className="bg-green-600">في الوقت</Badge>}
                              {log.submissionStatus === 'late' && <Badge className="bg-orange-500">متأخر</Badge>}
                              {log.submissionStatus === 'missed' && <Badge variant="destructive">مفقود</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                        {userAnalytics.recentLogs.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center py-4">لا توجد أوراد مسجلة</TableCell></TableRow>
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

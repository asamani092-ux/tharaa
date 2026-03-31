import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useUpdateAdmin, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

const DAYS = [
  { value: "0", label: "الأحد" },
  { value: "1", label: "الإثنين" },
  { value: "2", label: "الثلاثاء" },
  { value: "3", label: "الأربعاء" },
  { value: "4", label: "الخميس" },
  { value: "5", label: "الجمعة" },
  { value: "6", label: "السبت" }
];

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };
const sectionStyle = { border: '1px solid hsl(217,36%,22%)', borderRadius: '0.75rem', padding: '1rem', backgroundColor: 'hsl(218,47%,9%)' };

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const updateAdmin = useUpdateAdmin();

  const [formData, setFormData] = useState<any>({});
  const [allDaysActive, setAllDaysActive] = useState(false);

  const [adminForm, setAdminForm] = useState({
    name: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setAllDaysActive(!!(settings as any).allDaysActive);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      weeklyQuota: Number(formData.weeklyQuota),
      submissionStartDay: Number(formData.submissionStartDay),
      submissionStartHour: Number(formData.submissionStartHour || 0),
      normalDeadlineDay: (Number(formData.submissionStartDay) + 1) % 7,
      normalDeadlineHour: Number(formData.normalDeadlineHour || 0),
      lateDeadlineDay: Number(formData.lateDeadlineDay || 0),
      lateDeadlineHour: Number(formData.lateDeadlineHour || 0),
      gradeThresholdExcellent: Number(formData.gradeThresholdExcellent),
      gradeThresholdGood: Number(formData.gradeThresholdGood),
      gradeThresholdAcceptable: Number(formData.gradeThresholdAcceptable),
      allDaysActive,
    };

    updateSettings.mutate({ data: dataToSubmit }, {
      onSuccess: () => {
        toast.success("تم حفظ الإعدادات بنجاح");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => toast.error("حدث خطأ أثناء الحفظ")
    });
  };

  const handleAdminSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.currentPassword) {
      toast.error("كلمة المرور الحالية مطلوبة");
      return;
    }
    updateAdmin.mutate(
      {
        data: {
          name: adminForm.name || undefined,
          phone: adminForm.phone || undefined,
          currentPassword: adminForm.currentPassword,
          newPassword: adminForm.newPassword || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("تم حفظ بيانات المشرف بنجاح");
          setAdminForm({ name: "", phone: "", currentPassword: "", newPassword: "" });
        },
        onError: (err: any) => {
          toast.error(err?.error || "فشل حفظ البيانات");
        },
      }
    );
  };

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  const normalDeadlineDay = DAYS[((Number(formData.submissionStartDay) || 0) + 1) % 7]?.label || "اليوم التالي";

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>إعدادات النظام</h2>

        {/* Admin Data Section */}
        <Card className="rounded-xl border" style={cardStyle}>
          <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
            <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>بيانات المشرف</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleAdminSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">الاسم الكامل</Label>
                  <Input
                    value={adminForm.name}
                    onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                    placeholder="اسم المشرف"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">رقم الجوال</Label>
                  <Input
                    value={adminForm.phone}
                    onChange={e => setAdminForm({ ...adminForm, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">كلمة المرور الحالية <span className="text-red-400">*</span></Label>
                  <Input
                    type="password"
                    value={adminForm.currentPassword}
                    onChange={e => setAdminForm({ ...adminForm, currentPassword: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">كلمة المرور الجديدة (اختياري)</Label>
                  <Input
                    type="password"
                    value={adminForm.newPassword}
                    onChange={e => setAdminForm({ ...adminForm, newPassword: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button
                data-testid="button-save-admin"
                type="submit"
                className="gap-2 rounded-xl"
                disabled={updateAdmin.isPending}
              >
                {updateAdmin.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ بيانات المشرف
              </Button>
            </form>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Weekly quota */}
          <Card className="rounded-xl border" style={cardStyle}>
            <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
              <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>القراءة الأسبوعية</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-sm text-muted-foreground">نصاب القراءة الأسبوعي (عدد الصفحات)</Label>
                <Input
                  data-testid="input-weekly-quota"
                  type="number"
                  value={formData.weeklyQuota || 0}
                  onChange={e => setFormData({...formData, weeklyQuota: e.target.value})}
                  required
                  className="rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submission windows */}
          <Card className="rounded-xl border" style={cardStyle}>
            <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
              <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>أوقات التسليم</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* All days toggle */}
              <div style={sectionStyle} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">تفعيل التسليم طوال أيام الأسبوع</p>
                  {allDaysActive && (
                    <p className="text-xs text-muted-foreground mt-1">جميع التسليمات ستُعدّ في الوقت المحدد بصرف النظر عن اليوم</p>
                  )}
                </div>
                <Switch
                  data-testid="switch-all-days"
                  checked={allDaysActive}
                  onCheckedChange={setAllDaysActive}
                />
              </div>

              {/* Submission start day */}
              <div style={sectionStyle}>
                <p className="text-sm font-semibold mb-3 text-muted-foreground">يوم بداية التسليم (يوم التسليم الطبيعي)</p>
                <div className="max-w-xs">
                  <Label className="text-xs text-muted-foreground">اليوم</Label>
                  <Select value={formData.submissionStartDay?.toString()} onValueChange={v => setFormData({...formData, submissionStartDay: v})}>
                    <SelectTrigger data-testid="select-start-day" className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Late deadline auto-display */}
              <div style={sectionStyle}>
                <p className="text-sm font-semibold mb-1 text-orange-400">يوم التسليم المتأخر</p>
                <p className="text-sm text-muted-foreground">
                  {normalDeadlineDay} <span className="text-xs">(اليوم التالي تلقائياً)</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Grade thresholds */}
          <Card className="rounded-xl border" style={cardStyle}>
            <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
              <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>عتبات التقييم (نسبة الالتزام %)</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "امتياز (%)", key: "gradeThresholdExcellent", testid: "input-grade-excellent" },
                { label: "جيد جداً (%)", key: "gradeThresholdGood", testid: "input-grade-good" },
                { label: "مقبول (%)", key: "gradeThresholdAcceptable", testid: "input-grade-acceptable" },
              ].map(g => (
                <div key={g.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{g.label}</Label>
                  <Input
                    data-testid={g.testid}
                    type="number"
                    value={formData[g.key] || 0}
                    onChange={e => setFormData({...formData, [g.key]: e.target.value})}
                    required
                    className="rounded-xl"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button data-testid="button-save-settings" type="submit" className="gap-2 rounded-xl" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الإعدادات
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}

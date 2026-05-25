import { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useGetMe,
  useUpdateUser,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Loader2, Calendar, BookOpen, ShieldCheck, UserCog } from "lucide-react";

const settingsSwitchClass =
  "data-[state=unchecked]:bg-[var(--primary-600)] data-[state=checked]:bg-[hsl(var(--primary))]";

const cardShellClass =
  "flex flex-col h-full rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-md)]";

export default function AdminSettings() {
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const { data: me } = useGetMe();
  const updateSettings = useUpdateSettings();
  const updateUser = useUpdateUser();

  const [weeklyQuota, setWeeklyQuota] = useState<string>("75");
  const [allDaysActive, setAllDaysActive] = useState<boolean>(false);
  const [primaryDay, setPrimaryDay] = useState<string>("Friday");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);
  const [maintenanceSaveStep, setMaintenanceSaveStep] = useState<"idle" | "confirm">("idle");
  const [adminProfile, setAdminProfile] = useState({ name: "", phone: "", password: "" });
  const [curriculumPdfUrl, setCurriculumPdfUrl] = useState("");

  useEffect(() => {
    if (settings) {
      const ext = settings as { curriculumPdfUrl?: string | null };
      setWeeklyQuota(settings.weeklyQuota?.toString() || "75");
      setAllDaysActive(!!settings.allDaysActive);
      setPrimaryDay(settings.primaryDay || "Friday");
      setIsMaintenanceMode(!!settings.maintenanceMode);
      setCurriculumPdfUrl(ext.curriculumPdfUrl ?? "");
    }
    if (me?.user) {
      setAdminProfile({ name: me.user.name, phone: me.user.phone, password: "" });
    }
  }, [settings, me]);

  useEffect(() => {
    if (!isMaintenanceMode) setMaintenanceSaveStep("idle");
  }, [isMaintenanceMode]);

  const handleSaveSettings = () => {
    updateSettings.mutate(
      {
        data: {
          weeklyQuota: parseInt(weeklyQuota, 10),
          allDaysActive: allDaysActive ? 1 : 0,
          primaryDay,
          maintenanceMode: isMaintenanceMode ? 1 : 0,
          curriculumPdfUrl: curriculumPdfUrl.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث إعدادات المنصة ✅");
          setMaintenanceSaveStep("idle");
        },
        onError: () => toast.error("تعذر حفظ الإعدادات"),
      }
    );
  };

  const handleMaintenanceSaveClick = () => {
    if (isMaintenanceMode && maintenanceSaveStep === "idle") {
      setMaintenanceSaveStep("confirm");
      return;
    }
    handleSaveSettings();
  };

  const handleUpdateProfile = () => {
    if (!adminProfile.name || !adminProfile.phone) {
      toast.error("الاسم ورقم الجوال مطلوبان");
      return;
    }
    updateUser.mutate(
      {
        id: me?.user?.id as number,
        data: {
          name: adminProfile.name,
          phone: adminProfile.phone,
          ...(adminProfile.password ? { password: adminProfile.password } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("تم تحديث بياناتك الشخصية بنجاح");
          setAdminProfile({ ...adminProfile, password: "" });
        },
        onError: () => toast.error("حدث خطأ أثناء تحديث بياناتك"),
      }
    );
  };

  const days = [
    { label: "الأحد", value: "Sunday" },
    { label: "الاثنين", value: "Monday" },
    { label: "الثلاثاء", value: "Tuesday" },
    { label: "الأربعاء", value: "Wednesday" },
    { label: "الخميس", value: "Thursday" },
    { label: "الجمعة", value: "Friday" },
    { label: "السبت", value: "Saturday" },
  ];

  if (settingsLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin w-10 h-10 text-[var(--secondary-400)]" />
        </div>
      </AdminLayout>
    );
  }

  const cardIcon = "w-5 h-5 text-[var(--secondary-400)] shrink-0";
  const labelClass = "text-sm text-[var(--text-secondary)]";
  const switchRowClass =
    "flex items-center justify-between gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-secondary)]";

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 text-right pb-20" dir="rtl">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-[var(--secondary-400)]">
          <Settings className="w-8 h-8 shrink-0" />
          إعدادات المنصة
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* معايير القراءة */}
          <Card className={cardShellClass}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <BookOpen className={cardIcon} />
                <CardTitle className="text-lg text-[var(--text-primary)]">معايير القراءة</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <div className="space-y-2">
                <Label className={labelClass}>نصاب القراءة الأسبوعي (صفحة)</Label>
                <Input
                  type="number"
                  value={weeklyQuota}
                  onChange={(e) => setWeeklyQuota(e.target.value)}
                  className="text-center text-xl font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>رابط PDF المنهج (للطالب — تنزيل المنهج)</Label>
                <Input
                  type="url"
                  dir="ltr"
                  placeholder="https://..."
                  value={curriculumPdfUrl}
                  onChange={(e) => setCurriculumPdfUrl(e.target.value)}
                  className="text-left text-sm"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">
                  يظهر زر «تنزيل المنهج» بجانب اسم المشارك عند تعبئة الرابط.
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full mt-auto"
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? <Loader2 className="animate-spin" /> : "حفظ المعايير"}
              </Button>
            </CardContent>
          </Card>

          {/* مواعيد الرصد */}
          <Card className={cardShellClass}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Calendar className={cardIcon} />
                <CardTitle className="text-lg text-[var(--text-primary)]">مواعيد الرصد</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <div className={switchRowClass}>
                <div className="space-y-1 flex-1 min-w-0">
                  <Label className="text-sm font-medium block text-right text-[var(--text-primary)]">
                    تفعيل الرصد طوال الأسبوع
                  </Label>
                  <p className="text-[11px] text-[var(--text-secondary)] text-right">
                    فتح التسجيل في أي يوم بدلاً من يوم محدد.
                  </p>
                </div>
                <div dir="ltr" className="shrink-0">
                  <Switch
                    checked={allDaysActive}
                    onCheckedChange={setAllDaysActive}
                    className={settingsSwitchClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className={`${labelClass} block text-right`}>اليوم الأساسي للرصد (التسليم)</Label>
                <Select value={primaryDay} onValueChange={setPrimaryDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="secondary"
                className="w-full mt-auto"
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? <Loader2 className="animate-spin" /> : "تحديث المواعيد"}
              </Button>
            </CardContent>
          </Card>

          {/* تعديل المشرف الحالي */}
          <Card className={cardShellClass}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <UserCog className={cardIcon} />
                <CardTitle className="text-lg text-[var(--text-primary)]">تعديل بياناتي (المشرف)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <div className="space-y-2">
                <Label className={labelClass}>الاسم</Label>
                <Input
                  value={adminProfile.name}
                  onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>رقم الجوال</Label>
                <Input
                  value={adminProfile.phone}
                  onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className={labelClass}>كلمة المرور الجديدة (اختياري)</Label>
                <Input
                  type="password"
                  value={adminProfile.password}
                  onChange={(e) => setAdminProfile({ ...adminProfile, password: e.target.value })}
                  placeholder="اتركها فارغة لعدم التغيير"
                />
              </div>
              <Button
                variant="secondary"
                className="w-full mt-auto"
                onClick={handleUpdateProfile}
                disabled={updateUser.isPending}
              >
                {updateUser.isPending ? <Loader2 className="animate-spin" /> : "حفظ بياناتي"}
              </Button>
            </CardContent>
          </Card>

          {/* وضع الصيانة */}
          <Card className={cardShellClass}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className={cardIcon} />
                <CardTitle className="text-lg text-[var(--text-primary)]">وضع الصيانة</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <div className={switchRowClass}>
                <div className="space-y-1 flex-1 min-w-0">
                  <Label className="text-sm font-medium block text-right text-[var(--text-primary)]">
                    تفعيل وضع الصيانة
                  </Label>
                  <p className="text-xs text-[var(--text-secondary)] text-right">
                    عند التفعيل، سيتم إغلاق واجهة المشاركين للصيانة.
                  </p>
                </div>
                <div dir="ltr" className="shrink-0">
                  <Switch
                    checked={isMaintenanceMode}
                    onCheckedChange={(val) => {
                      setIsMaintenanceMode(val);
                      setMaintenanceSaveStep("idle");
                    }}
                    className={settingsSwitchClass}
                  />
                </div>
              </div>
              <Button
                variant={
                  isMaintenanceMode && maintenanceSaveStep === "confirm" ? "destructive" : "secondary"
                }
                className="w-full mt-auto"
                onClick={handleMaintenanceSaveClick}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : isMaintenanceMode && maintenanceSaveStep === "confirm" ? (
                  "تأكيد تفعيل وضع الصيانة"
                ) : (
                  "تحديث حالة النظام"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

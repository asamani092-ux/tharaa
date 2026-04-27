import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useGetMe } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Settings, Save, Loader2, Calendar, BookOpen, 
  ShieldCheck, UserCog, UserPlus, Lock, Phone, User 
} from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const { data: me } = useGetMe();
  const updateSettings = useUpdateSettings();

  // 1. حالات إعدادات المنصة
  const [weeklyQuota, setWeeklyQuota] = useState<string>("75");
  const [allDaysActive, setAllDaysActive] = useState<boolean>(false);
  const [primaryDay, setPrimaryDay] = useState<string>("Friday");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);

  // 2. حالات بيانات المشرف الحالي
  const [adminProfile, setAdminProfile] = useState({
    name: "",
    phone: "",
    password: ""
  });

  // 3. حالات إضافة مشرف جديد
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    phone: "",
    password: ""
  });

  useEffect(() => {
    if (settings) {
      setWeeklyQuota(settings.weeklyQuota?.toString() || "75");
      setAllDaysActive(!!settings.allDaysActive);
      setPrimaryDay(settings.primaryDay || "Friday");
      setIsMaintenanceMode(!!settings.maintenanceMode);
    }
    if (me?.user) {
      setAdminProfile({ name: me.user.name, phone: me.user.phone, password: "" });
    }
  }, [settings, me]);

  // دالة حفظ إعدادات المنصة
  const handleSaveSettings = () => {
    updateSettings.mutate({
      data: {
        weeklyQuota: parseInt(weeklyQuota),
        allDaysActive: allDaysActive ? 1 : 0,
        primaryDay,
        maintenanceMode: isMaintenanceMode ? 1 : 0
      }
    }, { onSuccess: () => toast.success("تم تحديث إعدادات المنصة بنجاح ✅") });
  };

  // دالة تحديث بيانات المشرف الحالي
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/users/${me?.user?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("تم تحديث بياناتك الشخصية بنجاح");
      queryClient.invalidateQueries({ queryKey: ['get-me'] });
    }
  });

  // دالة إضافة مشرف جديد
  const addAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, role: 'admin', status: 'active' })
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      toast.success("تمت إضافة المشرف الجديد بنجاح");
      setNewAdmin({ name: "", phone: "", password: "" });
    }
  });

  const days = [
    { label: "الأحد", value: "Sunday" },
    { label: "الاثنين", value: "Monday" },
    { label: "الثلاثاء", value: "Tuesday" },
    { label: "الأربعاء", value: "Wednesday" },
    { label: "الخميس", value: "Thursday" },
    { label: "الجمعة", value: "Friday" },
    { label: "السبت", value: "Saturday" },
  ];

  if (settingsLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-[#D4AF37]" /></div>;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8 text-right pb-20" dir="rtl">
        <h2 className="text-3xl font-bold flex items-center gap-3 text-[#D4AF37]" style={{ fontFamily: 'Cairo, sans-serif' }}>
          <Settings className="w-8 h-8" /> إعدادات المنصة والمشرفين
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* البطاقة 1: معايير القراءة */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl overflow-hidden border-t-4 border-t-[#D4AF37]">
            <CardHeader>
              <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-[#D4AF37]" /><CardTitle className="text-lg">معايير القراءة</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-[#94a3b8]">نصاب القراءة الأسبوعي (صفحة)</Label>
                <Input type="number" value={weeklyQuota} onChange={(e) => setWeeklyQuota(e.target.value)} className="h-12 rounded-xl text-center text-xl font-bold bg-[#161e2f] border-[#1e293b]" />
              </div>
              <Button onClick={handleSaveSettings} className="w-full rounded-xl bg-[#D4AF37] text-black font-bold">حفظ المعايير</Button>
            </CardContent>
          </Card>

          {/* البطاقة 2: مواعيد الرصد */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-emerald-500">
            <CardHeader>
              <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-emerald-400" /><CardTitle className="text-lg">مواعيد الرصد</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">تفعيل الرصد طوال الأسبوع</Label>
                  <p className="text-[10px] text-muted-foreground">فتح التسجيل في أي يوم بدلاً من يوم محدد.</p>
                </div>
                {/* Switch Fix: تأكد من عدم وجود styles تسبب الإزاحة */}
                <Switch checked={allDaysActive} onCheckedChange={setAllDaysActive} className="data-[state=checked]:bg-emerald-500 scale-90" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#94a3b8]">اليوم الأساسي للرصد (التسليم)</Label>
                <Select value={primaryDay} onValueChange={setPrimaryDay}>
                  <SelectTrigger className="h-11 rounded-xl bg-[#161e2f] border-[#1e293b]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {days.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-amber-400/80 mt-1">* اليوم التالي لهذا التاريخ سيعتبره النظام تسليماً متأخراً تلقائياً.</p>
              </div>
              <Button onClick={handleSaveSettings} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">تحديث المواعيد</Button>
            </CardContent>
          </Card>

          {/* البطاقة 3: إدارة حسابي (المشرف الحالي) */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-blue-500">
            <CardHeader>
              <div className="flex items-center gap-3"><UserCog className="w-5 h-5 text-blue-400" /><CardTitle className="text-lg">تعديل بياناتي (المشرف)</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1"><Label className="text-xs">الاسم</Label><Input value={adminProfile.name} onChange={e => setAdminProfile({...adminProfile, name: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg"/></div>
                <div className="space-y-1"><Label className="text-xs">رقم الجوال</Label><Input value={adminProfile.phone} onChange={e => setAdminProfile({...adminProfile, phone: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg" dir="ltr"/></div>
                <div className="space-y-1"><Label className="text-xs">كلمة المرور الجديدة (اختياري)</Label><Input type="password" value={adminProfile.password} onChange={e => setAdminProfile({...adminProfile, password: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg" placeholder="اتركها فارغة لعدم التغيير"/></div>
              </div>
              <Button onClick={() => updateProfileMutation.mutate(adminProfile)} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 font-bold" disabled={updateProfileMutation.isPending}>حفظ بياناتي</Button>
            </CardContent>
          </Card>

          {/* البطاقة 4: إضافة مشرف جديد */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-purple-500">
            <CardHeader>
              <div className="flex items-center gap-3"><UserPlus className="w-5 h-5 text-purple-400" /><CardTitle className="text-lg">إضافة مشرف آخر</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1"><Label className="text-xs">اسم المشرف الجديد</Label><Input value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg"/></div>
                <div className="space-y-1"><Label className="text-xs">رقم الجوال</Label><Input value={newAdmin.phone} onChange={e => setNewAdmin({...newAdmin, phone: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg" dir="ltr"/></div>
                <div className="space-y-1"><Label className="text-xs">كلمة المرور</Label><Input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg"/></div>
              </div>
              <Button onClick={() => addAdminMutation.mutate(newAdmin)} className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 font-bold" disabled={addAdminMutation.isPending}>إضافة المشرف</Button>
            </CardContent>
          </Card>

          {/* البطاقة 5: حالة النظام (الصيانة) */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-red-500 md:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                <div className="space-y-1">
                  <Label className="text-base flex items-center gap-2 text-red-400">وضع الصيانة <ShieldCheck className="w-5 h-5"/></Label>
                  <p className="text-xs text-muted-foreground">عند التفعيل، سيتم إغلاق واجهة الطلاب تماماً للصيانة.</p>
                </div>
                {/* Switch Fix: إضافة padding داخلي للـ Switch لضمان عدم خروج الدائرة */}
                <div className="px-1"><Switch checked={isMaintenanceMode} onCheckedChange={(val) => { setIsMaintenanceMode(val); /* سيتم الحفظ عند ضغط الزر بالأسفل أو تلقائياً */ }} className="data-[state=checked]:bg-red-500" /></div>
              </div>
              <Button onClick={handleSaveSettings} variant="destructive" className="w-full mt-4 rounded-xl font-bold h-12">تحديث حالة النظام</Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}

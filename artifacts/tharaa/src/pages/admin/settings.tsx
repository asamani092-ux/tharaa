import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, useGetMe, useUpdateUser } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Loader2, Calendar, BookOpen, ShieldCheck, UserCog, UserPlus } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const { data: me } = useGetMe();
  const updateSettings = useUpdateSettings();
  const updateUser = useUpdateUser(); // نستخدم دالة النظام لتعديل بيانات المشرف الحالي

  // حالات إعدادات المنصة
  const [weeklyQuota, setWeeklyQuota] = useState<string>("75");
  const [allDaysActive, setAllDaysActive] = useState<boolean>(false);
  const [primaryDay, setPrimaryDay] = useState<string>("Friday");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);

  // حالات بيانات المشرف الحالي
  const [adminProfile, setAdminProfile] = useState({ name: "", phone: "", password: "" });

  // حالات إضافة مشرف جديد
  const [newAdmin, setNewAdmin] = useState({ name: "", phone: "", password: "" });

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

  const handleSaveSettings = () => {
    updateSettings.mutate({
      data: {
        weeklyQuota: parseInt(weeklyQuota),
        allDaysActive: allDaysActive ? 1 : 0,
        primaryDay,
        maintenanceMode: isMaintenanceMode ? 1 : 0
      }
    }, { onSuccess: () => toast.success("تم تحديث إعدادات المنصة ✅") });
  };

  const handleUpdateProfile = () => {
    if (!adminProfile.name || !adminProfile.phone) {
      toast.error("الاسم ورقم الجوال مطلوبان");
      return;
    }
    updateUser.mutate({
      id: me?.user?.id as number,
      data: {
        name: adminProfile.name,
        phone: adminProfile.phone,
        ...(adminProfile.password ? { password: adminProfile.password } : {})
      }
    }, {
      onSuccess: () => {
        toast.success("تم تحديث بياناتك الشخصية بنجاح");
        setAdminProfile({ ...adminProfile, password: "" }); // تفريغ حقل المرور بعد النجاح
      },
      onError: () => toast.error("حدث خطأ أثناء تحديث بياناتك")
    });
  };

  const addAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/add_admin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      // قراءة الرد كنص أولاً لمعرفة سبب الخطأ الحقيقي
      const text = await res.text();
      let jsonData;
      try {
        jsonData = JSON.parse(text);
      } catch (e) {
        // إذا لم يكن الرد بصيغة JSON فهذا يعني أن الملف غير موجود أو المسار خاطئ
        throw new Error("خطأ في السيرفر: تأكد من رفع ملف add_admin.php في المسار الصحيح");
      }

      if (!res.ok) {
        throw new Error(jsonData.error || "حدث خطأ غير معروف");
      }
      return jsonData;
    },
    onSuccess: () => {
      toast.success("تمت إضافة المشرف الجديد بنجاح 🎉");
      setNewAdmin({ name: "", phone: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ['list-users'] });
    },
    onError: (err: any) => toast.error(err.message) // هنا ستظهر رسالة الخطأ الحقيقية
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
          
          {/* معايير القراءة */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl overflow-hidden border-t-4 border-t-[#D4AF37]">
            <CardHeader><div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-[#D4AF37]" /><CardTitle className="text-lg">معايير القراءة</CardTitle></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-[#94a3b8]">نصاب القراءة الأسبوعي (صفحة)</Label>
                <Input type="number" value={weeklyQuota} onChange={(e) => setWeeklyQuota(e.target.value)} className="h-12 rounded-xl text-center text-xl font-bold bg-[#161e2f] border-[#1e293b]" />
              </div>
              <Button onClick={handleSaveSettings} className="w-full rounded-xl bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-bold h-11" disabled={updateSettings.isPending}>حفظ المعايير</Button>
            </CardContent>
          </Card>

          {/* مواعيد الرصد */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-emerald-500">
            <CardHeader><div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-emerald-400" /><CardTitle className="text-lg">مواعيد الرصد</CardTitle></div></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">تفعيل الرصد طوال الأسبوع</Label>
                  <p className="text-[10px] text-muted-foreground">فتح التسجيل في أي يوم بدلاً من يوم محدد.</p>
                </div>
                <div className="px-1"><Switch checked={allDaysActive} onCheckedChange={setAllDaysActive} className="data-[state=checked]:bg-emerald-500 scale-90" /></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-[#94a3b8]">اليوم الأساسي للرصد (التسليم)</Label>
                <Select value={primaryDay} onValueChange={setPrimaryDay}>
                  <SelectTrigger className="h-11 rounded-xl bg-[#161e2f] border-[#1e293b]"><SelectValue /></SelectTrigger>
                  <SelectContent>{days.map(day => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveSettings} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11" disabled={updateSettings.isPending}>تحديث المواعيد</Button>
            </CardContent>
          </Card>

          {/* تعديل المشرف الحالي */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-blue-500">
            <CardHeader><div className="flex items-center gap-3"><UserCog className="w-5 h-5 text-blue-400" /><CardTitle className="text-lg">تعديل بياناتي (المشرف)</CardTitle></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1"><Label className="text-xs">الاسم</Label><Input value={adminProfile.name} onChange={e => setAdminProfile({...adminProfile, name: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg"/></div>
                <div className="space-y-1"><Label className="text-xs">رقم الجوال</Label><Input value={adminProfile.phone} onChange={e => setAdminProfile({...adminProfile, phone: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg" dir="ltr"/></div>
                <div className="space-y-1"><Label className="text-xs">كلمة المرور الجديدة (اختياري)</Label><Input type="password" value={adminProfile.password} onChange={e => setAdminProfile({...adminProfile, password: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg" placeholder="اتركها فارغة لعدم التغيير"/></div>
              </div>
              <Button onClick={handleUpdateProfile} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 font-bold h-11" disabled={updateUser.isPending}>{updateUser.isPending ? <Loader2 className="animate-spin" /> : "حفظ بياناتي"}</Button>
            </CardContent>
          </Card>

          {/* إضافة مشرف جديد */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-purple-500">
            <CardHeader><div className="flex items-center gap-3"><UserPlus className="w-5 h-5 text-purple-400" /><CardTitle className="text-lg">إضافة مشرف آخر</CardTitle></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1"><Label className="text-xs">اسم المشرف الجديد</Label><Input value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg"/></div>
                <div className="space-y-1"><Label className="text-xs">رقم الجوال</Label><Input value={newAdmin.phone} onChange={e => setNewAdmin({...newAdmin, phone: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg" dir="ltr"/></div>
                <div className="space-y-1"><Label className="text-xs">كلمة المرور</Label><Input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="bg-[#161e2f] border-[#1e293b] h-10 rounded-lg"/></div>
              </div>
              <Button onClick={() => addAdminMutation.mutate(newAdmin)} className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 font-bold h-11" disabled={addAdminMutation.isPending}>{addAdminMutation.isPending ? <Loader2 className="animate-spin" /> : "إضافة المشرف"}</Button>
            </CardContent>
          </Card>

          {/* حالة النظام */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-red-500 md:col-span-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                <div className="space-y-1">
                  <Label className="text-base flex items-center gap-2 text-red-400">وضع الصيانة <ShieldCheck className="w-5 h-5"/></Label>
                  <p className="text-xs text-muted-foreground">عند التفعيل، سيتم إغلاق واجهة الطلاب تماماً للصيانة.</p>
                </div>
                <div className="px-1"><Switch checked={isMaintenanceMode} onCheckedChange={(val) => { setIsMaintenanceMode(val); }} className="data-[state=checked]:bg-red-500 scale-90" /></div>
              </div>
              <Button onClick={handleSaveSettings} variant="destructive" className="w-full mt-4 rounded-xl font-bold h-11" disabled={updateSettings.isPending}>تحديث حالة النظام</Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}

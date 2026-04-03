import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import bgPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png";
import logoPath from "@assets/لقطة_شاشة_2026-03-24_055723_1774925020035.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. تنظيف الرقم
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith("+966")) {
      normalizedPhone = "0" + normalizedPhone.slice(4);
    } else if (normalizedPhone.startsWith("966") && normalizedPhone.length === 12) {
      normalizedPhone = "0" + normalizedPhone.slice(3);
    }
    if (!normalizedPhone.startsWith("0") && normalizedPhone.length === 9) {
      normalizedPhone = "0" + normalizedPhone;
    }

    // 2. تنفيذ تسجيل الدخول عبر mutate
    login.mutate(
      { data: { phone: normalizedPhone, password } },
      {
        onSuccess: async (res) => {
          toast.success("تم تسجيل الدخول بنجاح");
          
          // تحديث بيانات المستخدم في الكاش
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          
          // الانتقال لصفحة التحكم (استخدمنا href لضمان تحديث الصفحة والكوكيز)
          if (res.role === "admin") {
            window.location.href = "/admin"; 
          } else {
            window.location.href = "/student";
          }
        },
        onError: () => {
          toast.error("رقم الهاتف أو كلمة المرور غير صحيحة");
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" dir="rtl" style={{ backgroundColor: 'hsl(218,47%,8%)' }}>
      <div className="absolute inset-0 z-0">
        <img src={bgPath} alt="" className="w-full h-full object-cover" style={{ opacity: 0.08 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(218,47%,6%) 0%, hsl(218,47%,10%) 100%)' }} />
      </div>
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="text-[20vw] font-black select-none" style={{ color: 'hsl(46,65%,52%)', opacity: 0.04, fontFamily: 'Cairo, sans-serif' }}>ثراء</span>
      </div>
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-8">
          <img src={logoPath} alt="ثراء المعرفة" className="h-28 object-contain mb-4" />
          <p className="text-muted-foreground text-sm text-center">أهلاً بك في منصة ثراء المعرفة </p>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: 'hsl(218,39%,12%)', border: '1px solid hsl(217,36%,20%)' }}>
          <h1 className="text-xl font-bold text-center mb-6 text-foreground" style={{ fontFamily: 'Cairo, sans-serif' }}>تسجيل الدخول</h1>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                className="text-right h-11 rounded-xl"
                placeholder="05XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={login.isPending}
                style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                className="h-11 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={login.isPending}
                style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-bold text-base rounded-xl mt-2"
              disabled={login.isPending}
            >
              {login.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, Lock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";

// =====================
// استبدل هذه المسارات بملفاتك النهائية
// =====================
import bgImage from "@assets/login-bg.png";
import logoFullDark from "@assets/logo-full-dark.png";
import logoFullWhite from "@assets/logo-full-white.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // اكتشاف الثيم الحالي
  const isDark =
    document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") !== "light";

  // الشعار الرئيسي + العلامة المائية حسب الثيم
  const logoMain = isDark ? logoFullDark : logoFullDark;
  const logoWatermark = isDark ? logoFullWhite : logoFullDark;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    let normalizedPhone = phone.trim();

    if (normalizedPhone.startsWith("+966")) {
      normalizedPhone = "0" + normalizedPhone.slice(4);
    } else if (normalizedPhone.startsWith("966") && normalizedPhone.length === 12) {
      normalizedPhone = "0" + normalizedPhone.slice(3);
    }

    if (!normalizedPhone.startsWith("0") && normalizedPhone.length === 9) {
      normalizedPhone = "0" + normalizedPhone;
    }

    login.mutate(
      { data: { phone: normalizedPhone, password } },
      {
        onSuccess: async (res) => {
          toast.success("تم تسجيل الدخول بنجاح");
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });

          if (res.role === "admin") {
            window.location.href = "/admin";
          } else {
            window.location.href = "/student";
          }
        },
        onError: (error: any) => {
          const serverMessage =
            error?.response?.data?.error || error?.info?.error || error?.message;
          toast.error(serverMessage || "تأكد من صحة البيانات أو تواصل مع الإدارة");
        },
      }
    );
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen relative overflow-hidden bg-background text-foreground font-sans"
    >
      {/* زر تبديل الثيم */}
      <div className="absolute top-5 left-5 z-30">
        <ThemeToggle />
      </div>

      {/* الخلفية الأساسية */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImage}
          alt=""
          className="h-full w-full object-cover opacity-[0.14]"
        />
        <div className="absolute inset-0 bg-background/88" />
      </div>

      {/* العلامة المائية */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${logoWatermark})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "68%",
          opacity: 0.05,
        }}
      />

      {/* المحتوى */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* الشعار */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src={logoMain}
              alt="شعار ثراء المعرفة"
              className="w-[220px] max-w-full h-auto object-contain"
            />
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              بوابة الوصول إلى منصتك المعرفية
            </p>
          </div>

          {/* بطاقة تسجيل الدخول */}
          <Card className="w-full rounded-[var(--radius-xl)] border border-[var(--border-default)] shadow-[var(--shadow-lg)]">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-[24px] font-semibold">تسجيل الدخول</CardTitle>
              <CardDescription>أهلاً بك مجدداً في منصتك المعرفية</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {/* الهاتف */}
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] opacity-80 pointer-events-none" />
                    <Input
                      id="phone"
                      type="tel"
                      dir="ltr"
                      className="pr-10"
                      placeholder="05XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={login.isPending}
                    />
                  </div>
                </div>

                {/* كلمة المرور */}
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)] opacity-80 pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      dir="ltr"
                      className="pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={login.isPending}
                    />
                  </div>
                </div>

                {/* زر الدخول */}
                <Button
                  type="submit"
                  className="w-full mt-1"
                  isLoading={login.isPending}
                >
                  دخول للنظام
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

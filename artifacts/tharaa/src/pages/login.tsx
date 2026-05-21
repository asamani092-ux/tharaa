import { useState, useEffect } from "react";
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
import { isDarkTheme } from "@/lib/theme";

function useIsDarkTheme() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? isDarkTheme() : true
  );

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(isDarkTheme());
    sync();

    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class", "data-theme"] });

    return () => mo.disconnect();
  }, []);

  return isDark;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();
  const isDark = useIsDarkTheme();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  // شعار كامل: داكن للفاتح، أبيض/فاتح للداكن
 const logoFullDark = "/brand/logo-full-dark.png";
   const logoFullWhite = "/brand/logo-full-white.png";

  // أيقونات للعلامة المائية (أخف من الشعار الكامل)
   const iconColored = "/brand/thraa_icon_colored.png";
   const iconWhite = "/brand/thraa_icon_white.png";

  const logoMain = isDark ? logoFullWhite : logoFullDark;
  const logoWatermark = isDark ? iconWhite : iconColored;

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
      <div className="absolute top-5 left-5 z-30">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.03),transparent_40%),var(--bg-secondary)]" />

      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
        //  backgroundImage: `url(${logoWatermark})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "42%",
          opacity: 0.06,
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src={logoMain}
              alt="شعار ثراء المعرفة"
              className="w-[220px] max-w-full h-auto object-contain"
            />
          </div>

          <Card className="w-full rounded-[var(--radius-xl)] border border-[var(--border-default)] shadow-[var(--shadow-lg)]">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-[24px] font-semibold">تسجيل الدخول</CardTitle>
              <CardDescription>أهلاً بك مجدداً في ثراء المعرفة</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
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

                <Button type="submit" className="w-full mt-1" isLoading={login.isPending}>
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

import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import {
  LogOut,
  BookOpen,
  Users,
  BarChart3,
  Layers,
  Home,
  Settings, // تأكد من استيراد أيقونة الإعدادات
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useLogout();
  const { data: session } = useGetMe();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
    });
  };

  const navItems = [
    { href: "/admin", label: "نظرة عامة", icon: Home, id: "overview" },
    {
      href: "/admin/users",
      label: "إدارة المشاركين",
      icon: Users,
      id: "users",
    },
    {
      href: "/admin/curriculum",
      label: "المنهج الدراسي",
      icon: BookOpen,
      id: "curriculum",
    },
    { href: "/admin/batches", label: "الدفعات", icon: Layers, id: "batches" },
    {
      href: "/admin/analytics",
      label: "الإحصائيات",
      icon: BarChart3,
      id: "analytics",
    },
    // إعادة إظهار تبويب الإعدادات
    {
      href: "/admin/settings",
      label: "الإعدادات",
      icon: Settings,
      id: "settings",
    },
  ];

  return (
    <div
      className="flex min-h-screen bg-background text-foreground flex-col md:flex-row"
      dir="rtl"
    >
      {/* Sidebar */}
      <aside
        className="w-full md:w-64 flex flex-col shrink-0"
        style={{
          backgroundColor: "hsl(218,42%,10%)",
          borderLeft: "1px solid hsl(217,36%,18%)",
        }}
      >
        <div
          className="p-5 flex justify-center items-center h-[97px]"
          style={{ borderBottom: "1px solid hsl(217,36%,18%)" }}
        >
          {/* العنوان باللون الذهبي الفخم */}
          <h1 className="text-2xl font-bold" style={{ 
            color: '#D4AF37', 
            fontFamily: 'Cairo, sans-serif',
            textShadow: '0px 2px 4px rgba(0,0,0,0.5)' 
          }}>ثراء المعرفة</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (location.startsWith(item.href + "/") && item.href !== "/admin");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  data-testid={`link-admin-${item.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-150 text-sm font-medium ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: "hsl(46,65%,52%,0.12)",
                          borderRight: "3px solid hsl(46,65%,52%)",
                        }
                      : {}
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div
          className="p-4"
          style={{ borderTop: "1px solid hsl(217,36%,18%)" }}
        >
          <div
            className="mb-3 px-2 text-sm text-muted-foreground font-medium"
            data-testid="text-username"
          >
            {session?.user?.name}
          </div>
          <Button
            data-testid="button-logout"
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary text-sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 text-right">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const { data: session } = useGetMe();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      },
    });
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col relative"
      dir="rtl"
    >
      {/* الخلفية الشفافة (العلامة المائية) */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]" 
        style={{
          backgroundImage: `url(${logoPath})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '400px'
        }}
      />

      <header
        className="relative z-10"
        style={{
          backgroundColor: "hsl(218,42%,10%)",
          borderBottom: "1px solid hsl(217,36%,18%)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold" style={{ 
                color: '#D4AF37', 
                fontFamily: 'Cairo, sans-serif' 
              }}>ثراء المعرفة</h1>
              <p className="text-xs text-muted-foreground">بوابة المشارك</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium text-foreground/80 hidden sm:block"
              data-testid="text-username"
            >
              {session?.user?.name}
            </span>
            <Button
              data-testid="button-logout"
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 relative z-10">
        {children}
      </main>
    </div>
  );
}

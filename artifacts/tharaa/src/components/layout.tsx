import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import {
  LogOut,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Layers,
  Home,
} from "lucide-react";
import logoPath from "@assets/لقطة_شاشة_2026-03-24_055723_1774925020035.png";
import { Button } from "@/components/ui/button";

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
          className="p-5 flex justify-center"
          style={{ borderBottom: "1px solid hsl(217,36%,18%)" }}
        >
          <img
            src={logoPath}
            alt="ثراء المعرفة"
            className="h-14 object-contain"
          />
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
      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0 text-center">
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
      className="min-h-screen bg-background text-foreground flex flex-col"
      dir="rtl"
    >
      <header
        style={{
          backgroundColor: "hsl(218,42%,10%)",
          borderBottom: "1px solid hsl(217,36%,18%)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src={logoPath}
              alt="ثراء المعرفة"
              className="h-10 object-contain"
            />
            <div>
              <h1 className="text-base font-bold text-primary">ثراء المعرفة</h1>
              <p className="text-xs text-muted-foreground">بوابة الطالب</p>
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
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

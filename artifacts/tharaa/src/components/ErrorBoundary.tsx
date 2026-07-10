import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-background text-foreground"
          dir="rtl"
        >
          <h1 className="text-lg font-bold text-[var(--error-600)]">حدث خطأ في الواجهة</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-md">
            {this.state.error.message || "خطأ غير متوقع"}
          </p>
          <Button type="button" onClick={() => window.location.reload()}>
            إعادة تحميل الصفحة
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

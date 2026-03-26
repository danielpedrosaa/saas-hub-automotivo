import { ReactNode, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./layout/Sidebar";

import MobileBottomNav from "./layout/MobileBottomNav";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  // Listen for collapse changes from sidebar
  useEffect(() => {
    const handleStorage = () => {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    };
    window.addEventListener("storage", handleStorage);
    
    // Also poll for same-tab changes
    const interval = setInterval(() => {
      const val = localStorage.getItem("sidebar-collapsed") === "true";
      setCollapsed((prev) => (prev !== val ? val : prev));
    }, 200);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <main className="px-4 pt-4 pb-[72px]">{children}</main>
        <MobileBottomNav />
      </div>
    );
  }

  const sidebarWidth = collapsed ? 72 : 220;

  return (
    <div className="h-screen overflow-hidden bg-background flex font-sans">
      <Sidebar />
      <div
        className="flex-1 h-screen overflow-y-auto overflow-x-hidden min-w-0 transition-all duration-300"
        style={{ paddingLeft: sidebarWidth }}
      >
        <div className="w-full px-6 py-6 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}

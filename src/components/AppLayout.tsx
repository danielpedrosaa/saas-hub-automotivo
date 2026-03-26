import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./layout/Sidebar";
import MobileBottomNav from "./layout/MobileBottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <main className="px-4 pt-4 pb-[72px]">{children}</main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-background flex font-sans">
      <Sidebar />
      <div className="h-screen overflow-y-auto overflow-x-hidden flex-1 min-w-0 transition-all duration-300 custom-scrollbar">
        <div className="mx-auto w-full px-[60px] pt-4 min-h-full">{children}</div>
      </div>
    </div>
  );
}

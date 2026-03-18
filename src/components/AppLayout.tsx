import { ReactNode } from "react";
import BottomNav from "./BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <main className="mx-auto max-w-lg px-4 pt-6 pb-4">{children}</main>
      <BottomNav />
    </div>
  );
}

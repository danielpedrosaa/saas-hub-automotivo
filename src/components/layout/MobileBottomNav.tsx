import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MOBILE_NAV_ITEMS } from "./sidebar-nav";

export default function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex h-[56px] items-center justify-around px-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px]"
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-foreground" : "text-muted-foreground/50"
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className={cn(
                "text-[9px] font-medium uppercase tracking-wider",
                active ? "text-foreground" : "text-muted-foreground/50"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { useLocation, Link } from "react-router-dom";
import { Home, Car, Wrench, Settings, UserCircle, ClipboardList, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Início", roles: ["owner", "employee"] },
  { to: "/jobs", icon: ClipboardList, label: "OS", roles: ["owner", "employee"] },
  { to: "/agenda", icon: Calendar, label: "Agenda", roles: ["owner", "employee"] },
  { to: "/vehicles", icon: Car, label: "Veículos", roles: ["owner", "employee"] },
  { to: "/customers", icon: UserCircle, label: "Clientes", roles: ["owner", "employee"] },
  { to: "/services", icon: Wrench, label: "Serviços", roles: ["owner"] },
  { to: "/settings", icon: Settings, label: "Config", roles: ["owner", "employee"] },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { role } = useAuth();

  const filtered = navItems.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb"
      style={{ backgroundColor: "hsl(13 30% 3%)" }}
    >
      {/* subtle top separator */}
      <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.05)" }} />

      <div className="flex h-[60px] items-center justify-around px-1">
        {filtered.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center gap-1 px-1.5 py-1.5 min-w-[44px] min-h-[44px] transition-all"
            >
              {/* Icon box */}
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-primary/15 border border-primary/30"
                    : "bg-transparent border border-transparent"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-all",
                    active ? "text-primary" : "text-muted-foreground/50"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-medium uppercase tracking-wide leading-none",
                  active ? "text-primary" : "text-muted-foreground/50"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

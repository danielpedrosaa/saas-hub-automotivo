import { useLocation, Link } from "react-router-dom";
import { Home, Car, Wrench, Settings, UserCircle, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", icon: Home, label: "Início", roles: ["owner", "employee"] },
  { to: "/jobs", icon: ClipboardList, label: "OS", roles: ["owner", "employee"] },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-pb">
      <div className="flex h-16 items-center justify-around px-1">
        {filtered.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] transition-colors min-w-[48px] min-h-[48px]",
                active ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                {active && (
                  <motion.div
                    layoutId="nav-dot"
                    className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className={cn("font-medium leading-tight", active && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

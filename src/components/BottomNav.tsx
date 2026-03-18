import { useLocation, Link } from "react-router-dom";
import { Home, Car, Wrench, Users, Settings, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Início", roles: ["owner", "employee"] },
  { to: "/jobs", icon: Car, label: "Veículos", roles: ["owner", "employee"] },
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-pb">
      <div className="flex h-16 items-center justify-around px-2">
        {filtered.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors min-w-[48px] min-h-[48px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BottomNav from "./BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Home, FileText, Calendar, UserCircle, Car,
  DollarSign, MessageCircle, BarChart2, Settings,
  Bell, Search, SlidersHorizontal, LogOut, ChevronDown,
  Sun, Moon, MoreHorizontal, Gauge, CreditCard, Globe, Car as VehicleIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

// ── Nav structure ──────────────────────────────────────────────────────────
const GENERAL_ITEMS = [
  { to: "/",          icon: Home,         label: "Painel",            roles: ["owner", "employee"], badge: null },
  { to: "/jobs",      icon: FileText,     label: "Ordens de Serviço", roles: ["owner", "employee"], badge: null },
  { to: "/agenda",    icon: Calendar,     label: "Agenda",            roles: ["owner", "employee"], badge: "appt" },
  { to: "/customers", icon: UserCircle,   label: "Clientes",          roles: ["owner", "employee"], badge: null },
];
const MORE_ITEMS = [
  { to: "/financial", icon: DollarSign,    label: "Financeiro",  roles: ["owner"],             badge: null },
  { to: "/whatsapp",  icon: MessageCircle, label: "WhatsApp",    roles: ["owner"],             badge: "wa" },
  { to: "/vehicles",  icon: VehicleIcon,   label: "Veículos",    roles: ["owner", "employee"], badge: null },
];

// ── Sidebar nav link ────────────────────────────────────────────────────────
function NavLink({
  to, icon: Icon, label, active, badge, isDark
}: { to: string; icon: any; label: string; active: boolean; badge?: string | null; isDark: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "relative flex items-center gap-2.5 px-3 py-2 rounded-[8px] mx-1.5 text-[12px] font-medium transition-all group",
        active
          /* ATIVO */
          ? isDark ? "bg-[#C8FF00]/10 text-[#C8FF00]" : "bg-black/[0.07] text-black font-semibold"
          /* INATIVO */
          : isDark 
            ? "text-white/40 hover:bg-white/5 hover:text-white/80" 
            : "text-black/45 hover:bg-black/[0.05] hover:text-black/80"
      )}
    >
      {active && (
        <span className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-sm",
          isDark ? "bg-[#C8FF00]" : "bg-black"
        )} />
      )}
      <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? (isDark ? "text-[#C8FF00]" : "text-black") : "opacity-70 group-hover:opacity-100")} />
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={cn(
          "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold shadow-sm",
          isDark ? "bg-[#C8FF00] text-black" : "bg-black text-white"
        )}>
          {badge === "appt" ? "3" : badge === "wa" ? "!" : badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <p className={cn(
      "px-3 pt-5 pb-1 text-[9px] font-bold uppercase tracking-[0.14em] select-none",
      isDark ? "text-white/20" : "text-black/30"
    )}>
      {children}
    </p>
  );
}

// ── Desktop Sidebar ────────────────────────────────────────────────────────
function Sidebar({ role, profile, isDark }: { role: string | null; profile: any; isDark: boolean }) {
  const { pathname } = useLocation();
  const { signOut, shopId } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "HA";

  const general = GENERAL_ITEMS.filter(i => role && i.roles.includes(role));
  const more    = MORE_ITEMS.filter(i => role && i.roles.includes(role));

  return (
    <aside className={cn(
      "fixed top-0 left-0 bottom-0 w-[240px] flex flex-col z-40 transition-colors duration-300",
      isDark 
        ? "bg-[#111111] border-r border-white/[0.07]" 
        : "bg-white border-r border-black/[0.08] shadow-[2px_0_12px_rgba(0,0,0,0.04)]"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center justify-center h-[60px] border-b shrink-0", isDark ? "border-white/[0.07]" : "border-black/[0.08]")}>
        <img
          src={isDark ? "/Logo_NovaCar_White.png" : "/Logo_NovaCar.png"}
          alt="NovaCar"
          className="h-[22px] w-auto object-contain"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-none">
        <SectionLabel isDark={isDark}>Geral</SectionLabel>
        {general.map(item => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            icon={item.icon}
            label={item.label}
            active={item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)}
            badge={item.badge}
            isDark={isDark}
          />
        ))}

        {more.length > 0 && (
          <>
            <SectionLabel isDark={isDark}>Mais</SectionLabel>
            {more.map(item => (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={item.to === "/" ? false : pathname.startsWith(item.to)}
                badge={item.badge}
                isDark={isDark}
              />
            ))}
          </>
        )}

        <div className={cn("mx-4 my-4 h-px", isDark ? "bg-white/[0.06]" : "bg-black/[0.07]")} />

        <NavLink
          to="/settings"
          icon={Settings}
          label="Configurações"
          active={pathname === "/settings"}
          isDark={isDark}
        />
      </nav>

      {/* User footer card */}
      <div className={cn("p-4 border-t shrink-0", isDark ? "border-white/[0.07]" : "border-black/[0.08]")}>
        <div className={cn("flex items-center gap-3 rounded-xl p-2.5", isDark ? "bg-white/[0.04]" : "bg-black/[0.04]")}>
          <div className={cn(
            "h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-[10px] font-black",
            isDark ? "bg-[#1e1e1e] border border-[#C8FF00]/20 text-[#C8FF00]" : "bg-gray-100 border border-black/10 text-gray-600"
          )}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-[11px] font-bold truncate leading-tight", isDark ? "text-white" : "text-gray-900")}>{profile?.full_name ?? "Usuário"}</p>
            <p className={cn("text-[9px] font-medium uppercase tracking-wider leading-tight", isDark ? "text-white/30" : "text-black/35")}>
              {role === "owner" ? "Proprietário" : "Funcionário"}
            </p>
          </div>
          <button
            onClick={async () => { await signOut(); navigate("/auth"); }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Root layout ────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return document.documentElement.classList.contains("dark");
  });

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  if (isMobile) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="fixed top-0 inset-x-0 h-[52px] bg-card border-b border-border z-50 flex items-center justify-between px-4">
          <img src={isDark ? "/Logo_NovaCar_White.png" : "/Logo_NovaCar.png"} alt="NovaCar" className="h-[18px] w-auto" />
          <div className="flex items-center gap-1.5">
            <button onClick={toggleTheme} className="h-8 w-8 flex items-center justify-center rounded-xl bg-muted/50">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Avatar className="h-7 w-7 border border-primary/20">
              <AvatarFallback className="bg-secondary text-primary text-[10px] font-bold">U</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 pt-[64px] pb-[76px]">{children}</main>
        <BottomNav />
      </div>
    );
  }

  /* DESKTOP layout */
  return (
    <div className="min-h-[100dvh] bg-background flex font-sans selection:bg-primary/30">
      <Sidebar role={role} profile={profile} isDark={isDark} />
      
      <div className="flex-1 ml-[240px] flex flex-col min-w-0">
        {/* Topbar Row */}
        <header className={cn(
          "fixed top-0 left-[240px] right-0 h-[60px] z-30 flex items-center justify-between px-6 gap-4 transition-all duration-300",
          isDark 
            ? "bg-[#0a0a0a] border-b border-white/[0.06]" 
            : "bg-white border-b border-black/[0.07] shadow-sm"
        )}>
          {/* Search bar simulation */}
          <div className="relative max-w-md w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              readOnly
              placeholder="Pesquisar ordens, clientes..."
              className={cn(
                "w-full h-9 pl-10 pr-4 text-[13px] rounded-[10px] border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20",
                isDark ? "bg-white/5 border-white/[0.08]" : "bg-black/[0.03] border-black/[0.05]"
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                isDark ? "text-white/40 hover:bg-white/5" : "text-black/40 hover:bg-black/5"
              )}
            >
              {isDark ? <Sun className="h-5 w-5 text-warning" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Bell/Notifications */}
            <button className={cn(
               "relative h-9 w-9 flex items-center justify-center rounded-lg transition-colors",
               isDark ? "text-white/40 hover:bg-white/5" : "text-black/40 hover:bg-black/5"
            )}>
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#C8FF00] shadow-[0_0_8px_rgba(200,255,0,0.5)]" />
            </button>

            <div className={cn("w-px h-5 mx-1", isDark ? "bg-white/10" : "bg-black/10")} />

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-1">
              <div className="text-right hidden sm:block">
                <p className={cn("text-[11px] font-bold leading-tight", isDark ? "text-white" : "text-gray-900")}>{profile?.full_name?.split(" ")[0]}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-tight">Conta ativa</p>
              </div>
              <Avatar className="h-8 w-8 border border-primary/20 cursor-pointer hover:border-primary/50 transition-colors">
                <AvatarFallback className="bg-secondary text-primary font-bold text-xs uppercase">
                  {profile?.full_name?.substring(0, 1) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 mt-[60px] min-h-0 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

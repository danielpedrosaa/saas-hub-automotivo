import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_STRUCTURE, type NavItem, type NavChild } from "./sidebar-nav";
import {
  ChevronLeft, ChevronRight, ChevronDown, Sun, Moon, LogOut, Settings,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Sidebar ────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { pathname } = useLocation();
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return true;
  });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Persist collapse
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Theme sync
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Auto-open group that contains current route
  useEffect(() => {
    NAV_STRUCTURE.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          const isActive = item.children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
          if (isActive) {
            setOpenGroups((prev) => ({ ...prev, [item.label]: true }));
          }
        }
      });
    });
  }, [pathname]);

  const toggleGroup = (label: string) => {
    if (collapsed) return;
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemActive = (item: NavItem) => {
    if (item.to === "/") return pathname === "/";
    if (item.children) {
      return item.children.some((c) => pathname === c.to || pathname.startsWith(c.to + "/"));
    }
    return pathname === item.to || pathname.startsWith(item.to + "/");
  };

  const isChildActive = (child: NavChild) => pathname === child.to;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const w = collapsed ? "w-[72px]" : "w-[220px]";

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 bottom-0 flex flex-col z-40 transition-all duration-300 border-r border-border",
        "bg-card",
        w,
      )}
    >
      {/* ── Logo + Collapse ── */}
      <div className="flex items-center justify-between h-[60px] px-4 border-b border-border shrink-0">
        {!collapsed && (
          <img
            src={isDark ? "/Logo_NovaCar_White.png" : "/Logo_NovaCar.png"}
            alt="NovaCar"
            className="h-[22px] w-auto object-contain"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 sidebar-scroll">
        {NAV_STRUCTURE.map((group) => {
          const visibleItems = group.items.filter((i) => role && i.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.section} className="mb-1">
              {/* Section label */}
              {!collapsed && (
                <p className="px-5 pt-5 pb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50 select-none">
                  {group.section}
                </p>
              )}
              {collapsed && <div className="h-3" />}

              {visibleItems.map((item) => (
                <NavItemRow
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  isActive={isItemActive(item)}
                  isOpen={!!openGroups[item.label]}
                  onToggle={() => toggleGroup(item.label)}
                  isChildActive={isChildActive}
                  isDark={isDark}
                  pathname={pathname}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border shrink-0 p-3 space-y-2">
        {/* Theme toggle */}
        <SidebarButton
          collapsed={collapsed}
          icon={isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          label={isDark ? "Tema escuro" : "Tema claro"}
          onClick={() => setIsDark(!isDark)}
          tooltipLabel="Alternar tema"
        />

        {/* Settings */}
        <SidebarButton
          collapsed={collapsed}
          icon={<Settings className="h-4 w-4" />}
          label="Configurações"
          onClick={() => navigate("/settings")}
          active={pathname === "/settings"}
          tooltipLabel="Configurações"
        />

        {/* User card */}
        <div className={cn(
          "flex items-center gap-3 rounded-lg p-2 mt-1",
          "bg-muted/50",
          collapsed && "justify-center"
        )}>
          <div className={cn(
            "h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-[10px] font-black",
            "bg-background border border-border text-muted-foreground"
          )}>
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate leading-tight text-foreground">
                {profile?.full_name ?? "Usuário"}
              </p>
              <p className="text-[9px] font-medium uppercase tracking-wider leading-tight text-muted-foreground">
                {role === "owner" ? "proprietário" : "funcionário"}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={async () => { await signOut(); navigate("/auth"); }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Nav item row ───────────────────────────────────────────────────────────
function NavItemRow({
  item, collapsed, isActive, isOpen, onToggle, isChildActive, isDark, pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isChildActive: (c: NavChild) => boolean;
  isDark: boolean;
  pathname: string;
}) {
  const hasChildren = !!item.children && item.children.length > 0;
  const Icon = item.icon;

  const content = (
    <div
      className={cn(
        "relative flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer group",
        isActive
          ? "bg-muted text-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        collapsed && "justify-center px-0 mx-1"
      )}
      onClick={() => {
        if (hasChildren) onToggle();
      }}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[16px] rounded-r-sm bg-foreground" />
      )}
      <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-foreground" : "opacity-60 group-hover:opacity-100")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {hasChildren && (
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          )}
        </>
      )}
    </div>
  );

  // If no children, wrap in Link
  const row = hasChildren ? (
    <div>{content}</div>
  ) : (
    <Link to={item.to}>{content}</Link>
  );

  return (
    <div>
      {collapsed ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {hasChildren ? (
              <Link to={item.to}>{content}</Link>
            ) : (
              row
            )}
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        row
      )}

      {/* Children accordion */}
      {hasChildren && !collapsed && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="ml-[26px] pl-3 border-l border-border/50 py-0.5 space-y-0.5">
            {item.children!.map((child) => (
              <Link
                key={child.to}
                to={child.to}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] transition-colors whitespace-nowrap",
                  isChildActive(child)
                    ? "text-foreground font-semibold bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                <span className="flex-1 truncate">{child.label}</span>
                {child.badge === "novo" && (
                  <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tracking-wider">
                    novo
                  </span>
                )}
                {child.badge === "IA" && (
                  <span className="shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-purple/15 text-purple tracking-wider">
                    IA
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar footer button ──────────────────────────────────────────────────
function SidebarButton({
  collapsed, icon, label, onClick, active, tooltipLabel,
}: {
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  tooltipLabel: string;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 mx-0 rounded-lg text-[12px] font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{tooltipLabel}</TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}

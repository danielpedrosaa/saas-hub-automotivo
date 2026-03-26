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

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

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
        "h-screen flex-shrink-0 flex flex-col z-40 transition-all duration-300 border-r border-border relative",
        "bg-card",
        w,
      )}
      style={{ padding: collapsed ? "28px 8px" : "28px 18px" }}
    >
      {/* ── Collapse button — right edge, vertically centered ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute flex items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
        style={{
          right: -12,
          top: "50%",
          transform: "translateY(-50%)",
          width: 24,
          height: 24,
          zIndex: 20,
        }}
      >
        <ChevronLeft
          className="transition-transform duration-200"
          style={{
            width: 10,
            height: 10,
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* ── Logo ── */}
      <div
        className="flex items-center justify-center border-b border-border shrink-0"
        style={{ padding: "5px 16px 20px", marginBottom: 12 }}
      >
        {collapsed ? (
          <img
            src="/favicon.ico"
            alt="NovaCar"
            className="block mx-auto object-contain"
            style={{ width: 36, height: 36 }}
          />
        ) : (
          <img
            src={isDark ? "/Logo_NovaCar_White.png" : "/Logo_NovaCar.png"}
            alt="NovaCar"
            className="block mx-auto object-contain"
            style={{ height: 42, width: "auto", maxWidth: "85%" }}
          />
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-2 sidebar-scroll">
        {NAV_STRUCTURE.map((group) => {
          const visibleItems = group.items.filter((i) => role && i.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.section}>
              {/* Section label */}
              {!collapsed && (
                <p className="px-3 pt-[18px] pb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50 select-none">
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
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-border shrink-0 space-y-2 pt-3">
        {/* Theme toggle */}
        {!collapsed ? (
          <div
            className="flex items-center justify-between rounded-[11px] border border-border bg-muted/50"
            style={{ padding: "12px 14px" }}
          >
            <span className="text-[12px] font-light text-muted-foreground">Tema</span>
            <button
              onClick={() => setIsDark(!isDark)}
              className={cn(
                "relative flex items-center rounded-[13px] transition-colors duration-300",
                isDark ? "bg-foreground/20" : "bg-foreground/10"
              )}
              style={{ width: 48, height: 26 }}
            >
              <span
                className={cn(
                  "absolute flex items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-300"
                )}
                style={{
                  width: 20, height: 20, top: 3, left: 3,
                  transform: isDark ? "translateX(0)" : "translateX(22px)",
                }}
              >
                {isDark ? (
                  <Moon className="h-3 w-3 text-foreground" />
                ) : (
                  <Sun className="h-3 w-3 text-foreground" />
                )}
              </span>
            </button>
          </div>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsDark(!isDark)}
                className="flex h-9 w-9 mx-auto items-center justify-center rounded-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                {isDark ? <Moon style={{ width: 19, height: 19 }} strokeWidth={1.5} /> : <Sun style={{ width: 19, height: 19 }} strokeWidth={1.5} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Alternar tema</TooltipContent>
          </Tooltip>
        )}

        <SidebarButton
          collapsed={collapsed}
          icon={<Settings style={{ width: 19, height: 19 }} strokeWidth={1.5} />}
          label="Configurações"
          onClick={() => navigate("/settings")}
          active={pathname === "/settings"}
          tooltipLabel="Configurações"
        />

        {/* User card */}
        <div className={cn(
          "flex items-center rounded-[12px] border border-border bg-muted/50",
          collapsed ? "justify-center p-2" : "gap-3"
        )}
          style={collapsed ? undefined : { padding: 14 }}
        >
          <div className={cn(
            "shrink-0 flex items-center justify-center rounded-full text-[13px] font-medium",
            "bg-background border border-border text-foreground"
          )}
            style={{ width: 36, height: 36 }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-normal truncate leading-tight text-foreground">
                {profile?.full_name ?? "Usuário"}
              </p>
              <p className="text-[10px] font-light leading-tight text-muted-foreground" style={{ letterSpacing: "0.04em" }}>
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
  item, collapsed, isActive, isOpen, onToggle, isChildActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  isChildActive: (c: NavChild) => boolean;
}) {
  const hasChildren = !!item.children && item.children.length > 0;
  const Icon = item.icon;

  const content = (
    <div
      style={{ padding: "11px 14px", minHeight: 44, gap: 12 }}
      className={cn(
        "relative flex items-center rounded-[11px] text-[13px] transition-all cursor-pointer group",
        isActive
          ? "bg-muted text-foreground font-normal"
          : "text-muted-foreground font-light hover:bg-muted/50 hover:text-foreground",
        collapsed && "justify-center !px-0 mx-1"
      )}
      onClick={() => {
        if (hasChildren) onToggle();
      }}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[14px] rounded-r-sm bg-foreground" />
      )}
      <Icon style={{ width: 19, height: 19 }} strokeWidth={1.5} className={cn("shrink-0", isActive ? "text-foreground" : "opacity-60 group-hover:opacity-100")} />
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
          <div style={{ paddingLeft: 20 }} className="py-0.5">
            {item.children!.map((child) => (
              <Link
                key={child.to}
                to={child.to}
                style={{ padding: "8px 14px", minHeight: 36 }}
                className={cn(
                  "flex items-center gap-2 rounded-[11px] text-[12px] font-light transition-colors whitespace-nowrap group/sub",
                  isChildActive(child)
                    ? "text-foreground bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {/* Bullet dot */}
                <span className={cn(
                  "w-1 h-1 rounded-full shrink-0 transition-colors",
                  isChildActive(child)
                    ? "bg-foreground"
                    : "bg-muted-foreground/30 group-hover/sub:bg-muted-foreground/60"
                )} />
                <span className="flex-1 truncate">{child.label}</span>
                {child.badge === "novo" && (
                  <span
                    className="shrink-0 uppercase"
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 4,
                      letterSpacing: "0.04em",
                      background: "hsl(142 71% 45% / 0.12)",
                      color: "hsl(142 71% 45%)",
                    }}
                  >
                    novo
                  </span>
                )}
                {child.badge === "IA" && (
                  <span
                    className="shrink-0 uppercase"
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 4,
                      letterSpacing: "0.04em",
                      background: "rgba(168,85,247,0.12)",
                      color: "#a855f7",
                    }}
                  >
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
      style={{ padding: "11px 14px", minHeight: 44, gap: 12 }}
      className={cn(
        "flex items-center w-full rounded-[11px] text-[13px] font-light transition-colors",
        active
          ? "bg-muted text-foreground font-normal"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        collapsed && "justify-center !px-0"
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

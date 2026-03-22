import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, Calendar, FileText, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Header() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] ?? "Usuário";

  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      {/* Left: greeting */}
      <div className="min-w-0">
        <h1 className="text-xl font-medium text-foreground leading-tight">
          {getGreeting()}, <span className="font-semibold">{firstName}</span>
        </h1>
        <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{formatDate()}</p>
      </div>

      {/* Center: search */}
      <div className="hidden md:flex relative max-w-md w-full group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <input
          readOnly
          placeholder="Buscar ordens, clientes, placas..."
          className={cn(
            "w-full h-9 pl-10 pr-16 text-[12px] rounded-lg border border-border bg-muted/30",
            "placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/10",
            "transition-all cursor-pointer"
          )}
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/40 font-mono bg-muted px-1.5 py-0.5 rounded">
          ⌘K
        </kbd>
      </div>

      {/* Right: quick actions */}
      <div className="flex items-center gap-2 shrink-0">
        <QuickAction icon={Calendar} label="Agendamento" to="/agenda" />
        <QuickAction icon={FileText} label="OS" to="/jobs" primary />
        <QuickAction icon={UserPlus} label="Cliente" to="/customers" />
      </div>
    </header>
  );
}

function QuickAction({ icon: Icon, label, to, primary }: { icon: any; label: string; to: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "hidden lg:flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium transition-colors",
        primary
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
    >
      <Plus className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Link>
  );
}

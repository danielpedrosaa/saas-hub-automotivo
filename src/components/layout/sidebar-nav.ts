import {
  LayoutGrid, Calendar, CalendarPlus, CalendarOff, Sparkles, Lightbulb,
  FileText, ClipboardCheck, Workflow, Images,
  Users, Crown, RotateCcw, Cake, UserPlus,
  Car, Heart, DollarSign, Link2, Percent, Receipt, TrendingUp, FileCheck,
  Package, MessageCircle, Bell, RefreshCw, Megaphone, ShoppingBag,
  Globe, Star, BarChart3, Clock, PieChart, ArrowLeftRight,
  Settings, MoreHorizontal
} from "lucide-react";

export interface NavChild {
  to: string;
  label: string;
  badge?: string | null; // "novo" | "IA" | null
}

export interface NavItem {
  to: string;
  icon: any;
  label: string;
  roles: string[];
  badge?: string | null;
  children?: NavChild[];
}

export interface NavGroup {
  section: string;
  items: NavItem[];
}

export const NAV_STRUCTURE: NavGroup[] = [
  {
    section: "OPERACIONAL",
    items: [
      { to: "/", icon: LayoutGrid, label: "Painel", roles: ["owner", "employee"] },
      {
        to: "/agenda", icon: Calendar, label: "Agenda", roles: ["owner", "employee"],
        children: [
          { to: "/agenda", label: "Agendamentos" },
          { to: "/agenda/auto", label: "Autoagendamento" },
          { to: "/agenda/bloqueios", label: "Bloqueio de horários", badge: "novo" },
          { to: "/agenda/encaixes", label: "Encaixes sugeridos", badge: "IA" },
        ],
      },
      {
        to: "/jobs", icon: FileText, label: "Ordens de Serviço", roles: ["owner", "employee"],
        children: [
          { to: "/jobs", label: "Todas as OS" },
          { to: "/jobs/checklist", label: "Checklist de entrega" },
          { to: "/jobs/fluxo", label: "Fluxo operacional", badge: "novo" },
          { to: "/jobs/galeria", label: "Galeria / Antes e depois", badge: "novo" },
        ],
      },
      { to: "/oportunidades", icon: Lightbulb, label: "Oportunidades", roles: ["owner"] },
      {
        to: "/customers", icon: Users, label: "Clientes", roles: ["owner", "employee"],
        children: [
          { to: "/customers", label: "Todos os clientes" },
          { to: "/customers/vips", label: "VIPs automáticos", badge: "novo" },
          { to: "/customers/crm", label: "CRM de retorno", badge: "novo" },
          { to: "/customers/aniversariantes", label: "Aniversariantes" },
          { to: "/customers/indicacoes", label: "Indicações", badge: "novo" },
        ],
      },
      { to: "/vehicles", icon: Car, label: "Veículos", roles: ["owner", "employee"] },
      { to: "/fidelidade", icon: Heart, label: "Fidelidade", roles: ["owner"] },
    ],
  },
  {
    section: "FINANCEIRO",
    items: [
      {
        to: "/financial", icon: DollarSign, label: "Financeiro", roles: ["owner"],
        children: [
          { to: "/financial", label: "Visão geral" },
          { to: "/financial/link-pagamento", label: "Link de pagamento", badge: "novo" },
          { to: "/financial/comissoes", label: "Comissões", badge: "novo" },
          { to: "/financial/contas-pagar", label: "Contas a pagar", badge: "novo" },
          { to: "/financial/fluxo-caixa", label: "Fluxo de caixa", badge: "novo" },
          { to: "/financial/nfse", label: "NFS-e", badge: "novo" },
        ],
      },
      { to: "/estoque", icon: Package, label: "Estoque", roles: ["owner"] },
    ],
  },
  {
    section: "CANAIS",
    items: [
      {
        to: "/whatsapp", icon: MessageCircle, label: "WhatsApp", roles: ["owner"],
        children: [
          { to: "/whatsapp", label: "Conversas" },
          { to: "/whatsapp/lembretes", label: "Lembretes automáticos", badge: "novo" },
          { to: "/whatsapp/recorrencia", label: "Recorrência", badge: "novo" },
          { to: "/whatsapp/pos-venda", label: "Pós-venda automático", badge: "novo" },
          { to: "/whatsapp/campanhas", label: "Campanhas", badge: "novo" },
        ],
      },
      {
        to: "/vitrine", icon: Globe, label: "Vitrine Digital", roles: ["owner"],
        children: [
          { to: "/vitrine/portfolio", label: "Portfólio público", badge: "novo" },
          { to: "/vitrine/avaliacoes", label: "Avaliações Google", badge: "novo" },
        ],
      },
      {
        to: "/relatorios", icon: BarChart3, label: "Relatórios", roles: ["owner"],
        children: [
          { to: "/relatorios/comparativo", label: "Comparativo mensal", badge: "novo" },
          { to: "/relatorios/horarios", label: "Horários de pico", badge: "novo" },
          { to: "/relatorios/margem", label: "Margem por serviço", badge: "novo" },
          { to: "/relatorios/conversao", label: "Taxa de conversão", badge: "novo" },
        ],
      },
    ],
  },
];

export const MOBILE_NAV_ITEMS = [
  { to: "/", icon: LayoutGrid, label: "Painel" },
  { to: "/agenda", icon: Calendar, label: "Agenda" },
  { to: "/jobs", icon: FileText, label: "OS" },
  { to: "/customers", icon: Users, label: "Clientes" },
  { to: "/more", icon: MoreHorizontal, label: "Mais" },
];

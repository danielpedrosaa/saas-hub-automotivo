import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Jobs from "./pages/Jobs";
import CheckIn from "./pages/CheckIn";
import Agenda from "./pages/Agenda";
import Agendamentos from "./pages/Agendamentos";
import OrdensServico from "./pages/OrdensServico";
import OSDetail from "./pages/OSDetail";
import ClientesPage from "./pages/ClientesPage";
import ClienteDetailPage from "./pages/ClienteDetailPage";
import Services from "./pages/Services";
import Vehicles from "./pages/Vehicles";
import VeiculosPage from "./pages/VeiculosPage";
import VeiculoDetailPage from "./pages/VeiculoDetailPage";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Financial from "./pages/Financial";
import WhatsApp from "./pages/WhatsApp";
import VitrinePage from "./pages/VitrinePage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (role !== "owner") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
    <Route path="/os" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
    <Route path="/os/:id" element={<ProtectedRoute><OSDetail /></ProtectedRoute>} />
    <Route path="/checkin" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
    <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
    <Route path="/agenda/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
    <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
    <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
    <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
    <Route path="/clientes/:id" element={<ProtectedRoute><ClienteDetailPage /></ProtectedRoute>} />
    <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
    <Route path="/services" element={<ProtectedRoute><OwnerRoute><Services /></OwnerRoute></ProtectedRoute>} />
    <Route path="/team" element={<ProtectedRoute><OwnerRoute><Team /></OwnerRoute></ProtectedRoute>} />
    <Route path="/financial" element={<ProtectedRoute><OwnerRoute><Financial /></OwnerRoute></ProtectedRoute>} />
    <Route path="/financeiro" element={<Navigate to="/financial" replace />} />
    <Route path="/whatsapp" element={<ProtectedRoute><OwnerRoute><WhatsApp /></OwnerRoute></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    {/* PUBLIC — sem ProtectedRoute */}
    <Route path="/vitrine/:shopSlug" element={<VitrinePage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

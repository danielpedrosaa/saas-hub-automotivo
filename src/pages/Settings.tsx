import { useAuth } from "@/contexts/AuthContext";
import { useShop } from "@/hooks/useShopData";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Store, User, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Settings() {
  const { profile, role, signOut } = useAuth();
  const { data: shop, isLoading } = useShop();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Configurações</h1>

        <Card className="border-border bg-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {role === "owner" ? "Proprietário" : "Funcionário"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-secondary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4 text-primary" />
              Loja
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-sm text-foreground">{shop?.name}</p>
            )}
          </CardContent>
        </Card>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="h-12 w-full font-bold uppercase tracking-wider"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Sair
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}

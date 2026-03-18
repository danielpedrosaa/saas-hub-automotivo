import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeam } from "@/hooks/useShopData";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Users, Trash2 } from "lucide-react";

export default function Team() {
  const { shopId } = useAuth();
  const { data: team, isLoading } = useTeam();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    setSaving(true);

    try {
      // Note: Creating users from the client is limited.
      // For MVP, we sign up a new user, then update their profile to link to this shop.
      // In production, this should be an edge function.
      toast({
        title: "Funcionalidade limitada",
        description: "Para o MVP, peça ao funcionário para se cadastrar e entre em contato para vinculá-lo à loja.",
      });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Equipe</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="icon" className="h-10 w-10">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Funcionário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-12" required />
                </div>
                <div className="space-y-2">
                  <Label>Senha temporária</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="h-12" minLength={6} required />
                </div>
                <Button type="submit" disabled={saving} className="h-12 w-full font-bold uppercase tracking-wider">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : team?.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-10 w-10" />
            <p className="text-sm">Nenhum membro na equipe</p>
          </div>
        ) : (
          <div className="space-y-3">
            {team?.map((member) => (
              <Card key={member.id} className="border-border bg-secondary">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold text-foreground">{member.full_name}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {(member as any).user_roles?.[0]?.role === "owner" ? "Proprietário" : "Funcionário"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

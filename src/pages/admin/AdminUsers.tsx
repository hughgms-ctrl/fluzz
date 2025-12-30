import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  MoreVertical, 
  Ban, 
  Trash2, 
  CreditCard,
  Building2,
  Users,
  Eye,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface UserWithDetails {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  status?: "active" | "blocked" | "deleted";
  can_access_subscriptions?: boolean;
  workspaces_count?: number;
  workspaces_owned?: number;
}

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: async () => {
      // Get all profiles
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("full_name", `%${search}%`);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Get account management data
      const { data: accountData } = await supabase
        .from("user_account_management")
        .select("*");

      // Get workspace counts
      const { data: workspaceCounts } = await supabase
        .from("workspace_members")
        .select("user_id, workspace_id");

      const { data: workspacesOwned } = await supabase
        .from("workspaces")
        .select("created_by");

      // Combine data
      return profiles?.map((profile) => {
        const account = accountData?.find((a) => a.user_id === profile.id);
        const memberOf = workspaceCounts?.filter((w) => w.user_id === profile.id) || [];
        const owned = workspacesOwned?.filter((w) => w.created_by === profile.id) || [];

        return {
          ...profile,
          status: account?.status || "active",
          can_access_subscriptions: account?.can_access_subscriptions || false,
          workspaces_count: memberOf.length,
          workspaces_owned: owned.length,
        } as UserWithDetails;
      });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      // First check if record exists
      const { data: existing } = await supabase
        .from("user_account_management")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_account_management")
          .update({
            status: "blocked",
            blocked_at: new Date().toISOString(),
            blocked_by: currentUser?.id,
            blocked_reason: reason,
          })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_account_management")
          .insert({
            user_id: userId,
            status: "blocked",
            blocked_at: new Date().toISOString(),
            blocked_by: currentUser?.id,
            blocked_reason: reason,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Usuário bloqueado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setBlockDialogOpen(false);
      setSelectedUser(null);
      setBlockReason("");
    },
    onError: () => {
      toast.error("Erro ao bloquear usuário");
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_account_management")
        .update({
          status: "active",
          blocked_at: null,
          blocked_by: null,
          blocked_reason: null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário desbloqueado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast.error("Erro ao desbloquear usuário");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Get user email first
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (!profileData) throw new Error("User not found");

      // Add to blocked emails
      const { data: authUser } = await supabase.functions.invoke("admin-get-user-email", {
        body: { userId },
      });

      if (authUser?.email) {
        await supabase.from("blocked_emails").insert({
          email: authUser.email,
          blocked_by: currentUser?.id,
          blocked_reason: "Conta excluída permanentemente",
        });
      }

      // Mark as deleted in management table
      const { data: existing } = await supabase
        .from("user_account_management")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        await supabase
          .from("user_account_management")
          .update({
            status: "deleted",
            deleted_at: new Date().toISOString(),
            deleted_by: currentUser?.id,
          })
          .eq("user_id", userId);
      } else {
        await supabase.from("user_account_management").insert({
          user_id: userId,
          status: "deleted",
          deleted_at: new Date().toISOString(),
          deleted_by: currentUser?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Usuário excluído permanentemente");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error("Erro ao excluir usuário");
    },
  });

  const toggleSubscriptionAccessMutation = useMutation({
    mutationFn: async ({ userId, enable }: { userId: string; enable: boolean }) => {
      const { data: existing } = await supabase
        .from("user_account_management")
        .select("id")
        .eq("user_id", userId)
        .single();

      const updateData = {
        can_access_subscriptions: enable,
        subscription_panel_enabled_at: enable ? new Date().toISOString() : null,
        subscription_panel_enabled_by: enable ? currentUser?.id : null,
      };

      if (existing) {
        const { error } = await supabase
          .from("user_account_management")
          .update(updateData)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_account_management").insert({
          user_id: userId,
          ...updateData,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.enable
          ? "Painel de assinaturas liberado"
          : "Painel de assinaturas bloqueado"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast.error("Erro ao alterar acesso");
    },
  });

  const bulkEnableSubscriptionsMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      for (const userId of userIds) {
        const { data: existing } = await supabase
          .from("user_account_management")
          .select("id")
          .eq("user_id", userId)
          .single();

        const updateData = {
          can_access_subscriptions: true,
          subscription_panel_enabled_at: new Date().toISOString(),
          subscription_panel_enabled_by: currentUser?.id,
        };

        if (existing) {
          await supabase
            .from("user_account_management")
            .update(updateData)
            .eq("user_id", userId);
        } else {
          await supabase.from("user_account_management").insert({
            user_id: userId,
            ...updateData,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(`Painel de assinaturas liberado para ${selectedUsers.length} usuários`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUsers([]);
    },
    onError: () => {
      toast.error("Erro ao liberar acesso em massa");
    },
  });

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users?.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users?.map((u) => u.id) || []);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "blocked":
        return <Badge variant="destructive">Bloqueado</Badge>;
      case "deleted":
        return <Badge variant="secondary">Excluído</Badge>;
      default:
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
    }
  };

  return (
    <AdminLayout title="Gestão de Usuários" description="Gerencie todos os usuários da plataforma">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            {selectedUsers.length > 0 && (
              <Button
                size="sm"
                onClick={() => bulkEnableSubscriptionsMutation.mutate(selectedUsers)}
                disabled={bulkEnableSubscriptionsMutation.isPending}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Liberar Assinaturas ({selectedUsers.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.length === users?.length && users?.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Workspaces</TableHead>
                    <TableHead>Assinaturas</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleSelectUser(user.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.full_name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status || "active")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{user.workspaces_owned} próprios</span>
                          <Users className="h-4 w-4 text-muted-foreground ml-2" />
                          <span>{user.workspaces_count} total</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.can_access_subscriptions ? (
                          <Badge className="bg-green-500">Liberado</Badge>
                        ) : (
                          <Badge variant="secondary">Bloqueado</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setUserDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleSubscriptionAccessMutation.mutate({
                                  userId: user.id,
                                  enable: !user.can_access_subscriptions,
                                })
                              }
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              {user.can_access_subscriptions
                                ? "Bloquear painel assinaturas"
                                : "Liberar painel assinaturas"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === "blocked" ? (
                              <DropdownMenuItem
                                onClick={() => unblockUserMutation.mutate(user.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Desbloquear
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBlockDialogOpen(true);
                                }}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Bloquear acesso
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir permanentemente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block User Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Usuário</DialogTitle>
            <DialogDescription>
              O usuário será desconectado imediatamente e não poderá mais acessar a plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Usuário</Label>
              <p className="text-sm text-muted-foreground">
                {selectedUser?.full_name || "Sem nome"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-reason">Motivo do bloqueio</Label>
              <Textarea
                id="block-reason"
                placeholder="Descreva o motivo do bloqueio..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedUser &&
                blockUserMutation.mutate({ userId: selectedUser.id, reason: blockReason })
              }
              disabled={blockUserMutation.isPending}
            >
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário Permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O usuário será excluído e o email será bloqueado
              para impedir a criação de uma nova conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Detail Dialog */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {selectedUser.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedUser.full_name || "Sem nome"}
                  </h3>
                  <p className="text-sm text-muted-foreground">ID: {selectedUser.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium mt-1">
                    {getStatusBadge(selectedUser.status || "active")}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Painel Assinaturas</p>
                  <p className="font-medium mt-1">
                    {selectedUser.can_access_subscriptions ? "Liberado" : "Bloqueado"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Workspaces Próprios</p>
                  <p className="font-medium mt-1">{selectedUser.workspaces_owned}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Membro de Workspaces</p>
                  <p className="font-medium mt-1">{selectedUser.workspaces_count}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-medium mt-1">
                  {format(new Date(selectedUser.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'gestor' | 'membro';
  invited_by: string | null;
  created_at: string;
}

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface UserPermissions {
  can_view_projects: boolean;
  can_view_tasks: boolean;
  can_view_positions: boolean;
  can_view_analytics: boolean;
  can_view_briefings: boolean;
  can_view_culture: boolean;
  can_view_vision: boolean;
  can_view_processes: boolean;
  can_view_inventory: boolean;
}

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaceMember: WorkspaceMember | null;
  workspaces: Workspace[];
  loading: boolean;
  isAdmin: boolean;
  isGestor: boolean;
  isMembro: boolean;
  canManageMembers: boolean;
  canCreateTasks: boolean;
  permissions: UserPermissions;
  refetchWorkspace: () => Promise<void>;
  changeWorkspace: (workspaceId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceMember, setWorkspaceMember] = useState<WorkspaceMember | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermissions>({
    can_view_projects: true,
    can_view_tasks: true,
    can_view_positions: true,
    can_view_analytics: true,
    can_view_briefings: true,
    can_view_culture: true,
    can_view_vision: true,
    can_view_processes: true,
    can_view_inventory: false,
  });

  const fetchWorkspace = async (preferredWorkspaceId?: string) => {
    if (!user) {
      setWorkspace(null);
      setWorkspaceMember(null);
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Buscar todos os memberships do usuário sem depender de RLS recursivo
      const { data: memberData, error: memberError } = await supabase
        .rpc('user_workspace_ids', { _user_id: user.id });

      if (memberError) {
        console.error("Erro ao buscar workspaces do usuário:", memberError);
        setWorkspace(null);
        setWorkspaceMember(null);
        setWorkspaces([]);
        return;
      }

      // Se não há workspaces, retornar
      if (!memberData || memberData.length === 0) {
        setWorkspace(null);
        setWorkspaceMember(null);
        setWorkspaces([]);
        return;
      }

      // Buscar memberships completos
      const wsIds = memberData.map((m: any) => m.workspace_id);
      
      const { data: fullMemberData, error: fullMemberError } = await supabase
        .from("workspace_members")
        .select("*")
        .in("workspace_id", wsIds)
        .eq("user_id", user.id);

      if (fullMemberError) {
        console.error("Erro ao buscar memberships:", fullMemberError);
        return;
      }

      if (!fullMemberData || fullMemberData.length === 0) {
        // Usuário ainda não tem workspace associado
        setWorkspace(null);
        setWorkspaceMember(null);
        setWorkspaces([]);
        return;
      }

      // Determinar workspace atual (preferido, salvo ou primeiro da lista)
      let activeWorkspaceId = preferredWorkspaceId;

      if (!activeWorkspaceId && typeof window !== "undefined") {
        const stored = window.localStorage.getItem("currentWorkspaceId");
        if (stored && fullMemberData.some((m) => m.workspace_id === stored)) {
          activeWorkspaceId = stored;
        }
      }

      if (!activeWorkspaceId) {
        activeWorkspaceId = fullMemberData[0].workspace_id;
      }

      if (typeof window !== "undefined" && activeWorkspaceId) {
        window.localStorage.setItem("currentWorkspaceId", activeWorkspaceId);
      }

      const activeMember =
        fullMemberData.find((m) => m.workspace_id === activeWorkspaceId) ||
        fullMemberData[0];

      setWorkspaceMember(activeMember);

      // Buscar informações de todos os workspaces aos quais o usuário pertence
      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", wsIds);

      if (workspacesError) {
        console.error("Erro ao buscar workspaces:", workspacesError);
        // Mesmo que não consiga carregar detalhes, mantemos o membership ativo
        setWorkspace(null);
        setWorkspaces([]);
        return;
      }

      setWorkspaces(workspacesData || []);

      const activeWorkspace =
        workspacesData?.find((w) => w.id === activeMember.workspace_id) ||
        workspacesData?.[0] ||
        null;

      setWorkspace(activeWorkspace);

      // Fetch user permissions
      if (user && activeWorkspace) {
        const { data: permissionsData } = await supabase
          .from("user_permissions")
          .select("*")
          .eq("user_id", user.id)
          .eq("workspace_id", activeWorkspace.id)
          .single();

        if (permissionsData) {
          setPermissions({
            can_view_projects: permissionsData.can_view_projects,
            can_view_tasks: permissionsData.can_view_tasks,
            can_view_positions: permissionsData.can_view_positions,
            can_view_analytics: permissionsData.can_view_analytics,
            can_view_briefings: permissionsData.can_view_briefings,
            can_view_culture: permissionsData.can_view_culture,
            can_view_vision: permissionsData.can_view_vision,
            can_view_processes: permissionsData.can_view_processes,
            can_view_inventory: permissionsData.can_view_inventory || (isAdmin || isGestor),
          });
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar workspace:", error);
      toast.error("Erro ao carregar workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
    
    // Subscribe to workspace_members changes for real-time updates
    if (!user) return;

    const channel = supabase
      .channel('workspace-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Workspace membership changed, refetching...');
          fetchWorkspace();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const changeWorkspace = async (workspaceId: string) => {
    await fetchWorkspace(workspaceId);
  };

  const isAdmin = workspaceMember?.role === 'admin';
  const isGestor = workspaceMember?.role === 'gestor';
  const isMembro = workspaceMember?.role === 'membro';
  const canManageMembers = isAdmin;
  const canCreateTasks = isAdmin || isGestor;

  // Log para debug
  console.log('WorkspaceContext - Role info:', {
    workspaceId: workspace?.id,
    workspaceName: workspace?.name,
    memberId: workspaceMember?.id,
    role: workspaceMember?.role,
    isAdmin,
    isGestor,
    isMembro
  });

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaceMember,
        workspaces,
        loading,
        isAdmin,
        isGestor,
        isMembro,
        canManageMembers,
        canCreateTasks,
        permissions,
        refetchWorkspace: fetchWorkspace,
        changeWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};

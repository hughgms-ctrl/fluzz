import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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
  isAdminView?: boolean; // Flag to indicate admin view workspace
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
  can_view_ai: boolean;
  can_view_workload: boolean;
}

interface AdminViewSession {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  expires_at: string;
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
  isAdminViewMode: boolean;
  adminViewWorkspaces: Workspace[];
  refetchWorkspace: () => Promise<void>;
  changeWorkspace: (workspaceId: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceMember, setWorkspaceMember] = useState<WorkspaceMember | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [adminViewWorkspaces, setAdminViewWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminViewMode, setIsAdminViewMode] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>({
    can_view_projects: false,
    can_view_tasks: false,
    can_view_positions: false,
    can_view_analytics: false,
    can_view_briefings: false,
    can_view_culture: false,
    can_view_vision: false,
    can_view_processes: false,
    can_view_inventory: false,
    can_view_ai: false,
    can_view_workload: false,
  });

  // Check for active admin view sessions (can be multiple)
  const fetchAdminViewSessions = useCallback(async (): Promise<{ sessions: AdminViewSession[], workspaces: Workspace[] }> => {
    if (!user) return { sessions: [], workspaces: [] };

    try {
      // First, fetch admin view sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("admin_view_sessions")
        .select("id, workspace_id, expires_at")
        .eq("admin_user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("started_at", { ascending: false });

      if (sessionsError) {
        console.error("Error fetching admin view sessions:", sessionsError);
        return { sessions: [], workspaces: [] };
      }

      if (!sessionsData || sessionsData.length === 0) {
        return { sessions: [], workspaces: [] };
      }

      // Use RPC function to fetch workspaces that admin can access
      const workspaceIds = sessionsData.map(s => s.workspace_id);
      
      // Fetch workspaces directly - the can_access_workspace function in DB should allow this
      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds);

      if (workspacesError) {
        console.error("Error fetching admin workspaces:", workspacesError);
        // Return sessions anyway, we'll handle missing workspace names
      }

      const workspacesMap = new Map((workspacesData || []).map(w => [w.id, w]));

      const sessions = sessionsData.map(session => ({
        id: session.id,
        workspace_id: session.workspace_id,
        workspace_name: workspacesMap.get(session.workspace_id)?.name || "Workspace",
        expires_at: session.expires_at,
      }));

      const workspaces = (workspacesData || []).map(ws => ({
        ...ws,
        isAdminView: true,
      }));

      return { sessions, workspaces };
    } catch (err) {
      console.error("Error fetching admin view sessions:", err);
      return { sessions: [], workspaces: [] };
    }
  }, [user]);

  const fetchWorkspace = async (preferredWorkspaceId?: string) => {
    if (!user) {
      setWorkspace(null);
      setWorkspaceMember(null);
      setWorkspaces([]);
      setAdminViewWorkspaces([]);
      setLoading(false);
      setIsAdminViewMode(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch admin view sessions to add to workspace list
      const { sessions: adminSessions, workspaces: adminWsFromSessions } = await fetchAdminViewSessions();
      
      // Use workspaces directly from the fetch function
      const adminWorkspacesList = adminWsFromSessions;
      
      setAdminViewWorkspaces(adminWorkspacesList);

      // Buscar todos os memberships do usuário sem depender de RLS recursivo
      const { data: memberData, error: memberError } = await supabase
        .rpc('user_workspace_ids', { _user_id: user.id });

      if (memberError) {
        console.error("Erro ao buscar workspaces do usuário:", memberError);
        // If user has no normal workspaces but has admin sessions, use those
        if (adminWorkspacesList.length > 0 && preferredWorkspaceId) {
          const adminWs = adminWorkspacesList.find(w => w.id === preferredWorkspaceId);
          if (adminWs) {
            setWorkspace(adminWs);
            setWorkspaces(adminWorkspacesList);
            setWorkspaceMember({
              id: 'admin-view-session',
              workspace_id: adminWs.id,
              user_id: user.id,
              role: 'admin',
              invited_by: null,
              created_at: new Date().toISOString(),
            });
            setIsAdminViewMode(true);
            setPermissions({
              can_view_projects: true,
              can_view_tasks: true,
              can_view_positions: true,
              can_view_analytics: true,
              can_view_briefings: true,
              can_view_culture: true,
              can_view_vision: true,
              can_view_processes: true,
              can_view_inventory: true,
              can_view_ai: true,
              can_view_workload: true,
            });
            setLoading(false);
            return;
          }
        }
        setWorkspace(null);
        setWorkspaceMember(null);
        setWorkspaces(adminWorkspacesList);
        return;
      }

      // Se não há workspaces normais, verificar se há admin sessions
      if (!memberData || memberData.length === 0) {
        if (adminWorkspacesList.length > 0) {
          // Use admin workspaces if available
          const targetWs = preferredWorkspaceId 
            ? adminWorkspacesList.find(w => w.id === preferredWorkspaceId) || adminWorkspacesList[0]
            : adminWorkspacesList[0];
          
          setWorkspace(targetWs);
          setWorkspaces(adminWorkspacesList);
          setWorkspaceMember({
            id: 'admin-view-session',
            workspace_id: targetWs.id,
            user_id: user.id,
            role: 'admin',
            invited_by: null,
            created_at: new Date().toISOString(),
          });
          setIsAdminViewMode(true);
          setPermissions({
            can_view_projects: true,
            can_view_tasks: true,
            can_view_positions: true,
            can_view_analytics: true,
            can_view_briefings: true,
            can_view_culture: true,
            can_view_vision: true,
            can_view_processes: true,
            can_view_inventory: true,
            can_view_ai: true,
            can_view_workload: true,
          });
          setLoading(false);
          return;
        }
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
        setWorkspace(null);
        setWorkspaceMember(null);
        setWorkspaces(adminWorkspacesList);
        return;
      }

      // Buscar informações de todos os workspaces normais
      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", wsIds);

      if (workspacesError) {
        console.error("Erro ao buscar workspaces:", workspacesError);
        setWorkspace(null);
        setWorkspaces(adminWorkspacesList);
        return;
      }

      // Combine normal workspaces with admin view workspaces (avoid duplicates)
      const normalWorkspaces = (workspacesData || []).map(ws => ({ ...ws, isAdminView: false }));
      const combinedWorkspaces = [
        ...normalWorkspaces,
        ...adminWorkspacesList.filter(aws => !normalWorkspaces.some(nw => nw.id === aws.id))
      ];

      setWorkspaces(combinedWorkspaces);

      // Determinar workspace atual
      let activeWorkspaceId = preferredWorkspaceId;

      if (!activeWorkspaceId && typeof window !== "undefined") {
        const stored = window.localStorage.getItem("currentWorkspaceId");
        if (stored && combinedWorkspaces.some((w) => w.id === stored)) {
          activeWorkspaceId = stored;
        }
      }

      if (!activeWorkspaceId) {
        activeWorkspaceId = fullMemberData[0]?.workspace_id || combinedWorkspaces[0]?.id;
      }

      if (typeof window !== "undefined" && activeWorkspaceId) {
        window.localStorage.setItem("currentWorkspaceId", activeWorkspaceId);
      }

      // Check if selected workspace is an admin view workspace
      const isAdminViewWorkspace = adminWorkspacesList.some(aws => aws.id === activeWorkspaceId);
      
      if (isAdminViewWorkspace) {
        const adminWs = adminWorkspacesList.find(aws => aws.id === activeWorkspaceId)!;
        setWorkspace(adminWs);
        setWorkspaceMember({
          id: 'admin-view-session',
          workspace_id: adminWs.id,
          user_id: user.id,
          role: 'admin',
          invited_by: null,
          created_at: new Date().toISOString(),
        });
        setIsAdminViewMode(true);
        setPermissions({
          can_view_projects: true,
          can_view_tasks: true,
          can_view_positions: true,
          can_view_analytics: true,
          can_view_briefings: true,
          can_view_culture: true,
          can_view_vision: true,
          can_view_processes: true,
          can_view_inventory: true,
          can_view_ai: true,
          can_view_workload: true,
        });
        setLoading(false);
        return;
      }

      // Normal workspace flow
      setIsAdminViewMode(false);
      
      const activeMember =
        fullMemberData.find((m) => m.workspace_id === activeWorkspaceId) ||
        fullMemberData[0];

      setWorkspaceMember(activeMember);

      const activeWorkspace =
        combinedWorkspaces?.find((w) => w.id === activeMember.workspace_id) ||
        combinedWorkspaces?.[0] ||
        null;

      setWorkspace(activeWorkspace);

      // Fetch user permissions
      if (user && activeWorkspace) {
        const isAdminOrGestor = activeMember.role === 'admin' || activeMember.role === 'gestor';
        
        // Always fetch permissions from DB to respect user preferences
        const { data: permissionsData } = await supabase
          .from("user_permissions")
          .select("*")
          .eq("user_id", user.id)
          .eq("workspace_id", activeWorkspace.id)
          .single();

        if (permissionsData) {
          // For admins/gestors: default to true, but respect explicit false
          if (isAdminOrGestor) {
            setPermissions({
              can_view_projects: permissionsData.can_view_projects !== false,
              can_view_tasks: permissionsData.can_view_tasks !== false,
              can_view_positions: permissionsData.can_view_positions !== false,
              can_view_analytics: permissionsData.can_view_analytics !== false,
              can_view_briefings: permissionsData.can_view_briefings !== false,
              can_view_culture: permissionsData.can_view_culture !== false,
              can_view_vision: permissionsData.can_view_vision !== false,
              can_view_processes: permissionsData.can_view_processes !== false,
              can_view_inventory: permissionsData.can_view_inventory !== false,
              can_view_ai: permissionsData.can_view_ai !== false,
              can_view_workload: permissionsData.can_view_workload !== false,
            });
          } else {
            // For regular members: require explicit true
            setPermissions({
              can_view_projects: permissionsData.can_view_projects,
              can_view_tasks: permissionsData.can_view_tasks,
              can_view_positions: permissionsData.can_view_positions,
              can_view_analytics: permissionsData.can_view_analytics,
              can_view_briefings: permissionsData.can_view_briefings,
              can_view_culture: permissionsData.can_view_culture,
              can_view_vision: permissionsData.can_view_vision,
              can_view_processes: permissionsData.can_view_processes,
              can_view_inventory: permissionsData.can_view_inventory ?? false,
              can_view_ai: permissionsData.can_view_ai ?? false,
              can_view_workload: permissionsData.can_view_workload ?? false,
            });
          }
        } else {
          // No permissions record - admins/gestors get full access, members get none
          if (isAdminOrGestor) {
            setPermissions({
              can_view_projects: true,
              can_view_tasks: true,
              can_view_positions: true,
              can_view_analytics: true,
              can_view_briefings: true,
              can_view_culture: true,
              can_view_vision: true,
              can_view_processes: true,
              can_view_inventory: true,
              can_view_ai: true,
              can_view_workload: true,
            });
          } else {
            setPermissions({
              can_view_projects: false,
              can_view_tasks: false,
              can_view_positions: false,
              can_view_analytics: false,
              can_view_briefings: false,
              can_view_culture: false,
              can_view_vision: false,
              can_view_processes: false,
              can_view_inventory: false,
              can_view_ai: false,
              can_view_workload: false,
            });
          }
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
  const canManageMembers = isAdmin || isGestor;
  const canCreateTasks = isAdmin || isGestor;

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaceMember,
        workspaces,
        loading,
        isAdmin: isAdminViewMode || isAdmin,
        isGestor: isAdminViewMode || isGestor,
        isMembro,
        canManageMembers: isAdminViewMode || canManageMembers,
        canCreateTasks: isAdminViewMode || canCreateTasks,
        permissions,
        isAdminViewMode,
        adminViewWorkspaces,
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

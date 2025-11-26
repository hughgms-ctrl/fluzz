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
      // Buscar todos os memberships do usuário
      const { data: memberData, error: memberError } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("user_id", user.id);

      if (memberError) {
        console.error("Erro ao buscar membro do workspace:", memberError);
        return;
      }

      if (!memberData || memberData.length === 0) {
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
        if (stored && memberData.some((m) => m.workspace_id === stored)) {
          activeWorkspaceId = stored;
        }
      }

      if (!activeWorkspaceId) {
        activeWorkspaceId = memberData[0].workspace_id;
      }

      if (typeof window !== "undefined" && activeWorkspaceId) {
        window.localStorage.setItem("currentWorkspaceId", activeWorkspaceId);
      }

      const activeMember =
        memberData.find((m) => m.workspace_id === activeWorkspaceId) ||
        memberData[0];

      setWorkspaceMember(activeMember);

      // Buscar informações de todos os workspaces aos quais o usuário pertence
      const workspaceIds = memberData.map((m) => m.workspace_id);

      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds);

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
    } catch (error: any) {
      console.error("Erro ao carregar workspace:", error);
      toast.error("Erro ao carregar workspace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [user]);

  const changeWorkspace = async (workspaceId: string) => {
    await fetchWorkspace(workspaceId);
  };

  const isAdmin = workspaceMember?.role === 'admin';
  const isGestor = workspaceMember?.role === 'gestor';
  const isMembro = workspaceMember?.role === 'membro';
  const canManageMembers = isAdmin;
  const canCreateTasks = isAdmin || isGestor;

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

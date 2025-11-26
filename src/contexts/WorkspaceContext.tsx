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
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceMember, setWorkspaceMember] = useState<WorkspaceMember | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspace = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Buscar workspace do usuário
      const { data: memberData, error: memberError } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (memberError) {
        console.error("Erro ao buscar membro do workspace:", memberError);
        setLoading(false);
        return;
      }

      setWorkspaceMember(memberData);

      // Buscar informações do workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", memberData.workspace_id)
        .single();

      if (workspaceError) throw workspaceError;

      setWorkspace(workspaceData);

      // Buscar todos os workspaces (se for admin)
      if (memberData.role === 'admin') {
        const { data: allWorkspaces, error: workspacesError } = await supabase
          .from("workspaces")
          .select("*")
          .order("created_at", { ascending: false });

        if (workspacesError) throw workspacesError;
        setWorkspaces(allWorkspaces || []);
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
  }, [user]);

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

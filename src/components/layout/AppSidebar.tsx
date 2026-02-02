import { Home, FolderKanban, CheckSquare, User, LogOut, Briefcase, Heart, Target, FileText, BarChart3, Users, Building2, Eye, BookOpen, Package, Bot, Layers, StickyNote, GitBranch } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useViewMode } from "@/hooks/useViewMode";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permission?: string | null;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { title: "Home", url: "/home", icon: Home },
  { title: "Workspace", url: "/workspace", icon: Briefcase },
  { title: "Fluzz AI", url: "/ai-assistant", icon: Bot, permission: "can_view_ai" },
  { title: "Projetos", url: "/projects", icon: FolderKanban, permission: "can_view_projects" },
  { title: "Minhas Tarefas", url: "/my-tasks", icon: CheckSquare, permission: "can_view_tasks" },
  { title: "Workload View", url: "/workload", icon: Layers, permission: "can_view_workload" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, permission: "can_view_analytics" },
];

const workspaceItems: MenuItem[] = [
  { title: "POP's", url: "/workspace/processes", icon: BookOpen, permission: "can_view_processes" },
  { title: "Fluxos", url: "/workspace/flows", icon: GitBranch, permission: "can_view_flows" },
  { title: "Notas", url: "/workspace/notes", icon: StickyNote, permission: "can_view_notes" },
  { title: "Equipe", url: "/team", icon: Users, adminOnly: true },
  { title: "Setores", url: "/positions", icon: Briefcase, permission: "can_view_positions" },
  { title: "Inventário", url: "/inventory", icon: Package, permission: "can_view_inventory" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const { permissions, isAdmin, isGestor, workspace } = useWorkspace();
  const { viewMode } = useViewMode();

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    if (path === "/workspace") return location.pathname === "/workspace";
    return location.pathname.startsWith(path);
  };

  const canViewItem = (item: MenuItem) => {
    // Items that require admin/gestor role (like Team management)
    if (item.adminOnly && !isAdmin && !isGestor) return false;
    
    // Items without permission requirement are always visible
    if (!item.permission) return true;
    
    // ALL users must check the explicit permission value from DB
    const permissionKey = item.permission as keyof typeof permissions;
    return permissions[permissionKey] === true;
  };

  const isFocusMode = viewMode === "focus";
  const activeProjectId = new URLSearchParams(location.search).get("projectId");

  const canViewFocusTasks = canViewItem({
    title: "Minhas Tarefas",
    url: "/my-tasks",
    icon: CheckSquare,
    permission: "can_view_tasks",
  });

  const canViewFocusProjects = canViewItem({
    title: "Projetos",
    url: "/projects",
    icon: FolderKanban,
    permission: "can_view_projects",
  });

  const { data: focusProjects = [] } = useQuery({
    queryKey: ["focus-projects", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("workspace_id", workspace.id)
        .eq("archived", false)
        .eq("is_standalone_folder", false)
        .neq("pending_notifications", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: isFocusMode && canViewFocusProjects && !!workspace?.id,
  });

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"}>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={cn("text-xs uppercase tracking-wider font-medium", isCollapsed && "text-center")}>
            {isFocusMode ? "Foco" : "Menu Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isFocusMode ? (
                canViewFocusTasks ? (
                  <SidebarMenuItem key="focus-tasks">
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/my-tasks"
                        end
                        className="hover:bg-sidebar-accent/50 transition-all duration-200 rounded-lg"
                        activeClassName="bg-primary/15 text-primary font-medium"
                      >
                        <CheckSquare className={cn("transition-all duration-200", isCollapsed ? "mx-auto" : "mr-3")} size={18} />
                        {!isCollapsed && <span className="text-sm">Minhas Tarefas</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null
              ) : (
                menuItems.filter(canViewItem).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/home" || item.url === "/workspace"}
                        className="hover:bg-sidebar-accent/50 transition-all duration-200 rounded-lg"
                        activeClassName="bg-primary/15 text-primary font-medium"
                      >
                        <item.icon className={cn("transition-all duration-200", isCollapsed ? "mx-auto" : "mr-3")} size={18} />
                        {!isCollapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isFocusMode ? (
          canViewFocusProjects ? (
            <SidebarGroup>
              <SidebarGroupLabel className={cn("text-xs uppercase tracking-wider font-medium", isCollapsed && "text-center")}>
                Projetos
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {focusProjects.map((project: any) => {
                    const isActiveProject = activeProjectId === project.id;
                    return (
                      <SidebarMenuItem key={project.id}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={`/my-tasks?projectId=${project.id}`}
                            className={cn(
                              "hover:bg-sidebar-accent/50 transition-all duration-200 rounded-lg",
                              isActiveProject && "bg-primary/15 text-primary font-medium",
                            )}
                          >
                            <span className={cn("h-2 w-2 rounded-full bg-primary/70", isCollapsed ? "mx-auto" : "mr-3")} />
                            {!isCollapsed && (
                              <span className="text-sm truncate">{project.name}</span>
                            )}
                            {isCollapsed && <span className="sr-only">{project.name}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className={cn("text-xs uppercase tracking-wider font-medium", isCollapsed && "text-center")}>
              Empresa
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceItems.filter(canViewItem).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-sidebar-accent/50 transition-all duration-200 rounded-lg"
                        activeClassName="bg-primary/15 text-primary font-medium"
                      >
                        <item.icon className={cn("transition-all duration-200", isCollapsed ? "mx-auto" : "mr-3")} size={18} />
                        {!isCollapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={signOut}
                  className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-lg"
                >
                  <LogOut className={cn("transition-all duration-200", isCollapsed ? "mx-auto" : "mr-3")} size={18} />
                  {!isCollapsed && <span className="text-sm">Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

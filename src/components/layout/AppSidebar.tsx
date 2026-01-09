import { Home, FolderKanban, CheckSquare, User, LogOut, Briefcase, Heart, Target, FileText, BarChart3, Users, Building2, Eye, BookOpen, Package, Bot, Layers, StickyNote, GitBranch } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
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
  { title: "Fluzz AI", url: "/ai-assistant", icon: Bot, adminOnly: true }, // Admin only, or gestor/membro with permission
  { title: "Projetos", url: "/projects", icon: FolderKanban, permission: "can_view_projects" },
  { title: "Minhas Tarefas", url: "/my-tasks", icon: CheckSquare, permission: "can_view_tasks" },
  { title: "Workload View", url: "/workload", icon: Layers, adminOnly: true }, // Admin/gestor with team permission only
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
  const { permissions, isAdmin, isGestor } = useWorkspace();

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    if (path === "/workspace") return location.pathname === "/workspace";
    return location.pathname.startsWith(path);
  };

  const canViewItem = (item: MenuItem) => {
    // Special handling for Fluzz AI - respect user's preference (even for admins)
    if (item.url === "/ai-assistant") {
      // If permission is explicitly set to false, hide it
      if (permissions?.can_view_ai === false) return false;
      // For gestors/membros, require explicit permission
      if (!isAdmin && !isGestor) return permissions?.can_view_ai === true;
      return true;
    }
    
    // Special handling for Workload View - respect user's preference (even for admins)
    if (item.url === "/workload") {
      // If permission is explicitly set to false, hide it
      if (permissions?.can_view_workload === false) return false;
      // For gestors/membros, require explicit permission
      if (!isAdmin && !isGestor) return permissions?.can_view_workload === true;
      return true;
    }
    
    if (item.adminOnly && !isAdmin && !isGestor) return false;
    if (!item.permission) return true;
    // Admins and gestors always have full access
    if (isAdmin || isGestor) return true;
    return permissions[item.permission as keyof typeof permissions];
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"}>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={cn("text-xs uppercase tracking-wider font-medium", isCollapsed && "text-center")}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(canViewItem).map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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

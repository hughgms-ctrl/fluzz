import { Home, FolderKanban, CheckSquare, User, LogOut, Briefcase, Heart, Target, FileText, BarChart3, Users, Building2, Eye, BookOpen } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
  { title: "Workspace", url: "/", icon: Briefcase },
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Projetos", url: "/projects", icon: FolderKanban, permission: "can_view_projects" },
  { title: "Minhas Tarefas", url: "/my-tasks", icon: CheckSquare, permission: "can_view_tasks" },
  { title: "Cargos", url: "/positions", icon: Users, permission: "can_view_positions" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, permission: "can_view_analytics" },
  { title: "Perfil", url: "/profile", icon: User },
];

const workspaceItems: MenuItem[] = [
  { title: "Cultura", url: "/workspace/culture", icon: Heart, permission: "can_view_culture" },
  { title: "Visão & Valores", url: "/workspace/vision", icon: Target, permission: "can_view_vision" },
  { title: "Processos", url: "/workspace/processes", icon: BookOpen, permission: "can_view_processes" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const { permissions, isAdmin } = useWorkspace();

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const canViewItem = (item: MenuItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (!item.permission) return true;
    return permissions[item.permission as keyof typeof permissions];
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "text-center" : ""}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(canViewItem).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className={isCollapsed ? "mx-auto" : "mr-3"} size={20} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "text-center" : ""}>
            Empresa
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.filter(canViewItem).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className={isCollapsed ? "mx-auto" : "mr-3"} size={20} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut className={isCollapsed ? "mx-auto" : "mr-3"} size={20} />
                  {!isCollapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="p-4 border-t border-sidebar-border">
        <ThemeToggle />
      </div>
    </Sidebar>
  );
}

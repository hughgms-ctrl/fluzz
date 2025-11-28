import { Home, FolderKanban, CheckSquare, User, LogOut, Briefcase, Heart, Target, FileText, BarChart3, Users, Building2, Eye, BookOpen, Package } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
  adminGestorOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { title: "Home", url: "/", icon: Home },
  { title: "Workspace", url: "/workspace", icon: Briefcase },
  { title: "Projetos", url: "/projects", icon: FolderKanban, permission: "can_view_projects" },
  { title: "Minhas Tarefas", url: "/my-tasks", icon: CheckSquare, permission: "can_view_tasks" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, permission: "can_view_analytics" },
];

const workspaceItems: MenuItem[] = [
  { title: "Processos", url: "/workspace/processes", icon: BookOpen, permission: "can_view_processes" },
  { title: "Equipe", url: "/team", icon: Users, permission: "can_view_analytics", adminGestorOnly: true },
  { title: "Cargos", url: "/positions", icon: Briefcase, permission: "can_view_positions", adminGestorOnly: true },
  { title: "Inventário", url: "/inventory", icon: Package, permission: "can_view_inventory" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const { permissions, isAdmin, isGestor, isMembro } = useWorkspace();

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/workspace") return location.pathname === "/workspace";
    return location.pathname.startsWith(path);
  };

  const canViewItem = (item: MenuItem) => {
    // Log para debug
    console.log('Checking item:', item.title, {
      adminOnly: item.adminOnly,
      adminGestorOnly: item.adminGestorOnly,
      isAdmin: isAdmin,
      isGestor: isGestor,
      isMembro: isMembro,
      permission: item.permission,
      hasPermission: item.permission ? permissions[item.permission as keyof typeof permissions] : 'N/A'
    });

    if (item.adminOnly && !isAdmin) return false;
    if (item.adminGestorOnly && isMembro) return false;
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
                      end={item.url === "/" || item.url === "/workspace"}
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
    </Sidebar>
  );
}

import { Home, FolderKanban, CheckSquare, User, LogOut, Briefcase, Heart, Target, FileText, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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

const menuItems = [
  { title: "Workspace", url: "/", icon: Briefcase },
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Projetos", url: "/projects", icon: FolderKanban },
  { title: "Minhas Tarefas", url: "/my-tasks", icon: CheckSquare },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Perfil", url: "/profile", icon: User },
];

const workspaceItems = [
  { title: "Cultura", url: "/workspace/culture", icon: Heart },
  { title: "Visão & Valores", url: "/workspace/vision", icon: Target },
  { title: "Processos", url: "/workspace/processes", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();

  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
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
              {menuItems.map((item) => (
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
              {workspaceItems.map((item) => (
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
import { useLocation, useNavigate } from "react-router-dom";
import { FolderKanban, CheckSquare, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: FolderKanban, path: "/projects", label: "Projetos" },
  { icon: CheckSquare, path: "/my-tasks", label: "Tarefas", isMain: true },
  { icon: Home, path: "/home", label: "Home" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = currentPath === item.path || 
            (item.path === "/projects" && currentPath.startsWith("/projects"));
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-w-[72px] transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground",
                item.isMain && "relative"
              )}
            >
              <div className={cn(
                "flex items-center justify-center",
                item.isMain && isActive && "bg-primary/10 rounded-full p-1.5 -mt-1"
              )}>
                <item.icon className={cn(
                  "h-5 w-5",
                  item.isMain && isActive && "h-6 w-6"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                item.isMain && isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { BookOpen, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";

interface Section {
  id: string;
  title: string;
  content_type: string;
}

interface GettingStartedSidebarProps {
  sections: Section[];
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  canEdit: boolean;
  onCreateSection: () => void;
}

export function GettingStartedSidebar({
  sections,
  selectedSectionId,
  onSelectSection,
  canEdit,
  onCreateSection,
}: GettingStartedSidebarProps) {
  const { open } = useSidebar();

  return (
    <Sidebar className={open ? "w-64" : "w-14"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-2">
            {open && <SidebarGroupLabel>Seções</SidebarGroupLabel>}
            {canEdit && open && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onCreateSection}
                className="h-6 w-6 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => (
                <SidebarMenuItem key={section.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectSection(section.id)}
                    isActive={selectedSectionId === section.id}
                    className="hover:bg-muted/50"
                  >
                    <BookOpen className="h-4 w-4" />
                    {open && <span className="truncate">{section.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  return (
    <aside className="w-64 border-r bg-card flex-shrink-0 hidden md:flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg">Seções</h2>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCreateSection}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                selectedSectionId === section.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted/50"
              }`}
            >
              <BookOpen className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-left">{section.title}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

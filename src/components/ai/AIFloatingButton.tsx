import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AIChatPanel } from "./AIChatPanel";
import { cn } from "@/lib/utils";

interface AIFloatingButtonProps {
  className?: string;
}

export function AIFloatingButton({ className }: AIFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
          "bg-primary hover:bg-primary/90",
          className
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[450px] p-0">
          <AIChatPanel onClose={() => setIsOpen(false)} showCloseButton />
        </SheetContent>
      </Sheet>
    </>
  );
}

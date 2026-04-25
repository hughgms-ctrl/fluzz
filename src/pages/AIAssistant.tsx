import { AIChatPanel } from "@/components/ai/AIChatPanel";
import { AIConfigPanel } from "@/components/ai/AIConfigPanel";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Settings } from "lucide-react";

export default function AIAssistant() {
  return (
    <AppLayout>
      <Tabs defaultValue="chat" className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="border-b px-4 pt-3">
          <TabsList>
            <TabsTrigger value="chat" className="gap-2">
              <Bot className="h-4 w-4" />
              Conversa
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
          <AIChatPanel className="h-full" />
        </TabsContent>

        <TabsContent value="config" className="flex-1 overflow-auto mt-0">
          <AIConfigPanel />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

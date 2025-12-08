import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CreateInventoryItemDialog } from "@/components/inventory/CreateInventoryItemDialog";
import { CreateInventoryEventDialog } from "@/components/inventory/CreateInventoryEventDialog";
import { InventoryItemCard } from "@/components/inventory/InventoryItemCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateBR } from "@/lib/utils";

export default function Inventory() {
  const { workspace } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["inventory-events", workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_events")
        .select("*")
        .eq("workspace_id", workspace?.id!)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory-items", workspace?.id, selectedEvent, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select("*, inventory_events(name)")
        .eq("workspace_id", workspace?.id!);
      
      if (selectedEvent && selectedEvent !== "all") {
        query = query.eq("event_id", selectedEvent);
      }
      
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!workspace?.id,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventário</h1>
          <p className="text-muted-foreground">
            Gerencie materiais, controle estoque e organize por eventos
          </p>
        </div>
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="items">
              <Package className="h-4 w-4 mr-2" />
              Materiais
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="h-4 w-4 mr-2" />
              Eventos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2 md:flex-row md:gap-4 flex-1">
                <Input
                  placeholder="Buscar material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="md:w-64"
                />
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="md:w-48">
                    <SelectValue placeholder="Filtrar por evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eventos</SelectItem>
                    {events?.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setCreateItemOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Material
              </Button>
            </div>

            {itemsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : !items || items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum material cadastrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <InventoryItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCreateEventOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </div>

            {eventsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : !events || events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum evento cadastrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{event.name}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                        {event.date && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Data: {formatDateBR(event.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateInventoryItemDialog
        open={createItemOpen}
        onOpenChange={setCreateItemOpen}
      />
      <CreateInventoryEventDialog
        open={createEventOpen}
        onOpenChange={setCreateEventOpen}
      />
    </AppLayout>
  );
}

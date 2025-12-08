import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, History, Trash2 } from "lucide-react";
import { RegisterMovementDialog } from "./RegisterMovementDialog";
import { MovementHistoryDialog } from "./MovementHistoryDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InventoryItemCardProps {
  item: any;
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"entrada" | "saida">("entrada");
  const [historyOpen, setHistoryOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleMovement = (type: "entrada" | "saida") => {
    setMovementType(type);
    setMovementOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Item excluído com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir item");
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">{item.name}</span>
            <Badge variant={item.quantity > 0 ? "default" : "destructive"}>
              {item.quantity} {item.unit}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {item.description && (
            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
          )}
          {item.inventory_events && (
            <p className="text-xs text-muted-foreground">
              Evento: {item.inventory_events.name}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <div className="flex gap-2 flex-1 min-w-0">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleMovement("entrada")}
            >
              <ArrowUp className="h-4 w-4 mr-1" />
              Entrada
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => handleMovement("saida")}
            >
              <ArrowDown className="h-4 w-4 mr-1" />
              Saída
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir item</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir "{item.name}"? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>

      <RegisterMovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        itemId={item.id}
        itemName={item.name}
        type={movementType}
      />

      <MovementHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        itemId={item.id}
        itemName={item.name}
      />
    </>
  );
}

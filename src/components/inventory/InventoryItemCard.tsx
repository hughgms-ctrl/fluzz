import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, History } from "lucide-react";
import { RegisterMovementDialog } from "./RegisterMovementDialog";
import { MovementHistoryDialog } from "./MovementHistoryDialog";

interface InventoryItemCardProps {
  item: any;
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"entrada" | "saida">("entrada");
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleMovement = (type: "entrada" | "saida") => {
    setMovementType(type);
    setMovementOpen(true);
  };

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
        <CardFooter className="flex gap-2">
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-4 w-4" />
          </Button>
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

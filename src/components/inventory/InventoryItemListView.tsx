import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, History } from "lucide-react";
import { useState } from "react";
import { RegisterMovementDialog } from "./RegisterMovementDialog";
import { MovementHistoryDialog } from "./MovementHistoryDialog";

interface InventoryItemListViewProps {
  items: any[];
}

export function InventoryItemListView({ items }: InventoryItemListViewProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [movementType, setMovementType] = useState<"entrada" | "saida">("entrada");
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const handleMovement = (item: any, type: "entrada" | "saida") => {
    setSelectedItem(item);
    setMovementType(type);
    setMovementDialogOpen(true);
  };

  const handleHistory = (item: any) => {
    setSelectedItem(item);
    setHistoryDialogOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-semibold">{item.quantity}</span>
              </TableCell>
              <TableCell>{item.unit}</TableCell>
              <TableCell>
                {item.inventory_events?.name || "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMovement(item, "entrada")}
                    title="Entrada"
                  >
                    <ArrowDownToLine className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMovement(item, "saida")}
                    title="Saída"
                  >
                    <ArrowUpFromLine className="h-4 w-4 text-red-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleHistory(item)}
                    title="Histórico"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedItem && (
        <>
          <RegisterMovementDialog
            open={movementDialogOpen}
            onOpenChange={setMovementDialogOpen}
            itemId={selectedItem.id}
            itemName={selectedItem.name}
            type={movementType}
          />
          <MovementHistoryDialog
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
            itemId={selectedItem.id}
            itemName={selectedItem.name}
          />
        </>
      )}
    </>
  );
}

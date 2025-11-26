import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Calendar } from "lucide-react"

const mockOrders = [
  {
    id: "1",
    storeName: "Super Estrella",
    date: "Hoy, 10:30 AM",
    items: 12,
    total: 2450.0,
    status: "completed",
  },
  {
    id: "2",
    storeName: "Tienda El Sol",
    date: "Ayer, 2:15 PM",
    items: 8,
    total: 1820.0,
    status: "completed",
  },
  {
    id: "3",
    storeName: "Abarrotes La Luna",
    date: "Hace 2 días, 11:00 AM",
    items: 15,
    total: 3200.0,
    status: "completed",
  },
]

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mis Pedidos</h1>
            <p className="text-sm text-muted-foreground">Historial de visitas</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {mockOrders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{order.storeName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{order.date}</p>
                  </div>
                </div>
                <Badge className="bg-accent/10 text-accent">
                  {order.status === "completed" ? "Completado" : "Pendiente"}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="text-sm text-muted-foreground">{order.items} productos</div>
                <div className="text-lg font-bold text-primary">${order.total.toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Navigation } from "lucide-react"
import { Link } from "react-router-dom"

const mockStores = [
  {
    id: "1",
    name: "Tienda El Sol",
    address: "Av. Principal 123, Col. Centro",
    city: "CDMX",
    frequency: "Diario",
    lastVisit: "Ayer",
    status: "pending",
    distance: "0.8 km",
  },
  {
    id: "2",
    name: "Abarrotes La Luna",
    address: "Calle Secundaria 456, Col. Norte",
    city: "CDMX",
    frequency: "Semanal",
    lastVisit: "Hace 3 días",
    status: "pending",
    distance: "1.2 km",
  },
  {
    id: "3",
    name: "Super Estrella",
    address: "Av. Libertad 789, Col. Sur",
    city: "CDMX",
    frequency: "Diario",
    lastVisit: "Hoy",
    status: "completed",
    distance: "2.1 km",
  },
  {
    id: "4",
    name: "Tienda El Cometa",
    address: "Calle Mayor 321, Col. Este",
    city: "CDMX",
    frequency: "Quincenal",
    lastVisit: "Hace 5 días",
    status: "pending",
    distance: "3.5 km",
  },
]

export function RouteList() {
  return (
    <div className="p-4 space-y-3">
      {mockStores.map((store) => (
        <Card key={store.id} className={store.status === "completed" ? "opacity-60" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{store.name}</h3>
                  {store.status === "completed" && (
                    <Badge variant="secondary" className="bg-accent/10 text-accent">
                      Visitada
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{store.city}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Navigation className="h-3 w-3" />
                  {store.distance}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{store.address}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{store.frequency}</span>
                </div>
                <span>Última visita: {store.lastVisit}</span>
              </div>
            </div>

            {store.status === "pending" ? (
              <Link to={`/driver/scan?storeId=${store.id}`}>
                <Button className="w-full h-12 gap-2">
                  <MapPin className="h-5 w-5" />
                  Visitar Tienda
                </Button>
              </Link>
            ) : (
              <Button variant="outline" className="w-full h-12 bg-transparent" disabled>
                Visita Completada
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

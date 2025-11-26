import { RouteList } from "@/components/driver/RouteList"
import { MapPin } from "lucide-react"

export default function DriverDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mi Ruta</h1>
            <p className="text-sm text-muted-foreground">8 tiendas asignadas</p>
          </div>
        </div>
      </div>
      <RouteList />
    </div>
  )
}

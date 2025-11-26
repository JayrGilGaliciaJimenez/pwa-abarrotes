import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, CheckCircle, Package } from "lucide-react"

interface Store {
  id: string
  name: string
  address: string
  city: string
  phone: string
  lat: number
  lng: number
}

interface StoreInfoProps {
  store: Store
  onStartOrder: () => void
}

export function StoreInfo({ store, onStartOrder }: StoreInfoProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full">
            <CheckCircle className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Escaneo Exitoso</h1>
            <p className="text-sm text-muted-foreground">Información de la tienda</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-4">{store.name}</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Dirección</p>
                  <p className="text-sm text-muted-foreground">{store.address}</p>
                  <p className="text-sm text-muted-foreground">{store.city}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-sm text-muted-foreground">{store.phone}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full"></div>
                  <span className="text-muted-foreground">
                    Ubicación verificada: {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full h-16 gap-3 text-lg" onClick={onStartOrder}>
          <Package className="h-6 w-6" />
          Levantar Pedido
        </Button>
      </div>
    </div>
  )
}

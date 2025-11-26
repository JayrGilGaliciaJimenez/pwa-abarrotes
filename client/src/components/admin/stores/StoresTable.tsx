import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, MapPin, Search } from "lucide-react"
import { Link } from "react-router-dom"

// Mock data
const mockStores = [
  { id: "1", name: "Tienda El Sol", address: "Av. Principal 123, Col. Centro", phone: "555-0101", city: "CDMX" },
  { id: "2", name: "Abarrotes La Luna", address: "Calle Secundaria 456, Col. Norte", phone: "555-0102", city: "CDMX" },
  { id: "3", name: "Super Estrella", address: "Av. Libertad 789, Col. Sur", phone: "555-0103", city: "Guadalajara" },
  { id: "4", name: "Tienda El Cometa", address: "Calle Mayor 321, Col. Este", phone: "555-0104", city: "Monterrey" },
]

export function StoresTable() {
  const [search, setSearch] = useState("")
  const [stores] = useState(mockStores)

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.address.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tiendas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="p-4 font-semibold text-sm">Nombre</th>
                    <th className="p-4 font-semibold text-sm">Dirección</th>
                    <th className="p-4 font-semibold text-sm">Ciudad</th>
                    <th className="p-4 font-semibold text-sm">Teléfono</th>
                    <th className="p-4 font-semibold text-sm text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store) => (
                    <tr key={store.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="p-4">
                        <div className="font-medium">{store.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {store.address}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{store.city}</td>
                      <td className="p-4 text-sm">{store.phone}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/admin/stores/${store.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredStores.map((store) => (
          <Card key={store.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{store.name}</h3>
                  <p className="text-sm text-muted-foreground">{store.city}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/stores/${store.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{store.address}</span>
                </div>
                <div className="text-muted-foreground">Tel: {store.phone}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

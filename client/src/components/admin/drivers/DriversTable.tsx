import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Mail, Phone, Search } from "lucide-react"
import { Link } from "react-router-dom"

const mockDrivers = [
  { id: "1", name: "Juan Pérez", email: "juan@abarrotes.com", phone: "555-1001", status: "Activo", stores: 8 },
  { id: "2", name: "María González", email: "maria@abarrotes.com", phone: "555-1002", status: "Activo", stores: 6 },
  { id: "3", name: "Carlos Ruiz", email: "carlos@abarrotes.com", phone: "555-1003", status: "Activo", stores: 10 },
  { id: "4", name: "Ana Martínez", email: "ana@abarrotes.com", phone: "555-1004", status: "Inactivo", stores: 0 },
]

export function DriversTable() {
  const [search, setSearch] = useState("")
  const [drivers] = useState(mockDrivers)

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(search.toLowerCase()) ||
      driver.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar repartidores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="p-4 font-semibold text-sm">Nombre</th>
                  <th className="p-4 font-semibold text-sm">Contacto</th>
                  <th className="p-4 font-semibold text-sm">Tiendas Asignadas</th>
                  <th className="p-4 font-semibold text-sm">Estado</th>
                  <th className="p-4 font-semibold text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">{driver.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {driver.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {driver.phone}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{driver.stores} tiendas</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          driver.status === "Activo" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {driver.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/drivers/${driver.id}/edit`}>
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
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredDrivers.map((driver) => (
          <Card key={driver.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{driver.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${
                      driver.status === "Activo" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {driver.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/drivers/${driver.id}/edit`}>
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
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {driver.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {driver.phone}
                </div>
                <div className="text-muted-foreground pt-2">{driver.stores} tiendas asignadas</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

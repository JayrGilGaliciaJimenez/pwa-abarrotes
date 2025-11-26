import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Store, Calendar } from "lucide-react"

const mockDrivers = [
  { id: "1", name: "Juan Pérez" },
  { id: "2", name: "María González" },
  { id: "3", name: "Carlos Ruiz" },
]

const mockStores = [
  { id: "1", name: "Tienda El Sol", address: "Av. Principal 123" },
  { id: "2", name: "Abarrotes La Luna", address: "Calle Secundaria 456" },
  { id: "3", name: "Super Estrella", address: "Av. Libertad 789" },
  { id: "4", name: "Tienda El Cometa", address: "Calle Mayor 321" },
]

const frequencies = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
]

type Assignment = {
  id: string
  storeId: string
  storeName: string
  storeAddress: string
  frequency: string
  frequencyLabel: string
}

export function AssignmentManager() {
  const [selectedDriver, setSelectedDriver] = useState<string>("")
  const [selectedStore, setSelectedStore] = useState<string>("")
  const [selectedFrequency, setSelectedFrequency] = useState<string>("")
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: "1",
      storeId: "1",
      storeName: "Tienda El Sol",
      storeAddress: "Av. Principal 123",
      frequency: "weekly",
      frequencyLabel: "Semanal",
    },
    {
      id: "2",
      storeId: "2",
      storeName: "Abarrotes La Luna",
      storeAddress: "Calle Secundaria 456",
      frequency: "daily",
      frequencyLabel: "Diario",
    },
  ])

  const handleAddAssignment = () => {
    if (!selectedStore || !selectedFrequency) return

    const store = mockStores.find((s) => s.id === selectedStore)
    const freq = frequencies.find((f) => f.value === selectedFrequency)

    if (!store || !freq) return

    const newAssignment: Assignment = {
      id: Date.now().toString(),
      storeId: store.id,
      storeName: store.name,
      storeAddress: store.address,
      frequency: freq.value,
      frequencyLabel: freq.label,
    }

    setAssignments([...assignments, newAssignment])
    setSelectedStore("")
    setSelectedFrequency("")
  }

  const handleRemoveAssignment = (id: string) => {
    setAssignments(assignments.filter((a) => a.id !== id))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Assignment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Nueva Asignación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="driver">Seleccionar Repartidor *</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger id="driver" className="h-12">
                <SelectValue placeholder="Selecciona un repartidor" />
              </SelectTrigger>
              <SelectContent>
                {mockDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store">Seleccionar Tienda *</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger id="store" className="h-12">
                <SelectValue placeholder="Selecciona una tienda" />
              </SelectTrigger>
              <SelectContent>
                {mockStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    <div>
                      <div className="font-medium">{store.name}</div>
                      <div className="text-xs text-muted-foreground">{store.address}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frecuencia de Visita *</Label>
            <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
              <SelectTrigger id="frequency" className="h-12">
                <SelectValue placeholder="Selecciona la frecuencia" />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAddAssignment}
            disabled={!selectedDriver || !selectedStore || !selectedFrequency}
            className="w-full h-12 gap-2"
          >
            <Plus className="h-5 w-5" />
            Agregar Asignación
          </Button>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Tiendas Asignadas</CardTitle>
          {selectedDriver && (
            <p className="text-sm text-muted-foreground mt-1">
              Repartidor: {mockDrivers.find((d) => d.id === selectedDriver)?.name}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!selectedDriver ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Selecciona un repartidor para ver sus asignaciones</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay tiendas asignadas todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg flex-shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{assignment.storeName}</h4>
                    <p className="text-sm text-muted-foreground">{assignment.storeAddress}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="secondary" className="text-xs">
                        {assignment.frequencyLabel}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAssignment(assignment.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

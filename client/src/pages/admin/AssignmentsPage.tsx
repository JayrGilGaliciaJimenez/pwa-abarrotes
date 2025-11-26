import { AssignmentManager } from "@/components/admin/assignments/AssignmentManager"

export default function AssignmentsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asignaciones</h1>
        <p className="text-muted-foreground mt-1">Asigna tiendas a repartidores y define frecuencia de visitas</p>
      </div>
      <AssignmentManager />
    </div>
  )
}

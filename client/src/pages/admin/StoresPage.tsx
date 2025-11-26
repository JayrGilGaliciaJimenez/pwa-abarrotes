import { StoresTable } from "@/components/admin/stores/StoresTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Link } from "react-router-dom"

export default function StoresPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tiendas</h1>
          <p className="text-muted-foreground mt-1">Gestiona el catálogo de tiendas</p>
        </div>
        <Link to="/admin/stores/new">
          <Button size="lg" className="w-full sm:w-auto gap-2">
            <Plus className="h-5 w-5" />
            Nueva Tienda
          </Button>
        </Link>
      </div>
      <StoresTable />
    </div>
  )
}

import { ProductsTable } from "@/components/admin/products/ProductsTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Link } from "react-router-dom"

export default function ProductsPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground mt-1">Gestiona el catálogo de productos</p>
        </div>
        <Link to="/admin/products/new">
          <Button size="lg" className="w-full sm:w-auto gap-2">
            <Plus className="h-5 w-5" />
            Nuevo Producto
          </Button>
        </Link>
      </div>
      <ProductsTable />
    </div>
  )
}

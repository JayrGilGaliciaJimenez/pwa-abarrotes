import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, Trash2, Package, Search } from "lucide-react"
import { Link } from "react-router-dom"

const mockProducts = [
  { id: "1", name: "Coca-Cola 2L", sku: "CCL-2L-001", category: "Bebidas", price: 35.0 },
  { id: "2", name: "Sabritas Original 45g", sku: "SAB-ORI-045", category: "Botanas", price: 18.0 },
  { id: "3", name: "Pan Bimbo Blanco", sku: "BIM-BLA-620", category: "Pan", price: 42.0 },
  { id: "4", name: "Agua Bonafont 1L", sku: "BON-1L-001", category: "Bebidas", price: 12.0 },
  { id: "5", name: "Gamesa Arcoiris", sku: "GAM-ARC-200", category: "Galletas", price: 22.0 },
]

export function ProductsTable() {
  const [search, setSearch] = useState("")
  const [products] = useState(mockProducts)

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
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
                  <th className="p-4 font-semibold text-sm">Producto</th>
                  <th className="p-4 font-semibold text-sm">SKU</th>
                  <th className="p-4 font-semibold text-sm">Categoría</th>
                  <th className="p-4 font-semibold text-sm">Precio</th>
                  <th className="p-4 font-semibold text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-lg">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="font-medium">{product.name}</div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{product.sku}</td>
                    <td className="p-4 text-sm">{product.category}</td>
                    <td className="p-4 text-sm font-medium">${product.price.toFixed(2)}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/admin/products/${product.id}/edit`}>
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
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg flex-shrink-0">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.category}</p>
                  <p className="text-lg font-bold text-primary mt-1">${product.price.toFixed(2)}</p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/admin/products/${product.id}/edit`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

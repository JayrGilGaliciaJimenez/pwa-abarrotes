import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Store, Users, Package, Calendar, LogOut, Menu } from "lucide-react"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Store },
  { href: "/admin/stores", label: "Tiendas", icon: Store },
  { href: "/admin/drivers", label: "Repartidores", icon: Users },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/assignments", label: "Asignaciones", icon: Calendar },
]

export function AdminNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem("userRole")
    navigate("/login")
  }

  const NavContent = () => (
    <>
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-xl font-bold tracking-tight">AbarrotesApp</h2>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="mt-auto p-3">
        <Button variant="outline" className="w-full justify-start gap-3 bg-transparent" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden border-b border-border bg-card">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">AbarrotesApp</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <nav className="flex flex-col h-full">
                <NavContent />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
        <NavContent />
      </nav>
    </>
  )
}

import { Link, useLocation, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { MapPin, QrCode, Package, LogOut } from "lucide-react"

const navItems = [
  { href: "/driver", label: "Mi Ruta", icon: MapPin },
  { href: "/driver/scan", label: "Escanear", icon: QrCode },
  { href: "/driver/orders", label: "Pedidos", icon: Package },
]

export function DriverNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem("userRole")
    navigate("/login")
  }

  return (
    <div className="border-t border-border bg-card fixed bottom-0 left-0 right-0 z-50">
      <nav className="flex items-center justify-around px-2 py-3 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[80px]",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground min-w-[80px]"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs font-medium">Salir</span>
        </button>
      </nav>
    </div>
  )
}

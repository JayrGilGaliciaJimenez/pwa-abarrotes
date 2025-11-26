import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, Users, Package, TrendingUp } from "lucide-react"

export default function AdminDashboard() {
  const stats = [
    {
      title: "Tiendas Activas",
      value: "48",
      icon: Store,
      trend: "+12% vs mes anterior",
    },
    {
      title: "Repartidores",
      value: "12",
      icon: Users,
      trend: "3 en ruta ahora",
    },
    {
      title: "Productos",
      value: "156",
      icon: Package,
      trend: "8 agregados esta semana",
    },
    {
      title: "Pedidos del Mes",
      value: "342",
      icon: TrendingUp,
      trend: "+23% vs mes anterior",
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido al panel de administración</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "Nuevo pedido registrado", store: "Tienda El Sol", time: "Hace 5 min" },
                { action: "Repartidor asignado", store: "Tienda La Luna", time: "Hace 15 min" },
                { action: "Producto agregado", store: "Coca-Cola 2L", time: "Hace 1 hora" },
                { action: "Pedido completado", store: "Tienda Estrella", time: "Hace 2 horas" },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.store}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repartidores en Ruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Juan Pérez", stores: "3/8 tiendas", status: "En ruta" },
                { name: "María González", stores: "5/6 tiendas", status: "En ruta" },
                { name: "Carlos Ruiz", stores: "1/10 tiendas", status: "Iniciando" },
              ].map((driver, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between pb-3 border-b border-border last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.stores}</p>
                  </div>
                  <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">{driver.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate login - Replace with actual authentication
    setTimeout(() => {
      // Demo: admin@abarrotes.com -> admin, repartidor@abarrotes.com -> driver
      if (email.includes("admin")) {
        localStorage.setItem("userRole", "admin")
        navigate("/admin")
      } else {
        localStorage.setItem("userRole", "driver")
        navigate("/driver")
      }
      setIsLoading(false)
    }, 1000)
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <Button type="submit" className="w-full h-12" disabled={isLoading}>
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
          <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted rounded-md">
            <p className="font-semibold mb-2">Demo:</p>
            <p>Admin: admin@abarrotes.com</p>
            <p>Repartidor: repartidor@abarrotes.com</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

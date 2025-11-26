import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">AbarrotesApp</h1>
          <p className="text-muted-foreground">Sistema de Gestión de Distribución</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

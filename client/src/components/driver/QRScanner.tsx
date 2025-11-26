import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, Camera } from "lucide-react"

interface QRScannerProps {
  onScan: (result: string) => void
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)

  const handleStartScan = () => {
    setIsScanning(true)
    // In real app, this would activate the device camera
    // For demo, simulate scan after 2 seconds
    setTimeout(() => {
      onScan("STORE_QR_CODE_123")
    }, 2000)
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full">
              {isScanning ? (
                <Camera className="h-12 w-12 text-primary animate-pulse" />
              ) : (
                <QrCode className="h-12 w-12 text-primary" />
              )}
            </div>

            {isScanning ? (
              <>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Escaneando...</h3>
                  <p className="text-muted-foreground">Mantén la cámara enfocada en el código QR</p>
                </div>
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-pulse"></div>
                  <p className="text-sm text-muted-foreground z-10">Vista de cámara</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Listo para Escanear</h3>
                  <p className="text-muted-foreground">
                    Presiona el botón para activar la cámara y escanear el código QR de la tienda
                  </p>
                </div>
                <Button size="lg" className="w-full h-14 gap-2" onClick={handleStartScan}>
                  <Camera className="h-5 w-5" />
                  Activar Cámara
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

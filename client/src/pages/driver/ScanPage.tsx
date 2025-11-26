import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { QRScanner } from "@/components/driver/QRScanner"
import { StoreInfo } from "@/components/driver/StoreInfo"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

export default function ScanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const storeId = searchParams.get("storeId")
  const [scanned, setScanned] = useState(false)
  const [storeData, setStoreData] = useState<any>(null)

  // Mock store data - in real app, fetch from API
  const mockStore = {
    id: storeId || "1",
    name: "Tienda El Sol",
    address: "Av. Principal 123, Col. Centro",
    city: "CDMX",
    phone: "555-0101",
    lat: 19.4326,
    lng: -99.1332,
  }

  const handleScan = (result: string) => {
    console.log("[v0] QR Code scanned:", result)
    // In real app, validate QR code matches expected store
    setStoreData(mockStore)
    setScanned(true)
  }

  const handleStartOrder = () => {
    navigate(`/driver/order?storeId=${storeData.id}`)
  }

  if (scanned && storeData) {
    return <StoreInfo store={storeData} onStartOrder={handleStartOrder} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-6">
        <Link to="/driver">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Escanear Código QR</h1>
        <p className="text-sm text-muted-foreground mt-1">Apunta la cámara al código QR de la tienda</p>
      </div>
      <QRScanner onScan={handleScan} />
    </div>
  )
}

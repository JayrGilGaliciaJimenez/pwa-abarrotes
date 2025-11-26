import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import StoresPage from './pages/admin/StoresPage'
import ProductsPage from './pages/admin/ProductsPage'
import DriversPage from './pages/admin/DriversPage'
import AssignmentsPage from './pages/admin/AssignmentsPage'
import DriverDashboard from './pages/driver/DriverDashboard'
import OrdersPage from './pages/driver/OrdersPage'
import ScanPage from './pages/driver/ScanPage'
import { AdminNav } from './components/layout/AdminNav'
import { DriverNav } from './components/layout/DriverNav'

// Admin Layout Wrapper
function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

// Driver Layout Wrapper
function DriverLayout({ children }) {
  return (
    <div className="min-h-screen pb-20">
      {children}
      <DriverNav />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/stores" element={<AdminLayout><StoresPage /></AdminLayout>} />
        <Route path="/admin/products" element={<AdminLayout><ProductsPage /></AdminLayout>} />
        <Route path="/admin/drivers" element={<AdminLayout><DriversPage /></AdminLayout>} />
        <Route path="/admin/assignments" element={<AdminLayout><AssignmentsPage /></AdminLayout>} />

        {/* Driver Routes */}
        <Route path="/driver" element={<DriverLayout><DriverDashboard /></DriverLayout>} />
        <Route path="/driver/orders" element={<DriverLayout><OrdersPage /></DriverLayout>} />
        <Route path="/driver/scan" element={<DriverLayout><ScanPage /></DriverLayout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

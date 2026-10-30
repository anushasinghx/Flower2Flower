import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Landing/Navbar'
import CompanyHeader from './components/Landing/CompanyHeader'
import ScrollingBanner from './components/Landing/ScrollingBanner'
import OnboardingShell from './components/Layout/OnboardingShell'
import DevoteeShell from './components/Layout/DevoteeShell'
import AdminShell from './components/Layout/AdminShell'
import Welcome from './features/onboarding/Welcome'
import MobileNumber from './features/onboarding/MobileNumber'
import VerifyOtp from './features/onboarding/VerifyOtp'
import ProfileSetup from './features/onboarding/ProfileSetup'
import KycUpload from './features/onboarding/KycUpload'
import SocietyPool from './features/onboarding/SocietyPool'
import Home from './features/points/Home'
import History from './features/points/History'
import Redeem from './features/points/Redeem'
import Shop from './features/marketplace/Shop'
import ProductDetail from './features/marketplace/ProductDetail'
import Cart from './features/marketplace/Cart'
import Checkout from './features/marketplace/Checkout'
import { OrderDetail, OrdersList } from './features/marketplace/Orders'
import Profile from './features/profile/Profile'
import Dashboard from './features/admin/Dashboard'
import UserKyc from './features/admin/UserKyc'
import Temples from './features/admin/Temples'
import Rules from './features/admin/Rules'
import Alerts from './features/admin/Alerts'
import Batches from './features/admin/Batches'
import BatchDetail from './features/admin/BatchDetail'
import Catalogue from './features/admin/Catalogue'
import AdminOrders from './features/admin/Orders'
import UsersRoles from './features/admin/UsersRoles'
import AuditLog from './features/admin/AuditLog'
import './App.css'

const Landing = () => (
  <div className="min-h-screen bg-[#0b0b0b]">
    <Navbar />
    <main className="flex flex-1 flex-col">
      <CompanyHeader />
      <ScrollingBanner />
    </main>
  </div>
)

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Navigate to="/welcome" replace />} />

      <Route element={<OnboardingShell />}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<MobileNumber />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/onboarding/profile" element={<ProfileSetup />} />
        <Route path="/onboarding/kyc" element={<KycUpload />} />
        <Route path="/onboarding/society" element={<SocietyPool />} />
      </Route>

      <Route path="/app" element={<DevoteeShell />}>
        <Route index element={<Home />} />
        <Route path="history" element={<History />} />
        <Route path="redeem" element={<Redeem />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<OrdersList />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="kyc" element={<KycUpload inApp />} />
        <Route path="society" element={<SocietyPool inApp />} />
      </Route>

      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<Dashboard />} />
        <Route path="kyc" element={<UserKyc />} />
        <Route path="temples" element={<Temples />} />
        <Route path="rules" element={<Rules />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="batches" element={<Batches />} />
        <Route path="batches/:id" element={<BatchDetail />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="users" element={<UsersRoles />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

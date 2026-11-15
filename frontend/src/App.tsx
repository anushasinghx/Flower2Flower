import { Navigate, Route, Routes } from 'react-router-dom'
import PublicShell from './components/Layout/PublicShell'
import LogoutRoute from './components/Layout/LogoutRoute'
import OperatorShell from './components/Layout/OperatorShell'
import TempleShell from './components/Layout/TempleShell'
import Landing from './features/landing/Landing'
import InfoPage from './features/landing/InfoPage'
import OperatorHome from './features/operator/OperatorHome'
import FindDevotee from './features/operator/FindDevotee'
import AssistedRegister from './features/operator/AssistedRegister'
import WasteType from './features/operator/WasteType'
import EnterWeight from './features/operator/EnterWeight'
import PurityPhoto from './features/operator/PurityPhoto'
import ReviewDeposit from './features/operator/ReviewDeposit'
import DepositSaved from './features/operator/DepositSaved'
import DailySummary from './features/operator/DailySummary'
import OperatorHistory from './features/operator/OperatorHistory'
import SyncQueue from './features/operator/SyncQueue'
import TempleHome from './features/temples/TempleHome'
import RegisterTemple from './features/temples/RegisterTemple'
import TempleDocuments from './features/temples/TempleDocuments'
import TempleHistory from './features/temples/TempleHistory'
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
import AdminDeposits from './features/admin/Deposits'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<InfoPage kind="privacy" />} />
        <Route path="/terms" element={<InfoPage kind="terms" />} />
        <Route path="/contact" element={<InfoPage kind="contact" />} />
      </Route>
      <Route path="/auth" element={<Navigate to="/welcome" replace />} />
      <Route path="/logout" element={<LogoutRoute />} />

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
        <Route path="deposits" element={<AdminDeposits />} />
      </Route>

      <Route path="/operator" element={<OperatorShell />}>
        <Route index element={<OperatorHome />} />
        <Route path="find" element={<FindDevotee />} />
        <Route path="register" element={<AssistedRegister />} />
        <Route path="waste" element={<WasteType />} />
        <Route path="weight" element={<EnterWeight />} />
        <Route path="photo" element={<PurityPhoto />} />
        <Route path="review" element={<ReviewDeposit />} />
        <Route path="saved" element={<DepositSaved />} />
        <Route path="summary" element={<DailySummary />} />
        <Route path="history" element={<OperatorHistory />} />
        <Route path="sync" element={<SyncQueue />} />
      </Route>

      <Route path="/temple" element={<TempleShell />}>
        <Route index element={<TempleHome />} />
        <Route path="register" element={<RegisterTemple />} />
        <Route path="documents" element={<TempleDocuments />} />
        <Route path="history" element={<TempleHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

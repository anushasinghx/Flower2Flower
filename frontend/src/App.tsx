import Navbar from './components/Landing/Navbar'
import CompanyHeader from './components/Landing/CompanyHeader'
import ScrollingBanner from './components/Landing/ScrollingBanner'
import { Routes, Route } from 'react-router-dom'
import AuthPage from './components/Auth/AuthPage'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={
            <main className="flex flex-1 flex-col">
              <CompanyHeader />
              <ScrollingBanner />
            </main>
          }
        />

        <Route path="/auth" element={<AuthPage />} />
      </Routes>

      {/* <Footer /> */}
    </div>
  )
}

export default App
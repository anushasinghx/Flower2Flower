import Navbar from './components/Landing/Navbar'
import CompanyHeader from './components/Landing/CompanyHeader'
import ScrollingBanner from './components/Landing/ScrollingBanner'
{/*import Footer from './components/Landing/Footer'*/}
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <Navbar />

      <main className = "flex flex-1 flex-col">
        <CompanyHeader />
        <ScrollingBanner />
      </main>
      {/*<Footer />*/}
    </div>
  )
}

export default App
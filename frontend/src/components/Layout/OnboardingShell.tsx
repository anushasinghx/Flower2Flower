import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'

const OnboardingShell = () => (
  <div className="app-theme flex flex-col">
    <TopBar />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-5 md:px-8 md:pt-10">
      <Outlet />
    </main>
  </div>
)

export default OnboardingShell

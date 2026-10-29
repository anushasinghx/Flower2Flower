import { useState } from 'react'
import Login from './Login'
import Signup from './Signup'

type AuthMode = 'login' | 'signup'

const AuthPage = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-[#0b0b0b] px-5 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-wide text-white">
            Flower2Flower
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Welcome to a greener tomorrow.
          </p>
        </div>


        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-8">
          <div className="mb-8 grid grid-cols-2 rounded-lg bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`rounded-md py-3 text-sm font-medium transition-colors ${
                authMode === 'login'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`rounded-md py-3 text-sm font-medium transition-colors ${
                authMode === 'signup'
                  ? 'bg-white text-black'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {authMode === 'login' ? (
            <Login onSwitchToSignup={() => setAuthMode('signup')} />
          ) : (
            <Signup onSwitchToLogin={() => setAuthMode('login')} />
          )}
        </div>
      </div>
    </main>
  )
}

export default AuthPage
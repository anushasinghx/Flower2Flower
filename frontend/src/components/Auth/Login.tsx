import { useState, type FormEvent } from 'react'

type LoginProps = {
  onSwitchToSignup: () => void
}

const Login = ({ onSwitchToSignup }: LoginProps) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    //Backend authentication will be connected here
    console.log({ username, rememberMe })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
        <p className="mt-1 text-sm text-white/60">
          Log in to your Flower2Flower account.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="login-username" className="block text-sm text-white/80">
          Username
        </label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Enter your username"
          required
          className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-400"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-sm text-white/80">
          Password
        </label>

        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
            className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 pr-20 text-white outline-none placeholder:text-white/35 focus:border-emerald-400"
          />

          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60 hover:text-white"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-white/70">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="accent-emerald-400"
          />
          Remember me
        </label>

        <button
          type="button"
          onClick={() => alert('Forgot password will be implemented later.')}
          className="text-emerald-400 hover:text-emerald-300"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-white py-3 font-semibold text-black transition-colors hover:bg-emerald-300"
      >
        Log In
      </button>

      <p className="text-center text-sm text-white/60">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-medium text-emerald-400 hover:text-emerald-300"
        >
          Sign up
        </button>
      </p>
    </form>
  )
}

export default Login
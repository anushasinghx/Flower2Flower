import { useState, type FormEvent } from 'react'

type SignupProps = {
  onSwitchToLogin: () => void
}

const Signup = ({ onSwitchToLogin }: SignupProps) => {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    //Backend registration will be connected here
    console.log({ fullName, username, email })
  }

  const inputClass =
    'w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-white">Create an account</h2>
        <p className="mt-1 text-sm text-white/60">
          Join Flower2Flower and grow with us.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-name" className="block text-sm text-white/80">
          Full name
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Enter your full name"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-username" className="block text-sm text-white/80">
          Username
        </label>
        <input
          id="signup-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Choose a username"
          required
          minLength={4}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="block text-sm text-white/80">
          Email address
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-sm text-white/80">
          Password
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            required
            className={`${inputClass} pr-20`}
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

      <div className="space-y-2">
        <label
          htmlFor="signup-confirm-password"
          className="block text-sm text-white/80"
        >
          Confirm password
        </label>
        <input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter your password"
          required
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-white py-3 font-semibold text-black transition-colors hover:bg-emerald-300"
      >
        Create Account
      </button>

      <p className="text-center text-sm text-white/60">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-emerald-400 hover:text-emerald-300"
        >
          Log in
        </button>
      </p>
    </form>
  )
}

export default Signup
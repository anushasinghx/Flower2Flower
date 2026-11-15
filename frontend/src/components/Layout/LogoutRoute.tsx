import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../../store/appStore'
import { logout } from '../../store/actions'

// Signing out happens on its own route, after the role screen has closed,
// so no role screen can redirect to its own login first.
const LogoutRoute = () => {
  const { run } = useStore()

  useEffect(() => {
    run(logout)
  }, [run])

  return <Navigate to="/" replace />
}

export default LogoutRoute

import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useStore } from '../../store/appStore'
import { auth, signedOut } from '../../store/remote'

const LogoutRoute = () => {
  const { run } = useStore()

  useEffect(() => {
    void auth.logout()
    run(signedOut)
  }, [run])

  return <Navigate to="/" replace />
}

export default LogoutRoute

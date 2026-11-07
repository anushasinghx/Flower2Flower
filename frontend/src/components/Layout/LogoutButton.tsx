import { useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'
import { useStore, useT } from '../../store/appStore'

// Same Log out button in the header of every role. Icon only on phones.
const LogoutButton = () => {
  const { toast } = useStore()
  const t = useT()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => {
        navigate('/logout')
        toast(t('You are logged out.'))
      }}
      aria-label={t('Log out')}
      title={t('Log out')}
      className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm text-sindoor transition-colors hover:bg-surface"
    >
      <Icon name="logout" size={18} />
      <span className="hidden sm:inline">{t('Log out')}</span>
    </button>
  )
}

export default LogoutButton

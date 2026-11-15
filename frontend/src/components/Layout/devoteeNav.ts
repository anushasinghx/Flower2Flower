import type { IconName } from '../ui/Icon'

export const devoteeNav: { to: string; label: string; icon: IconName }[] = [
  { to: '/app', label: 'Home', icon: 'home' },
  { to: '/app/history', label: 'History', icon: 'list' },
  { to: '/app/shop', label: 'Shop', icon: 'bag' },
  { to: '/app/profile', label: 'Profile', icon: 'user' },
]

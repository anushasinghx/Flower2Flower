import { useStore } from '../../store/appStore'

export const useMyTemple = () => {
  const { state } = useStore()
  return state.temples.find((temple) => temple.id === state.templeAdmin.templeId)
}

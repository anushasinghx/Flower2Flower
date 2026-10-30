import { useT } from '../../store/appStore'

export const useOnboardingSteps = () => {
  const t = useT()
  return [t('Mobile'), t('OTP'), t('Profile'), t('KYC')]
}

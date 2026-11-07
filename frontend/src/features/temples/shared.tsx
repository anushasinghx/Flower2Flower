import { Steps } from '../../components/ui/kit'
import { useT } from '../../store/appStore'


export const TempleSteps = ({ current }: { current: number }) => {
  const t = useT()

  return (
    <Steps
      current={current}
      steps={[t('Details'), t('Documents'), t('Verification')]}
    />
  )
}

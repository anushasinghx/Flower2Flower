import RoleLogin from '../../components/Layout/RoleLogin'
import {
  ButtonLink,
  Card,
  Field,
  Select,
  Steps,
  TextLink,
} from '../../components/ui/kit'
import { formatKg } from './helpers'
import { useStore, useT } from '../../store/appStore'
import { isToday, setOperatorTemple } from '../../store/fieldActions'
import { DEMO_OPERATOR_MOBILE } from '../../services/mockData'

const OperatorHome = () => {
  const { state, run } = useStore()
  const t = useT()
  const steps = [t('Login'), t('Temple'), t('Collect')]

  if (state.session !== 'operator') {
    const operators = state.staff
      .filter((item) => item.role === 'operator' && item.status === 'active')
      .map((item) => item.mobile)

    return (
      <RoleLogin
        title={t('Operator login')}
        role="operator"
        steps={steps}
        isAllowed={(mobile) => operators.includes(mobile)}
        notAllowedText={t('This number is not registered as an operator.')}
        demoNote={t('Demo: use {mobile} with OTP 123456.', {
          mobile: DEMO_OPERATOR_MOBILE,
        })}
      />
    )
  }

  const { templeId } = state.operator
  const temples = state.temples.filter((temple) => temple.status === 'verified')
  const today = state.deposits.filter(
    (deposit) => deposit.templeId === templeId && isToday(deposit.at),
  )
  const kg = today
    .filter((deposit) => deposit.status !== 'rejected')
    .reduce((sum, deposit) => sum + deposit.kg, 0)

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <Steps steps={steps} current={2} />
      <h1 className="font-display text-3xl leading-tight md:text-4xl">
        {t('Collection point')}
      </h1>

      <Card className="flex flex-col gap-4">
        <Field label={t('Temple or ghat')}>
          {(id) => (
            <Select
              id={id}
              value={templeId}
              onChange={(event) => {
                const value = event.target.value
                run((current) => setOperatorTemple(current, value))
              }}
            >
              {temples.map((temple) => (
                <option key={temple.id} value={temple.id}>
                  {temple.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="rounded-2xl border border-line p-4">
          <p className="font-semibold">{t('Today')}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted">{t('Deposits')}</span>
            <span className="text-xl font-bold">{today.length}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted">{t('Total weight')}</span>
            <span className="text-xl font-bold">{formatKg(kg)}</span>
          </div>
        </div>

        <ButtonLink to="/operator/find" full className="!min-h-14">
          {t('Start collection')}
        </ButtonLink>
      </Card>

      <div className="flex flex-wrap justify-center gap-6">
        <TextLink to="/operator/summary">{t('Daily summary')}</TextLink>
        <TextLink to="/operator/history">{t('Deposit history')}</TextLink>
        <TextLink to="/operator/sync">{t('Sync queue')}</TextLink>
      </div>
    </div>
  )
}

export default OperatorHome

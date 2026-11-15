import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { Button, ButtonLink, Card, Pill } from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { changeCart, setMobile } from '../../store/actions'
import { initialState, kpisByRange } from '../../services/mockData'
import { formatNumber, productName } from '../../utils/points'

const Section = ({
  id,
  band,
  children,
}: {
  id?: string
  band?: boolean
  children: React.ReactNode
}) => (
  <section
    id={id}
    className={`scroll-mt-16 ${band ? 'border-y border-line bg-surface' : ''}`}
  >
    <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8 md:py-20">
      {children}
    </div>
  </section>
)

const Landing = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [mobile, setMobileValue] = useState('')
  const [mobileError, setMobileError] = useState('')

  const depositedKg =
    kpisByRange.all.kg +
    state.deposits
      .filter((deposit) => deposit.status !== 'rejected')
      .reduce((sum, deposit) => sum + deposit.kg, 0)
  const stats = [
    { value: `${formatNumber(Math.round(depositedKg))} kg`, label: t('nirmalya offered so far'), tone: 'text-marigold' },
    { value: `${formatNumber(Math.round(depositedKg * 0.9))} kg`, label: t('CO₂e kept out of the air'), tone: 'text-tulsi' },
    { value: `${formatNumber(Math.round(depositedKg * 0.31))} kg`, label: t('organic manure made'), tone: '' },
    { value: formatNumber(
        kpisByRange.all.devotees +
          state.devotees.length -
          initialState.devotees.length,
      ), label: t('devotees taking part'), tone: '' },
  ]

  const steps = [
    { numeral: '१', title: t('Offer at the counter'), text: t('Show your QR or say your mobile number at the temple counter.') },
    { numeral: '२', title: t('Weighed and photographed'), text: t('The operator records each type and takes a purity photo. You get a message with your points.') },
    { numeral: '३', title: t('Composted with care'), text: t('Pushp Vatika turns the offerings into organic manure, batch by batch.') },
    { numeral: '४', title: t('Back to your garden'), text: t('Use your points for manure, or buy packs for your home and society garden.') },
  ]

  const levels = [...state.rules.levels].sort((a, b) => a.minPoints - b.minPoints)
  const query = pin.trim().toLowerCase()
  const temples = state.temples.filter(
    (temple) =>
      temple.status === 'verified' &&
      `${temple.name} ${temple.address}`.toLowerCase().includes(query),
  )
  const products = state.products.filter(
    (product) => product.group === 'manure' && product.listed,
  )

  const addToCart = (id: string) => {
    run((current) => changeCart(current, id, 1))
    if (state.session === 'devotee') {
      navigate('/app/cart')
    } else {
      toast(t('Added to cart. Log in to check out.'))
      navigate('/login')
    }
  }

  const join = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMobileError(t('Enter a valid 10 digit number starting with 6, 7, 8 or 9.'))
      return
    }
    run((current) => setMobile(current, mobile))
    navigate('/verify')
  }

  return (
    <>
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-tulsi">
              {t('Shipra pilot · Indirapuram')}
            </p>
            <h1 className="mt-4 font-display text-5xl leading-tight md:text-7xl">
              {t('Complete your offering.')}
            </h1>
            <p className="mt-3 font-display text-2xl text-marigold md:text-3xl">
              निर्माल्य को प्रकृति को लौटाएँ
            </p>
            <p className="mt-5 max-w-xl text-lg text-ink/90">
              {t('Bring the flowers, leaves and ash from your puja to a Flower2Flower counter at your temple. We turn them into organic manure, and every 100 g earns you 10 points.')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink to="/welcome" className="!min-h-12 !px-6">
                {t('Register with your mobile')}
              </ButtonLink>
              <a
                href="#points"
                className="inline-flex min-h-12 items-center rounded-full border border-line px-6 font-semibold hover:bg-surface"
              >
                {t('Find a collection point')}
              </a>
            </div>
          </div>

          <Card className="shadow-2xl md:p-6">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>PUSHPV</span>
              <span>10:46 am</span>
            </div>
            <p className="mt-4 rounded-2xl bg-raised p-4 text-sm leading-relaxed">
              {t('Your sacred offering of 0.65 kg has been received for nature’s service. Points: +57. Balance: 1,184.')}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: t('Flowers'), value: '0.45 kg' },
                { label: t('Leaves'), value: '0.20 kg' },
                { label: t('Level'), value: '2', green: true },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-raised p-3">
                  <p className="text-xs text-muted">{item.label}</p>
                  <p className={`mt-1 font-bold ${item.green ? 'text-tulsi' : ''}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">
              {t('Example message. Every deposit is weighed and photographed at the counter.')}
            </p>
          </Card>
        </div>
      </Section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:px-8 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label}>
              <p className={`font-display text-3xl md:text-4xl ${item.tone}`}>{item.value}</p>
              <p className="mt-1 text-sm text-muted">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <Section id="how">
        <h2 className="font-display text-4xl leading-tight">
          {t('From your puja thali back to the soil')}
        </h2>
        <p className="mt-2 text-muted">{t('Four steps, about a minute at the counter.')}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <Card key={step.numeral}>
              <p className="font-display text-3xl text-marigold">{step.numeral}</p>
              <p className="mt-3 text-lg font-bold">{step.title}</p>
              <p className="mt-2 text-muted">{step.text}</p>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <p className="font-bold text-tulsi">{t('We accept')}</p>
            <p className="mt-2">
              {t('Dried or fresh flowers, leaves, ash (vibhooti). Broken idols at ₹10 per kg.')}
            </p>
          </Card>
          <Card>
            <p className="font-bold text-sindoor">{t('Please leave out')}</p>
            <p className="mt-2">
              {t('Plastic bags, synthetic thread, foil and food waste. Offerings with plastic are returned.')}
            </p>
          </Card>
        </div>
      </Section>

      <Section id="levels" band>
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-display text-4xl leading-tight">
              {t('Points that grow with you')}
            </h2>
            <p className="mt-4 text-muted">
              {t('100 g = 10 points. Levels follow your lifetime points, so using points never lowers your level. Complete KYC to use your points.')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {levels.map((level, index) => {
              const top = index === levels.length - 1
              const next = levels[index + 1]

              return (
                <div
                  key={level.id}
                  className={`rounded-3xl bg-night p-5 ${
                    top ? 'border-2 border-marigold' : 'border border-line'
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                      index === 0 ? 'text-muted' : top ? 'text-marigold' : 'text-tulsi'
                    }`}
                  >
                    {t('Level {number}', { number: index + 1 })}
                  </p>
                  <p className="mt-2 font-display text-3xl">{t(level.name)}</p>
                  <p className="mt-2 text-sm text-muted">
                    {next
                      ? t('{from} to {to} points.', {
                          from: formatNumber(level.minPoints),
                          to: formatNumber(next.minPoints),
                        })
                      : t('Above {from} points.', { from: formatNumber(level.minPoints) })}{' '}
                    {level.multiplier > 1 &&
                      t('Earn {multiplier}x on every offering.', {
                        multiplier: level.multiplier,
                      })}
                    {index === 0 && t('100 bonus points when KYC is verified.')}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      <Section id="points">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl leading-tight">
              {t('Collection points near you')}
            </h2>
            <p className="mt-2 text-muted">
              {t('Verified temples with a Flower2Flower counter.')}
            </p>
          </div>
          <label className="flex w-full flex-col gap-1.5 sm:w-72">
            <span className="text-sm text-muted">{t('Search by PIN code or area')}</span>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="201014"
              className="min-h-11 rounded-2xl border border-line bg-surface px-4 text-ink outline-none focus:border-marigold"
            />
          </label>
        </div>
        {temples.length === 0 ? (
          <p className="mt-8 text-muted">{t('No collection point matches this search yet.')}</p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {temples.map((temple) => (
              <Card key={temple.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-bold leading-snug">{temple.name}</p>
                  <Pill tone="green">{t('Verified')}</Pill>
                </div>
                <p className="text-sm text-muted">{temple.address}</p>
                <p className="text-sm">
                  {t('Counter open')} <span className="font-semibold">{t(temple.timings)}</span>
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(temple.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex min-h-8 w-fit items-center gap-1 text-sm text-marigold underline underline-offset-4"
                >
                  {t('Get directions')}
                </a>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section id="shop" band>
        <h2 className="font-display text-4xl leading-tight">{t('Manure made from offerings')}</h2>
        <p className="mt-2 text-muted">
          {t('Pay with UPI or with your points. Pick up at your temple, or get it delivered within 1 km for ₹10.')}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {products.map((product, index) => {
            const featured = index === 1

            return (
              <div
                key={product.id}
                className={`overflow-hidden rounded-3xl bg-night ${
                  featured ? 'border-2 border-marigold' : 'border border-line'
                }`}
              >
                <div className="flex aspect-[16/9] items-center justify-center bg-raised text-sm text-muted">
                  {t('Pack photo')} · {product.pack}
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <p className="font-bold">
                    {productName(product, state.lang)} · {product.pack}
                  </p>
                  <p>
                    <span className="text-xl font-bold">₹{product.price}</span>{' '}
                    <span className="text-sm text-muted">
                      {t('or')} {formatNumber(product.points)} {t('points')}
                    </span>
                  </p>
                  <Button
                    variant={featured ? 'primary' : 'outline'}
                    full
                    disabled={product.stock <= 0}
                    onClick={() => addToCart(product.id)}
                  >
                    {product.stock > 0 ? t('Add to cart') : t('Out of stock')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-display text-4xl leading-tight md:text-5xl">
              {t('Join with your mobile number')}
            </h2>
            <p className="mt-4 text-muted">
              {t('For adults 18 and above. Your points are held until your KYC is verified, then the 100 point welcome bonus is added.')}
            </p>
          </div>
          <Card className="md:p-6">
            <form onSubmit={join} className="flex flex-col gap-3">
              <label htmlFor="join-mobile" className="text-sm text-muted">
                {t('Mobile number')}
              </label>
              <input
                id="join-mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(event) => {
                  setMobileError('')
                  setMobileValue(event.target.value.replace(/\D/g, ''))
                }}
                placeholder={t('10 digit mobile number')}
                className="min-h-12 rounded-2xl border border-line bg-night px-4 text-ink outline-none focus:border-marigold"
              />
              {mobileError && (
                <p role="alert" className="text-sm text-sindoor">
                  {mobileError}
                </p>
              )}
              <Button type="submit" full className="!min-h-12">
                {t('Send OTP')}
              </Button>
              <p className="text-xs text-muted">
                {t('By continuing you agree to the')}{' '}
                <Link to="/privacy" className="text-marigold underline">
                  {t('Privacy Notice')}
                </Link>{' '}
                {t('and')}{' '}
                <Link to="/terms" className="text-marigold underline">
                  {t('Terms')}
                </Link>
                .
              </p>
            </form>
          </Card>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
          <span>{t('Working at a temple?')}</span>
          <Link to="/operator" className="inline-flex min-h-8 items-center gap-1 text-marigold underline">
            <Icon name="box" size={16} />
            {t('Counter operator login')}
          </Link>
          <Link to="/temple" className="inline-flex min-h-8 items-center gap-1 text-marigold underline">
            <Icon name="temple" size={16} />
            {t('Register your temple')}
          </Link>
        </div>
      </Section>
    </>
  )
}

export default Landing

import { LogoLockup } from '../Brand/Logo'

const CompanyHeader = () => {
  return (
    <section
      id="home"
      className="flex min-h-[65vh] flex-col items-center justify-center bg-[#0b0b0b] px-5 py-16 text-center"
    >
      <LogoLockup size="lg" stacked subtitle="पुष्प वाटिका · Pushp Vatika" />
    </section>
  )
}

export default CompanyHeader

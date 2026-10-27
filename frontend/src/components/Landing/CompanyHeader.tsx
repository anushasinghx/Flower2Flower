import flowerLogo from '../../assets/flower.jpg'

const CompanyHeader = () => {
  return (
    <section
      id="home"
      className="flex min-h-[65vh] flex-col items-center justify-center bg-[#0b0b0b] px-5 py-16 text-center"
    >
      <img
        src={flowerLogo}
        alt="Flower2Flower logo"
        className="mb-6 h-40 w-40 rounded-full object-cover sm:h-48 sm:w-48 md:h-56 md:w-56"
      />

      <h1 className="text-4xl font-semibold tracking-wide text-white sm:text-5xl md:text-6xl">
        Flower2Flower
      </h1>
    </section>
  )
}

export default CompanyHeader
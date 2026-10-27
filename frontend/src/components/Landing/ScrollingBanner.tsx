const ScrollingBanner = () => {
  const messages = [
    'Sacred Flowers, Renewed Purpose',
    'Turning Floral Waste into Organic Manure',
    'A Greener Tomorrow Starts Today',
    'Sacred Flowers, Renewed Purpose',
  ]

  return (
    <section
      aria-label="Our mission"
      className="w-full overflow-hidden border-y border-white/10 bg-white/[0.04] py-5"
    >
      <div className="flex w-max animate-scroll items-center">
        {[...messages, ...messages].map((message, index) => (
          <div
            key={index}
            className="flex shrink-0 items-center gap-8 px-8"
          >
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/80 sm:text-base">
              {message}
            </span>
            <span
              aria-hidden="true"
              className="text-xl text-emerald-400"
            >
              ✿
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default ScrollingBanner
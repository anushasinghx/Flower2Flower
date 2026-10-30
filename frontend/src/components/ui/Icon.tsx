const paths = {
  home: 'M4 11 12 4l8 7M6 9.5V20h12V9.5',
  list: 'M4 7h16M4 12h16M4 17h10',
  bag: 'M6 8h12l1 12H5L6 8Zm3 0V6a3 3 0 0 1 6 0v2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  qr: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h2v2h-2v-2Zm4 0h2v2h-2v-2Zm-4 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z',
  back: 'm15 5-7 7 7 7',
  next: 'm9 5 7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'm20 20-4.5-4.5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  lock: 'M6 11h12v9H6v-9Zm2.5 0V8a3.5 3.5 0 0 1 7 0v3',
  upload: 'M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19h14',
  camera: 'M4 8h4l1.5-2.5h5L16 8h4v11H4V8Zm8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  badge: 'M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Zm-3 9 2 2 4-4',
  temple: 'M12 3l3 5H9l3-5ZM6 11h12M7 11v9m10-9v9M4 20h16M10 20v-5h4v5M8 8h8l1 3H7l1-3Z',
  sliders: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 5v4h4V5h-4ZM7 15v4h4v-4H7Z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Zm4 4h4',
  layers: 'm12 4 8 4-8 4-8-4 8-4Zm-8 8 8 4 8-4M4 16l8 4 8-4',
  box: 'M4 8l8-4 8 4v9l-8 4-8-4V8Zm0 0 8 4m0 0 8-4m-8 4v9',
  cart: 'M4 5h2l2 11h10l2-8H7M9 20h.01M17 20h.01',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0m1-16a3.5 3.5 0 0 1 0 7m2 9a6 6 0 0 0-2.5-4.8',
  file: 'M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h5m-5 4h5',
  download: 'M12 5v11m0 0-4.5-4.5M12 16l4.5-4.5M5 20h14',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9',
  leaf: 'M5 19C5 10 11 5 20 4c0 9-5 15-13 15m-2 2c2-5 5-8 9-10',
  drop: 'M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  flag: 'M6 21V4h12l-2.5 4.5L18 13H6',
  print: 'M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7v-7Z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4',
  reset: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5',
}

export type IconName = keyof typeof paths

type IconProps = {
  name: IconName
  size?: number
  className?: string
}

const Icon = ({ name, size = 22, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`shrink-0 ${className ?? ''}`}
  >
    <path d={paths[name]} />
  </svg>
)

export default Icon

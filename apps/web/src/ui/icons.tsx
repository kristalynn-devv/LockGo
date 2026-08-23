export type IconName =
  | 'search'
  | 'clock'
  | 'user'
  | 'pin'
  | 'lock'
  | 'box'
  | 'calendar'
  | 'arrow'
  | 'back'
  | 'check'
  | 'alert'
  | 'chevron'
  | 'inbox'
  | 'offline'
  | 'sun'
  | 'moon'
  | 'close'

export function Icon({
  name,
  className = 'size-[18px]',
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.7] ${className}`}
    >
      <use href={`#lg-${name}`} />
    </svg>
  )
}

/** วางครั้งเดียวใน App — ไอคอนทุกตัวอ้างถึง symbol ชุดนี้ */
export function IconSprite() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <symbol id="lg-search" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </symbol>
        <symbol id="lg-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.2V12l3.2 2" />
        </symbol>
        <symbol id="lg-user" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
        </symbol>
        <symbol id="lg-pin" viewBox="0 0 24 24">
          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.6" />
        </symbol>
        <symbol id="lg-lock" viewBox="0 0 24 24">
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
          <path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9" />
          <circle cx="12" cy="15.4" r="1.2" />
        </symbol>
        <symbol id="lg-box" viewBox="0 0 24 24">
          <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2Z" />
          <path d="m4 7.2 8 4.2 8-4.2M12 11.4V21" />
        </symbol>
        <symbol id="lg-calendar" viewBox="0 0 24 24">
          <rect x="3.6" y="5" width="16.8" height="15.4" rx="2.4" />
          <path d="M3.6 9.6h16.8M8.4 3.2v3.4M15.6 3.2v3.4" />
        </symbol>
        <symbol id="lg-arrow" viewBox="0 0 24 24">
          <path d="M5 12h13.5M13 6.5 18.5 12 13 17.5" />
        </symbol>
        <symbol id="lg-back" viewBox="0 0 24 24">
          <path d="M19 12H5.5M11 6.5 5.5 12 11 17.5" />
        </symbol>
        <symbol id="lg-check" viewBox="0 0 24 24">
          <path d="m5.5 12.5 4.2 4.2L18.5 8" />
        </symbol>
        <symbol id="lg-alert" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.6v5.2M12 16.4h.01" />
        </symbol>
        <symbol id="lg-chevron" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" />
        </symbol>
        <symbol id="lg-inbox" viewBox="0 0 24 24">
          <path d="M3.6 13.4h4.2l1.4 2.6h5.6l1.4-2.6h4.2" />
          <path d="M6.2 4.6h11.6l2.6 8.8v3.6a2.4 2.4 0 0 1-2.4 2.4H6a2.4 2.4 0 0 1-2.4-2.4v-3.6Z" />
        </symbol>
        <symbol id="lg-offline" viewBox="0 0 24 24">
          <path d="M3 3l18 18M8.6 8.7A9.4 9.4 0 0 0 3.4 11M20.6 11a12.6 12.6 0 0 0-5-3M6.6 14.4a7 7 0 0 1 2.2-1.4M17.4 14.4a7 7 0 0 0-2.6-1.5M12 18.6h.01" />
        </symbol>
        <symbol id="lg-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
        </symbol>
        <symbol id="lg-moon" viewBox="0 0 24 24">
          <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
        </symbol>
        <symbol id="lg-close" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6 6 18" />
        </symbol>
      </defs>
    </svg>
  )
}

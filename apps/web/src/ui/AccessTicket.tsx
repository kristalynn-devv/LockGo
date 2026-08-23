import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from './icons'
import { labelClass } from './Page'

/** ค่าที่ตู้สแกนจากจอมือถือ — ยังไม่ต่อเครื่องจริง */
export function lockerTicketValue(reservationNumber: string, accessCode: string) {
  return `LOCKGO:${reservationNumber}:${accessCode}`
}

function TicketQr({
  reservationNumber,
  accessCode,
  size,
}: {
  reservationNumber: string
  accessCode: string
  size: number
}) {
  return (
    <QRCodeSVG
      value={lockerTicketValue(reservationNumber, accessCode)}
      size={size}
      level="H"
      marginSize={4}
      bgColor="#ffffff"
      fgColor="#0f1219"
      title={`ตั๋วเปิดตู้ ${reservationNumber}`}
    />
  )
}

export function AccessTicket({
  reservationNumber,
  accessCode,
}: {
  reservationNumber: string
  accessCode: string
}) {
  const [expanded, setExpanded] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [expanded])

  return (
    <>
      <div className="rounded-lg border border-dashed border-line-strong bg-elevated px-4 py-5 text-center">
        <p className={labelClass}>ยื่น QR ให้ตู้สแกน</p>
        <button
          type="button"
          className="mx-auto mt-3 block w-fit rounded-lg bg-white p-3 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
          aria-expanded={expanded}
          aria-haspopup="dialog"
          onClick={() => setExpanded(true)}
        >
          <TicketQr
            reservationNumber={reservationNumber}
            accessCode={accessCode}
            size={192}
          />
        </button>
        <p className="mt-2 text-xs text-ink-muted">กดเพื่อขยาย</p>
        <p className="mt-3 text-sm font-semibold tracking-wider tabular-nums">
          {reservationNumber}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-[0.35em] tabular-nums">{accessCode}</p>
      </div>

      {expanded
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4"
              role="presentation"
              onClick={() => setExpanded(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative w-full max-w-sm rounded-lg bg-white p-5 text-center text-[#0f1219]"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  ref={closeRef}
                  type="button"
                  className="absolute top-3 right-3 grid size-11 place-items-center rounded-lg text-[#0f1219] hover:bg-[#f1f3f8] focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label="ปิด"
                  onClick={() => setExpanded(false)}
                >
                  <Icon name="close" className="size-5" />
                </button>
                <p id={titleId} className="text-xs font-medium uppercase tracking-wide text-[#525a6c]">
                  ยื่น QR ให้ตู้สแกน
                </p>
                <div className="mx-auto mt-4 w-fit rounded-lg bg-white p-2">
                  <TicketQr
                    reservationNumber={reservationNumber}
                    accessCode={accessCode}
                    size={280}
                  />
                </div>
                <p className="mt-4 text-sm font-semibold tracking-wider tabular-nums">
                  {reservationNumber}
                </p>
                <p className="mt-1 text-3xl font-bold tracking-[0.35em] tabular-nums">{accessCode}</p>
                <p className="mt-3 text-xs text-[#525a6c]">แตะพื้นหลังเพื่อปิด</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

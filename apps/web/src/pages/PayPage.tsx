import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from '@lockgo/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError, getReservation, payReservation } from '../lib/api'
import { useAuth } from '../lib/auth'
import { money } from '../lib/format'
import { isAwaitingPayment, type Reservation } from '../lib/types'
import { Icon } from '../ui/icons'
import {
  Field,
  cardClass,
  fieldClass,
  labelClass,
  Page,
  priceClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/Page'
import { ErrorState, Skeleton } from '../ui/states'

const METHOD_HINT: Record<PaymentMethod, string> = {
  promptpay: 'สแกนจากแอปธนาคาร',
  card: 'กรอกบัตรทดสอบ แล้วบันทึกวิธีจ่าย',
  bank: 'โอนเข้าบัญชี LockGo',
}

const DEMO_PROMPTPAY = '081-234-5678'
const DEMO_BANK = {
  bank: 'กสิกรไทย',
  account: '123-4-56789-0',
  name: 'LockGo Co., Ltd.',
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function cardReady(name: string, number: string, expiry: string, cvc: string) {
  const digits = number.replace(/\D/g, '')
  const month = Number(expiry.slice(0, 2))
  return (
    name.trim().length > 1 &&
    digits.length === 16 &&
    /^\d{2}\/\d{2}$/.test(expiry) &&
    month >= 1 &&
    month <= 12 &&
    /^\d{3}$/.test(cvc)
  )
}

export function PayPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<PaymentMethod>('promptpay')
  const [transferred, setTransferred] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  const reservation = useQuery({
    queryKey: ['reservations', id],
    queryFn: () => getReservation(token, id),
    enabled: Boolean(token && id),
  })

  const pay = useMutation({
    mutationFn: () => payReservation(token, id, method),
    onSuccess: (updated) => {
      queryClient.setQueryData(['reservations', updated.id], updated)
      queryClient.setQueryData<{ items: Reservation[] }>(['reservations', 'list'], (current) => {
        if (!current) return current
        return {
          items: current.items.map((row) => (row.id === updated.id ? updated : row)),
        }
      })
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
      navigate(`/reservations/${updated.id}`, { replace: true })
    },
  })

  const item = reservation.data
  const canSubmit =
    method === 'card'
      ? cardReady(cardName, cardNumber, cardExpiry, cardCvc)
      : transferred

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || pay.isPending) return
    pay.mutate()
  }

  if (reservation.isLoading) {
    return (
      <Page title="ชำระเงิน">
        <Skeleton />
      </Page>
    )
  }

  if (reservation.isError || !item) {
    return (
      <Page title="ชำระเงิน">
        <ErrorState
          message="โหลดใบจองไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void reservation.refetch()}
        />
      </Page>
    )
  }

  if (!isAwaitingPayment(item)) {
    return <Navigate to={`/reservations/${item.id}`} replace />
  }

  return (
    <Page title="ชำระเงิน">
      <section className={`${cardClass} p-4`}>
        <p className={labelClass}>ยอดชำระ</p>
        <p className={`mt-1 ${priceClass}`}>{money(item.total_price)}</p>
        <h2 className="mt-4 text-lg font-semibold text-ink">{item.station_name}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {item.size} · {item.compartment_label} · {item.reservation_number}
        </p>
      </section>

      <form className={`${cardClass} mt-3 p-4`} onSubmit={onSubmit} autoComplete="off">
        <p className={labelClass}>วิธีจ่าย</p>
        <div className="mt-3 grid gap-2">
          {PAYMENT_METHODS.map((value) => {
            const selected = method === value
            return (
              <label
                key={value}
                className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                  selected
                    ? 'border-accent bg-accent-soft'
                    : 'border-line-strong bg-surface hover:bg-elevated'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={selected}
                  className="sr-only"
                  onChange={() => {
                    setMethod(value)
                    setTransferred(false)
                  }}
                />
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                    selected ? 'bg-accent text-accent-ink' : 'bg-elevated text-ink-muted'
                  }`}
                >
                  <Icon name={value === 'card' ? 'lock' : value === 'bank' ? 'arrow' : 'check'} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{PAYMENT_METHOD_LABELS[value]}</span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{METHOD_HINT[value]}</span>
                </span>
              </label>
            )
          })}
        </div>

        {method === 'promptpay' ? (
          <PromptPayFields
            amount={item.total_price}
            reference={item.reservation_number}
            confirmed={transferred}
            onConfirm={setTransferred}
          />
        ) : null}

        {method === 'bank' ? (
          <BankFields
            reference={item.reservation_number}
            confirmed={transferred}
            onConfirm={setTransferred}
          />
        ) : null}

        {method === 'card' ? (
          <CardFields
            name={cardName}
            number={cardNumber}
            expiry={cardExpiry}
            cvc={cardCvc}
            onName={setCardName}
            onNumber={setCardNumber}
            onExpiry={setCardExpiry}
            onCvc={setCardCvc}
          />
        ) : null}

        <p className="mt-4 text-xs text-ink-muted">
          ฟอร์มนี้บันทึกวิธีจ่ายบนระบบ ยังไม่ตัดเงินจากเกตเวย์จริง และไม่ส่งเลขบัตรออกจากเครื่อง
        </p>

        {pay.isError ? (
          <div className="mt-3">
            <ErrorState
              message={
                pay.error instanceof ApiRequestError ? pay.error.message : 'ชำระเงินไม่สำเร็จ กรุณาลองใหม่'
              }
            />
          </div>
        ) : null}

        <button
          type="submit"
          className={`${primaryButtonClass} mt-4 w-full`}
          disabled={!canSubmit || pay.isPending}
        >
          {pay.isPending
            ? 'กำลังชำระ…'
            : `ชำระ ${money(item.total_price)} ด้วย${PAYMENT_METHOD_LABELS[method]}`}
        </button>
      </form>

      <Link to={`/reservations/${item.id}`} className={`${secondaryButtonClass} mt-3 w-full`}>
        กลับใบจอง
      </Link>
    </Page>
  )
}

function PromptPayFields({
  amount,
  reference,
  confirmed,
  onConfirm,
}: {
  amount: number
  reference: string
  confirmed: boolean
  onConfirm: (value: boolean) => void
}) {
  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className={labelClass}>สแกนพร้อมเพย์</p>
      <div className="mt-3 flex flex-col items-center rounded-lg bg-elevated p-4">
        <div className="rounded-lg bg-white p-2">
          <QRCodeSVG
            value={`LOCKGO-PAY:${reference}:${amount}`}
            size={168}
            level="M"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#0f1219"
            title={`พร้อมเพย์ ${money(amount)}`}
          />
        </div>
        <p className="mt-3 text-sm font-semibold tabular-nums">{DEMO_PROMPTPAY}</p>
        <p className="mt-1 text-xs text-ink-muted">อ้างอิง {reference}</p>
      </div>
      <ConfirmTransfer
        label="ฉันสแกนและโอนแล้ว"
        checked={confirmed}
        onChange={onConfirm}
      />
    </div>
  )
}

function BankFields({
  reference,
  confirmed,
  onConfirm,
}: {
  reference: string
  confirmed: boolean
  onConfirm: (value: boolean) => void
}) {
  return (
    <div className="mt-4 grid gap-3 border-t border-line pt-4">
      <Field label="ธนาคาร">
        <p className={`${fieldClass} flex items-center`}>{DEMO_BANK.bank}</p>
      </Field>
      <Field label="เลขบัญชี">
        <p className={`${fieldClass} flex items-center font-semibold tabular-nums`}>{DEMO_BANK.account}</p>
      </Field>
      <Field label="ชื่อบัญชี">
        <p className={`${fieldClass} flex items-center`}>{DEMO_BANK.name}</p>
      </Field>
      <Field label="รหัสอ้างอิง">
        <p className={`${fieldClass} flex items-center font-semibold tabular-nums`}>{reference}</p>
      </Field>
      <ConfirmTransfer
        label="ฉันโอนเงินแล้ว"
        checked={confirmed}
        onChange={onConfirm}
      />
    </div>
  )
}

function CardFields({
  name,
  number,
  expiry,
  cvc,
  onName,
  onNumber,
  onExpiry,
  onCvc,
}: {
  name: string
  number: string
  expiry: string
  cvc: string
  onName: (value: string) => void
  onNumber: (value: string) => void
  onExpiry: (value: string) => void
  onCvc: (value: string) => void
}) {
  return (
    <div className="mt-4 grid gap-3 border-t border-line pt-4">
      <Field label="ชื่อบนบัตร">
        <input
          className={fieldClass}
          value={name}
          autoComplete="off"
          inputMode="text"
          placeholder="ชื่อตามบัตร"
          onChange={(event) => onName(event.target.value)}
        />
      </Field>
      <Field label="เลขบัตร" hint="ใช้ 4242 4242 4242 4242 — ไม่ส่งเลขบัตรออกจากเครื่อง">
        <input
          className={`${fieldClass} tabular-nums`}
          value={number}
          autoComplete="off"
          inputMode="numeric"
          placeholder="4242 4242 4242 4242"
          onChange={(event) => onNumber(formatCardNumber(event.target.value))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="หมดอายุ">
          <input
            className={`${fieldClass} tabular-nums`}
            value={expiry}
            autoComplete="off"
            inputMode="numeric"
            placeholder="MM/YY"
            onChange={(event) => onExpiry(formatExpiry(event.target.value))}
          />
        </Field>
        <Field label="CVC">
          <input
            className={`${fieldClass} tabular-nums`}
            value={cvc}
            autoComplete="off"
            inputMode="numeric"
            placeholder="123"
            onChange={(event) => onCvc(event.target.value.replace(/\D/g, '').slice(0, 3))}
          />
        </Field>
      </div>
    </div>
  )
}

function ConfirmTransfer({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line-strong px-3">
      <input
        type="checkbox"
        checked={checked}
        className="size-4 accent-[var(--accent)]"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  )
}

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'

export function useClickOutside<T extends HTMLElement>(
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    function onDoc(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, setOpen])

  return ref
}

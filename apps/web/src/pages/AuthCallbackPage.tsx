import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Page } from '../ui/Page'
import { Skeleton } from '../ui/states'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        navigate('/', { replace: true })
      }
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/', { replace: true })
      }
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <Page title="กำลังเข้าสู่ระบบ">
      <Skeleton />
    </Page>
  )
}

function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabasePublishableKey: required('VITE_SUPABASE_PUBLISHABLE_KEY'),
  apiBaseUrl: required('VITE_API_BASE_URL'),
  authRedirectUrl: required('VITE_AUTH_REDIRECT_URL'),
}

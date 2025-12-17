import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'domainfolio',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Types for the database
export type Domain = {
  id: string
  user_id: string
  name: string
  tld: string
  registrar_id: string | null
  status: 'active' | 'expiring' | 'expired' | 'transferred' | 'pending'
  is_locked: boolean
  is_private: boolean
  registered_at: string | null
  expires_at: string
  auto_renew: boolean
  renewal_price: number | null
  renewal_currency: string
  nameservers: string[] | null
  dns_provider: string | null
  dns_healthy: boolean | null
  ssl_healthy: boolean | null
  ssl_expires_at: string | null
  notes: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export type Registrar = {
  id: string
  name: string
  logo_url: string | null
  api_docs_url: string | null
  supports_api: boolean
}

export type Alert = {
  id: string
  user_id: string
  domain_id: string | null
  type: 'expiring_soon' | 'expired' | 'ssl_expiring' | 'dns_issue' | 'sync_error' | 'renewal_failed'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string | null
  is_read: boolean
  created_at: string
}

export type UserStats = {
  user_id: string
  total_domains: number
  expiring_count: number
  expired_count: number
  manual_renew_count: number
  estimated_annual_cost: number | null
  next_expiry: string | null
}

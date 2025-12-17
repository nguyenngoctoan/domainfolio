'use client'

import { useState } from 'react'
import { Globe, Plus, AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import { formatDistanceToNow, differenceInDays } from 'date-fns'

// Demo data - will be replaced with real API data
const DEMO_DOMAINS = [
  {
    id: '1',
    name: 'mycompany.com',
    registrar: 'Namecheap',
    expiresAt: new Date('2025-03-15'),
    autoRenew: true,
    status: 'active',
  },
  {
    id: '2',
    name: 'mycompany.io',
    registrar: 'Porkbun',
    expiresAt: new Date('2025-01-20'),
    autoRenew: false,
    status: 'expiring',
  },
  {
    id: '3',
    name: 'myapp.dev',
    registrar: 'Cloudflare',
    expiresAt: new Date('2025-08-01'),
    autoRenew: true,
    status: 'active',
  },
  {
    id: '4',
    name: 'startup.co',
    registrar: 'GoDaddy',
    expiresAt: new Date('2025-02-01'),
    autoRenew: false,
    status: 'expiring',
  },
]

type Domain = typeof DEMO_DOMAINS[0]

function DomainStatusBadge({ domain }: { domain: Domain }) {
  const daysUntilExpiry = differenceInDays(domain.expiresAt, new Date())

  if (daysUntilExpiry < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </span>
    )
  }

  if (daysUntilExpiry < 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" />
        Expiring Soon
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle className="w-3 h-3" />
      Active
    </span>
  )
}

function DomainCard({ domain }: { domain: Domain }) {
  const daysUntilExpiry = differenceInDays(domain.expiresAt, new Date())

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{domain.name}</h3>
            <p className="text-sm text-gray-500">{domain.registrar}</p>
          </div>
        </div>
        <DomainStatusBadge domain={domain} />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
        <div>
          <span className="text-gray-500">Expires </span>
          <span className={daysUntilExpiry < 30 ? 'text-amber-600 font-medium' : 'text-gray-700'}>
            {formatDistanceToNow(domain.expiresAt, { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {domain.autoRenew ? (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">Auto-renew ON</span>
          ) : (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Auto-renew OFF</span>
          )}
        </div>
      </div>
    </div>
  )
}

function StatsCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  )
}

export default function Home() {
  const [domains] = useState<Domain[]>(DEMO_DOMAINS)

  const expiringCount = domains.filter(d => differenceInDays(d.expiresAt, new Date()) < 30).length
  const autoRenewOffCount = domains.filter(d => !d.autoRenew).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-8 h-8 text-brand-600" />
            <span className="text-xl font-bold text-gray-900">Domainfolio</span>
          </div>
          <button className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
            <Plus className="w-4 h-4" />
            Connect Registrar
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard label="Total Domains" value={domains.length} />
          <StatsCard
            label="Expiring Soon"
            value={expiringCount}
            subtext="Within 30 days"
          />
          <StatsCard
            label="Auto-renew Off"
            value={autoRenewOffCount}
            subtext="Manual renewal needed"
          />
          <StatsCard
            label="Est. Annual Cost"
            value="$156"
            subtext="Based on avg. pricing"
          />
        </div>

        {/* Domains List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Domains</h2>
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <option>All Registrars</option>
            <option>Namecheap</option>
            <option>Porkbun</option>
            <option>Cloudflare</option>
            <option>GoDaddy</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {domains.map(domain => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>

        {/* Empty State / CTA */}
        <div className="mt-8 bg-gradient-to-r from-brand-50 to-blue-50 rounded-xl p-6 border border-brand-100">
          <h3 className="font-semibold text-gray-900">Connect your registrars</h3>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Import domains automatically from Namecheap, GoDaddy, Porkbun, Cloudflare, and more.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Namecheap', 'GoDaddy', 'Porkbun', 'Cloudflare', 'Google Domains'].map(registrar => (
              <button
                key={registrar}
                className="inline-flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm hover:border-brand-300 transition-colors"
              >
                {registrar}
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

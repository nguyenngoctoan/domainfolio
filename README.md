# Domainfolio

Universal domain portfolio dashboard - track all your domains across registrars in one place.

## Features

- **Unified Dashboard** - See all domains from Namecheap, GoDaddy, Porkbun, Cloudflare in one view
- **Expiration Alerts** - Get notified before domains expire
- **Auto-renew Status** - Know which domains need manual renewal
- **Cost Tracking** - Estimate annual domain expenses
- **Health Monitoring** - DNS, SSL, and email configuration checks (coming soon)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Roadmap

### Phase 1 - MVP
- [ ] Manual domain entry
- [ ] Expiration tracking
- [ ] Email alerts
- [ ] Basic dashboard

### Phase 2 - Integrations
- [ ] Namecheap API integration
- [ ] Porkbun API integration
- [ ] Cloudflare API integration
- [ ] GoDaddy API integration

### Phase 3 - Advanced
- [ ] WHOIS lookup
- [ ] DNS health checks
- [ ] SSL monitoring
- [ ] Domain valuation estimates

## API Integrations

| Registrar | Status | API Docs |
|-----------|--------|----------|
| Namecheap | Planned | [Docs](https://www.namecheap.com/support/api/intro/) |
| Porkbun | Planned | [Docs](https://porkbun.com/api/json/v3/documentation) |
| Cloudflare | Planned | [Docs](https://developers.cloudflare.com/api/) |
| GoDaddy | Planned | [Docs](https://developer.godaddy.com/) |

## License

MIT

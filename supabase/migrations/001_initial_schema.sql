-- Domainfolio Schema
-- Universal domain portfolio dashboard

-- Create the schema
CREATE SCHEMA IF NOT EXISTS domainfolio;

-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA domainfolio GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- ============================================
-- USERS
-- ============================================
CREATE TABLE domainfolio.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  domain_limit INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REGISTRARS (supported integrations)
-- ============================================
CREATE TABLE domainfolio.registrars (
  id TEXT PRIMARY KEY, -- e.g., 'namecheap', 'porkbun', 'cloudflare'
  name TEXT NOT NULL,
  logo_url TEXT,
  api_docs_url TEXT,
  supports_api BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed registrars
INSERT INTO domainfolio.registrars (id, name, api_docs_url) VALUES
  ('namecheap', 'Namecheap', 'https://www.namecheap.com/support/api/intro/'),
  ('porkbun', 'Porkbun', 'https://porkbun.com/api/json/v3/documentation'),
  ('cloudflare', 'Cloudflare', 'https://developers.cloudflare.com/api/'),
  ('godaddy', 'GoDaddy', 'https://developer.godaddy.com/'),
  ('google', 'Google Domains', NULL),
  ('gandi', 'Gandi', 'https://api.gandi.net/docs/'),
  ('hover', 'Hover', NULL),
  ('dynadot', 'Dynadot', 'https://www.dynadot.com/domain/api3.html'),
  ('name_com', 'Name.com', 'https://www.name.com/api-docs'),
  ('manual', 'Manual Entry', NULL);

-- ============================================
-- REGISTRAR CONNECTIONS (user API credentials)
-- ============================================
CREATE TABLE domainfolio.registrar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES domainfolio.users(id) ON DELETE CASCADE,
  registrar_id TEXT NOT NULL REFERENCES domainfolio.registrars(id),
  -- Encrypted credentials stored in vault or as encrypted JSON
  credentials_encrypted TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, registrar_id)
);

-- ============================================
-- DOMAINS
-- ============================================
CREATE TABLE domainfolio.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES domainfolio.users(id) ON DELETE CASCADE,

  -- Domain info
  name TEXT NOT NULL, -- e.g., 'example.com'
  tld TEXT NOT NULL,  -- e.g., 'com', 'io', 'dev'

  -- Registrar info
  registrar_id TEXT REFERENCES domainfolio.registrars(id),
  registrar_connection_id UUID REFERENCES domainfolio.registrar_connections(id),
  external_id TEXT, -- ID from registrar's API

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired', 'transferred', 'pending')),
  is_locked BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT true, -- WHOIS privacy

  -- Dates
  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Renewal
  auto_renew BOOLEAN DEFAULT false,
  renewal_price DECIMAL(10, 2),
  renewal_currency TEXT DEFAULT 'USD',

  -- DNS
  nameservers TEXT[], -- Array of nameservers
  dns_provider TEXT,  -- e.g., 'cloudflare', 'vercel', 'self'

  -- Health (cached from checks)
  dns_healthy BOOLEAN,
  ssl_healthy BOOLEAN,
  ssl_expires_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  tags TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- ============================================
-- DOMAIN HISTORY (track changes)
-- ============================================
CREATE TABLE domainfolio.domain_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domainfolio.domains(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'renewed', 'transferred', 'expired', 'settings_changed', 'dns_changed')),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERTS
-- ============================================
CREATE TABLE domainfolio.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES domainfolio.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domainfolio.domains(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('expiring_soon', 'expired', 'ssl_expiring', 'dns_issue', 'sync_error', 'renewal_failed')),
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),

  title TEXT NOT NULL,
  message TEXT,

  is_read BOOLEAN DEFAULT false,
  is_emailed BOOLEAN DEFAULT false,
  emailed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERT SETTINGS
-- ============================================
CREATE TABLE domainfolio.alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES domainfolio.users(id) ON DELETE CASCADE,

  -- When to alert before expiry (in days)
  alert_days_before INTEGER[] DEFAULT '{30, 14, 7, 1}',

  -- Channels
  email_enabled BOOLEAN DEFAULT true,
  email_address TEXT,

  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,

  webhook_enabled BOOLEAN DEFAULT false,
  webhook_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_domains_user_id ON domainfolio.domains(user_id);
CREATE INDEX idx_domains_expires_at ON domainfolio.domains(expires_at);
CREATE INDEX idx_domains_status ON domainfolio.domains(status);
CREATE INDEX idx_alerts_user_id ON domainfolio.alerts(user_id);
CREATE INDEX idx_alerts_unread ON domainfolio.alerts(user_id, is_read) WHERE NOT is_read;
CREATE INDEX idx_domain_history_domain_id ON domainfolio.domain_history(domain_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE domainfolio.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE domainfolio.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domainfolio.registrar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE domainfolio.domain_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE domainfolio.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE domainfolio.alert_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON domainfolio.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON domainfolio.users
  FOR UPDATE USING (auth.uid() = id);

-- Domains
CREATE POLICY "Users can view own domains" ON domainfolio.domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domains" ON domainfolio.domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains" ON domainfolio.domains
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains" ON domainfolio.domains
  FOR DELETE USING (auth.uid() = user_id);

-- Registrar connections
CREATE POLICY "Users can view own connections" ON domainfolio.registrar_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON domainfolio.registrar_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON domainfolio.registrar_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON domainfolio.registrar_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Domain history
CREATE POLICY "Users can view own domain history" ON domainfolio.domain_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM domainfolio.domains d
      WHERE d.id = domain_id AND d.user_id = auth.uid()
    )
  );

-- Alerts
CREATE POLICY "Users can view own alerts" ON domainfolio.alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON domainfolio.alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Alert settings
CREATE POLICY "Users can view own alert settings" ON domainfolio.alert_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert settings" ON domainfolio.alert_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert settings" ON domainfolio.alert_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Registrars table is public (read-only reference data)
ALTER TABLE domainfolio.registrars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view registrars" ON domainfolio.registrars
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION domainfolio.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = domainfolio
AS $$
BEGIN
  INSERT INTO domainfolio.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name')
  );

  -- Create default alert settings
  INSERT INTO domainfolio.alert_settings (user_id, email_address)
  VALUES (NEW.id, NEW.email);

  RETURN NEW;
END;
$$;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION domainfolio.handle_new_user();

-- Function to update domain status based on expiry
CREATE OR REPLACE FUNCTION domainfolio.update_domain_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expires_at < NOW() THEN
    NEW.status := 'expired';
  ELSIF NEW.expires_at < NOW() + INTERVAL '30 days' THEN
    NEW.status := 'expiring';
  ELSE
    NEW.status := 'active';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_domain_status_trigger
  BEFORE INSERT OR UPDATE OF expires_at ON domainfolio.domains
  FOR EACH ROW EXECUTE FUNCTION domainfolio.update_domain_status();

-- Function to extract TLD from domain name
CREATE OR REPLACE FUNCTION domainfolio.extract_tld(domain_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN LOWER(SUBSTRING(domain_name FROM '\.([^.]+)$'));
END;
$$;

-- Trigger to auto-set TLD
CREATE OR REPLACE FUNCTION domainfolio.set_domain_tld()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tld := domainfolio.extract_tld(NEW.name);
  NEW.name := LOWER(NEW.name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_domain_tld_trigger
  BEFORE INSERT OR UPDATE OF name ON domainfolio.domains
  FOR EACH ROW EXECUTE FUNCTION domainfolio.set_domain_tld();

-- ============================================
-- VIEWS
-- ============================================

-- Dashboard stats view
CREATE OR REPLACE VIEW domainfolio.user_stats AS
SELECT
  u.id AS user_id,
  COUNT(d.id) AS total_domains,
  COUNT(d.id) FILTER (WHERE d.status = 'expiring') AS expiring_count,
  COUNT(d.id) FILTER (WHERE d.status = 'expired') AS expired_count,
  COUNT(d.id) FILTER (WHERE NOT d.auto_renew) AS manual_renew_count,
  SUM(d.renewal_price) AS estimated_annual_cost,
  MIN(d.expires_at) FILTER (WHERE d.expires_at > NOW()) AS next_expiry
FROM domainfolio.users u
LEFT JOIN domainfolio.domains d ON d.user_id = u.id
GROUP BY u.id;

-- Expiring domains view (next 30 days)
CREATE OR REPLACE VIEW domainfolio.expiring_domains AS
SELECT
  d.*,
  r.name AS registrar_name,
  EXTRACT(DAY FROM d.expires_at - NOW())::INTEGER AS days_until_expiry
FROM domainfolio.domains d
LEFT JOIN domainfolio.registrars r ON r.id = d.registrar_id
WHERE d.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
ORDER BY d.expires_at ASC;

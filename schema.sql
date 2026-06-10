-- ══════════════════════════════════════════════════════
-- SHINEAILABS MULTI-TENANT SAAS — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- ── ENABLE UUID ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════
-- 1. TENANTS
-- ══════════════════════════════════════════════════════
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,        -- e.g. "acme-realty"
  domain          TEXT,                         -- custom domain: crm.acme.com
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#6366f1',
  plan            TEXT DEFAULT 'starter'        CHECK (plan IN ('starter','professional','enterprise')),
  plan_status     TEXT DEFAULT 'trial'          CHECK (plan_status IN ('trial','active','suspended','cancelled')),
  trial_ends_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  max_users       INT DEFAULT 5,
  max_leads       INT DEFAULT 500,
  max_agents      INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════
-- 2. ROLES
-- ══════════════════════════════════════════════════════
CREATE TABLE roles (
  id    SERIAL PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL   -- super_admin, reseller, client_admin, manager, employee
);

INSERT INTO roles (name) VALUES
  ('super_admin'),
  ('reseller'),
  ('client_admin'),
  ('manager'),
  ('employee');

-- ══════════════════════════════════════════════════════
-- 3. USERS
-- ══════════════════════════════════════════════════════
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role_id       INT REFERENCES roles(id),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  password_hash TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast tenant user lookup
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ══════════════════════════════════════════════════════
-- 4. INTEGRATIONS
-- ══════════════════════════════════════════════════════
CREATE TABLE integrations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type          TEXT NOT NULL  CHECK (type IN (
                  'whatsapp','facebook','instagram',
                  'gmail','outlook','telegram',
                  'razorpay','stripe',
                  'google_calendar','zoho','hubspot','salesforce'
                )),
  name          TEXT,
  credentials   JSONB,          -- stored encrypted
  is_active     BOOLEAN DEFAULT FALSE,
  connected_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);

-- ══════════════════════════════════════════════════════
-- 5. CONTACTS
-- ══════════════════════════════════════════════════════
CREATE TABLE contacts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  company             TEXT,
  industry            TEXT,
  preferred_language  TEXT DEFAULT 'English',
  source              TEXT,    -- website, whatsapp, facebook_ad, manual
  tags                TEXT[],
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_phone  ON contacts(phone);

-- ══════════════════════════════════════════════════════
-- 6. LEADS (CRM Pipeline)
-- ══════════════════════════════════════════════════════
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  assigned_to     UUID REFERENCES users(id),
  title           TEXT,
  status          TEXT DEFAULT 'new' CHECK (status IN (
                    'new','contacted','qualified',
                    'interested','proposal','won','lost'
                  )),
  score           INT DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  value           NUMERIC(12,2) DEFAULT 0,
  source          TEXT,
  industry        TEXT,
  notes           TEXT,
  lost_reason     TEXT,
  expected_close  DATE,
  won_at          TIMESTAMPTZ,
  lost_at         TIMESTAMPTZ,
  last_activity   TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant   ON leads(tenant_id);
CREATE INDEX idx_leads_status   ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);

-- ══════════════════════════════════════════════════════
-- 7. DEALS
-- ══════════════════════════════════════════════════════
CREATE TABLE deals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id),
  contact_id  UUID REFERENCES contacts(id),
  name        TEXT NOT NULL,
  value       NUMERIC(12,2),
  stage       TEXT DEFAULT 'prospecting',
  close_date  DATE,
  probability INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deals_tenant ON deals(tenant_id);

-- ══════════════════════════════════════════════════════
-- 8. ACTIVITIES (Notes, Tasks, Calls, etc.)
-- ══════════════════════════════════════════════════════
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id),
  contact_id  UUID REFERENCES contacts(id),
  user_id     UUID REFERENCES users(id),
  type        TEXT CHECK (type IN ('note','call','whatsapp','email','task','meeting')),
  subject     TEXT,
  body        TEXT,
  status      TEXT DEFAULT 'done' CHECK (status IN ('pending','done','cancelled')),
  due_at      TIMESTAMPTZ,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_tenant  ON activities(tenant_id);
CREATE INDEX idx_activities_lead    ON activities(lead_id);

-- ══════════════════════════════════════════════════════
-- 9. AI AGENTS
-- ══════════════════════════════════════════════════════
CREATE TABLE ai_agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,       -- "Sales Agent", "Support Agent"
  type            TEXT CHECK (type IN ('sales','support','collection','appointment','custom')),
  system_prompt   TEXT,
  language        TEXT DEFAULT 'English',
  channels        TEXT[],              -- ['whatsapp','voice','email']
  is_active       BOOLEAN DEFAULT TRUE,
  escalation_keywords TEXT[],          -- ['human','agent','manager']
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_tenant ON ai_agents(tenant_id);

-- ══════════════════════════════════════════════════════
-- 10. KNOWLEDGE BASE
-- ══════════════════════════════════════════════════════
CREATE TABLE knowledge_bases (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id    UUID REFERENCES ai_agents(id),
  name        TEXT NOT NULL,
  type        TEXT CHECK (type IN ('pdf','docx','website','faq','text')),
  content     TEXT,
  file_url    TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_tenant ON knowledge_bases(tenant_id);

-- ══════════════════════════════════════════════════════
-- 11. CONVERSATIONS
-- ══════════════════════════════════════════════════════
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id  UUID REFERENCES contacts(id),
  lead_id     UUID REFERENCES leads(id),
  agent_id    UUID REFERENCES ai_agents(id),
  channel     TEXT CHECK (channel IN ('whatsapp','voice','email','chat')),
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','escalated')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_tenant ON conversations(tenant_id);

-- ══════════════════════════════════════════════════════
-- 12. MESSAGES
-- ══════════════════════════════════════════════════════
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT CHECK (role IN ('user','assistant','system')),
  content         TEXT NOT NULL,
  channel         TEXT,
  is_ai           BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conv   ON messages(conversation_id);
CREATE INDEX idx_messages_tenant ON messages(tenant_id);

-- ══════════════════════════════════════════════════════
-- 13. FOLLOWUPS V2 (Avoids conflicts with existing Phase 1 followups)
-- ══════════════════════════════════════════════════════
CREATE TABLE followups_v2 (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id      UUID REFERENCES contacts(id),
  lead_id         UUID REFERENCES leads(id),
  followup_type   TEXT CHECK (followup_type IN ('voice','whatsapp','email','sms')),
  day_number      INT,           -- Day 1, 2, 4, 6, 8, 10
  scheduled_time  TIMESTAMPTZ,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  result          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_followups_v2_tenant ON followups_v2(tenant_id);
CREATE INDEX idx_followups_v2_status ON followups_v2(status);

-- ══════════════════════════════════════════════════════
-- 14. WORKFLOWS
-- ══════════════════════════════════════════════════════
CREATE TABLE workflows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  trigger     TEXT,            -- lead_created, message_received, etc.
  steps       JSONB,           -- workflow steps as JSON
  is_active   BOOLEAN DEFAULT TRUE,
  n8n_id      TEXT,            -- linked n8n workflow ID
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_tenant ON workflows(tenant_id);

-- ══════════════════════════════════════════════════════
-- 15. SUBSCRIPTIONS
-- ══════════════════════════════════════════════════════
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL,
  status          TEXT DEFAULT 'active' CHECK (status IN ('trial','active','past_due','cancelled')),
  amount          NUMERIC(10,2),
  currency        TEXT DEFAULT 'INR',
  billing_cycle   TEXT DEFAULT 'monthly',
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  ends_at         TIMESTAMPTZ,
  razorpay_sub_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subs_tenant ON subscriptions(tenant_id);

-- ══════════════════════════════════════════════════════
-- 16. ROW LEVEL SECURITY (RLS)
-- Ensures tenants can ONLY see their own data
-- ══════════════════════════════════════════════════════
ALTER TABLE contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups_v2  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows     ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations  ENABLE ROW LEVEL SECURITY;

-- RLS policies (tenant isolation)
-- Each table only returns rows matching current tenant
CREATE POLICY tenant_isolation_contacts      ON contacts      USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_leads         ON leads         USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_deals         ON deals         USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_activities    ON activities    USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_agents        ON ai_agents     USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_kb            ON knowledge_bases USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_conversations ON conversations USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_messages      ON messages      USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_followups     ON followups_v2  USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_workflows     ON workflows     USING (tenant_id = current_setting('app.tenant_id')::UUID);
CREATE POLICY tenant_isolation_integrations  ON integrations  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- ══════════════════════════════════════════════════════
-- 17. SEED SUPER ADMIN TENANT + USER
-- ══════════════════════════════════════════════════════
INSERT INTO tenants (name, slug, plan, plan_status) VALUES
  ('ShineAILabs', 'shineailabs', 'enterprise', 'active');

-- Super admin user (password: set via Supabase Auth)
INSERT INTO users (tenant_id, role_id, name, email, phone)
SELECT t.id, r.id, 'Nitin Lal', 'nitin@shineailabs.com', '+919999999999'
FROM tenants t, roles r
WHERE t.slug = 'shineailabs' AND r.name = 'super_admin';

-- ══════════════════════════════════════════════════════
-- DONE! Your multi-tenant schema is ready.
-- Next: Build authentication + RBAC in Next.js
-- ══════════════════════════════════════════════════════

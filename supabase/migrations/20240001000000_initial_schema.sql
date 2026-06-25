-- =============================================================================
-- Rinsion Product A — Initial Schema
-- Spec reference: Rinsion_Database_Diagram.md (V3 ERD)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE employee_role AS ENUM ('admin', 'employee');

-- draft is reserved for Product B customer submissions; not exposed in Product A UI
CREATE TYPE order_status AS ENUM ('draft', 'received', 'confirmed', 'processing', 'ready', 'collected', 'cancelled');

CREATE TYPE order_priority AS ENUM ('normal', 'express', 'urgent');

CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money', 'card', 'bank_transfer');

CREATE TYPE sms_status AS ENUM ('queued', 'sent', 'failed');

CREATE TYPE sms_trigger_event AS ENUM (
  'ORDER_CREATED',
  'ORDER_READY',
  'PICKUP_CODE_RESEND',
  'RENEWAL_REMINDER_3_DAYS',
  'RENEWAL_REMINDER_1_DAY',
  'RENEWAL_REMINDER_DAY_OF',
  'QUOTA_WARNING_70'
);

CREATE TYPE subscription_plan AS ENUM ('trial', 'starter', 'growth');

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'soft_block',
  'hard_block',
  'locked',
  'cancelled'
);

CREATE TYPE subscription_payment_type AS ENUM (
  'cycle_renewal',
  'upgrade_prorate',
  'trial_conversion'
);

CREATE TYPE subscription_payment_method AS ENUM ('manual_momo', 'paystack');

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE laundries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_code TEXT       NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id  UUID        NOT NULL REFERENCES laundries(id),
  branch_code TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- phone is NOT NULL for both roles — used for sub notifications and quota warnings
CREATE TABLE employees (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID          UNIQUE REFERENCES auth.users(id),
  laundry_id      UUID          NOT NULL REFERENCES laundries(id),
  branch_id       UUID          NOT NULL REFERENCES branches(id),
  role            employee_role NOT NULL DEFAULT 'employee',
  first_name      TEXT          NOT NULL,
  last_name       TEXT          NOT NULL,
  email           TEXT          NOT NULL,
  phone           TEXT          NOT NULL,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- total_orders and lifetime_revenue are NOT stored — computed at read time
-- phone unique per laundry: if two people share a phone, they share a customer record
CREATE TABLE customers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id       UUID        NOT NULL REFERENCES laundries(id),
  customer_code    TEXT        NOT NULL,
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  first_visit_date DATE,
  last_visit_date  DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  UNIQUE (laundry_id, phone)
);

CREATE TABLE item_types (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id  UUID        NOT NULL REFERENCES laundries(id),
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE services (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id  UUID        NOT NULL REFERENCES laundries(id),
  name        TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- The pricing matrix: one row per laundry × item type × service combination
CREATE TABLE item_service_prices (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id   UUID         NOT NULL REFERENCES laundries(id),
  item_type_id UUID         NOT NULL REFERENCES item_types(id),
  service_id   UUID         NOT NULL REFERENCES services(id),
  price        DECIMAL(10,2) NOT NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (laundry_id, item_type_id, service_id)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

CREATE TABLE orders (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          TEXT          NOT NULL UNIQUE,
  -- 5-digit numeric string, generated at creation, never regenerated
  pickup_code           CHAR(5)       NOT NULL,
  laundry_id            UUID          NOT NULL REFERENCES laundries(id),
  branch_id             UUID          NOT NULL REFERENCES branches(id),
  customer_id           UUID          NOT NULL REFERENCES customers(id),
  created_by_employee_id UUID         NOT NULL REFERENCES employees(id),
  status                order_status  NOT NULL DEFAULT 'received',
  priority              order_priority NOT NULL DEFAULT 'normal',
  pickup_date           DATE,
  subtotal              DECIMAL(10,2) NOT NULL DEFAULT 0,
  total                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

-- unit_price is locked at creation time — never joined through item_service_prices at read time
CREATE TABLE order_items (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID         NOT NULL REFERENCES orders(id),
  item_type_id UUID         NOT NULL REFERENCES item_types(id),
  service_id   UUID         NOT NULL REFERENCES services(id),
  quantity     INT          NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   DECIMAL(10,2) NOT NULL,
  total_price  DECIMAL(10,2) NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- created_by_type supports future Product B customer notes without schema changes
CREATE TABLE order_notes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID        NOT NULL REFERENCES orders(id),
  created_by_type TEXT        NOT NULL DEFAULT 'employee',
  created_by_id   UUID,
  note            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- amount_paid and balance_due are NEVER stored — computed from this table at read time
CREATE TABLE payments (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID           NOT NULL REFERENCES orders(id),
  recorded_by_employee_id UUID         NOT NULL REFERENCES employees(id),
  amount                DECIMAL(10,2)  NOT NULL CHECK (amount > 0),
  payment_method        payment_method NOT NULL,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE order_status_history (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID         NOT NULL REFERENCES orders(id),
  employee_id     UUID         NOT NULL REFERENCES employees(id),
  previous_status order_status,
  new_status      order_status NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- Every SMS attempt is logged here — critical for debugging and quota accounting
CREATE TABLE sms_messages (
  id                 UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id         UUID              NOT NULL REFERENCES laundries(id),
  -- nullable: renewal reminders and quota warnings have no associated order
  order_id           UUID              REFERENCES orders(id),
  -- nullable: system-to-admin SMS has no associated customer
  customer_id        UUID              REFERENCES customers(id),
  phone              TEXT              NOT NULL,
  message            TEXT              NOT NULL,
  trigger_event      sms_trigger_event NOT NULL,
  provider           TEXT              NOT NULL DEFAULT 'mnotify',
  provider_message_id TEXT,
  status             sms_status        NOT NULL DEFAULT 'queued',
  -- set at send time, not computed later — see Rinsion_Technical_Overview.md §11
  counts_toward_cap  BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  sent_at            TIMESTAMPTZ,
  failed_at          TIMESTAMPTZ,
  error_message      TEXT
);

-- ---------------------------------------------------------------------------
-- Activity logging
-- ---------------------------------------------------------------------------

-- action_type uses TEXT (not enum) to allow new types without migrations
CREATE TABLE activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id  UUID        NOT NULL REFERENCES laundries(id),
  order_id    UUID        REFERENCES orders(id),
  employee_id UUID        REFERENCES employees(id),
  action_type TEXT        NOT NULL,
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

CREATE TABLE settings (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id                UUID        NOT NULL UNIQUE REFERENCES laundries(id),
  allow_partial_payments    BOOLEAN     NOT NULL DEFAULT FALSE,
  allow_express_orders      BOOLEAN     NOT NULL DEFAULT FALSE,
  allow_customer_submissions BOOLEAN    NOT NULL DEFAULT FALSE,
  require_pickup_code       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------

-- sms_quota is denormalized for the cycle — locked at cycle start, updated on upgrade
-- A laundry has one non-cancelled subscription at a time; history retained with status = cancelled
CREATE TABLE subscriptions (
  id                    UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id            UUID                 NOT NULL REFERENCES laundries(id),
  plan                  subscription_plan    NOT NULL,
  status                subscription_status  NOT NULL DEFAULT 'trialing',
  cycle_start_date      DATE                 NOT NULL,
  cycle_end_date        DATE                 NOT NULL,
  sms_quota             INT                  NOT NULL,
  -- NULL means 70% warning not yet sent this cycle; cleared when new cycle begins
  sms_warning_70_sent_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- Immutable financial ledger — NEVER soft-deleted
-- plan_at_payment is snapshotted at payment time so historical records survive plan changes
CREATE TABLE subscription_payments (
  id                      UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id         UUID                       NOT NULL REFERENCES subscriptions(id),
  laundry_id              UUID                       NOT NULL REFERENCES laundries(id),
  amount                  DECIMAL(10,2)              NOT NULL,
  plan_at_payment         subscription_plan          NOT NULL,
  payment_type            subscription_payment_type  NOT NULL,
  payment_method          subscription_payment_method NOT NULL,
  -- Paystack transaction reference; NULL for manual_momo payments
  external_reference      TEXT,
  cycle_start_date        DATE                       NOT NULL,
  cycle_end_date          DATE                       NOT NULL,
  -- Rinsion internal admin who verified the MoMo payment; NULL for Paystack auto-reconciled
  recorded_by_employee_id UUID                       REFERENCES employees(id),
  paid_at                 TIMESTAMPTZ                NOT NULL,
  created_at              TIMESTAMPTZ                NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_branches_laundry_id                ON branches(laundry_id);
CREATE INDEX idx_employees_auth_user_id              ON employees(auth_user_id);
CREATE INDEX idx_employees_laundry_id                ON employees(laundry_id);
CREATE INDEX idx_customers_laundry_id                ON customers(laundry_id);
CREATE INDEX idx_customers_phone                     ON customers(laundry_id, phone);
CREATE INDEX idx_item_types_laundry_id               ON item_types(laundry_id);
CREATE INDEX idx_services_laundry_id                 ON services(laundry_id);
CREATE INDEX idx_item_service_prices_laundry_id      ON item_service_prices(laundry_id);
CREATE INDEX idx_orders_laundry_id                   ON orders(laundry_id);
CREATE INDEX idx_orders_customer_id                  ON orders(customer_id);
CREATE INDEX idx_orders_status                       ON orders(laundry_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_pickup_code                  ON orders(laundry_id, pickup_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_items_order_id                ON order_items(order_id);
CREATE INDEX idx_payments_order_id                   ON payments(order_id);
CREATE INDEX idx_order_status_history_order_id       ON order_status_history(order_id);
-- Cap-eligible SMS count query — see Rinsion_Technical_Overview.md §11
CREATE INDEX idx_sms_messages_cap_query              ON sms_messages(laundry_id, counts_toward_cap, created_at);
-- Failure count query for 24h rolling window
CREATE INDEX idx_sms_messages_failures               ON sms_messages(laundry_id, status, created_at);
CREATE INDEX idx_activity_logs_laundry_id            ON activity_logs(laundry_id);
CREATE INDEX idx_activity_logs_order_id              ON activity_logs(order_id);
CREATE INDEX idx_subscriptions_laundry_id            ON subscriptions(laundry_id);
-- Daily advancer job scans active/soft_block/hard_block subscriptions
CREATE INDEX idx_subscriptions_status_cycle          ON subscriptions(status, cycle_end_date);
CREATE INDEX idx_subscription_payments_laundry_id    ON subscription_payments(laundry_id);

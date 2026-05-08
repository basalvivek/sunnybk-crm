-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT true
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(30),
  role          VARCHAR(50) NOT NULL DEFAULT 'Staff',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee ↔ Department junction
CREATE TABLE IF NOT EXISTS employee_departments (
  employee_id   INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, department_id)
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  customer_code VARCHAR(20) NOT NULL UNIQUE,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(30) NOT NULL,
  whatsapp      VARCHAR(30),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city          VARCHAR(100),
  postcode      VARCHAR(20),
  source        VARCHAR(50) NOT NULL DEFAULT 'Phone',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate customer_code: CUS-00001
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.customer_code := 'CUS-' || LPAD(NEW.id::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_customer_code
BEFORE INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION generate_customer_code();

-- Enquiries
CREATE TABLE IF NOT EXISTS enquiries (
  id               SERIAL PRIMARY KEY,
  enquiry_code     VARCHAR(20) NOT NULL UNIQUE,
  customer_id      INT NOT NULL REFERENCES customers(id),
  assigned_to      INT REFERENCES employees(id),
  created_by       INT REFERENCES employees(id),
  product_interest VARCHAR(100),
  channel          VARCHAR(50) NOT NULL DEFAULT 'Phone',
  description      TEXT,
  priority         VARCHAR(20) NOT NULL DEFAULT 'Normal',
  budget_estimate  NUMERIC(10,2),
  status           VARCHAR(50) NOT NULL DEFAULT 'New',
  enquiry_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate enquiry_code: ENQ-00001
CREATE OR REPLACE FUNCTION generate_enquiry_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.enquiry_code := 'ENQ-' || LPAD(NEW.id::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_enquiry_code
BEFORE INSERT ON enquiries
FOR EACH ROW EXECUTE FUNCTION generate_enquiry_code();

-- Enquiry logs
CREATE TABLE IF NOT EXISTS enquiry_logs (
  id                SERIAL PRIMARY KEY,
  enquiry_id        INT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  logged_by         INT REFERENCES employees(id),
  channel           VARCHAR(50) NOT NULL DEFAULT 'Internal Note',
  notes             TEXT NOT NULL,
  status_changed_to VARCHAR(50),
  log_date          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visits (Module 2)
CREATE TABLE IF NOT EXISTS visits (
  id                  SERIAL PRIMARY KEY,
  visit_code          VARCHAR(20) NOT NULL UNIQUE,
  enquiry_id          INT NOT NULL REFERENCES enquiries(id),
  customer_id         INT NOT NULL REFERENCES customers(id),
  engineer_id         INT REFERENCES employees(id),
  scheduled_date      DATE NOT NULL,
  scheduled_time      TIME,
  duration_minutes    INT NOT NULL DEFAULT 60,
  visit_type          VARCHAR(50) NOT NULL DEFAULT 'Survey',
  status              VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
  notes               TEXT,
  cancellation_reason TEXT,
  rescheduled_from    INT REFERENCES visits(id),
  created_by          INT REFERENCES employees(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_visit_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.visit_code := 'VIS-' || LPAD(NEW.id::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_visit_code
BEFORE INSERT ON visits
FOR EACH ROW EXECUTE FUNCTION generate_visit_code();

-- Seed data
INSERT INTO departments (name) VALUES
  ('Sales'), ('Design'), ('Installation'), ('Admin'), ('Management')
ON CONFLICT DO NOTHING;

INSERT INTO employees (employee_code, first_name, last_name, email, phone, role) VALUES
  ('EMP-00001', 'Admin', 'User', 'admin@sunnybk.com', '07000000000', 'Admin')
ON CONFLICT DO NOTHING;

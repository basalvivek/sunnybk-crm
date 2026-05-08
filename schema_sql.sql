-- SUNNY BEDROOMS & KITCHENS - DATABASE SCHEMA - Module 1

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT, is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY, employee_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL, phone VARCHAR(20),
    role VARCHAR(100), is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_departments (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(employee_id, department_id)
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY, customer_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150), phone VARCHAR(20) NOT NULL, whatsapp VARCHAR(20),
    address_line1 VARCHAR(200), address_line2 VARCHAR(200),
    city VARCHAR(100), postcode VARCHAR(20),
    source VARCHAR(50) DEFAULT 'Phone', notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquiries (
    id SERIAL PRIMARY KEY, enquiry_code VARCHAR(20) UNIQUE NOT NULL,
    customer_id INT REFERENCES customers(id) ON DELETE RESTRICT,
    assigned_to INT REFERENCES employees(id) ON DELETE SET NULL,
    enquiry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_interest VARCHAR(100) NOT NULL,
    channel VARCHAR(50) DEFAULT 'Phone',
    description TEXT, status VARCHAR(50) DEFAULT 'New',
    priority VARCHAR(20) DEFAULT 'Normal',
    budget_estimate DECIMAL(10,2),
    created_by INT REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquiry_logs (
    id SERIAL PRIMARY KEY,
    enquiry_id INT REFERENCES enquiries(id) ON DELETE CASCADE,
    logged_by INT REFERENCES employees(id) ON DELETE SET NULL,
    log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    channel VARCHAR(50) NOT NULL, notes TEXT NOT NULL,
    status_changed_to VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS customer_seq START 1;
CREATE SEQUENCE IF NOT EXISTS enquiry_seq START 1;
CREATE SEQUENCE IF NOT EXISTS employee_seq START 1;

CREATE OR REPLACE FUNCTION generate_customer_code() RETURNS TRIGGER AS $$
BEGIN NEW.customer_code := 'CUST-' || LPAD(nextval('customer_seq')::TEXT, 4, '0'); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_enquiry_code() RETURNS TRIGGER AS $$
BEGIN NEW.enquiry_code := 'ENQ-' || LPAD(nextval('enquiry_seq')::TEXT, 4, '0'); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_employee_code() RETURNS TRIGGER AS $$
BEGIN NEW.employee_code := 'EMP-' || LPAD(nextval('employee_seq')::TEXT, 4, '0'); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_code ON customers;
CREATE TRIGGER trg_customer_code BEFORE INSERT ON customers FOR EACH ROW WHEN (NEW.customer_code IS NULL OR NEW.customer_code = '') EXECUTE FUNCTION generate_customer_code();

DROP TRIGGER IF EXISTS trg_enquiry_code ON enquiries;
CREATE TRIGGER trg_enquiry_code BEFORE INSERT ON enquiries FOR EACH ROW WHEN (NEW.enquiry_code IS NULL OR NEW.enquiry_code = '') EXECUTE FUNCTION generate_enquiry_code();

DROP TRIGGER IF EXISTS trg_employee_code ON employees;
CREATE TRIGGER trg_employee_code BEFORE INSERT ON employees FOR EACH ROW WHEN (NEW.employee_code IS NULL OR NEW.employee_code = '') EXECUTE FUNCTION generate_employee_code();

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_enquiries_updated_at BEFORE UPDATE ON enquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO departments (name, description) VALUES
    ('Sales', 'Handles customer enquiries and conversions'),
    ('Design', 'Designers who visit sites and create quotes'),
    ('Installation', 'Fitters who install furniture'),
    ('Manufacturing', 'In-house manufacturing team'),
    ('Management', 'Management and administration')
ON CONFLICT (name) DO NOTHING;

INSERT INTO employees (first_name, last_name, email, phone, role, employee_code) VALUES
    ('Admin', 'User', 'admin@sunnybk.com', '02085792777', 'Manager', 'EMP-0001'),
    ('Pav', 'Singh', 'pav@sunnybk.com', '07939000001', 'Designer', 'EMP-0002'),
    ('Muskan', 'Kaur', 'muskan@sunnybk.com', '07939000002', 'Sales', 'EMP-0003')
ON CONFLICT (email) DO NOTHING;

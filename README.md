# Sunny Bedrooms & Kitchens — CRM System
## Module 1: Customer Enquiries

---

## 📁 Project Structure
```
sunnybk/
├── backend/              ← Node.js + Express API
│   ├── controllers/      ← Business logic
│   ├── db/               ← PostgreSQL connection + schema
│   ├── routes/           ← API routes
│   ├── server.js         ← Entry point
│   └── .env.example      ← Environment variables template
└── frontend/             ← React app
    └── src/
        ├── api/          ← Axios API calls
        ├── components/   ← Sidebar, helpers, badges
        └── pages/        ← Dashboard, Enquiries, Customers, Employees
```

---

## ⚙️ Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm

---

## 🚀 Setup Instructions

### Step 1: Setup PostgreSQL Database

```bash
# Open PostgreSQL prompt
psql -U postgres

# Create database
CREATE DATABASE sunnybk_crm;

# Connect to it
\c sunnybk_crm

# Run the schema
\i /path/to/sunnybk/backend/db/schema.sql

# Exit
\q
```

### Step 2: Setup Backend

```bash
cd sunnybk/backend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env — update your PostgreSQL password:
# DB_PASSWORD=your_postgres_password

# Start backend (development mode with auto-reload)
npm run dev

# Backend runs on: http://localhost:5000
```

### Step 3: Setup Frontend

```bash
cd sunnybk/frontend

# Install dependencies
npm install

# Start frontend
npm start

# Frontend runs on: http://localhost:3000
# (Proxy to backend is pre-configured in package.json)
```

---

## ✅ Verify Setup

1. Open http://localhost:3000 — you should see the Dashboard
2. Test the API: http://localhost:5000/api/enquiries/stats
3. Go to "New Enquiry" and log your first test enquiry

---

## 📊 Database Tables (Module 1)

| Table | Description |
|---|---|
| `departments` | Department master (Sales, Design, Installation, etc.) |
| `employees` | Employee master with codes like EMP-0001 |
| `employee_departments` | Many-to-many: one employee can be in multiple departments |
| `customers` | Customer master with auto-code CUST-0001 |
| `enquiries` | Enquiry records with status tracking, code ENQ-0001 |
| `enquiry_logs` | Full conversation/follow-up history per enquiry |

---

## 🔄 Enquiry Status Flow

```
New → In Progress → Visit Scheduled → Visit Done → Quote Sent
                                                        ↓
                                          Confirmed / Hold / Cancelled
                                                        ↓
                                            Converted to Order
```

---

## 🔌 API Endpoints

### Customers
| Method | URL | Description |
|---|---|---|
| GET | /api/customers | List all (with search) |
| GET | /api/customers/:id | Single customer + enquiries |
| POST | /api/customers | Create customer |
| PUT | /api/customers/:id | Update customer |

### Enquiries
| Method | URL | Description |
|---|---|---|
| GET | /api/enquiries | List (with filters) |
| GET | /api/enquiries/stats | Dashboard counts |
| GET | /api/enquiries/:id | Single + logs |
| POST | /api/enquiries | Create (+ optionally create customer) |
| PUT | /api/enquiries/:id | Update enquiry |
| POST | /api/enquiries/:id/logs | Add follow-up log |

### Employees
| Method | URL | Description |
|---|---|---|
| GET | /api/employees | All active employees |
| GET | /api/departments | All departments |

---

## 📝 Modules Planned

- ✅ **Module 1**: Customer Enquiries + Follow-up Logs + History (DONE)
- 🔜 **Module 2**: Engineer Visit Scheduling + Rescheduling
- 🔜 **Module 3**: Daily Schedule View per Engineer
- 🔜 **Module 4**: Email Notifications (Gmail SMTP)
- 🔜 **Module 5**: Employee & Department Management
- 🔜 **Module 6**: Order Management (after confirmed enquiry)

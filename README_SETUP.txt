ERP BACKEND STARTER (Node.js + Express + MongoDB + JWT)

1) Extract this folder into:
   E:\ERP system\server

2) Install Node.js LTS if it is not installed. In a terminal:
   node -v
   npm -v

3) Make sure MongoDB Community Server is installed and running locally.
   This starter uses:
   mongodb://127.0.0.1:27017/erp_system

4) In VS Code terminal:
   cd "E:\ERP system\server"
   npm install

5) Create a file named .env in E:\ERP system\server
   Copy the contents from .env.example into .env.
   Replace JWT_SECRET with a long random secret. Do not commit .env.

6) Start:
   npm run dev

7) Verify in browser:
   http://localhost:5000/api/health
   Expected JSON: {"success":true,"message":"ERP API is running",...}

API endpoints:
POST /api/auth/register
POST /api/auth/login
GET    /api/employees          (Bearer JWT required)
GET    /api/employees/:id      (Bearer JWT required)
POST   /api/employees          (Bearer JWT required)
PUT    /api/employees/:id      (Bearer JWT required)
DELETE /api/employees/:id      (Bearer JWT required)

Register body:
{"name":"Admin Demo","email":"admin@example.com","password":"change-this-password"}

Login body:
{"email":"admin@example.com","password":"change-this-password"}

Use the token returned by login as:
Authorization: Bearer <token>

IMPORTANT:
- The employee API is protected by JWT.
- Public /register creates employee-role accounts only. It is for initial development;
  before deployment, restrict signup to admin invitations/approval.
- The existing React UI has not been modified by this starter.
- To connect Employees.jsx without breaking its current field names and forms,
  use the current src/pages/Employees.jsx file as the source. Upload that file next
  so the API calls can be added to the exact current implementation.
- This is a local development scaffold, not production-ready security configuration.

# ================= SERVER =================
PORT=3001
NODE_ENV=development

# ================= DATABASE =================
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/tracking_vaccine?sslmode=require

# ================= APP LOGIC =================
PARENT_ROLE_NAME="Parent/Guardian"

# ================= JWT =================
JWT_SECRET=dev_super_secret_key_change_this
JWT_EXPIRES_IN=7d

# ================= URLS =================
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

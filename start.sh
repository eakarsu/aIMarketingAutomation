#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DB_NAME="ai_marketing"

echo "=========================================="
echo "  AI Marketing Automation - Startup Script"
echo "=========================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"
echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  # Try to connect to PostgreSQL server
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  # Create database if it doesn't exist
  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Clean up processes on the ports
echo ""
echo "==> Cleaning up processes on ports ${BACKEND_PORT} and ${FRONTEND_PORT}..."
for PORT in ${BACKEND_PORT} ${FRONTEND_PORT}; do
  if lsof -ti tcp:"${PORT}" >/dev/null 2>&1; then
    echo "Found processes on port ${PORT}, killing them..."
    lsof -ti tcp:"${PORT}" | xargs kill -9 || true
    sleep 1
  fi
done
echo "Ports are clear."

# ========== BACKEND SETUP ==========
echo ""
echo "==> Setting up Backend..."
cd "$BACKEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "==> Installing backend dependencies..."
  npm install
else
  echo "Backend dependencies already installed."
fi

# Generate Prisma client
echo ""
echo "==> Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ""
echo "==> Running Prisma migrations..."
npx prisma db push || {
  echo "Migration failed. Trying to create initial schema..."
  npx prisma db push --force-reset
}

# Update .env file with current DATABASE_URL
echo ""
echo "==> Updating backend .env file..."
if [ -f ".env" ]; then
  if grep -q "^DATABASE_URL=" .env; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  fi
else
  echo "DATABASE_URL=\"${DATABASE_URL}\"" > .env
  echo "JWT_SECRET=\"ai-marketing-secret-change-in-production\"" >> .env
  echo "PORT=${BACKEND_PORT}" >> .env
fi

# Check if database has been seeded
echo ""
echo "==> Checking if database needs seeding..."
CONTACT_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"Contact\";" 2>/dev/null | tr -d ' ' || echo "0")
if [ "${CONTACT_COUNT}" = "0" ] || [ -z "${CONTACT_COUNT}" ]; then
  echo "Database appears empty. Running seed..."
  npm run prisma:seed || npx tsx prisma/seed.ts
else
  echo "Database already contains data (${CONTACT_COUNT} contacts). Skipping seed."
fi

# ========== FRONTEND SETUP ==========
echo ""
echo "==> Setting up Frontend..."
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "==> Installing frontend dependencies..."
  npm install
else
  echo "Frontend dependencies already installed."
fi

# ========== START SERVICES ==========
echo ""
echo "=========================================="
echo "  Starting AI Marketing Automation"
echo "=========================================="
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "==> Shutting down services..."
  if [ ! -z "${BACKEND_PID:-}" ]; then
    kill $BACKEND_PID 2>/dev/null || true
  fi
  if [ ! -z "${FRONTEND_PID:-}" ]; then
    kill $FRONTEND_PID 2>/dev/null || true
  fi
  echo "All services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "==> Starting backend on port ${BACKEND_PORT}..."
cd "$BACKEND_DIR"
npm run dev &
BACKEND_PID=$!
sleep 3

# Check if backend started
if ! kill -0 $BACKEND_PID 2>/dev/null; then
  echo "ERROR: Backend failed to start!"
  exit 1
fi
echo "Backend started (PID: $BACKEND_PID)"

# Start frontend
echo ""
echo "==> Starting frontend on port ${FRONTEND_PORT}..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
sleep 3

# Check if frontend started
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
  echo "ERROR: Frontend failed to start!"
  cleanup
  exit 1
fi
echo "Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "=========================================="
echo "  AI Marketing Automation is running!"
echo "=========================================="
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  Backend API: http://localhost:${BACKEND_PORT}"
echo ""
echo "Demo credentials:"
echo "  Email: demo@example.com"
echo "  Password: demo123"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

#!/usr/bin/env bash
set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DB_NAME="ai_marketing"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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
  DB_EXISTS=0
  set +o pipefail
  if psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then DB_EXISTS=1; fi
  if [ "${DB_EXISTS}" = "0" ] && psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then DB_EXISTS=1; fi
  set -o pipefail
  if [ "${DB_EXISTS}" = "0" ]; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      # Recheck — another process may have created it; or it already existed
      if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" || \
         psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
        echo "Database '${DB_NAME}' already exists (after retry)."
      else
        echo "Could not create database automatically."
        echo "Please create it manually: createdb ${DB_NAME}"
        exit 1
      fi
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

# Update root .env file with current DATABASE_URL
echo ""
echo "==> Updating root .env file..."
ROOT_ENV="$SCRIPT_DIR/.env"
if [ -f "$ROOT_ENV" ]; then
  if grep -q "^DATABASE_URL=" "$ROOT_ENV"; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$ROOT_ENV" 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" "$ROOT_ENV"
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> "$ROOT_ENV"
  fi
else
  echo "DATABASE_URL=\"${DATABASE_URL}\"" > "$ROOT_ENV"
  echo "JWT_SECRET=\"ai-marketing-secret-change-in-production\"" >> "$ROOT_ENV"
  echo "PORT=${BACKEND_PORT}" >> "$ROOT_ENV"
  echo "NODE_ENV=development" >> "$ROOT_ENV"
  echo "" >> "$ROOT_ENV"
  echo "# OpenRouter AI Configuration" >> "$ROOT_ENV"
  echo "OPENROUTER_API_KEY=\"your-openrouter-api-key-here\"" >> "$ROOT_ENV"
  echo "OPENROUTER_MODEL=\"anthropic/claude-haiku-4.5\"" >> "$ROOT_ENV"
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
echo -e "${GREEN}=========================================="
echo "  AI Marketing Automation is running!"
echo "==========================================${NC}"
echo ""
echo -e "${CYAN}Access the application at:${NC}"
echo -e "  Frontend:    ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  Backend API: ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "  Health:      ${GREEN}http://localhost:${BACKEND_PORT}/api/health${NC}"
echo ""
echo -e "${CYAN}Demo credentials:${NC}"
echo -e "  Email:    ${YELLOW}demo@example.com${NC}"
echo -e "  Password: ${YELLOW}demo123${NC}"
echo ""
echo -e "${CYAN}AI Features Available:${NC}"
echo "  - AI Segment Builder      - AI Customer Persona Creator"
echo "  - AI Journey Optimizer    - AI Influencer Matcher"
echo "  - AI Attribution Modeler  - AI Hashtag Generator"
echo "  - AI Budget Allocator     - AI Landing Page Builder"
echo "  - AI Fatigue Detector     - Plus 8 more AI tools!"
echo ""
echo -e "${YELLOW}Hot reload is enabled - your code changes will be detected automatically${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

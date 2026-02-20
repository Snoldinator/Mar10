#!/usr/bin/env bash
# Mar10 Tournament Manager — Development Server Setup
# Run from the project root: bash setup.sh

set -euo pipefail

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Mar10 Tournament Manager — Setup       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Check working directory ───────────────────────────────────────────────
if [[ ! -f "package.json" ]] || ! grep -q '"name": "mar10"' package.json 2>/dev/null; then
  error "Run this script from the Mar10 project root (the folder containing package.json)."
fi
PROJ_DIR="$(pwd)"
info "Project directory: $PROJ_DIR"

# ── 2. Check Node.js ─────────────────────────────────────────────────────────
info "Checking Node.js..."
if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Install Node.js >= 20.9.0 from https://nodejs.org or via nvm:\n  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash\n  nvm install 22"
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

# Require >= 20.9.0 (Next.js 16 requirement)
if [[ "$NODE_MAJOR" -lt 20 ]] || { [[ "$NODE_MAJOR" -eq 20 ]] && [[ "$NODE_MINOR" -lt 9 ]]; }; then
  error "Node.js $NODE_VERSION is too old. Next.js 16 requires >= 20.9.0.\n  Install a newer version: nvm install 22 && nvm use 22"
fi
success "Node.js $NODE_VERSION"

# ── 3. Check npm ─────────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  error "npm not found. It should ship with Node.js."
fi
success "npm $(npm --version)"

# ── 4. Check native build tools (needed for better-sqlite3) ─────────────────
info "Checking native build tools (required for better-sqlite3)..."
if [[ "$(uname -s)" == "Linux" ]]; then
  MISSING_TOOLS=()
  command -v make   &>/dev/null || MISSING_TOOLS+=("make")
  command -v python3 &>/dev/null || MISSING_TOOLS+=("python3")
  command -v gcc    &>/dev/null || MISSING_TOOLS+=("gcc")

  if [[ ${#MISSING_TOOLS[@]} -gt 0 ]]; then
    warn "Missing build tools: ${MISSING_TOOLS[*]}"
    warn "better-sqlite3 requires native compilation. Install with:"
    warn "  Ubuntu/Debian: sudo apt-get install -y build-essential python3"
    warn "  RHEL/Fedora:   sudo dnf groupinstall 'Development Tools' && sudo dnf install python3"
    warn ""
    warn "Attempting to continue — npm install may fail without them."
  else
    success "Build tools available (make, python3, gcc)"
  fi
elif [[ "$(uname -s)" == "Darwin" ]]; then
  if ! xcode-select -p &>/dev/null; then
    warn "Xcode Command Line Tools not found. Install with: xcode-select --install"
  else
    success "Xcode Command Line Tools available"
  fi
fi

# ── 5. Install npm dependencies ──────────────────────────────────────────────
info "Installing npm dependencies (this may take a minute)..."
npm install
success "npm dependencies installed"

# ── 6. Set up .env ───────────────────────────────────────────────────────────
info "Checking .env configuration..."
if [[ -f ".env" ]]; then
  warn ".env already exists — skipping creation. Edit it manually if needed."
else
  # Generate a cryptographically random AUTH_SECRET
  if command -v openssl &>/dev/null; then
    AUTH_SECRET=$(openssl rand -base64 32)
  else
    # Fallback: use Node.js crypto
    AUTH_SECRET=$(node -e "require('crypto').randomBytes(32).toString('base64')" 2>/dev/null || echo "CHANGE_ME_$(date +%s)")
  fi

  cat > .env <<EOF
# Database
DATABASE_URL="file:./prisma/dev.db"

# Auth.js — keep this secret, never commit it
AUTH_SECRET="${AUTH_SECRET}"

# App URL (update if not running on localhost:3000)
NEXTAUTH_URL="http://localhost:3000"
EOF
  success ".env created with generated AUTH_SECRET"
  warn "Review .env and update NEXTAUTH_URL if deploying on a non-default host/port."
fi

# ── 7. Run Prisma migrations ─────────────────────────────────────────────────
info "Running database migrations..."
# Use deploy (not dev) for server environments — applies existing migrations without prompting
npx prisma migrate deploy
success "Database migrations applied"

# ── 8. Generate Prisma client ────────────────────────────────────────────────
info "Generating Prisma client..."
npx prisma generate
success "Prisma client generated"

# ── 9. Seed the database ─────────────────────────────────────────────────────
info "Seeding database (creates default admin user if not present)..."
npx tsx prisma/seed.ts
success "Database seeded"

# ── 10. Build the application ────────────────────────────────────────────────
info "Building Next.js application..."
node node_modules/next/dist/bin/next build
success "Application built"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Setup complete!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Start the dev server:    ${CYAN}npm run dev${NC}"
echo -e "  Start the prod server:   ${CYAN}npm run start${NC}"
echo -e "  Browse the database:     ${CYAN}npm run db:studio${NC}"
echo ""
echo -e "  Default admin login:"
echo -e "    Email:    ${CYAN}admin@mar10.local${NC}"
echo -e "    Password: ${CYAN}admin123${NC}"
echo -e "  ${YELLOW}Change the admin password after first login.${NC}"
echo ""

"# Kong Gateway SDET Assignment

End-to-end test automation for Kong Gateway's administrative UI using Playwright and TypeScript.

## Technology Choices

### Playwright Test Framework
Modern, reliable UI testing framework with TypeScript support. Chosen for auto-waiting capabilities, cross-browser support, and built-in HTML reporting.

### TypeScript
Provides type safety and better IDE support. Catches errors at compile time and makes tests easier to maintain.

### Docker & Docker Compose
Ensures Kong runs in isolated, reproducible environments. Runs PostgreSQL 15 for persistent storage and Kong Gateway 3.5 with all necessary services.

### GitHub Actions
Native CI/CD integration with no setup required. Runs tests automatically on push/PRs and stores artifacts for debugging.

### Serial Test Execution
Tests depend on each other (Test 1 creates a service, Test 2 creates a route using that service). Serial execution ensures consistent state between tests.

### UI Testing
Tests practical user workflows through Kong Manager UI—validates real browser behavior, not just API contracts.

---

## Quick Start

**Prerequisites**: Docker, Node.js 18+, npm

```bash
# Start Kong and PostgreSQL
docker-compose up -d

# Install dependencies
npm install

# Run tests
npm test
```

**CI/CD**: Tests run automatically on push/PRs to `main`. Reports available as GitHub Actions artifacts.

---

## Project Structure

- `tests/` - Test suites
- `playwright.config.ts` - Test configuration
- `docker-compose.yml` - Kong + PostgreSQL setup
- `.github/workflows/ci.yml` - GitHub Actions pipeline" 

## Possible improvements

-The usage of the POM pattern in order to separate the pages from the test excetution
-Adding of a page for having the report tracking or use an instrument like XRay
-Add a self healing system with n8n

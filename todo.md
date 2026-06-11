# Sentinel Home - Project TODO

## Phase 1: Database Schema & Planning

- [x] Design database schema for devices, vulnerabilities, alerts, and notifications
- [x] Implement device categories (smart home, IoT, mobile, laptops, routers, automotive, health, child/pet devices)
- [x] Create severity tier system (Calm, Be Aware, Action Recommended, Immediate Attention)
- [x] Set up database migrations

## Phase 2: Core Dashboard Interface

- [x] Design beautiful, minimalist dashboard layout with calm color palette
- [x] Implement overview page with key metrics (urgent alerts, total vulnerabilities, monitored devices, threat sources)
- [x] Create data visualization components (time-series charts, donut charts for device status)
- [x] Add sidebar navigation with sections (Overview, Alerts, Devices, Database, Intelligence, Translation)
- [x] Implement theme system (light/dark/system) with elegant transitions
- [x] Add responsive design for mobile and tablet

## Phase 3: Vulnerability Tracking & Intelligence

- [x] Build vulnerability list view with filtering and sorting
- [x] Create vulnerability detail cards with CVE information
- [x] Implement severity classification and visual indicators
- [x] Add vulnerability timeline and history tracking
- [x] Create threat source monitoring dashboard
- [x] Implement vulnerability search and filtering

## Phase 4: Device Management & Actions

- [x] Build device inventory management interface
- [x] Create device detail pages with firmware information
- [x] Implement device categorization and grouping
- [x] Add device status monitoring (secure/at risk)
- [x] Create action plan workflows for remediation
- [x] Implement "Tap to Fix" and "Tap to Learn" buttons
- [x] Add firmware update tracking and recommendations

## Phase 5: AI-Powered Features

- [x] Integrate LLM for vulnerability explanations in plain language
- [x] Implement Security Expert Agent for safe, responsible explanations
- [x] Create Notification & Storytelling Agent for gentle nudges
- [ ] Build "What's new since you last checked" feature
- [x] Add progressive disclosure for technical details
- [ ] Implement conversational AI for device security questions

## Phase 6: Testing & Quality Assurance

- [x] Write vitest tests for all tRPC procedures
- [x] Test device management workflows
- [x] Test vulnerability tracking and alerts
- [x] Test AI explanation generation
- [x] Verify responsive design across devices
- [ ] Test accessibility features

## Phase 7: Deployment & Documentation

- [ ] Create comprehensive user documentation
- [ ] Add onboarding flow for new users
- [x] Create checkpoint for deployment
- [ ] Deploy to production

## UI Redesign (Reference: Aura Finance Dashboard)

- [x] Update color palette to 3 colors max (soft purple/blue, light background, dark text)
- [x] Implement soft gradient backgrounds
- [x] Redesign metric cards with rounded corners and icon badges
- [x] Update sidebar to minimal icon-based navigation
- [x] Add subtle shadows and glass morphism effects
- [x] Update typography to match reference (larger headings, lighter weights)
- [x] Redesign charts with softer colors
- [x] Update all pages (Overview, Alerts, Devices, Vulnerabilities) with new design

## Strict 3-Color Palette Update

- [x] Update color system to use only black, white, and oklab(0.7 0.0260473 -0.147721 / 0.2) with 20% opacity
- [x] Remove all purple, green, red, yellow color variations
- [x] Update all badges, icons, and UI elements to use only the 3 specified colors
- [x] Ensure proper contrast and readability with limited palette

## Enterprise SaaS UI Build

- [x] Multi-tenant schema: orgs, members, roles, plans, api_keys
- [x] Extend devices/vulnerabilities/alerts with org_id tenancy
- [x] Push schema migrations
- [x] Marketing landing page (hero, features, pricing, CTA)
- [x] Onboarding wizard (org name, first device, plan)
- [x] DashboardLayout with full sidebar (Overview, Devices, Vulns, Alerts, Agent Console, Team, Billing, Settings)
- [x] Org switcher + user avatar in sidebar
- [ ] Global command palette (Cmd+K) — placeholder toast
- [x] Overview dashboard with metric cards, threat chart, device donut
- [x] Devices page with table, filters, add modal, detail drawer
- [x] Vulnerabilities page with AI explain modal
- [x] Alerts page with timeline, acknowledge, dismiss
- [x] Agent Console page (live agent loop, run history, prompt editor)
- [x] Team page (invite, roles, remove)
- [x] Billing page (plan cards, usage meter, upgrade CTA)
- [x] Settings page (org profile, API keys, notifications, privacy)
- [x] tRPC routers: org, members, devices, vulnerabilities, alerts, billing, agentRun
- [x] Vitest tests for all new routers (25 tests passing)
- [x] Empty states and loading skeletons for all pages
- [x] Final checkpoint and delivery

## Sprint 2: NVD/CISA KEV Live Ingestion Pipeline

- [x] Extend schema: nvd_cve_cache, kev_catalog, device_cve_matches, ingestion_runs tables
- [x] NVD API v2 client: fetch CVEs by lastModified date range, paginate, normalize
- [x] CISA KEV fetcher: pull JSON catalog, upsert into kev_catalog table
- [x] CPE normalization engine: vendor/product alias map, Levenshtein fuzzy match
- [x] Device-to-CVE matching: exact CPE, fuzzy CPE, fingerprint strategies with confidence scores
- [x] Sentinel risk score calculation: CVSS + KEV flag + exploit available + patch status
- [x] Ingestion pipeline orchestrator: incremental delta updates, auto-alert generation
- [x] Auto-alert generation: create org alerts when matched CVE sentinel risk score >= 60
- [x] Intelligence UI page: ingestion controls, matched CVEs, KEV stats, CVE search
- [x] tRPC procedures: intelligence.runs, lastIngestion, triggerIngestion, orgMatches, searchCves, kevStats, getCve
- [x] Intelligence nav item added to sidebar
- [x] OAuth avatarUrl column fix applied (SQL ALTER + db:push)
- [x] 25 vitest tests passing
- [x] Final checkpoint and delivery

## Sprint 3: Automated Ingestion Cron Job (COMPLETED)

- [x] Read server entry point to find where to register cron
- [x] Install node-cron package
- [x] Create server/intelligence/scheduler.ts with 6-hour cron job
- [x] Wire scheduler startup into server boot sequence
- [x] Add intelligence.schedulerStatus tRPC procedure
- [x] Update Intelligence UI to show next scheduled run time, last result, run counts
- [x] Write 15 vitest tests for scheduler logic (mutex, start/stop, state, error handling)
- [x] 40 total tests passing across 3 test files
- [x] Checkpoint and deliver

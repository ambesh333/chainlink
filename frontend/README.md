# Chainlink Agent — Frontend

Next.js 15 dashboard and marketplace UI for Chainlink Agent.

## Features

- **Marketplace** — Browse and purchase data resources with trust scores and pricing
- **Merchant Dashboard** — List resources, track transactions, earnings, and disputes
- **Workflow Builder** — Visual drag-and-drop workflow editor with AI generation
- **x402 Demo Terminal** — Interactive CLI demo of the full agent purchase flow
- **Wallet Auth** — Sign-In With Ethereum via RainbowKit + wagmi (Sepolia testnet)
- **Documentation** — Full interactive docs covering architecture, CRE, privacy, and API reference

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TailwindCSS
- RainbowKit + wagmi (wallet connection)
- Framer Motion (animations)
- TypeScript (strict mode)

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

### Environment Variables

Create `.env` in the frontend root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Build

```bash
npm run build
npm run lint
```

## Key Directories

```
frontend/
├── app/
│   ├── dashboard/          # All dashboard pages (explore, resources, workflows, demo)
│   ├── documentation/      # Interactive docs page
│   └── page.tsx            # Landing page
├── components/
│   ├── workflows/          # Workflow builder components (canvas, nodes, edges)
│   ├── AuthContext.tsx      # SIWE authentication state
│   ├── Navbar.tsx           # Landing navbar
│   ├── Hero.tsx             # Landing hero section
│   ├── FeatureShowcase.tsx  # Feature cards
│   └── PaymentStackScroll.tsx # Payment protocol visualization
└── lib/
    └── wagmi.ts             # Wallet config (Sepolia)
```

## Chainlink Integration Points

- **Workflow Builder** (`components/workflows/`) — UI for creating merchant automations executed by CRE
- **Documentation** (`app/documentation/page.tsx`) — CRE integration docs, privacy flow diagrams, API reference
- **Demo Terminal** (`app/dashboard/demo/`) — Live x402 + escrow + CRE settlement demo

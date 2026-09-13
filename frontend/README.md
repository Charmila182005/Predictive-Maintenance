# Fathom Predictive Maintenance Agent - Frontend

React 19 + Vite 8 + TypeScript 7 + Tailwind v4

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure API base (optional - defaults to localhost:8000)
cp .env.example .env
# Edit .env if backend runs elsewhere

# 3. Start development server
npm run dev
```

Runs at `http://localhost:5173`

## Build for Production

```bash
npm run build
# Output in dist/
```

## Preview Production Build

```bash
npm run preview
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE` | `http://localhost:8000` | Backend API URL |

## Tech Stack

- **React 19** - UI framework
- **Vite 8** - Build tool
- **TypeScript 7** - Type safety
- **Tailwind v4** - Styling
- **React Router 7** - Routing
- **Zustand** - State management
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Recharts** - Charts
- **@radix-ui/react-slot** - Button asChild

## Pages

1. **Dashboard** (`/overview`) - Fleet metrics, risk gauge, distribution, trends
2. **Analyze** (`/analyze`) - Machine assessment input + results
3. **Machine Health** (`/machines`) - Per-machine health (supervisor+)
4. **Alert Center** (`/alerts`) - Alert management with acknowledge/resolve
5. **History** (`/history`) - Filterable assessment log
6. **Insights** (`/insights`) - AI explainability (supervisor+)
7. **Settings** (`/settings`) - Theme, API config, data (admin)

## Authentication

- JWT httpOnly cookies
- Roles: `admin`, `supervisor`, `worker`
- Login at `/login`
- Protected routes redirect to login

## Deployment

### Vercel (recommended)
```bash
vercel --prod
```
Set `VITE_API_BASE` in Vercel dashboard.

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
```

## Project Structure

```
src/
├── components/
│   ├── deck/          # UI components (Button, Panel, Badge, etc.)
│   ├── instrument/    # Charts (RiskGauge, Sparkline, etc.)
│   └── layout/        # AppShell, Sidebar, Topbar
├── context/
│   ├── AuthContext.tsx    # Auth state + login/logout
│   └── ThemeContext.tsx   # Light/dark theme
├── hooks/
│   ├── use-analyze.ts     # Assessment runner
│   └── use-machines.ts    # Machine/assessment/alert data fetching
├── lib/
│   ├── api/
│   │   ├── client.ts      # FastAPI client
│   │   ├── provider.ts    # Predict chain (FastAPI → Gradio → Simulated)
│   │   └── fallback.ts    # Simulated physics engine
│   ├── store/             # Zustand stores
│   ├── types.ts           # TypeScript types
│   ├── domain.ts          # Failure modes, risk mapping
│   ├── derived.ts         # Formulas, formatters
│   ├── stats.ts           # Fleet summaries
│   ├── config.ts          # App config
│   ├── nav.ts             # Navigation (RBAC-aware)
│   └── utils/cn.ts        # Classname helper
├── pages/                 # 7 page components
├── App.tsx                # Routes + RBAC guards
└── main.tsx               # Entry + providers
```

## License

Internal use only.
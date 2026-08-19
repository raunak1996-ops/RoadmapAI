# RoadmapAI

**AI-powered Product Roadmap & Customer Intelligence.**

RoadmapAI connects raw customer feedback (CRM, Zoom calls, sales conversations) to strategic AI
synthesis, RICE-scored feature ideation grounded in your own shipping history, and an interactive
Kanban/Timeline roadmap with simulated GitHub & Slack syncing and PDF status reporting.

**[Live demo →](https://roadmapai-raunak.netlify.app/)** — runs in Demo Mode on deterministic local
synthesis, so it is fully explorable without an API key.

Built with React 19, TypeScript, Tailwind CSS v4, Recharts, jsPDF, Lucide, and the official
[`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK.

---

## The workflow

RoadmapAI is deliberately linear. Each stage is gated by a human approval, so the model never
silently pushes work onto the roadmap.

```
CustomerIssue  ──►  InsightsData  ──►  FeatureIdea  ──►  Ticket
  (signals)         (synthesis)       (RICE-scored)     (execution)
     │                   │                  │                │
   Insights           Insights           Ideation         Roadmap
```

| Tab | What it does |
| --- | --- |
| **Overview** | KPI tiles, issue-intensity bar chart, category distribution pie, delivery trend, live activity, work in flight. |
| **Insights** | Multi-channel signal feed with search/filters, AI strategic synthesis (summary, consolidated themes, risks, recommendations), and the New → Analyzed → Approved pipeline. |
| **Ideation** | AI feature generation grounded in approved signals **and** historical benchmarks; a two-step AI RICE estimator; approval promotes an idea to a roadmap ticket. |
| **Roadmap** | Kanban board with drag-and-drop, a timeline/Gantt view, a slide-over ticket drawer with sub-tasks and epics, live cloud-sync simulation with pulse highlights, and PDF status report generation. |
| **Connect** | Integration hub for GitHub, Slack, Salesforce, Zoom, Gong and Intercom. Toggling a connection actually changes what the app can do. |

### RICE scoring

`score = (reach × impact) ÷ effort`

- **Reach** — 1–100, percent of the enterprise base affected.
- **Impact** — 1 (Low), 2 (Medium), 3 (High).
- **Effort** — 1 (S, ~1wk), 2 (M, ~3wk), 3 (L, ~6wk), 4 (XL, ~10wk), 5 (XXL, ~16wk).

The estimator is deliberately split into two steps. **Reach and Impact** are argued from linked
customer evidence; **Effort** is argued from delivery history. Estimating them in one call lets a
model quietly trade one against the other to reach a flattering score.

---

## Quick start

Requires **Node.js 20+**.

```bash
npm install
```

```bash
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

### Optional: enable live Gemini generation

The app is fully usable without any API key — it falls back to a deterministic local synthesis and
labels every generated artifact as `Local` rather than `Gemini`. To enable live generation:

```bash
cp .env.example .env
```

Then put a key from [Google AI Studio](https://aistudio.google.com/apikey) into `.env`:

```
VITE_GEMINI_API_KEY=your-key-here
```

> **Security note.** Vite inlines every `VITE_`-prefixed variable into the client bundle, so a key
> configured this way is visible to anyone who loads the page. That is fine for local development
> and for a personal demo with a restricted, rate-limited key. Before putting this in front of real
> users, move the three calls in `src/services/aiService.ts` behind your own backend endpoint and
> keep the key server-side.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with HMR. |
| `npm run build` | Type-check and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm run typecheck` | Type-check without emitting. |

---

## Publishing to GitHub Pages

1. Create a repository and push this project to its `main` branch.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The included workflow at `.github/workflows/deploy.yml` builds the app and
   deploys it.

The workflow sets `VITE_BASE_PATH` to `/<repo-name>/` automatically, so assets resolve correctly on
a project site. It also copies `index.html` to `404.html` so deep links work.

To publish with live Gemini generation, add a repository secret named `GEMINI_API_KEY`
(**Settings → Secrets and variables → Actions**). Remember the security note above: that key ends up
in the published JavaScript. Leaving it unset publishes the site in Demo Mode, which is the intended
default.

### Netlify (the canonical deployment)

`netlify.toml` pins the build command, publish directory and Node version, and adds the SPA
fallback. `VITE_BASE_PATH` stays unset so the app serves from the domain root. Vercel and
Cloudflare Pages work the same way: build `npm run build`, publish `dist`.

---

## Project structure

```
src/
├── App.tsx                     # Shell: sidebar, header, tab routing
├── main.tsx                    # React entry point
├── index.css                   # Tailwind v4 import + base styles
├── types.ts                    # Domain model (AppTab, CustomerIssue, FeatureIdea, Ticket, …)
├── data/
│   └── seed.ts                 # Seeded signals, ideas, tickets, integrations, benchmarks
├── state/
│   └── AppContext.tsx          # Reducer, localStorage persistence, toasts, pulse highlights
├── hooks/
│   └── useCloudSync.ts         # Simulated GitHub/Slack activity stream
├── services/
│   ├── geminiClient.ts         # @google/genai wrapper, structured JSON output
│   ├── aiService.ts            # Synthesis, ideation, two-step RICE — each with a local fallback
│   └── pdfService.ts           # jsPDF status report generator
├── lib/
│   ├── utils.ts                # riceScore, categorize, date + formatting helpers
│   └── theme.ts                # Chart colors and status styles
├── components/
│   ├── ui/                     # Card, Button, Badge, Modal, Drawer, Toasts, …
│   ├── layout/                 # Sidebar, mobile tab bar, header
│   ├── insights/               # IssueCard, SynthesisPanel, ApprovalPipeline
│   ├── ideation/               # FeatureCard, two-step RiceModal
│   └── tickets/                # KanbanBoard, TimelineView, TicketDrawer
└── views/                      # One file per tab
```

### Notes on the design

- **Everything degrades.** `src/services/aiService.ts` exports `{ data, source, warning }` from every
  call. If the model errors, the deterministic fallback runs and the UI says so instead of failing.
- **State is local.** The workspace persists to `localStorage` under `roadmapai.state.v1`. The
  header button clears the workspace or reloads the demo data, following whether records actually
  exist; a cleared workspace survives a reload via the persisted `demoLoaded` flag.
- **Cloud sync is simulated.** `useCloudSync` emits a GitHub or Slack event every 9 seconds against a
  ticket that is actually in motion, pulses the matching card, and only uses sources whose
  integration is toggled on. Replacing it with real webhooks is a change confined to that one file.
- **The PDF is hand-laid-out.** `pdfService.ts` owns its own cursor and page breaks rather than
  pulling in a table plugin, which keeps section breaks predictable across page boundaries.

---

## License

MIT — see [LICENSE](LICENSE).

# SubEye v4.0.0 — Claude Code session briefs

Unbuilt work from the 2026-07-27 release-readiness audit. Each brief is
self-contained: open a fresh session, paste the brief, and it has what it needs.

The manual half — anything needing a dashboard login, credentials, or a decision
— is [MANUAL-CHECKLIST.md](MANUAL-CHECKLIST.md).

**v4.0.0 is live on `app.subeye.cc`** (M1, 2026-07-27). The app finally has a
backend that matches it.

## What is left, in order

**Done 2026-07-28:** M2 (EAS production env), M3 (all six landing routes live on
`www.subeye.cc`, apex 301s to it), M4 (Clerk production instance, DNS and all),
and **B6** — the paywall and Pro gating shipped in `72615f8`, which also closed
the "the landing page sells what the app gives away" problem.

1. **B3** crash telemetry — [SENTRY-BRIEF.md](SENTRY-BRIEF.md). A native module,
   so it goes in *before* the first build or it costs a whole build cycle. Its
   privacy-policy half is overdue for RevenueCat regardless.
2. **TestFlight** — [TESTFLIGHT-STEPS.md](TESTFLIGHT-STEPS.md). One App Store
   Connect form and four commands; deliberately skips every IAP prerequisite.
   Nothing has ever run on a device against the deployed API.
3. **M6** the device smoke test, against that build.
4. **M8** → real purchases: Paid Applications agreement (days of lead time), the
   IAP product, RevenueCat's Apple config, and the `appl_` key replacing the
   Test Store one in EAS. [PAYMENTS-BRIEF.md](PAYMENTS-BRIEF.md).
5. **M5** the rest of the store listing — privacy label (now needs a Purchase
   History row), screenshots from the device, description.
6. **B7** rate limiting (mostly the M7 dashboard rule).

The live gap to fix first: the published privacy policy does not name
**RevenueCat**, and states *"no SDK ships inside the app"*. The binary has
shipped one since `72615f8`.

## Already landed on `dev`

Detail lives in the commits; this is only an index so a fresh session knows what
not to redo.

| Commit | What |
| --- | --- |
| `730ce60` | CI + pre-push quality gate |
| `9b94f95` | Privacy policy links, locale-aware legal URLs, real privacy manifest |
| `40ecafe` | Subscription list follows its cursor (was silently capped at 50) |
| `4e3615d` | expo-router `ErrorBoundary` |
| `e532af0` | Category picker + inline create, `brandDomain` field |
| `b89a3c7` | **B1** Sign in with Apple · **B4** category management · **B5** first-run experience · consent notice |
| `9bbe2c2` | **B2** observability config reconciled (`enabled` and `logs.enabled` no longer disagree) |
| `769852a` | Legal URLs prefixed `/en` and `/uk` (tracks the landing redesign) |
| `9ad5003` | Paused/cancelled subscriptions never reached the client — `status=all` |
| `cb65810`, `0742049` | List filters in a native sheet, split header actions, monthly single-currency rows |
| `8aaf525` | Add/edit is a full-screen modal with its own stack + searchable category picker |
| `b07e334`, `3f6bf1f` | **B8** brand picker — the Website field is a searchable logo avatar over Brandfetch, opening on 20 popular services |
| `d7bf701` | Subscription form fits on one screen |
| `0f707ee` | A cancelled subscription reads as finished |
| `c1f2818` | Trend, top and resuming rows replaced by one attention card — **this also changed the dashboard DTO in `packages/shared`, so it is part of what M1 has to deploy** |

Two patterns from that work are load-bearing for anything new:

- **Add/edit is `presentation: "modal"` over its own `Stack`** at
  `app/(tabs)/subscriptions/form/`. One route serves both modes (`?id=` means
  edit). The in-flight draft lives in a React context on the modal's layout
  (`widgets/subscription-form/model/form-context.tsx`) so a pushed sub-screen can
  write into it. Anything that outgrows an action sheet becomes a pushed screen
  in that stack.
- **`headerSearchBarOptions` works on a pushed screen inside that nested stack**
  — the category and brand pickers both use the real `UISearchBar`.

---

## B3 — Client-side crash telemetry

**Moved to its own file: [SENTRY-BRIEF.md](SENTRY-BRIEF.md)**, with the SDK
choice settled (Sentry — the `pe-yhunko` org already exists on the EU region).

Two corrections to what used to be here: there is **no Sentry entry in this
repo's `.mcp.json`** — the MCP is configured globally — and the new DSN var must
be **optional** in `env.ts`, not required. A required var there breaks the test
suite and every EAS environment set up before it, which is exactly how
`EXPO_PUBLIC_REVENUECAT_IOS_KEY` came to block store builds.

The privacy-policy half of that brief is now overdue independently of Sentry:
the published policy claims *"no SDK ships inside the app"* and does not mention
**RevenueCat**, which has shipped since `72615f8`.

---

## B6 — RevenueCat paywall and Pro entitlement

**Moved to its own file: [PAYMENTS-BRIEF.md](PAYMENTS-BRIEF.md).** It carries the
dashboard setup, the implementation brief, the three testing tiers and how to
grant yourself the entitlement.

Two corrections to what used to be here, in case an old copy is still open:
**CSV export is not part of Pro** — it does not exist — and gating categories
touches **four** surfaces, not three (the subscription form's category picker is
the one that gets missed).

---

## B7 — API rate limiting

> The SubEye API (`apps/server`) has no rate limiting. Every endpoint requires
> Clerk auth, so abuse needs an account — but one scripted account can burn Neon
> compute-hours, which is the meter that actually costs money.
>
> Prefer a Cloudflare Rate Limiting rule on `app.subeye.cc` over application
> code: it is free, it runs before the Worker, and it costs zero request
> latency. See manual step **M7** for the suggested rule — the dashboard part is
> yours, this brief is the code/doc half. If the dashboard rule cannot express a
> per-user limit, add the smallest possible Worker-side check — but do not
> introduce a KV namespace or Durable Object for this without saying why in the
> commit message.
>
> Document whatever is chosen in `apps/server/README.md`.

---

## Verified on a simulator, 2026-07-27

Categories screen and counts, the category edit sheet and its delete warning,
the emoji grid, the filter sheet (including Reset and the header dot), the
paused-subscription fix, monthly single-currency rows, and both the create and
edit paths of the add/edit modal with its category picker.

**Still needs real hardware and a production build** — the Apple sign-in flow
end to end with a real Apple ID, notification permission, and anything about
reaching the deployed API. Manual step **M6** is that checklist.

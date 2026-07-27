# subeye.cc — landing page design brief

Paste this into Claude Design. It is written to be self-contained.

---

## What you're designing

A pre-launch marketing site for **SubEye**, a subscription-tracking iPhone app.
The app is built and going through App Store review. The site's job, in order:

1. Make someone want the app.
2. Capture an email so they hear about launch day.
3. Host the Terms and Privacy pages the app links to. (Non-negotiable — see
   *Required routes*.)

There is no App Store link yet. Every download affordance is a **"Coming to the
App Store"** state plus an email field. Do not fake a live badge.

Single page plus two legal pages. English and Ukrainian.

---

## The product, honestly

SubEye is for someone who has quietly accumulated eleven subscriptions and could
not tell you what they cost per year. Not for someone hunting a budgeting suite.

**The thing that makes it different from every competitor: SubEye never touches
your bank.** Rocket Money, Bobby Pro and the rest either link your accounts or
read your email. SubEye asks you to type in what you pay. That sounds like a
weakness and it is the whole pitch — no Plaid, no bank credentials, no inbox
scanning, no "we found 3 subscriptions" surveillance. Say this plainly and early.

### What the app actually does

Do not invent features. This list is exhaustive.

**Sees the money**
- One number on the home screen: what is still going to leave your account this
  month, with the month's own progress underneath so the figure has a
  denominator.
- Next month's forecast, and a six-month spend trend.
- Your most expensive subscription, called out.
- Where it goes, by category.
- Anything resuming from a pause soon.

**Tracks the price over time — this is the unusual one**
- A subscription's price is modelled as a timeline, not a single number: free
  trial → intro discount → standard price → any scheduled change.
- The app knows a trial is about to convert, and what the price becomes.
- Every subscription has a price history you can look at.
- You can schedule a price change ahead of time, or apply one now.

**Manages the lifecycle**
- Pause indefinitely or until a specific date; resume.
- Cancel at period end (you keep what you paid for) or cancel immediately.
- Change your mind and keep it.
- Swipe a row for the action; the app only ever offers actions that are legal
  for that subscription's current state.

**Reminds you**
- A notification the day before a renewal, at 9am, on the device.
- Scheduled entirely on the phone. No push server, no notification tokens.

**Handles real money**
- Five currencies: UAH, USD, EUR, GBP, PLN.
- Daily exchange rates. Everything re-denominates into your home currency, so a
  mix of dollar and hryvnia subscriptions still adds up to one honest total.

**Everyday**
- Search, filter by status, sort by next payment / name / cost.
- Categories with a spend breakdown.
- Real service logos on the rows.
- Works offline against cached data; refreshes silently when you come back.
- English and Ukrainian, following your phone's language.
- Delete your account and everything in it goes, for real.

### Deliberately not features — never imply otherwise

No bank linking. No email scanning. No "we'll cancel it for you." No shared or
family plans. No widgets. No web app. No CSV export yet. No price negotiation.
No ads. No data sale.

---

## Pricing — show it, and show it early

I'm recommending you put pricing on a pre-launch page, which is unusual. The
reason: the loudest unspoken objection to a subscription-tracking app is *"is
this thing going to turn into another subscription I forget about?"* Silence
reads as "we'll work out how to charge you later." Answering it up front is the
strongest trust asset on the page.

Present two columns:

**Free** — Unlimited subscriptions. The full dashboard. Search, filters, every
lifecycle action. Multi-currency with daily rates. Not a trial, not a teaser.

**Pro — $19.99 once** — Renewal reminders. Trial-ending and price-change
tracking. Categories and the spend breakdown. Export.

The line that has to land, in whatever form you find for it: **one payment, not
a subscription.** A subscription tracker charging a monthly subscription is a
joke people will make at your expense, and declining to make it is the point.
Don't over-wink at it — one dry line, then move on.

Frame the number as the **launch price**, and make the email capture worth
something: early signups hear first and get a discount code. That is the
incentive, not a countdown timer.

---

## Required routes — hard constraint

The shipped app opens these URLs from Settings and from the sign-up consent row.
They must resolve, with trailing slashes, exactly:

```
/terms-of-service/
/privacy-policy/
/uk/terms-of-service/
/uk/privacy-policy/
```

English at the root, Ukrainian under `/uk/`. If you propose a different locale
scheme, say so loudly — it means a code change in the app and a new App Store
build.

The legal pages are opened from inside a dark app, so they should feel like the
same product rather than a bare document dump. Readable measure, real type
hierarchy, same palette.

---

## Visual direction

### The palette is locked

These are the app's shipped tokens. The site has to look like the same product.

```
Background     #0f1115
Surface        #171a20
Surface raised #1f232b
Text           #f2f4f8
Muted text     #98a0ae
Brand green    #33a453     accent + interaction
Bright green   #6fd98c     focus, highlights
Amber          #e0a32e     "paused" only
Red            #f87171     destructive only
Category ramp  #e8834e #34c759 #c15cff #d4d640 #4a9eff #f0507e #43d17a
```

Two rules carried over from the app, and they matter:

- **Green is brand and interaction, never "good."** Every amount in a spend
  tracker is money leaving. Amounts stay neutral — do not tint a total green
  because it's a number.
- **Amber means suspended, not wrong.** Red is only for destroying something.

### Read this before you start

Near-black background with a single bright green accent is one of the three
looks AI design defaults to. Here it is a genuine brand constraint, not a
default — but that means **the palette axis is already spent, and you cannot use
it to make the page distinctive.** Distinctiveness has to come from typography,
structure, and the signature element. If you find yourself reaching for a
gradient mesh, a glow behind the hero, or a big number with a small label and a
green underline, you have landed on the template.

### Typography

The app itself uses the system face on purpose — it should feel like iOS, not
like a brand. The site is where the brand gets to speak, so **do not just set
everything in Inter.**

Pick a display face with some measured, mechanical quality. This is a product
about schedules and amounts, not about warmth or craft. One genuinely useful
structural device: **set every amount and date in a monospace or tabular face.**
That is not decoration — it is financial data, columns should align, and it
gives the page a texture the copy alone won't. Let that be a real system, not a
one-off in the pricing table.

### Signature element — the price timeline

Spend your boldness here and keep everything around it quiet.

The one thing SubEye models that nobody else does is a subscription's price
*over time*. Build the page around a real, honest timeline of one subscription's
life:

```
   free trial          intro price          standard
   30 days             3 months             from month 4
   $0.00        →      $4.99         →      $12.99 / mo
   ├──────────────────┼────────────────────┼──────────────────
                                            ▲
                                     this is the part
                                     nobody sees coming
```

That step from $4.99 to $12.99 is the emotional core of the product. A timeline
is one of the few places sequence markers are honest — order carries real
information here, so the structure is telling the truth rather than decorating.

Use it as the hero thesis if it works there. If one orchestrated motion moment
belongs anywhere on this page, it is this timeline advancing and the price
stepping up as it scrolls into view — once, deliberately, respecting
`prefers-reduced-motion`. Not scattered fades everywhere else.

### Device mockups

The app is **dark, portrait, iPhone-only, and uses iOS 26 native chrome**
(Liquid Glass tab bar, transparent nav bars). Any phone frame must be portrait
and dark. Never show a light-mode screenshot; there isn't one.

If you render screen content, use the app's real copy:

- Home: **"LEFT THIS MONTH"** · a large amount · a thin progress bar · "Day 18
  of 31" · "Next month · $284"
- Sections: "Monthly spend / Last six months" · "Most expensive" · "Resuming
  soon"
- List rows: a circular service logo, name, amount, next payment date
- Status words: Active · Paused · Cancelling · Cancelled
- Detail: "Current price" · "Next payment" · "Price history"
- Actions: "Pause" · "Resume" · "Cancel at period end" · "Keep subscription"

### The mark

The app icon is an eye whose pupil is a three-bar chart, in brand green on the
near-black background. An eye watching a number move. Use the shape system —
eye, three bars, that green — but do not just paste the icon at 400px and call
it a hero.

---

## Voice

The app already has one and it is good. Match it. Plain, specific, no filler,
sentence case, active voice.

Real strings from the product, as calibration:

> "Left this month" · "Could not load your numbers." · "Keep subscription" ·
> "A reminder the day before a subscription renews." · "Your account and every
> subscription in it are removed. This cannot be undone."

Notice: it never apologises, never says "oops," never sells. Headlines should
say what happens, not gesture at a feeling. **"See the price change before it
hits you"** is the register. "Take control of your financial future" is not.

Avoid: "effortlessly," "seamlessly," "powerful," "beautiful," "your money, your
rules," and any headline built on "Never ___ again."

---

## Page structure — a starting point, not a spec

Rearrange, merge or cut if you find something better. It has to answer, in
roughly this order: what is it, why should I trust it, what does it do, what
does it cost, when can I have it.

1. **Hero** — the thesis, the coming-soon state, and one email field.
2. **The trust line** — never touches your bank. This is high on the page, not
   buried in a privacy section at the bottom.
3. **The price timeline** — the signature moment.
4. **What it does** — three or four blocks, each with one real screen. See the
   money · manage the lifecycle · get reminded · handle mixed currencies.
5. **Pricing** — two columns, one payment, not a subscription.
6. **Email capture again**, with the early-signup incentive.
7. **Footer** — Terms, Privacy, contact, language switch, © SubEye.

An FAQ is optional and probably earns its place, because there are three real
questions: *Why do I have to type everything in?* (because the alternative is
your bank password) · *Is my data safe?* (what's stored, where, and that you can
delete all of it) · *Android?* (see below).

---

## Constraints

- **iOS first.** Android is undecided. Build any store-badge or platform area so
  a second platform can be switched on later without a redesign, but do not
  promise Android.
- Responsive to 375px. The audience is on a phone; a phone-first read of this
  page is the likely one.
- Visible keyboard focus, `prefers-reduced-motion` respected, real contrast on
  `#98a0ae` over `#0f1115`.
- Fast. This is a static marketing page; it should not ship a framework's worth
  of JavaScript to render text.
- The email form needs a real destination. Note what it should post to; don't
  design around a provider's embedded widget.

---

## Where this ends up

`apps/landing/` in the SubEye monorepo — Bun workspaces, Turbo, Biome (not
ESLint, not Prettier), TypeScript.

**Recommended stack: Astro, static output, deployed to Cloudflare Pages.** The
reasoning is not aesthetic: Astro's i18n routing produces `/terms-of-service/`
and `/uk/terms-of-service/` natively, which is the exact URL contract the
shipped app depends on; it ships zero JavaScript by default; and the API already
runs on Cloudflare. If you propose something else, make sure it satisfies those
routes exactly.

Deliver the design so it can be built as static pages with a small amount of
scoped CSS — no design system to install, no component library dependency.

# subeye.cc — landing page design brief (v2)

Paste this into Claude Design as a fresh start. It supersedes an earlier brief.

**A first attempt already exists and was rejected.** Read *What went wrong* below
before designing anything — it is the most important section here, because the
content architecture from that attempt was right and the visual system was not.

---

## What you're designing

The marketing site for **SubEye**, a subscription-tracking iPhone app. The
site's job, in order:

1. Make someone want the app.
2. Send them to the App Store.
3. Host the Terms and Privacy pages the app links to. (Non-negotiable — see
   *Required routes*.)

**Superseded 2026-08-30 — SubEye shipped.** This section used to say there was
no App Store link and that every download affordance was a "Coming to the App
Store" state plus an email field. The app is live at
`apps.apple.com/app/id6795566917`, the closing card and the fixed bar now say
so, and the hero carries Apple's real badge. The email field never existed and
is not coming back; see *Email form*.

Apple's badge comes with rules that outrank any design instinct — one badge per
layout, minimum 40px tall, a quarter of its height in clear space on every
side, never recoloured, tilted or animated, never redrawn in another language,
and credited in the footer. `apps/landing/CLAUDE.md` carries them, and
`apps/landing/test/appStore.test.ts` enforces the ones a test can reach.

One page, plus two legal pages. English and Ukrainian.

---

## What went wrong last time — read this first

The previous attempt got the copy and the section order broadly right and the
visual system badly wrong. Every failure below is a thing you must not repeat.

1. **Everything was the same card.** A `#171a20` rounded rectangle with a 1px
   white-10% border, repeated about fifteen times at different sizes, was the
   only structural device on the page. Section after section resolved to
   "eyebrow · heading · paragraph · card." There was no rhythm, no compression,
   nothing to distinguish a major moment from a minor one.

2. **Monospace was applied to labels instead of data.** Nine all-caps mono
   eyebrows — `THE PRICE TIMELINE`, `WHAT IT DOES`, `PRICING`, `QUESTIONS`,
   `NEVER ASKED FOR` — turned a meaningful signal into wallpaper and gave the
   whole page a terminal-cosplay feel. Mono is for **numbers and dates only**.
   Amounts, currency codes, day counts, cadences. Never a section label, never
   a heading, never body copy.

3. **No display face.** Headings were a default grotesk at semibold. The type
   carried none of the personality, so the page had none.

4. **The brand's colour ramp went unused.** SubEye ships seven category colours.
   The page was green-on-black and nothing else, which is precisely the AI
   default look.

5. **The signature element was treated as a module.** The price timeline —
   the one thing the whole page exists to show — was rendered inside the same
   card as everything else, with `$0.00`, `$4.99` and `$12.99` set at identical
   size and weight. The escalation *is* the content. Setting it flat threw away
   the page's only real idea.

6. **The hero demonstrated nothing.** Headline left, small stat card right, is
   the single most templated layout on the web.

---

## The product, honestly

SubEye is for someone who has quietly accumulated eleven subscriptions and could
not tell you what they cost per year. Not for someone shopping for a budgeting
suite.

**The thing that separates it from every competitor: SubEye never touches your
bank.** The alternatives either link your accounts or read your inbox. SubEye
asks you to type in what you pay. That sounds like a weakness and it is the
whole pitch — no bank credentials, no inbox scanning, no "we found 3
subscriptions" surveillance. Say it plainly and early.

### What the app actually does

Exhaustive. Do not invent features.

**Sees the money**
- One number on the home screen: what is still going to leave your account this
  month, with the month's own progress underneath so the figure has a
  denominator.
- Next month's forecast with the direction it moved, and what the next twelve
  months come to. (The six-bar trend is gone — it was replaced by the delta.)
- Where it goes, by category. Pro.
- Anything resuming from a pause soon.

**Tracks the price over time — the unusual one**
- A subscription's price is a timeline, not a number: free trial → intro
  discount → standard price → any scheduled change.
- The app knows a trial is about to convert, and what the price becomes.
- Every subscription has a price history you can look at.
- You can schedule a price change ahead, or apply one now.

**Manages the lifecycle**
- Pause indefinitely or until a date; resume.
- Cancel at period end (you keep what you paid for) or cancel immediately.
- Change your mind and keep it.
- Swipe a row for the action; only actions legal for that subscription's current
  state are ever offered.

**Reminds you**
- A notification the day before a renewal, at 9am, scheduled on the device.
- No push server, no notification tokens.

**Handles real money**
- 156 currencies — the ISO-4217 fiat set. State the number; don't list codes,
  and don't render a row of flags. The flags belong in the app's own picker,
  where each one labels a row the reader can tap.
- Daily exchange rates. Everything re-denominates into your home currency, so a
  mix of dollar and hryvnia subscriptions still adds to one honest total.

**Everyday**
- Search, filter by status, sort by next payment / name / cost.
- Categories with a spend breakdown.
- Real service logos on the rows.
- Works offline; there is nothing to be online for.
- iCloud Sync, off by default, free: a switch in Settings → Data that copies the
  store document to the user's own iCloud so a second device sees the same list.
  Apple's transport, not a SubEye server, and still no account.
- Home Screen widgets. Pro.
- English and Ukrainian, following the phone's language.
- Erase all data wipes the device — and the iCloud copy, when sync is on.

### Never imply these

No bank linking. No email scanning. No "we'll cancel it for you." No shared or
family plans. No SubEye account, ever — iCloud Sync rides the user's own Apple
Account and is never described as signing in. No web app. No CSV export yet. No
ads. No data sale.
**No Android — do not mention it at all**, not in copy, not in an FAQ, not as a
greyed-out badge. The product is an iPhone app. Raising the platform question
only invites it.

---

## Pricing

Show it. The loudest unspoken objection to a subscription tracker is *"is this
going to become another subscription I forget about?"* Silence reads as "we'll
work out how to charge you later," so answering up front is the strongest trust
asset on the page after the bank line.

**Free** — Unlimited subscriptions. The full dashboard. Search, filters, every
lifecycle action. Multi-currency at daily rates. Not a trial, not a teaser.

**Pro — $11.99 once** — Control over when reminders land. Trial-ending
reminders. The price history on each subscription. Categories, the category
filter and the spend breakdown. Home Screen widgets.

Two things have to land:

**One payment, not a subscription.** A subscription tracker charging monthly is
a joke people will make at your expense; declining to make it is the point. One
dry line, then move on — don't over-wink at it.

**Priced for where you live.** SubEye uses per-storefront pricing: about ₴199 in
Ukraine, $11.99 in the US, adjusted elsewhere. This is real — Apple supports it
— and almost no indie app says it out loud. It is a second trust signal of the
same kind as the bank line, and it should be designed as one, not buried as a
footnote. A visitor on a Ukrainian storefront should see hryvnia.

**$11.99 is the price, not a launch price** (decided 2026-07-27). No
introductory framing, no promo codes, no first-100-free, no countdown and no
"only N spots left". A page whose whole argument is that it will not surprise
you later should not open with a price that expires.

---

## Required routes — hard constraint

The shipped app opens these from Settings and from the sign-up consent row. They
must resolve, with trailing slashes, exactly:

```
/en/terms-of-service/
/en/privacy-policy/
/uk/terms-of-service/
/uk/privacy-policy/
```

**Every locale is prefixed, English included** — not the bare root. This changed
in commit `769852a`; `apps/landing/test/routes.test.ts` pins all four strings.
The scheme is App Store Connect metadata a reviewer follows, so proposing a
different one still means new store metadata — say so loudly if you do.

**Superseded 2026-08-25:** the pages no longer own their own copy. Both
documents live in `@subeye/legal` and are rendered by `LegalBody.astro`, which
is also what the app renders in its legal sheet. Design the page; edit the words
in the package or the two surfaces drift.

The legal pages open from inside a dark app, so they should feel like the same
product: readable measure, real hierarchy, same palette. Not a document dump.

---

## Visual direction

### The palette is locked

The app's shipped tokens. The site has to look like the same product.

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

Rules carried from the app:

- **Green is brand and interaction, never "good."** Every amount in a spend
  tracker is money leaving. Amounts stay neutral — never tint a total green
  because it is a number.
- **Amber means suspended, not wrong.** Red only ever means destroying
  something.
- **The category ramp is not decoration and it is not optional here.** Those
  seven colours are how the app draws its spend breakdown. Use them where that
  feature appears. They are the page's only sanctioned escape from two-tone, and
  the last attempt failed partly by ignoring them.

### Where the distinctiveness has to come from

Near-black plus one bright green is a genuine brand constraint here — but it is
also one of the three looks AI design defaults to. **The palette axis is already
spent. You cannot use colour to make this page distinctive.** It has to come
from type, structure, and the signature. If you reach for a gradient mesh, a
glow behind the hero, a hairline-bordered card grid, or a big number with a
small caps label and a green underline, you have landed on the template.

### Typography — three roles, strictly separated

The app deliberately uses the system face so it feels like iOS. The site is
where the brand speaks. **Do not set this in Inter.**

- **Display.** A face with real editorial authority, used only for section
  headings and the hero. An unexpected but defensible direction: a high-contrast
  serif on near-black. That is not the AI-default serif look, because the default
  is a serif on warm cream — a serif over `#0f1115` paired with mono numerals
  reads as financial press, which is exactly this product's world. A condensed
  or expanded grotesk is the other credible route. Pick one, commit, and don't
  hedge with a third.
- **Mono.** Every amount, date, currency code, day count and cadence. This is
  tabular financial data, columns should align, and it gives the page a texture
  the copy alone won't. **Mono never touches a label, an eyebrow, a heading or
  body copy.** Breaking this is what made the last attempt feel like a hacker
  landing page.
- **Body.** A neutral, legible sans. Its job is to disappear.

### Structure

- **At most two module treatments on the whole page**, and the timeline uses
  neither. If a section can be separated by rhythm, a rule, or a change of
  ground instead of a bordered box, do that.
- **Vary vertical rhythm.** Some sections should compress and some should
  breathe. Uniform section heights are what made the last page read as
  generated.
- Section labels: at most two on the page, in the display or body face. Not nine
  in mono.

### Signature element — the price timeline

Spend your boldness here and keep everything around it quiet.

The one thing SubEye models that nobody else does is a subscription's price
*over time*. Build the page around one honest example:

```
   free trial          intro price          standard
   30 days             3 months             from month 4
   $0.00        →      $4.99         →      $12.99 / mo
   ├──────────────────┼────────────────────┼──────────────────
                                            ▲
                                     this is the part
                                     nobody sees coming
```

Non-negotiable this time:

- **The escalation must be visible in the type itself.** `$0.00` small, `$4.99`
  larger, `$12.99` largest and heaviest. Setting the three at one size — which
  is what happened last time — throws away the entire idea. Scale is the
  argument.
- **It must break the page's grid.** Full-bleed, or the widest thing on the
  page, or on its own ground. It must not be a card among cards.
- A timeline is one of the few places sequence markers are honest — order
  carries real information here, so the structure is telling the truth rather
  than decorating.

If one orchestrated motion moment belongs anywhere, it is this timeline
advancing and the price stepping up as it scrolls into view. Once, deliberately,
`prefers-reduced-motion` respected. **No scroll-reveal on other sections** —
that is the clearest AI-design tell there is.

### Device mockups

The app is **dark, portrait, iPhone-only, iOS 26 native chrome** (Liquid Glass
tab bar, transparent nav bars). Any frame is portrait and dark; there is no
light mode.

No screenshots exist yet — design the mockups. If a phone screen is too small to
read at page scale, either crop to one legible component or drop it. Last time
the phone content was illegible, which made it decoration.

Use the app's real copy:

- Home: **"LEFT THIS MONTH"** · a large amount · a thin progress bar · "Day 18
  of 31" · "Next month · $284"
- Sections: "Next month" with an up/down delta chip · "Next 12 months" ·
  "Upcoming" · "Where it goes"
- Rows: circular service logo, name, amount, next payment date
- Status words: Active · Paused · Cancelling · Cancelled
- Detail: "Current price" · "Next payment" · "Price history"
- Actions: "Pause" · "Resume" · "Cancel at period end" · "Keep subscription"

### The mark

The app icon is an eye whose pupil is a three-bar chart, brand green on
near-black. An eye watching a number move. Use the shape system — eye, three
bars, that green — but don't paste the icon at 400px and call it a hero.

---

## Voice

The app has one and it's good. Plain, specific, no filler, sentence case, active.

Calibration, from the product:

> "Left this month" · "Could not load your numbers." · "Keep subscription" ·
> "A reminder the day before a subscription renews." · "Every subscription,
> reminder and setting is removed from this device. This cannot be undone."

It never apologises, never says "oops," never sells. Headlines say what happens.
**"See the price change before it hits you"** is the register. "Take control of
your financial future" is not.

Avoid: effortlessly, seamlessly, powerful, beautiful, "your money your rules,"
and anything built on "Never ___ again."

**Copy worth keeping from the last attempt** — it was the part that worked:

> "Know what your subscriptions cost. All of them."
> "SubEye never touches your bank."
> "One number, with a denominator."
> "This is the part nobody sees coming."
> "Charging a monthly fee to watch your monthly fees would be absurd."
> "Two actions, because the one is paused."

---

## Page structure — a starting point, not a spec

Rearrange, merge or cut if you find better. It must answer, roughly in order:
what is it, why should I trust it, what does it do, what does it cost, when can
I have it.

1. **Hero** — must *demonstrate*, not just assert. Headline-left/stat-card-right
   is banned. The timeline may live here; see below.
2. **Never touches your bank** — high on the page, not a privacy footnote.
3. **The price timeline** — the signature moment.
4. **What it does** — three blocks, each with one legible screen or component:
   see the money · manage the lifecycle · mixed currencies, one total.
5. **Pricing** — two columns, one payment, priced for where you live.
6. **Closing card.** There is no email capture and no waiting list — the page
   ships with zero client JavaScript and nothing to POST to.
7. **FAQ** — *Why do I have to type everything in?* (because the alternative is
   your bank password) · *Is my data safe?* (what's stored, where, that iCloud
   Sync is the one opt-in exception, and that deletion is real) · *Do I need an
   account?* (**no** — not a SubEye one; iCloud Sync uses the Apple Account the
   phone is already signed in to) · *What happens when a price changes?*
8. **Footer** — Terms, Privacy, contact, language switch, © SubEye.

**Show me two hero directions:** (a) the timeline *is* the hero, page opens on
it; (b) a headline hero with the timeline as its supporting visual in the same
viewport, email below. The last attempt did neither — it had a headline and an
unrelated stat card.

Target length: **tighter than the last attempt.** Roughly four screens of scroll
past the hero. Pre-launch pages that scroll forever lose people before the
second email field.

---

## Email form

**Cut, and not coming back.** The page was specced with a waiting-list form; it
shipped without one, and the zero-client-JS budget is now a stated constraint of
the build, so there is nothing to POST from. The closing card says the app will
simply be there. Do not re-introduce a form here without also re-arguing that
budget — see `apps/landing/CLAUDE.md`.

---

## Constraints

- iPhone only. No platform badges beyond Apple, no Android anywhere.
- Responsive to 375px. The audience is on a phone; assume a phone-first read.
- Visible keyboard focus, `prefers-reduced-motion` respected, real contrast for
  `#98a0ae` on `#0f1115`.
- Static marketing page. It should not ship a framework's worth of JavaScript to
  render text.
- **Ukrainian is first-class, not a courtesy locale.** Design the `/uk/` layout
  too, or at minimum verify the type scale survives Cyrillic: "Політика
  конфіденційності" is more than twice the width of "Privacy policy" and will
  break a tight nav or a two-column pricing header. The `/uk/` copy will be
  written by a person, not machine-translated.
- Top nav: the mark plus a language switch. Nothing else — it's one page, and
  anchor links would be nav for nav's sake. But the language switch must be
  findable, so footer-only is not enough.
- Sign-in providers, if shown anywhere: email, Google, GitHub, Apple.
- Do not name competitors. The bank-linking contrast lands without naming who
  does it — naming them gives them free awareness and makes SubEye look like the
  challenger.
- Do not state a launch date, month or season. "Coming to the App Store," no
  timeline.

---

## Where this ends up

`apps/landing/` in the SubEye monorepo — Bun workspaces, Turbo, Biome (not
ESLint, not Prettier), TypeScript.

**Stack: Astro 6, static output, Vercel.** Functional reasoning, not aesthetic:
Astro's i18n routing with `prefixDefaultLocale: true` produces `/en/...` and
`/uk/...` natively, which is the exact URL contract the shipped app depends on,
and it ships zero JavaScript by default. Vercel because `subeye.cc` already
resolves there and moving hosts is churn on the critical path.

The engineering constraints — monorepo wiring, the Turbo cache trap, what to
reuse from `packages/`, and the 100/100/100/100 acceptance bar — are in
[SETUP-BRIEF.md](SETUP-BRIEF.md). Read it before writing markup.

Deliver so it can be built as static pages with scoped CSS — no design system to
install, no component library dependency.

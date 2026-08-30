# SubEye launch plan — from 2026-08-30

SubEye is live at `apps.apple.com/app/id6795566917`. This is the plan for the
first ninety days, written for one person with a few hours a week and no budget.

Everything here is sorted by what it costs and what it compounds. The store
record compounds; a Reddit post does not. That ordering is the plan's only real
opinion.

**Read the confidence markers.** Claims tagged **[Apple]** or **[repo]** were
checked at developer.apple.com or against this repository and can be acted on.
Claims tagged **[unverified]** came out of research that could not open the page
it cites — venue rules, competitor prices, audience numbers. Every one of them
costs an evening if it is wrong, so each carries the check that settles it.
Section 8 is the whole list in one place.

---

## The wedge moved, and the store record has not caught up

The pitch on subeye.cc is *no bank, no account, no server*. That was the
differentiator when the design brief was written. It is now the category's
default claim — the 2025–26 cohort of trackers ships it verbatim on their own
pages. **[unverified: read the three listings yourself, five minutes]**

What no competitor was found doing is modelling a price **forward**. Everyone
who touches price does it retrospectively — "price history", "price-rise
alert", something that fires after the charge. SubEye's timeline says what a
subscription *becomes*, months before the statement does. That is the sentence
the store record should lead with, and today it does not: the subtitle reads
`Renewals, trials and spending` and privacy is the headline everywhere.

So the positioning move is one sentence long: **stop arguing privacy, start
arguing time.** Privacy is now table stakes and free; the timeline is the thing
a searcher cannot get elsewhere. Keep the privacy claim — it still closes the
sale — but demote it from headline to proof.

One honest consequence: the free tier already gives away almost everything, and
Pro is $11.99 once. Nothing in this plan tries to raise conversion by making the
free tier worse. The free tier is the marketing.

---

## 1. The store record — week one

This is the only channel that works while you sleep, and it is the one with
known-wrong bytes in it today.

### 1.1 Check Small Business Program enrolment — 5 minutes, do it first

**[Apple]** 15% instead of 30%, for anyone under $1M in the prior calendar
year; developers new to the App Store qualify. Proceeds are adjusted *fifteen
days after the end of the fiscal month in which enrolment is approved*, so a
late enrolment leaves real money on the first weeks of sales.

| storefront | list | net at 15% | net at 30% |
| --- | --- | --- | --- |
| United States | $11.99 | **$10.19** | $8.39 |
| Euro zone | €9.99 | **≈$8.26** | ≈$6.81 |
| Ukraine | ₴199 | **≈$3.15** | ≈$2.59 |

Ukraine is after 20% VAT — ₴199 less VAT less commission is ₴140.96, about
$3.15 at the rate in the app's own `fx-seed.json`. **[repo]** Apple converts at
its own payout rate, so treat that as an order of magnitude, not a figure.

The table is also the whole argument of section 5: a Ukrainian Pro sale nets
about a third of a US one.

### 1.2 Spend the wasted keyword characters

**[Apple]** Only Name (30), Subtitle (30) and the keyword field (100) are
indexed — 160 characters per locale, and that is the entire searchable surface.
Promotional Text (170) is explicitly **not** indexed. Apple's own guidance says
to avoid plurals of words already used, category names, the word "app", and
duplicates of anything in the name or subtitle.

**English — 14 characters are dead.** `finance,` is a category name; `spend,`
duplicates "spending" in the subtitle. **[repo:** `docs/release/STORE-METADATA.md`,
counted at 97/100**]**

```
now  recurring,bill,payment,budget,expense,money,finance,reminder,cancel,manage,price,widget,spend,due
new  recurring,bill,payment,budget,expense,money,reminder,cancel,manager,price,widget,due,monthly,yearly
```

99/100. `manage` → `manager` buys the head phrase "subscription manager" for one
character; `monthly` and `yearly` are what people actually type.

**Ukrainian — 37 of 99 characters are dead**, which is the single largest
metadata defect on the record. `підписки`, `витрати` and `нагадування` are all
already indexed from the name `SubEye: трекер підписок` and the subtitle
`Витрати, списання, нагадування`; `фінанси` is a category name.

```
now  підписки,платежі,витрати,бюджет,гроші,фінанси,нагадування,скасувати,ціна,віджет,тріал,рахунки,облік
new  платежі,бюджет,гроші,скасувати,ціна,віджет,тріал,рахунки,облік,менеджер,автоплатіж,щомісячно,оплата
```

99/100. Both strings are counted, not estimated — recount if you edit them.

**Effort is not "minutes".** **[Apple]** Keywords, subtitle, name and
description all ride a version record, which means a build and an App Review
round-trip. Promotional Text is the only field editable in place, and it does
not rank. There is no quick ASO win here; there is a correct one that ships with
the next update. Plan it into that build rather than cutting one for it.

### 1.3 Lead the subtitle with time, not money

Counted alternatives, all ≤30:

| | subtitle | chars |
| --- | --- | --- |
| now | `Renewals, trials and spending` | 29 |
| a | `Trials, price rises, renewals` | 29 |
| b | `Renewals, trials, price rises` | 29 |
| c | `See a price rise months early` | 29 |

(a) keeps every indexed term the current one has except "spending" and swaps in
"price"/"rises". (c) reads best and indexes worst. The Ukrainian equivalent of
(a) is `Тріали, зміни цін, списання` at 27.

**[Apple]** Guideline 2.3.7 verbatim: *"Metadata such as app names, subtitles,
screenshots, and previews should not include prices, terms, or descriptions that
are not specific to the metadata type."* So the "$11.99 once" argument cannot go
in the subtitle or a screenshot caption. It belongs in the description and on
subeye.cc, both of which already carry it.

### 1.4 Screenshots: the first three are the ad

**[Apple]** Up to 10 screenshots; the first one to three appear in search
results when there is no app preview. Required size today is 6.9″ 1320×2868;
6.5″ only if 6.9″ is absent. **[repo]** Both `en` and `uk` sets are already
rendered — upload the `uk/` set into the Ukrainian localization rather than
letting it inherit English captions.

If the positioning move in section 0 is right, screenshot 1 is one
subscription's timeline with a dated future increase, not the dashboard total.
Privacy moves to screenshot 3 or 4.

### 1.5 Ship a rating prompt — the biggest single lever

**[repo]** There is no rating prompt anywhere in the app. `expo-store-review`
is not installed; the shipped Expo is ~57.0.7 and `expo-store-review@57.0.2`
matches it.

**[Apple]** `requestReview` shows at most three times per user per 365 days, and
the system may silently decline to show it at all — so it cannot be observed
from inside the app and must not be wired to anything that depends on it firing.

At zero ratings this outranks every venue in section 3. A store listing with no
ratings reads as abandoned to the exact buyer who is here because Bobby was
abandoned. Prompt after a moment that went well — a second or third subscription
added, or a renewal reminder that fired — never on launch.

Ratings display **per storefront**, so an English and a Ukrainian audience build
two separate counts. Do not read a single global number.

### 1.6 Featuring Nomination — file two

**[Apple]** Minimum three weeks' lead time, up to about three months for wider
consideration. (Research claimed 8–12 weeks; Apple's page says three weeks
minimum. **[killed]**) Requires Account Holder, Admin, App Manager or Marketing.

File one now of type **App Launch**, and one for the next update as **App
Enhancements** written for the Ukrainian storefront — localisation and
uniqueness are two of Apple's own criteria and SubEye genuinely wins both
(English + Ukrainian, five currencies, per-storefront pricing, and a price model
no competitor ships).

### 1.7 App Store Tags

**[Apple]** A live discovery surface under App Information, applied by default
from your metadata, English (U.S.) only, and deselectable. Nobody looks at
these. Look at them once.

---

## 2. What you can already measure — no SDK, no site change

The premise that a zero-analytics site cannot be measured is false. App Store
Connect measures the site for you.

**[Apple, verified at source]**

- **Web Referrer / App Referrer name the individual source.** Apple: *"Filter by
  Web Referrer to view a list of websites that referred users to your app's
  product page."* Available once the app has five first-time downloads.
  **[repo]** `apps/landing/public/_headers` sets
  `Referrer-Policy: strict-origin-when-cross-origin`, so a Safari tap on the
  badge sends `https://www.subeye.cc/` — exactly the origin Apple needs.
  **subeye.cc already appears in that report with no change to anything.**
- **A tap inside the Reddit app is an App Referrer, not a Web Referrer.** Apple
  attributes non-Safari browsers and StoreKit-using apps as the app. So Reddit,
  Telegram and Messages separate themselves automatically.
- **Source types** are: App Store search (ads included), App Store browse, App
  referrer, Web referrer, App Clip, Institutional Purchase, Unavailable. Source
  **resets on a manual redownload** and all later sales re-attribute.
- **Campaign links** — `?pt=<provider>&ct=<campaign>&mt=8`. No SDK. The campaign
  *name* is the token: ≤30 characters, alphanumeric plus spaces and punctuation,
  no leading or trailing space. Attribution is a first-time download within 24
  hours; on multiple clicks the most recent link wins.
  **The Campaigns tab does not exist until the app has generated analytics data**
  — Apple: *"the Campaigns tab and add button appear only after your app has
  generated analytics data"*, and to keep checking after 24 hours live. So this
  is a week-two task, not a launch-day one.
- **Cohorts → Download to Paid**, filterable by Purchase Type = Non-Consumable,
  source type and territory, up to seven filters. This is the free-to-Pro rate,
  measured directly, with no attribution work.
- **Peer benchmarks**: Day 35 Download to Paid and Day 35 Proceeds per Download,
  against your category's 25th/50th/75th percentiles. Weekly, differentially
  private, and absent if the peer group is too small.
- **Apple's own average default product-page conversion rate is 1.6%.** That is
  the number to beat, and it is a first-party benchmark rather than a vendor
  blog's.
- **Custom Product Pages**: up to 70, each with its own permanent URL, its own
  screenshots and copy, its own App Review (independent of a version), its own
  Acquisition metrics once it has five first-time downloads, and — since
  29 Oct 2025 — its own assignable keywords, where a keyword combination must be
  unique to one page. This is the instrument that makes "which channel worked"
  answerable without touching the site.
- **Analytics Reports API** for the raw data: `ONGOING` or
  `ONE_TIME_SNAPSHOT`, gzipped TSV, Admin key needed the first time, and a day's
  data is complete two days later.
- **Sales and Trends** daily reports land by 08:00 PT the next day. App units
  count first-time purchases only; the IAP count excludes restores.

**[repo] RevenueCat will disagree with Apple, and Apple is right.**
`Purchases.configure({ appUserID: null })` means anonymous customers, so a
reinstall or a second device mints a new one. RevenueCat's customer count will
run above Apple's first-time downloads. Use Apple's Cohorts for the conversion
rate and RevenueCat for revenue. RevenueCat's free tier runs to $2,500 monthly
tracked revenue **[likely]**, which this will not approach for a while.

**[repo] Sentry release health is already on.** `Sentry.init` runs without
`enableAutoSessionTracking: false`, which defaults to true — so crash-free
session rate per release exists already, for free. It is the closest thing to a
retention signal you have and nobody has looked at it.

### The four numbers, weekly

Impressions → product page views → first-time downloads → Day-35 Download to
Paid. Everything else is noise below a few hundred downloads a week. Write them
in a text file with a date. A number with no threshold attached is a diary — so
each gets one in section 6.

---

## 3. Channels — weeks two to six

Ordered by expected return per evening, and every venue below the line is
declined on purpose.

### Do, in this order

1. **Respond to every App Store review.** Free, unlimited, no build, no review
   round-trip, and visible to every future browser. At launch volume this is
   twenty minutes a week and it is the highest-yield thing on this list.
2. **Show HN** — *"Show HN: A subscription tracker that models price as a
   timeline, not a number"*. Post the first comment yourself: no account, no
   bank link, unlimited free tier, what the $11.99 one-time Pro adds, built by
   one person in Ukraine with Expo, and the exact outbound calls the app makes.
   HN's audience is the one that pays once for a private utility.
   **[unverified: re-read news.ycombinator.com/showhn.html the morning you post]**
3. **AlternativeTo** — create the entry, then add SubEye as an alternative on
   the incumbent trackers' pages. Permanent, neutral, and it sits on the exact
   "X alternative" searches where competitor-owned blogs currently rank
   themselves first. **[unverified: the seven-day account-age rule was killed —
   check the site's own submission page]**
4. **One r/iosapps post.** Read the live sidebar the hour you post, disclose in
   the first line, screenshots inline rather than a bare link, and have a week of
   ordinary comment history on the account first.
   **[unverified: every specific subreddit rule the research produced was killed
   as unchecked. Read the sidebar. Do not trust a rule you did not read today.]**
5. **Indie iOS press** — individually written emails, never a BCC. Subject line
   names one thing: the price timeline. Five sentences, three screenshots under
   1 MB, the App Store link.
   **[unverified: confirm each outlet still runs its indie column and take the
   byline from its most recent post]**
6. **Mastodon `indieapps.space` + Bluesky.** Posting your own app is the stated
   purpose. Small reach, but this is where the people who write the newsletters
   in (5) actually read.
7. **A standing 20-minute weekly slot answering threads that already exist** —
   "which subscription tracker doesn't need my bank", "X alternative" — as a
   disclosed developer. Never start the thread. These pages rank for years.
8. **Product Hunt as a credibility artefact, not a launch.** A permanent
   linkable page that reviewers and directories check. Do not organise a day
   around it.

Tag each of 2–6 with its own `ct=` campaign token once the Campaigns tab exists,
or give each its own Custom Product Page. Then section 6's decision rules have
something to read.

### Declined, with the reason

- **r/AppHookup and discount-listing sites** — they exist for price drops, and
  $11.99 is the price, not a launch price. Posting there means either lying or
  breaking that policy.
- **r/personalfinance, r/Frugal, r/ynab** — developer app posts are advertising
  there. Removal, and it follows your account.
- **r/degoogle** — an Android and de-Google audience, for an iPhone-only app
  that fetches favicons from Google. The thread would be about that.
- **r/shortcuts** — **[repo]** there are no App Intents in `apps/mobile`, only a
  widget target. Off-topic.
- **Privacy Guides** — will not list a closed-source, iOS-only app.
- **Paid Ukrainian media placement** — see section 5.
- **Anything mentioning Android**, including "not planned". The design brief's
  rule, and it is right: raising the platform question only invites it.

### The privacy question you will get asked — and already have the answer to

Someone on HN will point out that the app talks to Brandfetch and Google. The
research called this an undisclosed liability needing days of work. **That is
false.** **[repo]** `packages/legal/src/privacy-policy.ts` already names both
services in both languages, and for the brand picker it says verbatim
*"Receives the text you type into the brand picker"* — the sharpest version of
the exposure, disclosed in the app's own words. **[repo]** The lookup goes to
Google **or** Brandfetch depending on one env var, never both.

So the answer is one line and a link, and it is a credibility win rather than a
risk. Have the link ready; do not ship a "fix" for a problem you documented two
releases ago.

---

## 4. Ukraine

Ukraine is a **story market**, not a revenue market. A Ukrainian Pro sale nets
about $3.15 against $10.19 in the US. Plan for the free tier to carry nearly all
Ukrainian users, and judge Ukrainian effort on credibility and coverage that
feeds English-language pickup — not on units.

- **dev.ua appears to have published a SubEye piece around 29 August 2026**, in
  Ukrainian and English. **[unverified: the domain was unreachable — open
  `dev.ua/en/news/subeye-1788002909` and confirm before citing it]** If it is
  real, it is the credibility reference for every later pitch, and it means the
  next Ukrainian move needs a *new hook*, not a repeat launch pitch.
- **Every other Ukrainian venue, rate card, audience number and creator name the
  research produced was killed as unverified.** Do not email an address that
  came from a channel-stats aggregator. If you work this market, spend the first
  evening confirming three outlets exist and take submissions, and the second
  writing to them.
- **A Ukrainian Telegram channel is the honest answer to the missing email
  list.** A plain `<a href>` in both locales: zero client JavaScript, nothing to
  POST, no personal data held, and none of the site's promises break.
- **An email form is blocked by the CSP, not by the JS budget.** **[repo]**
  `public/_headers` ships `form-action 'none'`, so even a plain
  `<form method="post">` to a third party is blocked by the browser — and
  allowing it would put a third-party origin on a page whose argument is that it
  has none. Telegram plus the App Store's own "What's New" is the cheaper answer.
- **The diaspora does not read your Ukrainian listing.** **[Apple]** The Ukraine
  storefront's default language is English (U.K.) with Russian and Ukrainian
  additional; Poland's is English (U.K.) with Polish. A Ukrainian speaker on the
  Polish or German storefront sees the **English** listing — while the app
  itself follows the phone's language and is Ukrainian anyway. So the English
  metadata carries the diaspora, at €9.99 and about $8.26 net. That is a reason
  to invest in the English record, not the Ukrainian one.
- **Ukrainian copy QA is a market risk in its own right.** One Russicism in
  store copy costs more Ukrainian goodwill than any feature buys. Have a native
  reader go through the listing once.

---

## 5. Money: do not buy installs, and here is the number that would change that

The ceiling is arithmetic. One Pro sale nets $10.19 / ≈$8.26 / ≈$3.15. If
roughly 1.5% of installs ever buy Pro, an install is worth **10–15 cents** in
direct revenue. No App Store ad channel sells installs anywhere near that, so
the gap is roughly two orders of magnitude.

Two honest qualifications, because the research overclaimed both:

- **1.5% is a guess**, not a measurement — and section 2 says you can measure it
  for real inside a month, from Cohorts → Download to Paid. Until then it is a
  prior.
- **"Structural, can never work" is an overclaim.** The correct statement:
  *at the best numbers available, paid acquisition is off by ~100×.* You would
  need roughly **6% US-only install-to-Pro** to defend even a $0.60 cost per
  install. If the Day-35 cohort ever prints that, reopen the question. Nothing
  else should reopen it.
- The free tier is a real acquisition strategy denominated in product rather
  than dollars — but that argument makes an install worth *more* than the direct
  ceiling, not enough more to close a 100× gap. Label the 10–15 cents as
  "direct Pro revenue only" and don't let it do work it can't.

**[Apple]** Promo codes for in-app purchases were removed on 26–27 March 2026,
and offer codes are auto-renewable-subscription only — so there is **no**
first-party way to comp Pro to a reviewer. Use **TestFlight** for that; it costs
nothing and contradicts no pricing promise.

---

## 6. The weekly twenty minutes

One slot, one text file, four numbers, and a rule attached to each.

| what | where | rule |
| --- | --- | --- |
| Impressions | App Analytics → Acquisition | Flat for 3 weeks after the metadata update → the keyword change did not take; revisit the head terms, not the venues. |
| Product page views ÷ impressions | same | Below Apple's 1.6% benchmark → the problem is screenshot 1, not traffic. Start a PPO test. |
| First-time downloads by source | Source type filter | If Web/App Referrer beats App Store Search, ASO is losing and the channels are carrying it — invest the next evening in section 1, not section 3. |
| Day-35 Download to Paid | Cohorts, Purchase Type = Non-Consumable | Below ~1% → the Pro split is wrong, not the marketing. Above ~6% US → re-run section 5. |

And the stop rule the research never wrote: **if Show HN and r/iosapps both
produce nothing measurable, stop working channels and spend the recovered
evenings on the store record and the app.** Section 3 is a month of evenings at
its own estimates; it is allowed to fail, once, cheaply.

Do not rewrite metadata in week two because week one was quiet. Baseline first;
one change at a time; three weeks between changes or you cannot read the result.

**Product Page Optimization** belongs in month two or three, not now.
**[Apple]** A test needs five attributed first-time downloads to appear at all,
reports Performing Better/Worse only at 90% confidence, and Apple will label it
*"Likely to be Inconclusive"* when it cannot get there — which is what launch
volume will produce. New creative also needs App Review first.

---

## 7. The first two weeks, concretely

**Week 1** — Small Business Program check (§1.1). File the App Launch Featuring
Nomination (§1.6). Look at App Store Tags (§1.7). Read your own live listing
against `docs/release/STORE-METADATA.md` and note where they differ. Start the
weekly file with a baseline (§6). Confirm the dev.ua piece exists (§4).

**Week 2** — Campaigns tab now exists; create one token per channel (§2). Show
HN and the AlternativeTo entry (§3). Reply to every review that has arrived.
Queue the keyword, subtitle and rating-prompt changes into the next build — one
release, not three (§1.2, §1.3, §1.5).

**Weeks 3–6** — one channel per week from §3, each tagged. Ukrainian outlet
confirmation, then one pitch with a new hook. First Custom Product Page for
whichever channel produced anything.

---

## 8. Unverified — the check that settles each

The research behind this plan ran with most of the web unreachable. These are
the claims that could not be confirmed at source. **Every one of them is one
short check away, and acting on an unchecked one is how an evening gets wasted.**

| claim | the check |
| --- | --- |
| Competitors now ship the no-bank/one-payment claim verbatim | Open the three closest listings on the App Store. 5 min. |
| Competitor one-time prices sit at $1.99–$4.99 | Same pass. The "3–6× overpriced" framing was killed as unchecked — do not put a comparison on subeye.cc built on it. |
| The decaying incumbent has ~7,900 ratings and broken notifications | Its listing and its recent reviews. 5 min. |
| dev.ua published SubEye on ~29 Aug 2026 | Open the URL in §4. |
| Any specific subreddit's self-promotion rule | The sidebar, the hour you post. Never a remembered rule. |
| Product Hunt / Show HN outcome numbers | Ignore them. Treat both as free, unmeasured, one-evening bets. |
| Ukrainian iPhone share, media rate cards, creator audiences | All killed. Re-derive or drop; do not spend money on any of it. |
| Apple Ads popularity scores and category CPI benchmarks | Third-hand. §5's conclusion does not depend on them and should not be restated with them. |

---

## What this plan does not do

No launch discount, no promo codes, no countdown, no "first 100 free". $11.99 is
the price. A page whose whole argument is that it will not surprise you later
cannot open with a number that expires — and the store record has to agree with
the landing page, or the argument is just copy.

# SubEye launch plan — from 2026-08-30

SubEye is live at `apps.apple.com/app/id6795566917`. This is the plan for the
first ninety days, written for one person with a few hours a week and no budget.

Revised 2026-11-05 against SubEye's live US and Ukrainian listings, eight
competitor listings and sites, and the native app. Claims tagged
**[listings, 2026-11-05]** were read on those pages that day.

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

The pitch on the site is *no bank, no account, no server*. That was the
differentiator when the design brief was written. It is now the category's
default claim. **[listings, 2026-11-05]** Winnowed, Subscrr, SubTrack'd,
SubTracker, Aboscan and Bobby all make it on their own pages.

What no competitor was found doing is modelling a price **forward**. Everyone
who touches price does it retrospectively — "price history", "price-rise
alert", something that fires after the charge. Winnowed comes closest, with a
five-year cost projection and a log of past rises, but no listing read models a
trial → intro → standard schedule. SubEye's timeline says what a
subscription *becomes*, months before the statement does. That is the sentence
the store record should lead with, and today it does not: the subtitle reads
`Renewals, trials and spending` and privacy is the headline everywhere.

So the positioning move is one sentence long: **stop arguing privacy, start
arguing time.** Privacy is now table stakes and free; the timeline is the thing
a searcher cannot get elsewhere. Keep the privacy claim — it still closes the
sale — but demote it from headline to proof.

Two more wedges were already in the product, and no competitor read has either:

- **No cap on the free tier.** Every other manual tracker read caps it — at 3
  subscriptions (SubTracker, Aboscan), 5 (SubTrack'd, ReSubs) or 6 (Subscrr).
  SubEye's free tier is unlimited, and a competitor cannot match that without
  breaking its own paywall. It is the most checkable claim SubEye can make, and
  today it sits in the middle of the description.
- **Installments next to subscriptions.** No tracker read puts pay-in-parts,
  card installments and loans on the same calendar as subscriptions.

**Resolve one contradiction first.** **[repo]** Trials, intro prices, licenses
and scheduled changes are Pro (the description's own Pro list), and the intro
switch in `apps/ios/SubEye/UI/EditorView.swift` shows a lock to a free user. So a
reader who downloads for the headline feature meets a lock on the first add.
Either let the free tier see one timeline, or say plainly on the site and the
listing that the timeline is what Pro buys. The headline and the paywall have to
tell the same story.

One honest consequence: the free tier already gives away almost everything, and
Pro is $14.99 once. Nothing in this plan tries to raise conversion by making the
free tier worse. The free tier is the marketing.

---

## The field on 2026-11-05

**[listings, 2026-11-05]** unless tagged otherwise.

| app | model and price | the hook | worth knowing |
| --- | --- | --- | --- |
| Rocket Money | bank-linked; Premium is pay-what-you-want, about $7–14/month **[unverified: blogs disagree]** | finds and cancels for you; AI assistant "Rowan" on Premium+ | 405K ratings, 4.5, Finance #17; buys reach through influencer, podcast, paid-social and offline teams (its job ads) |
| Bobby | manual; IAPs $0.99–$2.99 | simple, hundreds of presets | 8K ratings, 4.7; last update 9 Dec 2025; iPhone only, no widgets; reviews ask for iPad |
| Winnowed | free, $9.99 once | a quarterly keep/pause/cut review | screenshot import read by Apple Intelligence, share an email from Mail, Siri, Spotlight, Live Activity, PDF export; iOS 27; 1 rating |
| SubTrack'd | 5 free, $5.99 once | widgets on Home, Lock Screen and StandBy; Face ID lock | its site attacks Rocket Money and Bobby by name |
| Subscrr | 6 free, $7.99/month | AI chat, screenshot import | Apple Watch complication |
| SubTracker (byAlif) | 3 free, $1.99/month to $49 lifetime | screenshot import, cancel guides with email templates | Watch, CSV; 2.8 from 21 ratings, and the reviews are about the paywall |
| Aboscan | 3 free, €24.99 lifetime | bank-statement files and screenshots read on the device | cancellation notice periods; aimed at Germany, Austria and Switzerland |
| ReSubs | 5 free, then subscription or lifetime | Gmail, screenshot and PDF import; iOS and Android | 25 languages; the strongest content operation (§3) |
| monobank | — | upcoming card debits, two days ahead **[unverified: kosht.media]** | the realistic Ukrainian alternative |

Four patterns:

1. **Import is the 2026 onboarding hook.** A screenshot of Settings → Apple
   Account → Subscriptions, read on the device, labelled "AI". It removes the
   objection in SubEye's first FAQ answer — *why do I have to type everything
   in?* — without a bank or an inbox. See §9.
2. **Competitors own the search results.** "best subscription tracker iPhone
   2026" returns almost only competitor-owned listicles ranking themselves
   first (ReSubs, SubKept, VaultAudit, CancelSubscriptions, Impause,
   subtracker.io). ReSubs runs ten "ReSubs vs X" pages and cancel guides in
   about 25 languages, Ukrainian included. SubEye has no page in that set.
3. **The dormant incumbent is everyone's target.** "Bobby alternative" is
   worked by SubTrack'd, ReSubs, subtracker.io and Nexasphere.
4. **Price bands.** Free tiers cap at 3–6; one-time unlocks run $5.99–$24.99;
   subscriptions $1.99–$7.99 a month. At $14.99, SubEye's Pro is at the top of
   the one-time band — defensible with the timeline and installments, but only
   once the listing has social proof (§1.5).

**[listings, 2026-11-05]** SubEye itself: **1 rating on the US storefront, 10 on
the Ukrainian one**, all five stars. The US listing reads as new or abandoned to
the exact buyer who is here because Bobby stopped updating.

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
| United States | $14.99 | **$12.74** | $10.49 |
| Euro zone | €17.99 | **≈$15.01** | ≈$12.36 |
| Ukraine | $11.99 | **≈$8.49** | ≈$6.99 |

**[repo]** Prices are `proPrice` and `proPriceUkraine` in
`apps/landing/src/lib/site.ts`; the Ukraine storefront bills in dollars at a
hand-set price, and its listing shows "11,99 USD" **[listings, 2026-11-05]**.
The euro row assumes Germany's 19% VAT and converts at the app's own
`fx-seed.json` (2026-08-24); the Ukraine row assumes the price includes 20% VAT
**[unverified: confirm in App Store Connect → Pricing]**. Apple converts at its
own payout rate, so treat the converted rows as an order of magnitude.

The table is also the whole argument of section 5. A Ukrainian Pro sale now nets
about two-thirds of a US one, not the third it did at ₴199, and a euro-zone sale
nets the most.

### 1.2 Spend the wasted keyword characters

**[Apple]** Only Name (30), Subtitle (30) and the keyword field (100) are
indexed — 160 characters per locale, and that is the entire searchable surface.
Promotional Text (170) is explicitly **not** indexed. Apple's own guidance says
to avoid plurals of words already used, category names, the word "app", and
duplicates of anything in the name or subtitle.

**[repo:** `docs/release/STORE-METADATA.md`, 6.3.0**]** Part of the earlier
cleanup shipped; two category names are still in the field.

**English — `finance` is still a category name**, and nothing in the field says
`manager`, which the name `Subscriptions Tracker - SubEye` does not index
either. Installments shipped in 6.3.0 with only `loan` to find them.

```
now  recurring,bill,payment,budget,expense,money,finance,reminder,cancel,loan,price,widget,due,calendar
new  recurring,bill,payment,budget,expense,manager,reminder,cancel,loan,price,widget,due,calendar,bnpl
```

97/100. `manager` buys the head phrase "subscription manager"; `bnpl` is the
installment searcher's own word. `money` goes because it is the weakest term
left. No brand names (Klarna, Afterpay) — trademarked terms in keywords are a
review risk.

**Ukrainian — `фінанси` is a category name.** The name is now
`Менеджер підписок - SubEye`, so `менеджер` is indexed and `підписки` may be too
**[unverified: whether Apple matches Ukrainian inflections; leave it until a
test says otherwise]**.

```
now  підписки,платежі,бюджет,гроші,фінанси,скасувати,ціна,віджет,рахунки,облік,календар,кредит,пробний
new  підписки,платежі,бюджет,гроші,частинами,скасувати,ціна,віджет,рахунки,облік,календар,кредит,пробний
```

99/100. `частинами` catches "оплата частинами" and "покупка частинами", the
banks' own names for installments. `розстрочка` is the commoner search but is
widely called a Russicism; `розстрочення` is the standard form — have a native
reader choose, as §4 says.

All four strings are counted, not estimated — recount if you edit them.

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
are not specific to the metadata type."* So the "$14.99 once" argument cannot go
in the subtitle or a screenshot caption. It belongs in the description and on
the site, both of which already carry it. The same caution applies to "free":
say "no limit on subscriptions" in a caption, and keep the word "free" for the
description's first line and the promotional text.

### 1.4 Screenshots: the first three are the ad

**[Apple]** Up to 10 screenshots; the first one to three appear in search
results when there is no app preview. Required size today is 6.9″ 1320×2868;
6.5″ only if 6.9″ is absent. **[repo]** Both `en` and `uk` sets are already
rendered — upload the `uk/` set into the Ukrainian localization rather than
letting it inherit English captions.

If the positioning move above is right, screenshot 1 is one subscription's
timeline with a dated future increase, not the dashboard total — captioned so
it is clear the timeline is Pro, until the contradiction in the wedge section is
resolved. Screenshot 2 is the no-cap claim; 3 is installments beside
subscriptions on the calendar. Privacy moves to 4.

### 1.5 The rating prompt shipped — now let it ask first

**[repo]** The native app asks through SwiftUI's `requestReview`
(`apps/ios/SubEye/App/MainShell.swift`). `ReviewState.isDue` in
`SubEyeCore/PromptPolicy.swift` wants three tracked subscriptions, seven days
since first launch and 180 days since the last ask; a paid-off installment
also triggers it. But `PromptPolicy.home` checks the Pro pitch first, and the
pitch is due once anything is saved or 14 days have passed — so whenever both
are due, the free user sees the Pro pitch and the rating waits for a later
launch.

**[Apple]** `requestReview` shows at most three times per user per 365 days, and
the system may silently decline to show it at all — so it cannot be observed
from inside the app and must not be wired to anything that depends on it firing.

**[listings, 2026-11-05]** One US rating against ten Ukrainian ones. Ratings
display **per storefront**, so the English audience has almost no social proof
while the Ukrainian one has some. Until the US count is in double figures, a
rating is worth more than a Pro pitch: put `.review` ahead of `.pro` in
`PromptPolicy.home` for one release, and watch the US count. Do not read a single
global number.

### 1.6 Featuring Nomination — file two

**[Apple]** Minimum three weeks' lead time, up to about three months for wider
consideration. (Research claimed 8–12 weeks; Apple's page says three weeks
minimum. **[killed]**) Requires Account Holder, Admin, App Manager or Marketing.

File one now of type **App Launch**, and one for the next update as **App
Enhancements** written for the Ukrainian storefront — localisation and
uniqueness are two of Apple's own criteria and SubEye genuinely wins both
(English + Ukrainian, 155 currencies, per-storefront pricing, and a price model
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
  badge sends `https://subeye.yhunko.dev/` — exactly the origin Apple needs.
  **The site appears in that report with no change to anything** (as
  `www.subeye.cc` before the 2026-11-05 move).
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
`Purchases.configure(withAPIKey:)` with no app user ID
(`apps/ios/SubEye/Services/PurchaseService.swift`) means anonymous customers, so
a reinstall or a second device mints a new one. RevenueCat's customer count will
run above Apple's first-time downloads. Use Apple's Cohorts for the conversion
rate and RevenueCat for revenue. RevenueCat's free tier runs to $2,500 monthly
tracked revenue **[likely]**, which this will not approach for a while.

**[repo] Sentry is gone.** The privacy policy says versions before 6.0 sent
crash reports to Sentry; the native app sends none. App Analytics' sessions,
active devices and crash counts — from users who share analytics with
developers — are the only retention signal left **[unverified: confirm which
metrics App Analytics shows for this app]**.

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
   bank link, unlimited free tier, what the $14.99 one-time Pro adds, built by
   one person in Ukraine in SwiftUI, and the exact outbound calls the app makes.
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

9. **Pages the site can own** — static, zero client JavaScript, in English and
   Ukrainian, so they fit the site's rules. Search for this category is won by
   content, not listings (see the field above).
   - **A Bobby alternative page**: dated facts only — last update, platforms,
     widgets, free cap, price. Every claim must survive Bobby shipping an
     update tomorrow.
   - **A price-increase log for the year**, updated monthly — 2026 so far
     includes Netflix's second US rise in a year, Spotify Premium at $12.99,
     YouTube Premium at $15.99 and Crunchyroll's Fan tier at $9.99
     **[unverified: news roundups; check each service's own page before
     publishing]**. This is where the forward-timeline argument lives, and each
     new rise is a reason to post it again.
   - **Cancel guides, Ukrainian first.** The Ukrainian results are thin, and
     ReSubs' Ukrainian pages read as translations.
   - **No "best trackers" listicle ranking SubEye first.** Every competitor runs
     one and they read as advertising; dated comparisons are more credible.
10. **Newsjack price rises.** When a large service raises its price, post one
    timeline screenshot — what the rise does to the next twelve months — on
    the venues in 5–6 and in the Telegram channel (§4).
11. **Custom Product Pages per intent**, each with its own keywords: one for
    installments and buy now, pay later; one for people leaving Bobby; one for
    Ukraine. Link each from the channel it belongs to.

Tag each of 2–6 with its own `ct=` campaign token once the Campaigns tab exists,
or give each its own Custom Product Page. Then section 6's decision rules have
something to read.

### Declined, with the reason

- **r/AppHookup and discount-listing sites** — they exist for price drops, and
  $14.99 is the price, not a launch price. Posting there means either lying or
  breaking that policy.
- **r/personalfinance, r/Frugal, r/ynab** — developer app posts are advertising
  there. Removal, and it follows your account.
- **r/degoogle** — an Android and de-Google audience, for an iPhone-only app
  that fetches favicons from Google. The thread would be about that.
- **r/shortcuts** — **[repo]** the only App Intent is `OpenSubEyeIntent`
  (`apps/ios/Shared`), which opens the app and nothing more. Off-topic until the
  intents in §9 ship.
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
the exposure, disclosed in the app's own words. **[repo]** Logos come from
Brandfetch first and from Google's favicon service only when Brandfetch has none
(`apps/ios/SubEye/Services/LogoService.swift`), and the policy says exactly
that.

So the answer is one line and a link, and it is a credibility win rather than a
risk. Have the link ready; do not ship a "fix" for a problem you documented two
releases ago.

---

## 4. Ukraine

Ukraine was planned as a **story market**, at ₴199 netting about $3.15. At
$11.99 it nets about $8.49 against $12.74 in the US (§1.1), and it is the
storefront that is actually working: ten ratings against one. Judge Ukrainian
effort on units as well as on the coverage that feeds English-language pickup.

- **dev.ua published a SubEye piece**, in Ukrainian and English
  (`dev.ua/news/subeye-1788002909`, found in search 2026-11-05). It is the
  credibility reference for every later pitch, and the next Ukrainian move needs
  a *new hook*, not a repeat launch pitch.
- **The new hook is installments.** Banks sell pay-in-parts plans under their
  own names, and monobank shows upcoming card debits only two days ahead
  **[unverified: kosht.media; check the app]**. "Your bank shows two days;
  SubEye shows the year" works in posts and pitches. Keep bank names out of
  store metadata.
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
  metadata carries the diaspora, at €17.99 and about $15.01 net in the euro
  zone. That is a reason to invest in the English record as much as the
  Ukrainian one.
- **Ukrainian copy QA is a market risk in its own right.** One Russicism in
  store copy costs more Ukrainian goodwill than any feature buys. Have a native
  reader go through the listing once.

---

## 5. Money: do not buy installs, and here is the number that would change that

The ceiling is arithmetic. One Pro sale nets $12.74 / ≈$15.01 / ≈$8.49. If
roughly 1.5% of installs ever buy Pro, an install is worth **13–23 cents** in
direct revenue. No App Store ad channel sells installs anywhere near that, so
the gap is roughly two orders of magnitude.

Two honest qualifications, because the research overclaimed both:

- **1.5% is a guess**, not a measurement — and section 2 says you can measure it
  for real inside a month, from Cohorts → Download to Paid. Until then it is a
  prior.
- **"Structural, can never work" is an overclaim.** The correct statement:
  *at the best numbers available, paid acquisition is off by ~100×.* You would
  need roughly **5% US-only install-to-Pro** to defend even a $0.60 cost per
  install. If the Day-35 cohort ever prints that, reopen the question. Nothing
  else should reopen it.
- The free tier is a real acquisition strategy denominated in product rather
  than dollars — but that argument makes an install worth *more* than the direct
  ceiling, not enough more to close a 100× gap. Label the 13–23 cents as
  "direct Pro revenue only" and don't let it do work it can't.

**[Apple]** Promo codes for in-app purchases were removed on 26–27 March 2026,
and offer codes are auto-renewable-subscription only — so there is **no**
first-party way to comp Pro to a reviewer. Use **TestFlight** for that; it costs
nothing and contradicts no pricing promise.

**Family Sharing on Pro.** Bobby, Winnowed and SubTracker turn it on for their
unlocks **[listings, 2026-11-05]**, and households share the subscriptions SubEye
tracks. Once enabled for a product it cannot be turned off **[unverified:
confirm on the App Store Connect page before switching]** — decide it once,
deliberately.

---

## 6. The weekly twenty minutes

One slot, one text file, four numbers, and a rule attached to each.

| what | where | rule |
| --- | --- | --- |
| Impressions | App Analytics → Acquisition | Flat for 3 weeks after the metadata update → the keyword change did not take; revisit the head terms, not the venues. |
| Product page views ÷ impressions | same | Below Apple's 1.6% benchmark → the problem is screenshot 1, not traffic. Start a PPO test. |
| First-time downloads by source | Source type filter | If Web/App Referrer beats App Store Search, ASO is losing and the channels are carrying it — invest the next evening in section 1, not section 3. |
| Day-35 Download to Paid | Cohorts, Purchase Type = Non-Consumable | Below ~1% → the Pro split is wrong, not the marketing. Above ~5% US → re-run section 5. |

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

### From 2026-11-05

1. **Next build:** the keyword strings in §1.2, the review-before-Pro order in
   §1.5, and the first-line rewrite — "every subscription, no limit" leads the
   description and the promotional text. One release, not three.
2. **Resolve the timeline contradiction** in the wedge section before the
   screenshots in §1.4 are redrawn around it.
3. **The Bobby alternative page and the price-increase log** (§3, item 9), then
   the first cancel guides in Ukrainian.
4. **Three Custom Product Pages** — installments, Bobby, Ukraine — each linked
   from its own channel.
5. **December:** the year-in-subscriptions share card from §9, if it ships in
   time; a late one waits a year.

### From 2026-08-30

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

Settled on 2026-11-05: competitors do ship the no-bank claim; one-time prices
run $5.99–$24.99 with Bobby's IAPs at $0.99–$2.99; Bobby has 8K ratings at 4.7
and last updated on 9 Dec 2025; the dev.ua piece exists.

| claim | the check |
| --- | --- |
| Bobby's notifications are broken | One competitor-owned blog says so. Read Bobby's recent reviews before repeating it anywhere. |
| Rocket Money Premium costs about $7–14 a month | Blogs disagree; its listing shows ten unlabelled prices. Read rocketmoney.com before quoting it. |
| The Ukraine price includes 20% VAT | App Store Connect → Pricing. Changes the §1.1 net. |
| monobank shows upcoming debits two days ahead | Open the app. |
| Family Sharing on an IAP cannot be turned off | The App Store Connect page for the product. |
| 2026 streaming price rises | Each service's own pricing page, before the price log goes live. |
| Any specific subreddit's self-promotion rule | The sidebar, the hour you post. Never a remembered rule. |
| Product Hunt / Show HN outcome numbers | Ignore them. Treat both as free, unmeasured, one-evening bets. |
| Ukrainian iPhone share, media rate cards, creator audiences | All killed. Re-derive or drop; do not spend money on any of it. |
| Apple Ads popularity scores and category CPI benchmarks | Third-hand. §5's conclusion does not depend on them and should not be restated with them. |

---

## 9. Product moves that are marketing

Each one either removes an objection a competitor already removes, or gives a
channel something to show. All of them keep the promise that nothing leaves the
phone; **[repo]** marks what the app lacks today.

**Next one or two releases**

1. **Screenshot import, read on the device.** Settings → Apple Account →
   Subscriptions, or a bank's regular-payments screen, read with Vision text
   recognition (available on SubEye's iOS 16.4 floor) into an editable draft
   list; Apple's on-device model on iOS 26+ where Apple Intelligence is on.
   Winnowed, Subscrr and SubTracker lead with it. It answers the first FAQ
   without a bank or an inbox, and it is the feature that makes a Show HN post a
   second time.
2. **A service catalog** — logos and typical plans per storefront — shipped as a
   static document the way exchange rates are. Cuts the twenty-second add.
3. **A known price-change feed** in the same document: "Spotify moves to $12.99
   on this date — add it as a scheduled change?" The user confirms; nothing is
   applied silently. It makes the timeline fill itself, which no competitor can
   copy without the timeline. Money logic, so it needs a test that fails without
   it.
4. **A payment card on each subscription**, and a "card replaced" view listing
   every subscription to move.
5. **More widget surfaces.** **[repo]** Only small and medium Home Screen
   widgets ship (`supportedFamilies([.systemSmall, .systemMedium])`).
   SubTrack'd's free tier has Lock Screen and StandBy.
6. **Real App Intents** — "due this week", "monthly total", "add a
   subscription" — for Siri, Shortcuts and Spotlight. **[repo]** Only
   `OpenSubEyeIntent` exists. Reopens r/shortcuts.
7. **Face ID lock.** **[repo]** None today; SubTrack'd gives it away free.

**After that**

8. **A "worth it?" review** — a periodic keep/pause/cancel pass with cost per
   use, feeding "Saved with SubEye". Winnowed's entire pitch, built on
   lifecycle and savings plumbing SubEye already has.
9. **Cancellation help** — a cancel link and notice period per subscription,
   and "cancel by" reminders.
10. **Your share of a shared plan**, counted in the totals.
11. **CSV import and export.** **[repo]** Export is JSON only. A Bobby import if
    its export format allows it **[unverified]** — the switching path for §3.
12. **A year-in-subscriptions share card** the user chooses to post, ready for
    December: the one organic sharing mechanism the category has.

**Later:** an Apple Watch complication; native iPad and Mac layouts (the listing
says "Designed for iPad" and "Not verified for macOS"); importing one receipt
shared from Mail.

**Declined:** bank linking and Gmail access — both need a server and break the
landing page's promise; an AI chat assistant; FinanceKit, which reaches US
Apple Card holders only and contradicts "nothing is guessed from a bank feed".

---

## What this plan does not do

No launch discount, no promo codes, no countdown, no "first 100 free". $14.99 is
the price. A page whose whole argument is that it will not surprise you later
cannot open with a number that expires — and the store record has to agree with
the landing page, or the argument is just copy.

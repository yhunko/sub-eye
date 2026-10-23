# App Store Connect metadata — en-US + uk

What App Store Connect holds for the current version record, both
localizations, so a release starts from the live copy rather than from memory.
Character limits are App Store Connect's and sit in each heading. Update this
file in the same change that edits App Store Connect.

Name, Subtitle and the Privacy Policy URL live on **App Information** and apply
to every version; everything else is per version and per locale. An unfilled
Ukrainian field shows the English text to Ukrainian users, so fill both.

---

## Releasing a version

1. **The version string comes from the app.** `MARKETING_VERSION` in
   `apps/ios/project.yml` (and the checked-in `.pbxproj`) has to equal the
   version record exactly, or the build never appears in its picker.
2. **Build:** `bun run build:ios` archives `SubEye` / `Production` with fresh
   DerivedData and exports `builds/ios/subeye-VERSION-buildN-DATE.ipa` (plus a
   `SubEye.ipa` copy). Build numbers come from the local counter. Nothing is
   uploaded: add the IPA to Transporter, Verify, Deliver, then pick the build on
   the version page.
3. **Screenshots** carry over between versions. The iPhone sets are 6.9"
   (1320×2868) and 6.5" (1284×2778), rendered at
   `~/Developer/projects/sub-eye-store-screenshots/export/apple/iphone/`, `en`
   and `uk`. The 12.9" iPad set is a leftover from the Expo build; the app is
   iPhone-only, so the iPad store shows the iPhone set.
4. **Promotional Text** is the one field editable without a new build, so it
   carries the news and is rewritten between releases.
5. **Contacts:** `support@subeye.cc` is the App Review contact;
   `privacy@subeye.cc` is the address in the privacy policy. Both must keep
   delivering.

---

## English (U.S.)

### App Information → Name (30)

```
Subscriptions Tracker - SubEye
```

### App Information → Subtitle (30)

```
Renewals, trials and spending
```

### Promotional Text (170) — 6.2.0

```
New: track apps you buy once with a year of updates. SubEye counts the license once and reminds you before the updates run out. No account, no ads.
```

For when there is no news worth the slot:

```
No account, no bank login, no ads. Type in what you pay and see what leaves your account this month, what is next, and the day a trial turns into a charge.
```

### What's New in This Version (4000) — 6.2.0

```
• One-time licenses (SubEye Pro): track software you buy once with a year of updates included. SubEye counts the purchase once, shows the optional renewal on its own date and reminds you before your updates run out — renewing is your call.
• A clearer way to add a subscription: choose how you pay — regular, free trial, intro discount or one-time license — and see the first charges laid out before you save.
• The calendar marks a license purchase, and "Needs a decision" on Home shows when updates are about to end.
```

### Description (4000)

```
SubEye tells you what your subscriptions cost — all of them, together, before the money leaves your account.

You type in what you pay. SubEye keeps the whole schedule: what it costs now, what it becomes when the discount ends, and the exact day it renews.

WHAT YOU GET

• One number that matters — what is still going to leave your account this month, and how much of the month is left to pay it.
• Next month's forecast set against this one, and the single subscription costing you the most.
• A price is a timeline, not a number. Free trial, intro price, the standard price it turns into, a license you bought once with its optional updates renewal, and any change you have scheduled — all on one line, months before it reaches your statement.
• Pause indefinitely or until a date. Cancel at period end and keep what you already paid for, or cancel immediately. Change your mind and renew.
• Saved with SubEye — what pausing and cancelling has kept in your pocket, counted from the day each one stopped.
• A reminder the day before a renewal, so nothing is a surprise.
• 155 currencies — every one the world bills in — converted daily into the one you count in.
• English and Ukrainian, and iCloud Sync when you want the same list on two devices.

NO ACCOUNT. NO BANK. NO SERVER.

Most trackers ask for one of two things: the credentials to your bank, or permission to read your email. SubEye asks for neither. There is nothing to sign up for and nothing to sign in to — open the app and start typing.

Your subscriptions stay on your phone. There is no server behind SubEye holding a copy, so there is nothing to breach and nothing to sell. Settings → Erase all data removes every subscription, reminder and setting from the device, for real.

SUBEYE PRO — ONE PAYMENT

The free app is not a trial and not a teaser. Unlimited subscriptions, the whole dashboard, the payment calendar, every lifecycle action, renewal reminders, Live Activities, every currency and iCloud Sync are free, and stay free.

Pro is a single purchase that never renews. It adds:
• Trial-ending alerts, and reminders at the time you choose
• Pricing phases — trials, intro discounts, one-time licenses and scheduled changes on one timeline
• Categories, the category filter, and the spend breakdown grouped by them
• The calendar's year view, and every month set against the one before it
• Home Screen widgets

Charging a monthly fee to watch your monthly fees would be absurd.

Built by one person, in Ukraine.
```

### Keywords (100)

Comma-separated, no spaces. Words already in the Name or Subtitle are indexed
anyway, so they stay out.

```
recurring,bill,payment,budget,expense,money,finance,reminder,cancel,manage,price,widget,due,calendar
```

### URLs

| Field | Value |
| --- | --- |
| Support URL | `https://www.subeye.cc/en/support/` |
| Marketing URL | `https://www.subeye.cc/en/` |
| Privacy Policy URL (App Information) | `https://www.subeye.cc/en/privacy-policy/` |

### Copyright (200)

```
2026 Yehor Hunko
```

---

## Ukrainian

### App Information → Name (30)

```
Менеджер підписок - SubEye
```

### App Information → Subtitle (30)

```
Витрати, списання, нагадування
```

### Promotional Text (170) — 6.2.0

```
Нове: програми, куплені один раз із роком оновлень. SubEye врахує ліцензію один раз і нагадає, коли оновлення закінчуються. Без акаунта й реклами.
```

For when there is no news worth the slot:

```
Без акаунта, без доступу до банку, без реклами. Ви вводите те, що платите, — і бачите, скільки піде цього місяця, що далі й коли пробний період стане списанням.
```

### What's New in This Version (4000) — 6.2.0

```
• Разові ліцензії (SubEye Pro): відстежуйте програми, куплені один раз із роком оновлень. SubEye враховує покупку один раз, показує необов’язкове продовження в його день і нагадує, коли оновлення закінчуються, — продовжувати чи ні, вирішуєте ви.
• Простіше додати підписку: оберіть, як ви платите, — звичайна оплата, пробний період, вступна знижка чи разова ліцензія — і ще до збереження побачите перші платежі.
• Календар позначає купівлю ліцензії, а «Потребує рішення» на головній показує, коли закінчуються оновлення.
```

### Description (4000)

```
SubEye показує, скільки коштують ваші підписки — усі разом і до того, як гроші підуть з рахунку.

Ви вводите те, що платите. SubEye тримає весь розклад: скільки це коштує зараз, скільки коштуватиме, коли закінчиться знижка, і в який саме день станеться списання.

ЩО ВСЕРЕДИНІ

• Одне число, яке має значення, — скільки ще піде з рахунку цього місяця і скільки місяця лишилося.
• Прогноз на наступний місяць у порівнянні з цим і найдорожча підписка.
• Ціна — це не число, а лінія часу. Пробний період, ціна на старт, стандартна ціна, на яку все перетвориться, ліцензія, куплена один раз, із необов’язковим продовженням оновлень, і будь-яка зміна, яку ви запланували, — на одній шкалі, за місяці до того, як це з’явиться у виписці.
• Призупиніть безстроково або до певної дати. Скасуйте наприкінці оплаченого періоду й користуйтеся тим, за що вже заплатили, — або скасуйте одразу. Передумали? Відновіть.
• Заощаджено з SubEye — скільки лишилося у вашій кишені завдяки паузам і скасуванням, від дня, коли кожна підписка зупинилася.
• Нагадування за день до списання, щоб нічого не було несподіванкою.
• 155 валют — усі, якими у світі виставляють рахунки, — за щоденним курсом переводяться в ту, у якій рахуєте ви.
• Українська та англійська, а якщо потрібен той самий список на двох пристроях — синхронізація через iCloud.

БЕЗ АКАУНТА. БЕЗ БАНКУ. БЕЗ СЕРВЕРА.

Більшість трекерів хочуть одне з двох: доступ до вашого банківського рахунку або дозвіл читати вашу пошту. SubEye не просить ні того, ні іншого. Реєструватися нема де, входити нема куди — відкриваєте застосунок і починаєте вводити.

Ваші підписки лишаються на телефоні. За SubEye немає сервера з копією, тож нема чого зламувати і нема чого продавати. «Налаштування → Стерти всі дані» прибирає з пристрою всі підписки, нагадування й налаштування — по-справжньому.

SUBEYE PRO — ОДИН ПЛАТІЖ

Безкоштовна версія — це не тріал і не приманка. Необмежена кількість підписок, уся панель, календар платежів, усі дії з підписками, нагадування про списання, активності поновлень наживо, усі валюти й синхронізація через iCloud безкоштовні й такими лишаються.

Pro — це разова покупка, яка ніколи не поновлюється. Вона додає:
• Сповіщення про кінець пробного періоду й нагадування в той час, який оберете ви
• Цінові періоди — пробні періоди, знижки, разові ліцензії та заплановані зміни на одній шкалі
• Категорії, фільтр за ними і розподіл витрат за категоріями
• Річний огляд у календарі й порівняння кожного місяця з попереднім
• Віджети на екрані «Дім»

Брати щомісячну плату за те, щоб стежити за щомісячними платежами, було б абсурдом.

Створено однією людиною в Україні.
```

### Keywords (100)

```
підписки,платежі,бюджет,гроші,фінанси,скасувати,ціна,віджет,рахунки,облік,календар,менеджер,пробний
```

### URLs

| Field | Value |
| --- | --- |
| Support URL | `https://www.subeye.cc/uk/support/` |
| Marketing URL | `https://www.subeye.cc/uk/` |
| Privacy Policy URL (App Information) | `https://www.subeye.cc/uk/privacy-policy/` |

### Copyright (200)

```
2026 Yehor Hunko
```

---

## Not localized

### App Review Information

**Sign-in required: NO.** Contact: Yehor Hunko, `support@subeye.cc`.

Notes (4000). A reviewer who has never seen the app gets only this field.
Replace section 1 and the test devices per release and recheck every factual
line against the app: the external services and the Pro list drift.

```
No account: no sign-up, no sign-in, no server, no backend. The app opens straight to the dashboard, so "Sign-In Required" is unticked.

1. WHAT CHANGED IN 6.2.0
- One-time licenses: an entry can now be software bought once with a year of updates included, followed by an optional yearly updates renewal. The license price is counted once on its purchase date; each later renewal shows as an "Updates end" decision, and its reminder says the updates end, not that the app renews. Part of SubEye Pro (pricing phases).
- The last step of adding a subscription is redesigned: four ways to pay (regular, free trial, intro discount, one-time license), each opening its own fields, and a timeline of the first charges before saving.
To try it (SubEye Pro; the sandbox purchase works): Home, "+", any name, Price 41, Billing cycle Yearly, Next, choose "One-time license", Updates renewal 19, Save.
No new permissions, no new data collected, no new network requests.

2. TESTED ON
iPhone 17, iOS 27.0.1; iPhone 17 Pro simulator, iOS 26.5. iPhone only, portrait only, dark appearance only, by design. Minimum iOS 16.4.

3. WHAT IT DOES
A manual subscription tracker. The user types what they pay — name, amount, currency, billing cycle, start date — and sees what will still leave their account this month, next month's forecast, exact renewal dates and the day a trial turns into a charge, and can pause, cancel at period end, cancel immediately or renew. No bank credentials, no email access. For general consumers paying for several subscriptions. Rated 4+.

4. SETUP
No credentials, demo account or configuration. Empty on first launch by design: Home, "+", any service name, amount, currency and start date, Save. That one entry fills the dashboard, forecast, list, calendar and reminder schedule in about twenty seconds. Fully usable with the network off.

5. EXTERNAL SERVICES
- Apple In-App Purchase via RevenueCat, configured anonymously.
- jsDelivr CDN: one public exchange-rate file, at most once a day.
- Brandfetch, with Google's favicon service as fallback: a logo for the service name typed into the add form.
- Apple App Store lookup (itunes.apple.com/lookup, app ID and storefront country only): at most once a day, to show a notice when a newer version is out. Skipped for sandbox and TestFlight receipts, so it will not appear in review.
- Apple iCloud key-value storage: off by default, opt-in at Settings, Data; the user's own iCloud, which we cannot read.
No authentication, analytics, crash-reporting, advertising or AI SDK, no payment processor other than Apple, and no server of ours.

6. REGIONAL DIFFERENCES
None. English and Ukrainian from the device language; all 155 currencies everywhere; nothing geo-restricted. Only the purchase price varies, read from Apple's storefront at runtime.

7. REGULATED INDUSTRY, THIRD-PARTY MATERIAL
Not regulated: no bank connection, financial account, money movement, credential, transaction or advice. Guideline 3.2.1(viii) does not apply; Finance is the category for discoverability only.
Brand logos are fetched at runtime for a domain the user typed, never bundled, and imply no affiliation; the mark identifies the service the user already named.

8. IN-APP PURCHASE
"SubEye Pro", one non-consumable that never renews; no subscription in this app. It unlocks trial-ending alerts and custom reminder times, pricing phases (trials, intro prices, scheduled changes and one-time licenses), categories with the filter and spend breakdown, the calendar's year view and month-on-month figures, and Home Screen widgets.
Buy at Settings, first row, "SubEye Pro". Locked features open the same paywall: Settings, Categories; Settings, Reminders, trial alerts; Calendar, year view; a subscription's Manage pricing; the trial, intro and license options when adding a subscription.
The paywall shows Apple's storefront price, says it does not renew, and links the Terms of Use and Privacy Policy. Restore Purchases is on the paywall and in Settings.
```

### App Privacy (App Information → App Privacy)

*Do you or your third-party partners collect data:* **Yes**. Two data types,
both **App Functionality**, **not linked to the user**, **not used for
tracking**:

| Category | Type | Why |
| --- | --- | --- |
| Purchases | Purchase History | RevenueCat, configured with an anonymous, device-local app user id |
| Search History | Search History | text typed into the brand picker goes to Brandfetch |

Crash Data was declared while the Expo app shipped Sentry; the native app has no
crash-reporting SDK, so it came off on 2026-10-20. Crash logs a user shares
through Apple's own analytics are Apple's collection, not the app's.

Boxes that stay empty: Other User Content and the financial types (the amounts
never leave the device; iCloud Sync writes to the user's own iCloud, which the
developer cannot read), User ID (anonymous RevenueCat id), Performance Data and
Product Interaction (no analytics or tracing SDK).

### App Store Server Notifications (App Information, bottom)

Production and sandbox URLs both point at RevenueCat's per-app URL from the
RevenueCat dashboard; there is no SubEye server for them to reach. Pro is a
non-consumable, but refunds and Family Sharing revokes travel this way, and the
entitlement is read on the device from RevenueCat
(`apps/ios/SubEye/Services/PurchaseService.swift`). RevenueCat needs the
**In-App Purchase Key** (`.p8`) from Users and Access → Integrations, not an App
Store Connect API key and not a shared secret.

### Accessibility Nutrition Label (App Accessibility)

Drafted for iPhone, not yet published: **Dark Interface, Sufficient Contrast,
Larger Text, Differentiate Without Color Alone, Reduced Motion, VoiceOver**. Not declared:
Voice Control, Captions, Audio Descriptions (there is no audio or video).

- Dark Interface: the app is dark-only.
- Larger Text: every screen follows Dynamic Type up to AX5; UI tests run the
  largest Ukrainian text with an accessibility audit.
- Reduced Motion: custom animations check `accessibilityReduceMotion`.
- A new colour that carries meaning on its own, or an animation without the
  reduced-motion check, quietly falsifies a claim here.

### The rest

- **Age rating:** every question NO, which lands on **4+**. There is no web
  view, no user-generated content and no advertising.
- **Category:** primary **Finance**, secondary **Productivity**. Guideline
  3.2.1(viii) does not apply: no bank, no money movement, no credential. If a
  reviewer raises it, swap the two.
- **Content Rights:** Yes. Brand logos are fetched at runtime from Brandfetch
  with a Google favicon fallback for a domain the user typed, never bundled.
- **In-app purchase:** "Pro Lifetime" (`cc.subeye.app.pro.lifetime`),
  non-consumable, approved.
- **App Previews:** none.

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

### Promotional Text (170) — 6.1.0

```
New: see how much you've saved by stopping subscriptions, and every price change spelled out before it hits — even a switch to another currency. No account, no ads.
```

For when there is no news worth the slot:

```
No account, no bank login, no ads. Type in what you pay and see what leaves your account this month, what is next, and the day a trial turns into a charge.
```

### What's New in This Version (4000) — 6.1.0

```
• Saved with SubEye: Home now shows how much you've kept by pausing or cancelling subscriptions.
• Clearer subscription pages. The next payment comes first, and a price change, a trial ending or an intro price ending is spelled out — including whether a switch to another currency costs you more or less.
• Turn on renewal reminders right from a subscription with the bell.
• Reminders name the day — "Netflix renews tomorrow" — and open the subscription they're about.
• Renewal Live Activities now work on iOS 17 and later, and one you dismiss stays dismissed.
• Adding a subscription you already track? SubEye offers to resume or restart it instead of making a duplicate.
• SubEye tells you when an update is out.
• A scheduled price change now counts from its own day in totals, the calendar and reminders.
• Fixed: Terms of service and Privacy policy open again, busy days on Home show every payment, and layouts hold up at the largest text sizes.
```

### Description (4000)

```
SubEye tells you what your subscriptions cost — all of them, together, before the money leaves your account.

You type in what you pay. SubEye keeps the whole schedule: what it costs now, what it becomes when the discount ends, and the exact day it renews.

WHAT YOU GET

• One number that matters — what is still going to leave your account this month, and how much of the month is left to pay it.
• Next month's forecast set against this one, and the single subscription costing you the most.
• A price is a timeline, not a number. Free trial, intro price, the standard price it turns into, and any change you have scheduled — all on one line, months before it reaches your statement.
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
• Pricing phases — trials, intro discounts and scheduled changes on one timeline
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

### Promotional Text (170) — 6.1.0

```
Нове: SubEye показує, скільки ви заощадили, зупинивши підписки, і кожну зміну ціни ще до списання — навіть перехід на іншу валюту. Без акаунта й реклами.
```

For when there is no news worth the slot:

```
Без акаунта, без доступу до банку, без реклами. Ви вводите те, що платите, — і бачите, скільки піде цього місяця, що далі й коли пробний період стане списанням.
```

### What's New in This Version (4000) — 6.1.0

```
• Заощаджено з SubEye: на головній видно, скільки ви зберегли, призупинивши або скасувавши підписки.
• Зрозуміліші сторінки підписок. Спершу — наступний платіж, а зміна ціни, кінець пробного періоду чи стартової ціни пояснені прямо, зокрема чи перехід на іншу валюту обійдеться дорожче або дешевше.
• Нагадування про списання вмикаються просто зі сторінки підписки — дзвіночком.
• Нагадування називають день — «Netflix поновлюється завтра» — і відкривають саме ту підписку.
• Активності поновлень наживо тепер працюють з iOS 17, а закрита активність більше не повертається.
• Додаєте підписку, яка вже є? SubEye запропонує відновити її, а не створювати дублікат.
• SubEye повідомить, коли вийде оновлення.
• Запланована зміна ціни тепер діє саме з її дня — у підсумках, календарі й нагадуваннях.
• Виправлено: Умови користування й Політика конфіденційності знову відкриваються, дні з кількома платежами на головній показують їх усі, а екрани коректно виглядають із найбільшим текстом.
```

### Description (4000)

```
SubEye показує, скільки коштують ваші підписки — усі разом і до того, як гроші підуть з рахунку.

Ви вводите те, що платите. SubEye тримає весь розклад: скільки це коштує зараз, скільки коштуватиме, коли закінчиться знижка, і в який саме день станеться списання.

ЩО ВСЕРЕДИНІ

• Одне число, яке має значення, — скільки ще піде з рахунку цього місяця і скільки місяця лишилося.
• Прогноз на наступний місяць у порівнянні з цим і найдорожча підписка.
• Ціна — це не число, а лінія часу. Пробний період, ціна на старт, стандартна ціна, на яку все перетвориться, і будь-яка зміна, яку ви запланували, — на одній шкалі, за місяці до того, як це з’явиться у виписці.
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
• Цінові періоди — пробні періоди, знижки та заплановані зміни на одній шкалі
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

1. WHAT CHANGED IN 6.1.0
- Home shows what pausing and cancelling subscriptions has saved, computed on the device. Free.
- Redesigned subscription detail: a scheduled price change, trial end or intro end is explained in one card; a switch to another currency is compared at today's exchange rate.
- Reminders name the day; a bell on the detail page turns them on.
- Renewal Live Activities on iOS 17 and later.
- Adding a service already tracked offers Resume or Restart instead of a duplicate.
- Update notice: once a day the app asks Apple's public App Store lookup (itunes.apple.com/lookup, app ID and storefront country only) for a newer version and shows a one-time alert and a Settings banner. Skipped for sandbox and TestFlight receipts, so it will not appear in review.
- After a first saving or two weeks of use, Home may show the SubEye Pro offer once; it opens the same paywall as Settings.
- Fixes: Terms of service and Privacy policy open again; layout fixes at the largest text sizes.
No new permissions, no new data collected. The only new request is the App Store lookup.

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
- Apple App Store lookup: the daily version check above.
- Apple iCloud key-value storage: off by default, opt-in at Settings, Data; the user's own iCloud, which we cannot read.
No authentication, analytics, crash-reporting, advertising or AI SDK, no payment processor other than Apple, and no server of ours.

6. REGIONAL DIFFERENCES
None. English and Ukrainian from the device language; all 155 currencies everywhere; nothing geo-restricted. Only the purchase price varies, read from Apple's storefront at runtime.

7. REGULATED INDUSTRY, THIRD-PARTY MATERIAL
Not regulated: no bank connection, financial account, money movement, credential, transaction or advice. Guideline 3.2.1(viii) does not apply; Finance is the category for discoverability only.
Brand logos are fetched at runtime for a domain the user typed, never bundled, and imply no affiliation; the mark identifies the service the user already named.

8. IN-APP PURCHASE
"SubEye Pro", one non-consumable that never renews; no subscription in this app. It unlocks trial-ending alerts and custom reminder times, pricing phases, categories with the filter and spend breakdown, the calendar's year view and month-on-month figures, and Home Screen widgets.
Buy at Settings, first row, "SubEye Pro". Locked features open the same paywall: Settings, Categories; Settings, Reminders, trial alerts; Calendar, year view; a subscription's Manage pricing.
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

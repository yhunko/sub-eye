# App Store Connect metadata — en-US + uk

What App Store Connect holds for the current version record, both
localizations, so a release starts from the live copy rather than from memory.
Character limits are App Store Connect's and sit in each heading. Update this
file in the same change that edits App Store Connect.

Name, Subtitle and the Privacy Policy URL live on **App Information** and apply
to every version; everything else is per version and per locale. An unfilled
Ukrainian field shows the English text to Ukrainian users, so fill both.

This is the 6.3.1 listing: 6.3.0's installments and loans, per-type + menu and
iPhone Duo layout, with the legal and support pages moved to
`subeye.yhunko.dev` and the contact to `subeye@yhunko.dev`. Pro rose to $14.99 (Ukraine $11.99) on 2026-11-04.

The Promotional Text, Description and Keywords below are staged for the next
version record (`docs/marketing/LAUNCH-PLAN.md` §1.2–1.5) and are not in App
Store Connect yet. They lead with the uncapped free tier and say plainly that
the price timeline is Pro. The free-tier claim leads the description's first
line and the promotional text; the word "free" never goes in the Name, Subtitle
or a screenshot caption (Guideline 2.3.7).

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
5. **Contact:** `subeye@yhunko.dev` is the App Review contact and the address
   in the privacy policy, the terms and the support page. It must keep
   delivering. Moved from `@subeye.cc` on 2026-11-05; that domain lapses on
   2027-01-09.

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

### Promotional Text (170) — next build

```
Every subscription, no limit, for free — with installments and loans on the same calendar. SubEye Pro adds the timeline: a price rise, months before your statement.
```

For when there is no news worth the slot:

```
Every subscription, no limit, for free. No account, no bank login, no ads. Type in what you pay and see what leaves your account this month and what comes next.
```

### What's New in This Version (4000) — 6.4.0

```
• Add from a screenshot: take screenshots of Settings → your name → Subscriptions, then tap + → From screenshot. SubEye reads the names, prices and renewal dates on the phone and shows you the list to check before anything is added. Nothing leaves the device.
• SubEye Pro: Lock Screen widgets — your next payment, or the month's total, right under the clock.
• The + button is a true circle again, and still opens the menu of what you can add.
```

### What's New in This Version (4000) — 6.3.1

```
• Installments and loans: track a pay-in-parts purchase, a buy now, pay later plan, a card installment or a bank loan next to your subscriptions. See how many payments are made, what is paid, what is left and the day it ends.
• Every payment counts in this month's total and shows in the calendar. A reminder the day before each payment — the one for the last payment says it is the last — and a note once the plan is paid off. Paid it off early? Record it and the schedule ends there.
• The + button now asks what you are adding — a subscription, a free trial, a one-time license, or an installment or loan — and each has its own short flow. A subscription takes two steps, with an intro price one switch away.
• On iPhone Duo, unfolded, each tab shows its list and what you open side by side.
• SubEye Pro: add the purchase price to see how much more the credit costs, choose how many days ahead installment reminders arrive, and keep the next payment in the Home Screen widget. Already have Pro? All of it is included.
• Using iCloud Sync? Update SubEye on every device you sync — older versions do not show installments.
• The privacy policy, terms and support page now live at subeye.yhunko.dev, and the contact address is subeye@yhunko.dev.
```

### Description (4000)

```
Every subscription, no limit, for free. SubEye tells you what they cost — all of them, together, before the money leaves your account.

You type in what you pay. SubEye keeps the whole schedule: what it costs now and the exact day it renews — and, with Pro, what it becomes when the discount ends.

WHAT YOU GET

• One number that matters — what is still going to leave your account this month, and how much of the month is left to pay it.
• Next month's forecast set against this one, and the single subscription costing you the most.
• SubEye Pro makes a price a timeline, not a number. Free trial, intro price, the standard price it turns into, a license you bought once with its optional updates renewal, and any change you have scheduled — all on one line, months before it reaches your statement.
• Pause indefinitely or until a date. Cancel at period end and keep what you already paid for, or cancel immediately. Change your mind and renew.
• Add from a screenshot — pick screenshots of your App Store subscriptions and SubEye reads them on the phone, ready for you to check.
• Installments and loans next to your subscriptions — a pay-in-parts purchase, buy now, pay later, a card installment or a bank loan. How many payments are made, what is left to pay and the day it ends, with every payment counted in its month and shown in the calendar.
• Saved with SubEye — what pausing and cancelling has kept in your pocket, counted from the day each one stopped.
• A reminder the day before a renewal or an installment payment, so nothing is a surprise.
• 155 currencies — every one the world bills in — converted daily into the one you count in.
• English and Ukrainian, and iCloud Sync when you want the same list on two devices.

NO ACCOUNT. NO BANK. NO SERVER.

Most trackers ask for one of two things: the credentials to your bank, or permission to read your email. SubEye asks for neither. There is nothing to sign up for and nothing to sign in to — open the app and start typing.

Your subscriptions and installments stay on your phone. There is no server behind SubEye holding a copy, so there is nothing to breach and nothing to sell. Settings → Erase all data removes every subscription, installment, reminder and setting from the device, for real.

SUBEYE PRO — ONE PAYMENT

The free app is not a trial and not a teaser. Unlimited subscriptions and installments, the whole dashboard, the payment calendar, every lifecycle action, renewal and installment reminders, Live Activities, every currency and iCloud Sync are free, and stay free.

Pro is a single purchase that never renews. It adds:
• Pricing phases — trials, intro discounts, one-time licenses and scheduled changes on one timeline
• Trial-ending alerts, and reminders on the days you choose — the same day, or 1, 3 or 7 days before — for installments too
• Categories, the category filter, and the spend breakdown grouped by them
• The calendar's year view, and every month set against the one before it
• What a credit really costs — the purchase price set against what you repay
• Home and Lock Screen widgets, with your next installment payment among the upcoming ones

Charging a monthly fee to watch your monthly fees would be absurd.

Built by one person, in Ukraine.
```

### Keywords (100)

Comma-separated, no spaces. Words already in the Name or Subtitle are indexed
anyway, so they stay out.

```
recurring,bill,payment,budget,expense,manager,reminder,cancel,loan,price,widget,due,calendar,bnpl
```

The next build drops `finance`, a category name, and `money`, the weakest term,
for `manager` (the head phrase "subscription manager", which the Name does not
index) and `bnpl`, the installment searcher's own word (97 characters). No
brand names such as Klarna or Afterpay: trademarked keywords are a review risk.

### URLs

| Field | Value |
| --- | --- |
| Support URL | `https://subeye.yhunko.dev/en/support/` |
| Marketing URL | `https://subeye.yhunko.dev/en/` |
| Privacy Policy URL (App Information) | `https://subeye.yhunko.dev/en/privacy-policy/` |

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

### Promotional Text (170) — next build

```
Усі ваші підписки — без обмежень і безкоштовно, а розстрочки й кредити в тому ж календарі. SubEye Pro додає лінію часу: подорожчання видно за місяці до виписки.
```

For when there is no news worth the slot:

```
Усі ваші підписки — без обмежень і безкоштовно. Без акаунта, без доступу до банку, без реклами. Вводите те, що платите, — і бачите, скільки піде цього місяця і що далі.
```

### What's New in This Version (4000) — 6.4.0

```
• Додавання зі знімка екрана: зробіть знімки екрана «Параметри → ваше ім’я → Передплати», а тоді торкніться «+» → «Зі знімка екрана». SubEye розпізнає назви, ціни й дати поновлення на телефоні й покаже список на перевірку, перш ніж щось додати. Нічого не залишає пристрій.
• SubEye Pro: віджети на Замкненому екрані — наступний платіж або сума за місяць просто під годинником.
• Кнопка «+» знову ідеально кругла й так само відкриває меню того, що можна додати.
```

### What's New in This Version (4000) — 6.3.1

```
• Розстрочки й кредити: відстежуйте покупку частинами, розстрочку на картці чи банківський кредит поруч із підписками. Видно, скільки платежів уже зроблено, скільки сплачено, скільки лишилося і коли все закінчиться.
• Кожен платіж враховується в сумі за місяць і є в календарі. Нагадування за день до кожного платежу (про останній — що він останній) і повідомлення, коли розстрочку чи кредит погашено. Погасили достроково? Позначте це — і графік на цьому закінчиться.
• Кнопка «+» тепер питає, що ви додаєте, — підписку, пробний період, разову ліцензію чи розстрочку або кредит, — і для кожного є свій короткий шлях. Підписка додається за два кроки, а нижча ціна на старт — за один перемикач.
• На iPhone Duo в розкладеному вигляді кожна вкладка показує список і те, що ви відкрили, поруч.
• SubEye Pro: додайте ціну покупки, щоб побачити переплату, оберіть, за скільки днів до платежу нагадувати про розстрочки й кредити, і тримайте наступний платіж у віджеті на Початковому екрані. Уже маєте Pro? Усе це вже ваше.
• Користуєтеся синхронізацією з iCloud? Оновіть SubEye на кожному пристрої, який синхронізуєте, — старіші версії розстрочок не показують.
• Політика конфіденційності, умови та сторінка підтримки тепер на subeye.yhunko.dev, а адреса для звʼязку — subeye@yhunko.dev.
```

### Description (4000)

```
Усі ваші підписки — без обмежень і безкоштовно. SubEye показує, скільки вони коштують, — усі разом і до того, як гроші підуть з рахунку.

Ви вводите те, що платите. SubEye тримає весь розклад: скільки це коштує зараз і в який саме день станеться списання, а з Pro — ще й скільки коштуватиме, коли закінчиться знижка.

ЩО ВСЕРЕДИНІ

• Одне число, яке має значення, — скільки ще піде з рахунку цього місяця і скільки місяця лишилося.
• Прогноз на наступний місяць у порівнянні з цим і найдорожча підписка.
• З SubEye Pro ціна — це не число, а лінія часу. Пробний період, ціна на старт, стандартна ціна, на яку все перетвориться, ліцензія, куплена один раз, із необов’язковим продовженням оновлень, і будь-яка зміна, яку ви запланували, — на одній шкалі, за місяці до того, як це з’явиться у виписці.
• Призупиніть безстроково або до певної дати. Скасуйте наприкінці оплаченого періоду й користуйтеся тим, за що вже заплатили, — або скасуйте одразу. Передумали? Відновіть.
• Додавання зі знімка екрана — оберіть знімки своїх передплат з App Store, і SubEye розпізнає їх на телефоні, а ви перевірите перед додаванням.
• Розстрочки й кредити поруч із підписками — покупка частинами, розстрочка на картці чи банківський кредит. Скільки платежів уже зроблено, скільки лишилося сплатити і коли все закінчиться, а кожен платіж — у своєму місяці й у календарі.
• Заощаджено з SubEye — скільки лишилося у вашій кишені завдяки паузам і скасуванням, від дня, коли кожна підписка зупинилася.
• Нагадування за день до списання чи платежу за розстрочкою, щоб нічого не було несподіванкою.
• 155 валют — усі, якими у світі виставляють рахунки, — за щоденним курсом переводяться в ту, у якій рахуєте ви.
• Українська та англійська, а якщо потрібен той самий список на двох пристроях — синхронізація через iCloud.

БЕЗ АКАУНТА. БЕЗ БАНКУ. БЕЗ СЕРВЕРА.

Більшість трекерів хочуть одне з двох: доступ до вашого банківського рахунку або дозвіл читати вашу пошту. SubEye не просить ні того, ні іншого. Реєструватися нема де, входити нема куди — відкриваєте застосунок і починаєте вводити.

Ваші підписки, розстрочки й кредити лишаються на телефоні. За SubEye немає сервера з копією, тож нема чого зламувати і нема чого продавати. «Налаштування → Стерти всі дані» прибирає з пристрою всі підписки, розстрочки, кредити, нагадування й налаштування — по-справжньому.

SUBEYE PRO — ОДИН ПЛАТІЖ

Безкоштовна версія — це не тріал і не приманка. Необмежена кількість підписок, розстрочок і кредитів, уся панель, календар платежів, усі дії з підписками, нагадування про списання й платежі за розстрочками, активності поновлень наживо, усі валюти й синхронізація через iCloud безкоштовні й такими лишаються.

Pro — це разова покупка, яка ніколи не поновлюється. Вона додає:
• Цінові періоди — пробні періоди, знижки, разові ліцензії та заплановані зміни на одній шкалі
• Сповіщення про кінець пробного періоду й нагадування в дні, які оберете ви, — у день платежу або за 1, 3 чи 7 днів, і для розстрочок та кредитів теж
• Категорії, фільтр за ними і розподіл витрат за категоріями
• Річний огляд у календарі й порівняння кожного місяця з попереднім
• Скільки насправді коштує кредит — переплата порівняно з ціною покупки
• Віджети на Початковому й Замкненому екранах — з наступним платежем за розстрочкою чи кредитом серед найближчих

Брати щомісячну плату за те, щоб стежити за щомісячними платежами, було б абсурдом.

Створено однією людиною в Україні.
```

### Keywords (100)

```
підписки,платежі,бюджет,гроші,частинами,скасувати,ціна,віджет,рахунки,облік,календар,кредит,пробний
```

The next build swaps `фінанси`, a category name, for `частинами` (99
characters), which catches «оплата частинами» and «покупка частинами», the
banks' own names for installments. `розстрочка` is the commoner search but is
widely called a Russicism; `розстрочення` is the standard form. A native reader
chooses (`docs/marketing/LAUNCH-PLAN.md` §1.2, §4): `розстрочка` fits only in
place of `частинами` or `скасувати`, `розстрочення` only by dropping two words.
`підписки` may duplicate the Name's `підписок` if Apple matches Ukrainian
inflections; that is untested, so it stays.

### URLs

| Field | Value |
| --- | --- |
| Support URL | `https://subeye.yhunko.dev/uk/support/` |
| Marketing URL | `https://subeye.yhunko.dev/uk/` |
| Privacy Policy URL (App Information) | `https://subeye.yhunko.dev/uk/privacy-policy/` |

### Copyright (200)

```
2026 Yehor Hunko
```

---

## Not localized

### App Review Information

**Sign-in required: NO.** Contact: Yehor Hunko, `subeye@yhunko.dev`.

Notes (4000). A reviewer who has never seen the app gets only this field.
Replace section 1 and the test devices per release and recheck every factual
line against the app: the external services and the Pro list drift.

```
No account: no sign-up, no sign-in, no server, no backend. The app opens straight to the dashboard, so "Sign-In Required" is unticked.

1. WHAT CHANGED IN THIS VERSION
Add from a screenshot (free). To try it: Home, "+", "From screenshot", then choose screenshots of Settings > [your name] > Subscriptions. The system photo picker is used, so no photo library permission is requested. Text is read on the device by Apple's Vision framework; only when its rules find no rows, and only on iOS 26 or later with Apple Intelligence on, Apple's on-device Foundation Models groups the text. Nothing is uploaded and the images are not stored. The user checks and edits the list before anything is added.
Lock Screen widgets (Pro): the existing widget also comes in the Lock Screen's rectangular and inline sizes.

2. TESTED ON
iPhone 17 Pro simulator, iOS 26.5; the previous version also on iPhone 17, iOS 27.2. iPhone only, portrait only, dark appearance only, by design. Minimum iOS 16.4.

3. WHAT IT DOES
A manual subscription tracker: the user types what they pay (name, amount, currency, cycle, start date) and sees what still leaves their account this month, next month's forecast, renewal dates and when a trial turns into a charge; they can pause, cancel or renew. It also tracks the user's own installment plans and loans. No bank credentials, no email access. Rated 4+.

4. SETUP
No credentials, demo account or configuration. Empty on first launch by design: Home, "+", "Subscription", any name, Next, an amount, Save. That one entry fills the dashboard, list, calendar and reminders. Works offline.

5. EXTERNAL SERVICES
- Apple In-App Purchase via RevenueCat, configured anonymously.
- jsDelivr CDN: one public exchange-rate file, at most once a day.
- Brandfetch, with Google's favicon service as fallback: a logo for a domain the user typed or picked, a service's or a lender's.
- Apple App Store lookup (itunes.apple.com/lookup, app ID and country only), at most daily, for a new-version notice; skipped for sandbox and TestFlight receipts.
- Apple iCloud key-value storage: off by default, opt-in at Settings, Data; the user's own iCloud, which we cannot read.
Screenshot import runs only on the device (Apple Vision, and Apple's on-device Foundation Models where available) and makes no network call.
No authentication, analytics, crash-reporting, advertising or third-party AI SDK, no payment processor other than Apple, and no server of ours.

6. REGIONAL DIFFERENCES
None. English and Ukrainian from the device language; all 155 currencies; nothing geo-restricted. Only the purchase price varies by storefront.

7. REGULATED INDUSTRY, THIRD-PARTY MATERIAL
Not regulated: no bank or lender connection, financial account, money movement, credential, transaction or advice. Guideline 3.2.1(viii) does not apply; Finance is the category for discoverability only.
Brand logos are fetched at runtime for a domain the user typed or picked, never bundled, and imply no affiliation.

8. IN-APP PURCHASE
"SubEye Pro", one non-consumable that never renews; no subscription in this app. It unlocks trial-ending alerts and custom reminder days, installments too, pricing phases (trials, intro prices, scheduled changes and one-time licenses), categories with the filter and spend breakdown, the calendar's year view and month-on-month figures, installment overpayment, and Home Screen and Lock Screen widgets, installments included.
Buy at Settings, first row, "SubEye Pro". Locked features open the same paywall: Settings, Categories; Settings, Reminders, trial alerts; Calendar, year view; a subscription's Manage pricing; the + menu's Free trial and One-time license and a subscription's "Starts at a lower price"; an installment's purchase price and overpayment.
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
  3.2.1(viii) does not apply: no bank, no money movement, no credential, and an
  installment plan or loan is the user's record of credit they already have,
  never an offer of one. If a reviewer raises it, swap the two.
- **Content Rights:** Yes. Brand logos are fetched at runtime from Brandfetch
  with a Google favicon fallback for a domain the user typed or picked, never
  bundled.
- **In-app purchase:** "Pro Lifetime" (`cc.subeye.app.pro.lifetime`),
  non-consumable, approved.
- **App Previews:** none.

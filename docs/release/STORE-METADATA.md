# App Store Connect metadata — en-US + uk

Paste-ready copy for the 1.0 version record, both localizations. Character
limits are App Store Connect's and sit in each heading; every field below was
counted against its cap. The Ukrainian subtitle is exactly 30 — editing it needs
a recount.

Add the second language from the **English (U.S.) ⌄** dropdown at the top right
of the version page → *Add Language* → **Ukrainian**. That creates a second copy
of every field on this page *and* of Name / Subtitle / Privacy Policy URL on the
**App Information** page — both have to be filled.

---

## Blockers to clear first

1. **Version says `1.0`, the binary will say `5.0.0`.** `apps/mobile/app.json`
   sets `version: "5.0.0"`, which becomes `CFBundleShortVersionString`, and
   App Store Connect only offers builds whose version string matches the record.
   Change the **Version** field on this page to `5.0.0` (it is editable until
   the first submission), or drop `app.json` to `1.0.0` — but the app config is
   deliberate, so match the record to the binary.
2. **"Sign-in required" is ticked under App Review Information.** There is no
   account, no sign-up and no sign-in anywhere in the app. Untick it; leaving it
   on with empty credentials is an automatic rejection.
3. **`privacy@subeye.cc` must actually deliver.** It is the contact address in
   the privacy policy, on the support page, and in the App Review contact block.
   MX is on the domain; the alias itself was still outstanding.
4. **Screenshots** — the 6.9" set (1320×2868) is the one Apple requires today;
   6.5" is optional. Both are already rendered at
   `~/Developer/projects/sub-eye-store-screenshots/export/apple/iphone/`, **`en`
   and `uk`**, so upload the `uk/` set into the Ukrainian localization rather
   than letting it inherit the English captions.

---

## English (U.S.)

### App Information → Name (30)

```
SubEye: Subscription Tracker
```

### App Information → Subtitle (30)

```
Renewals, trials and spending
```

### Promotional Text (170)

Editable any time without a new build — use it for launch notes later.

```
No account, no bank login, no ads. Type in what you pay and see what leaves your account this month, what is next, and the day a trial turns into a charge.
```

### Description (4000)

```
SubEye tells you what your subscriptions cost — all of them, together, before the money leaves your account.

You type in what you pay. SubEye keeps the whole schedule: what it costs now, what it becomes when the discount ends, and the exact day it renews.

WHAT YOU GET

• One number that matters — what is still going to leave your account this month, and how much of the month is left to pay it.
• Next month's forecast, six months of trend, and your most expensive subscription.
• A price is a timeline, not a number. Free trial, intro price, the standard price it turns into, and any change you have scheduled — all on one line, months before it reaches your statement.
• Pause indefinitely or until a date. Cancel at period end and keep what you already paid for, or cancel immediately. Change your mind and renew.
• A reminder the day before a renewal, so nothing is a surprise.
• Five currencies — UAH, USD, EUR, GBP, PLN — converted daily into the one you count in.
• English and Ukrainian, and iCloud Sync when you want the same list on two devices.

NO ACCOUNT. NO BANK. NO NETWORK.

Most trackers ask for one of two things: the credentials to your bank, or permission to read your email. SubEye asks for neither. There is nothing to sign up for and nothing to sign in to — open the app and start typing.

Your subscriptions stay on your phone. There is no server behind SubEye holding a copy, so there is nothing to breach and nothing to sell. Settings → Erase all data removes every subscription, reminder and setting from the device, for real.

SUBEYE PRO — ONE PAYMENT

The free app is not a trial and not a teaser. Unlimited subscriptions, the whole dashboard, every lifecycle action, renewal reminders, five currencies and iCloud Sync are free, and stay free.

Pro is a single purchase that never renews. It adds:
• Trial-ending alerts, and reminders at the time you choose
• Pricing phases — trials, intro discounts and scheduled changes on one timeline
• Categories, the category filter and the spend breakdown
• Home Screen widgets

Charging a monthly fee to watch your monthly fees would be absurd.

Built by one person, in Ukraine.
```

### Keywords (100)

Comma-separated, no spaces. Do not repeat words already in the Name or
Subtitle — Apple indexes those too.

```
recurring,bill,payment,budget,expense,money,finance,reminder,cancel,manage,price,widget,spend,due
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
SubEye: трекер підписок
```

### App Information → Subtitle (30)

```
Витрати, списання, нагадування
```

### Promotional Text (170)

```
Без акаунта, без доступу до банку, без реклами. Ви вводите те, що платите, — і бачите, скільки піде цього місяця, що далі й коли пробний період стане списанням.
```

### Description (4000)

```
SubEye показує, скільки коштують ваші підписки — усі разом і до того, як гроші підуть з рахунку.

Ви вводите те, що платите. SubEye тримає весь розклад: скільки це коштує зараз, скільки коштуватиме, коли закінчиться знижка, і в який саме день станеться списання.

ЩО ВСЕРЕДИНІ

• Одне число, яке має значення, — скільки ще піде з рахунку цього місяця і скільки місяця лишилося.
• Прогноз на наступний місяць, тренд за пів року і найдорожча підписка.
• Ціна — це не число, а лінія часу. Пробний період, ціна на старт, стандартна ціна, на яку все перетвориться, і будь-яка зміна, яку ви запланували, — на одній шкалі, за місяці до того, як це з’явиться у виписці.
• Призупиніть безстроково або до певної дати. Скасуйте наприкінці оплаченого періоду й користуйтеся тим, за що вже заплатили, — або скасуйте одразу. Передумали? Відновіть.
• Нагадування за день до списання, щоб нічого не було несподіванкою.
• П’ять валют — UAH, USD, EUR, GBP, PLN — за щоденним курсом переводяться в ту, у якій рахуєте ви.
• Українська та англійська, а якщо потрібен той самий список на двох пристроях — синхронізація через iCloud.

БЕЗ АКАУНТА. БЕЗ БАНКУ. БЕЗ МЕРЕЖІ.

Більшість трекерів хочуть одне з двох: доступ до вашого банківського рахунку або дозвіл читати вашу пошту. SubEye не просить ні того, ні іншого. Реєструватися нема де, входити нема куди — відкриваєте застосунок і починаєте вводити.

Ваші підписки лишаються на телефоні. За SubEye немає сервера з копією, тож нема чого зламувати і нема чого продавати. «Налаштування → Стерти всі дані» прибирає з пристрою всі підписки, нагадування й налаштування — по-справжньому.

SUBEYE PRO — ОДИН ПЛАТІЖ

Безкоштовна версія — це не тріал і не приманка. Необмежена кількість підписок, уся панель, усі дії з підписками, нагадування про списання, п’ять валют і синхронізація через iCloud безкоштовні й такими лишаються.

Pro — це разова покупка, яка ніколи не поновлюється. Вона додає:
• Сповіщення про кінець пробного періоду й нагадування в той час, який оберете ви
• Цінові періоди — пробні періоди, знижки та заплановані зміни на одній шкалі
• Категорії, фільтр за ними і розподіл витрат
• Віджети на екрані «Дім»

Брати щомісячну плату за те, щоб стежити за щомісячними платежами, було б абсурдом.

Створено однією людиною в Україні.
```

### Keywords (100)

```
підписки,платежі,витрати,бюджет,гроші,фінанси,нагадування,скасувати,ціна,віджет,тріал,рахунки,облік
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

## Not localized — fill once

### App Review Information

**Sign-in required: NO.** Untick it.

Notes (4000):

```
There is no account in this app. No sign-up, no sign-in, no server, no backend of any kind — the app opens straight to the dashboard.

SEEING THE APP WITH DATA
It starts empty by design. Tap "+" on the Home tab and add one subscription (any name, amount, currency and start date). That single entry populates the dashboard totals, the forecast, the upcoming rail, the list, the detail timeline and the reminder schedule. It takes about twenty seconds.

WHERE DATA LIVES
Everything is stored on the device. Nothing about a user's subscriptions is uploaded to us — there is no server to upload it to. iCloud Sync (Settings → Data) is off by default and writes to NSUbiquitousKeyValueStore, i.e. the user's own iCloud, which we cannot read.

NETWORK
The app is fully usable with the network off. The only outbound requests are: a daily exchange-rate file from a public CDN, a brand-logo lookup when a service name is typed into the add form, crash reports, and the App Store purchase check. None of them carries a user identifier — the purchase SDK is configured with an anonymous, device-local app user id.

IN-APP PURCHASE
"SubEye Pro" is one non-consumable that unlocks trial-ending alerts, custom reminder times, pricing phases, categories with the spend breakdown, and Home Screen widgets. Nothing renews. Restore Purchases is on the paywall and in Settings.

The app is iPhone-only, portrait-only and dark-only by design.
```

Contact: `privacy@subeye.cc` — see blocker 3.

### App Privacy (App Information → App Privacy)

Must match `NSPrivacyCollectedDataTypes` in `apps/mobile/app.json`, which now
declares exactly these three. All "App Functionality", none used for tracking,
**none linked to the user**:

| Category | Type | Linked | Why |
| --- | --- | --- | --- |
| Diagnostics | Crash Data | no | Sentry, `sendDefaultPii: false`, no user attached |
| Purchases | Purchase History | no | RevenueCat with `appUserID: null` |
| Browsing/Search | Search History | no | text typed into the brand picker goes to Brandfetch |

The subscriptions a user types are **not** declared: they stay on the device,
and the one path that moves them (iCloud Sync) writes to the user's own iCloud,
which the developer cannot read. Neither is collection under Apple's definition.

### App Store Server Notifications (App Information, bottom)

**Set both the production and the sandbox URL to RevenueCat's**, copied from the
RevenueCat dashboard — the Apple app's config page prints the exact per-app URL.
There is nothing else they could point at: SubEye has no server.

It matters even though Pro is a non-consumable rather than a subscription,
because refunds and family-sharing revokes travel that way. The entitlement is
checked entirely on the device (`entities/pro/model/purchases.ts`), so whatever
RevenueCat last said *is* what the app believes; without the notification URL it
keeps saying yes after a refund until something forces a receipt refresh.

**The App-Specific Shared Secret is for auto-renewable subscriptions**, which
this app does not sell. The credential RevenueCat needs for a non-consumable is
the **In-App Purchase Key** (`.p8`) from Users and Access → Integrations — *not*
the App Store Connect API key, which is the mistake that looks identical and
fails silently in a release build. Generate a shared secret only if RevenueCat's
config page still flags one as missing after the IAP key is uploaded.

### The rest

- **Age rating:** **every row of all seven steps is NO**, which lands on 4+.
  The three that are worth a second's thought and are still NO: *Unrestricted
  Web Access* — there is no WebView and no in-app browser, the only
  `Linking.openURL` in the app is a `mailto:` and the legal documents render
  in-app from `@subeye/legal`; *User-Generated Content* — the user types
  subscription names for themselves and nothing distributes them; *Advertising*
  — the paywall sells our own in-app purchase, which is not paid promotion of a
  third party. *Social Media Disabled for Users Under 13* should grey itself out
  once Social Media is NO; if it does not, NO is still literal, because there
  are no social features and the Declared Age Range API is never called.
- **Encryption:** `usesNonExemptEncryption: false` is already in `app.json`, so
  the export-compliance question should not appear. If it does: standard HTTPS
  only.
- **Category:** primary **Finance**, secondary **Productivity**. Finance is
  where every subscription tracker a user might compare this to already lives,
  and category drives browse placement, not search — the charts there are
  unreachable for a new indie app either way, so pick for relevance. Only Games
  have subcategories; there is nothing else to fill in.
  - The one thing to know: **Guideline 3.2.1(viii)** says apps for financial
    trading, investing or money management should be submitted by the
    institution performing the service. SubEye performs none — it touches no
    bank, moves no money and holds no credential — so this should not bite. If
    a reviewer raises it anyway, the answer is that the app is a manual ledger
    with no financial service behind it, and the fallback is to swap the two:
    Productivity primary, Finance secondary.
- **Content Rights:** **Yes, and I have the necessary rights.** The app draws
  brand logos it does not own — Brandfetch's logo CDN with a Google favicon
  fallback, fetched at runtime for a domain the user typed, never bundled.
  Answering "No" would be false. The rights stand on Brandfetch's logo API
  being built for this and on nominative use of a mark to name the service the
  user already named. Open question worth checking against Brandfetch's terms,
  not Apple's: whether the plan in use requires visible attribution.
- **App Previews:** none. Seven screenshots per locale is enough for 1.0.

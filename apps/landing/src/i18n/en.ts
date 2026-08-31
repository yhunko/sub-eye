import type { PricePhaseKind, SubscriptionStatus } from "@subeye/model";

/**
 * English is the shape of the whole dictionary. It lives here rather than in
 * the barrel so `uk.ts` can annotate itself without the two files importing
 * each other — `check:circular` fails on that cycle even though it is types-only.
 */
export type Copy = typeof en;

export const en = {
  intl: "en-US",
  langName: "English",
  otherLangShort: "УКР",
  otherLangName: "Українська",

  skip: "Skip to content",
  languages: "English and Ukrainian",

  nav: {
    how: "How it works",
    privacy: "Privacy",
    price: "Price",
  },

  meta: {
    title: "SubEye — know what your subscriptions cost",
    description:
      "SubEye tracks every recurring charge you type in: what it costs now, what it becomes, and the day it leaves your account. No account, no bank login, works with the network off. iPhone.",
  },

  hero: {
    title: "Know what your subscriptions cost. All of them.",
    lead: "You type in what you pay. SubEye tells you what it costs now, what it becomes, and the day it leaves your account — with nothing to sign up for and no network to be on.",
    platform: "iPhone",
    ctaHow: "See how it works",
    ctaPrice: (free: string, pro: string) => `${free} to start, ${pro} once`,
    upcoming: "Leaving your account next",
    upcomingNote:
      "Every date is one you typed once. Nothing is guessed from a bank feed.",
  },

  timeline: {
    kicker: "A subscription's price is a timeline, not a number.",
    lede: "SubEye models the whole schedule — the trial, the discount, and the price the discount turns into — so the increase is on the screen months before it is on your statement.",
    trial: "Free trial",
    intro: "Intro price",
    standard: "Standard",
    scheduledChange: "Scheduled change",
    days: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
    months: (n: number) => `${n} ${n === 1 ? "month" : "months"}`,
    fromMonth: (n: number) => `from month ${n}`,
    perMonth: "per month",
    punch: "This is the part nobody sees coming. That is the whole app.",
    blurb: {
      trial: "You are billed nothing, and you know when that ends.",
      intro: "The discount, and the month it stops being one.",
      standard: "The real price. On screen from the day you add it.",
      scheduledChange: "A change you recorded, already waiting for its date.",
    } satisfies Record<PricePhaseKind, string>,
  },

  bank: {
    title: "SubEye never touches your bank. Or the network.",
    body: "Every other tracker wants one of two things: credentials to your bank, or read access to your inbox. SubEye asks you to type in what you pay, and then keeps it on the phone — no account to create, no server holding a copy. The other half of that trade is honest: your subscriptions are on that phone. An iPhone backup carries them to a new one, and if you want a second device to see the same list, iCloud Sync is a switch in Settings — off until you turn it on, and it goes to your own iCloud, never to us.",
    denials: [
      "No bank linking",
      "No email scanning",
      "No “we found 3 subscriptions”",
    ],
    /** `languages` is appended at the call site — it is one string, not two. */
    pills: [
      "Nothing sold, nothing tracked",
      "No sign-up, nothing to sign in to",
      "Works with the network off",
    ],
  },

  does: {
    title: "What it does",
    money: {
      title: "One number, with a denominator.",
      body: "The home screen shows what is still going to leave your account this month, and how much of the month is left to pay it. Under that: next month's forecast and whether it moved up or down, what the next twelve months come to, and where the money actually goes.",
    },
    lifecycle: {
      title: "Pause it, cancel it, change your mind.",
      body: "Pause indefinitely or until a date. Cancel at period end and keep what you already paid for, or cancel immediately. Swipe a row and you are only ever offered the actions that are legal for that subscription right now.",
    },
    currency: {
      title: "Every currency, one honest total.",
      body: "156 currencies, re-denominated daily into the one you count in. A hryvnia subscription and a dollar subscription still add up to a number you can trust.",
    },
  },

  panel: {
    leftThisMonth: "Left this month",
    dayOf: (day: number, days: number) => `Day ${day} of ${days}`,
    subscriptions: (n: number) => `${n} subscriptions`,
    nextMonth: "Next month",
    whereItGoes: "Where it goes",
    categories: ["Video", "Software", "Fitness", "Music", "Other"],
    today: "Today",
    inDays: (n: number) => `in ${n} ${n === 1 ? "day" : "days"}`,
    totalThisMonth: "Total this month",
  },

  status: {
    active: "Active",
    paused: "Paused",
    cancelling: "Cancelling",
    cancelled: "Cancelled",
  } satisfies Record<SubscriptionStatus, string>,

  pricing: {
    title: "Pay once, or not at all.",
    freeName: "Free",
    freeSuffix: "always",
    freeBody:
      "Unlimited subscriptions. The whole dashboard. Search, sorting, every lifecycle action. A reminder the day before each renewal. Multi-currency at daily rates. iCloud Sync between your own devices. Not a trial and not a teaser.",
    freeItems: [
      "No account, and it works offline",
      "Unlimited subscriptions",
      "Spend, next month, and the year ahead",
      "A payment calendar for every month",
      "Pause, cancel, renew",
      "Renewal reminders, the day before",
      "Every currency at daily rates",
      "iCloud Sync across your own devices",
      "English and Ukrainian",
    ],
    proName: "Pro",
    proSuffix: "once",
    proTag: "One payment",
    proBody:
      "Everything above, plus the parts that watch the calendar for you.",
    proItems: [
      "Choose when every reminder lands",
      "Trial-ending alerts",
      "Price history on every subscription",
      "Categories, category filters and the breakdown",
      "Home Screen widgets",
    ],
    joke: "Charging a monthly fee to watch your monthly fees would be absurd.",
    storefrontTitle: "Priced for where you live.",
    storefrontBody:
      "SubEye uses per-storefront pricing. You pay your country's price, set in your country's currency — not a dollar price converted at the till.",
    storefrontUs: "United States",
    storefrontUa: "Ukraine",
    storefrontEu: "Euro zone",
    storefrontElsewhere: "adjusted for every other storefront",
  },

  faq: {
    title: "Questions",
    heading: "The ones we get asked.",
    items: [
      {
        q: "Why do I have to type everything in?",
        a: "Because the alternative is your bank password. Trackers that find subscriptions for you do it by holding a credential to your accounts or by reading your email. SubEye holds neither. Adding a subscription takes about twenty seconds, once.",
      },
      {
        q: "Is my data safe?",
        a: "It stays on your phone. There is no account, no server and no database behind SubEye — nothing to breach, nothing to sell, and nobody to hand it to. The one exception is iCloud Sync, off until you switch it on in Settings: it copies your subscriptions into your own iCloud so a second device can read them. That is Apple's storage, not ours, and we still never see them. Settings → Erase all data removes every subscription, reminder and setting from the device — and from iCloud too, if sync is on. The handful of services the app talks to, and exactly what each one sees, is in the privacy policy.",
      },
      {
        q: "Do I need an account?",
        a: "Not a SubEye one — there is nothing to sign up for and nothing to sign in to. Open the app and start typing. Your subscriptions live on the phone, and an iPhone backup carries them to a new one. If you want two devices to hold the same list, turn on iCloud Sync: it rides the Apple Account you are already signed in to, and it is off until you ask for it.",
      },
      {
        q: "What happens when a price changes?",
        a: "You add the new price with the date it starts. The old one stays on the timeline, so the forecast is right on both sides of the change — and if the change lands early, you can apply it on the day it actually happened.",
      },
    ],
  },

  cta: {
    title: "SubEye is on the App Store.",
    body: "Download it, type in the first subscription, and about twenty seconds later the number on the home screen is yours. Nothing to sign up for, nothing to sign in to.",
    download: "Download SubEye",
  },

  appStore: {
    /** Apple's own wording for the badge. The service mark is never translated. */
    badgeAlt: "Download on the App Store",
    /** The top bar's button. Not the badge's words — a text button that borrowed
        them would read as a badge Apple did not draw. */
    download: "Download",
    /**
     * Required wherever the site gives legal notice, once, because the page
     * carries the badge. The international form: no ® or ℠ symbols, which
     * Apple restricts to communications distributed only in the United States.
     */
    trademark:
      "Apple, the Apple logo and iPhone are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc.",
  },

  footer: {
    support: "Support",
    terms: "Terms of service",
    privacy: "Privacy policy",
    contact: "Contact",
    rights: "SubEye. Made in Ukraine.",
  },

  legal: {
    updated: "Last updated",
    backHome: "Back to SubEye",
  },
};

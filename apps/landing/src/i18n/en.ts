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
      "SubEye tracks every recurring charge you type in: what it costs now, what it becomes, and the day it leaves your account. No bank login, no inbox scanning. iPhone.",
  },

  hero: {
    title: "Know what your subscriptions cost. All of them.",
    lead: "You type in what you pay. SubEye tells you what it costs now, what it becomes, and the day it leaves your account.",
    status: "Coming to the App Store",
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
    title: "SubEye never touches your bank.",
    body: "Every other tracker wants one of two things: credentials to your bank, or read access to your inbox. SubEye asks you to type in what you pay. That is the whole trade — a minute of typing, and nobody gets a key to your accounts.",
    denials: [
      "No bank linking",
      "No email scanning",
      "No “we found 3 subscriptions”",
    ],
    /** `languages` is appended at the call site — it is one string, not two. */
    pills: ["Nothing sold, nothing tracked", "Delete your account, for real"],
  },

  does: {
    title: "What it does",
    money: {
      title: "One number, with a denominator.",
      body: "The home screen shows what is still going to leave your account this month, and how much of the month is left to pay it. Under that: next month's forecast, six months of trend, your most expensive subscription, and where the money actually goes.",
    },
    lifecycle: {
      title: "Pause it, cancel it, change your mind.",
      body: "Pause indefinitely or until a date. Cancel at period end and keep what you already paid for, or cancel immediately. Swipe a row and you are only ever offered the actions that are legal for that subscription right now.",
    },
    currency: {
      title: "Five currencies, one honest total.",
      body: "UAH, USD, EUR, GBP and PLN, re-denominated daily into the one you count in. A hryvnia subscription and a dollar subscription still add up to a number you can trust.",
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
      "Unlimited subscriptions. The whole dashboard. Search, filters, every lifecycle action. A reminder the day before each renewal. Multi-currency at daily rates. Not a trial and not a teaser.",
    freeItems: [
      "Unlimited subscriptions",
      "Spend, forecast and six-month trend",
      "Pause, cancel, renew",
      "Renewal reminders, the day before",
      "Five currencies at daily rates",
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
      "Price-change tracking",
      "Categories and the spend breakdown",
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
        a: "SubEye stores your email, your name, an account id, and the subscriptions you typed in. None of it is sold, none of it feeds advertising, and there is no tracking. Deleting your account in Settings removes the account and every subscription in it, for real. The full list of processors is in the privacy policy.",
      },
      {
        q: "Do I need an account?",
        a: "Yes. Your subscriptions live on the server so they survive a lost phone, a new phone and a reinstall. Sign in with email, Google, GitHub or Apple.",
      },
      {
        q: "What happens when a price changes?",
        a: "You add the new price with the date it starts. The old one stays on the timeline, so the forecast is right on both sides of the change — and if the change lands early, you can apply it on the day it actually happened.",
      },
    ],
  },

  cta: {
    title: "Coming to the App Store.",
    body: "SubEye is built and heading for review. There is no list to join and nothing to sign up for — the app will simply be there.",
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
    contents: "On this page",
  },
};

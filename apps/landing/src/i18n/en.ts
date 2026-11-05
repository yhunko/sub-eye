import type { PricePhaseKind } from "@subeye/model";
import type { SourceKind } from "../lib/priceRises";

/**
 * English is the shape of the whole dictionary. It lives here rather than in
 * the barrel so `uk.ts` can annotate itself without the two files importing
 * each other — `check:boundaries` fails on that cycle even though it is types-only.
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
    timeline: "Timeline",
    free: "Free",
    installments: "Installments",
    price: "Price",
    faq: "Questions",
  },

  meta: {
    title: "SubEye — see a subscription's price rise before it lands",
    description:
      "An iPhone subscription tracker that plots each price forward: the trial, the intro price and the rise already on its way. Every subscription free, with no limit. Installments on the same calendar. No account, no bank.",
  },

  hero: {
    title: "See the price rise before it hits.",
    lead: "SubEye is an iPhone subscription tracker that plots every price forward: the trial, the intro price, and the rise already on its way.",
    price: (pro: string) =>
      `Every subscription is free, with no limit. The timeline is Pro: ${pro}, once.`,
    secondary: "See the timeline",
    alt: "SubEye on iPhone: Adobe Creative Cloud at $29.99 a month, with a rise to $34.99 scheduled for 6 December 2026, $60.00 more a year.",
  },

  timeline: {
    title: "A price is a timeline, not a number.",
    lede: "SubEye keeps the whole schedule — the trial, the discount, and the price the discount turns into — so the increase is on screen months before it is on your statement. Pick a phase.",
    trial: "Free trial",
    intro: "Intro price",
    standard: "Standard",
    scheduledChange: "Scheduled change",
    days: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
    months: (n: number) => `${n} ${n === 1 ? "month" : "months"}`,
    fromMonth: (n: number) => `from month ${n}`,
    perMonth: "a month",
    yearly: (amount: string) => `${amount} over a year at this price`,
    blurb: {
      trial: "You are billed nothing, and you know when that ends.",
      intro: "The discount, and the month it stops being one.",
      standard: "The real price. On screen from the day you add it.",
      scheduledChange: "A change you recorded, already waiting for its date.",
    } satisfies Record<PricePhaseKind, string>,
    proTitle: "The timeline is what Pro buys.",
    pro: (pro: string) =>
      `Trials, intro prices, one-time licenses and scheduled changes, each on its own date, are SubEye Pro: ${pro}, once. Every subscription, its renewal date and a reminder the day before stay free.`,
    shotAlt:
      "SubEye price history for a sample Netflix subscription: free trial from 6 May to 6 June 2026, introductory price $4.99 until 6 August, then $12.99.",
  },

  free: {
    title: "Every subscription. No limit.",
    body: "The free app is not a trial and has no cap: the twentieth subscription goes in the way the first did.",
    features: [
      {
        title: "Left this month",
        body: "Home leads with what is still to leave your account, against what the whole month costs.",
      },
      {
        title: "Next month, and the year",
        body: "The forecast for next month, which way it moved, and what the next twelve months come to.",
      },
      {
        title: "Pause, cancel, change your mind",
        body: "Pause until a date, cancel at period end and keep what you paid for, or keep it after all.",
      },
      {
        title: "A calendar for every month",
        body: "Every renewal and payment on its day, with the month's total at the top.",
      },
    ],
    shotAlt:
      "SubEye's subscription list with sample data: $218 a month, $2,789 a year, iCloud+, Adobe Creative Cloud, Netflix, Spotify, HelloFresh, Disney+.",
  },

  does: {
    currency: {
      title: "Every currency, one honest total.",
      body: "155 currencies, converted daily into the one you count in. A hryvnia subscription and a dollar subscription still add up to a number you can trust.",
    },
  },

  panel: {
    totalThisMonth: "Total this month",
  },

  installments: {
    title: "Installments on the same calendar.",
    body: "A pay-in-parts purchase, a card installment or a loan you already have sits next to your subscriptions. Each payment falls on its day, counts in that month's total, and says how many are left. Free, with no cap on plans.",
    note: "SubEye tracks credit you already have. It never offers, compares or recommends a loan.",
    calendarAlt:
      "SubEye's November 2026 calendar with sample data: subscription logos and installment payments on their days, $1,487.24 for the month.",
    dayAlt:
      "14 November in SubEye: a car loan, payment 8 of 24, $520.00, next to Notion renewing for $96.00.",
    plansAlt:
      "SubEye's installment list with sample data: iPhone 17 Pro, 2 of 6 paid; a car loan, 7 of 24 paid; a sofa, 2 of 4 paid.",
  },

  reminders: {
    title: "A reminder the day before.",
    body: "Every renewal and installment payment gets a notification the day before, scheduled on the phone itself — there is no push server. On renewal day, a Live Activity puts Keep and Cancel on the Lock Screen.",
    pro: "With Pro: the lead time you choose (the same day, or 1, 3 or 7 days before), trial-ending alerts, and your next payments in a Home Screen widget.",
    alt: "A SubEye Live Activity on the iPhone Lock Screen: iCloud+ renews today for $2.99, with Keep and Cancel buttons.",
  },

  privacy: {
    title: "Nothing to hand over.",
    body: "You type in what you pay, and it stays on the phone.",
    rows: [
      {
        title: "No bank login, no inbox access",
        body: "SubEye never asks for the credentials to your bank or permission to read your email.",
      },
      {
        title: "No account, no server",
        body: "There is nothing to sign up for and no copy of your list anywhere but the phone.",
      },
      {
        title: "iCloud Sync is off until you turn it on",
        body: "It copies the list to your own iCloud for a second device. Apple's storage, never ours.",
      },
      {
        title: "Erase means erase",
        body: "Settings → Erase all data removes every subscription, reminder and setting, for real.",
      },
    ],
    policy: "Read the privacy policy",
  },

  pricing: {
    title: "Pay once, or not at all.",
    joke: "Charging a monthly fee to watch your monthly fees would be absurd.",
    freeName: "Free",
    freeSuffix: "always",
    freeItems: [
      "Every subscription and installment, no limit",
      "This month, next month and the year ahead",
      "The payment calendar",
      "A reminder the day before each payment",
      "Live Activities on renewal day",
      "155 currencies and iCloud Sync",
    ],
    proName: "SubEye Pro",
    proSuffix: "once",
    proItems: [
      "The price timeline: trials, intro prices, licenses, scheduled changes",
      "Reminders on the days you choose, trial-ending alerts",
      "Categories and the spend breakdown",
      "The calendar's year view, month against month",
      "What a credit costs over the purchase price",
      "Home Screen widgets",
    ],
    storefrontTitle: "Priced for where you live.",
    storefrontBody:
      "You pay the price set for your country's App Store, not the US price converted at the till.",
    storefrontUs: "United States",
    storefrontUa: "Ukraine",
    storefrontEu: "Euro zone",
  },

  faq: {
    title: "Questions",
    heading: "The ones we get asked.",
    items: [
      {
        q: "Is the timeline free?",
        a: "No — it is what Pro buys. A free subscription has one price and a renewal date. Pro adds trials, intro prices, one-time licenses and scheduled changes, each on its own date. Every subscription, every installment and the reminder the day before stay free, with no limit.",
      },
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
        a: "With Pro, you add the new price with the date it starts. The old one stays on the timeline, so the forecast is right on both sides of the change — and if the change lands early, you can apply it on the day it actually happened.",
      },
    ],
  },

  cta: {
    title: "On the App Store now.",
    body: "Type in the first subscription, and about twenty seconds later the number on Home is yours. Nothing to sign up for.",
    fact: (pro: string) => `Free, with no limit. Pro is ${pro}, once.`,
  },

  appStore: {
    /** Apple's own wording for the badge. The service mark is never translated. */
    badgeAlt: "Download on the App Store",
    /**
     * Required wherever the site gives legal notice, once, because the page
     * carries the badge. The international form: no ® or ℠ symbols, which
     * Apple restricts to communications distributed only in the United States.
     */
    trademark:
      "Apple, the Apple logo and iPhone are trademarks of Apple Inc., registered in the U.S. and other countries. App Store is a service mark of Apple Inc.",
  },

  footer: {
    product: "SubEye",
    read: "Read",
    legalTitle: "Help and legal",
    support: "Support",
    terms: "Terms of service",
    privacy: "Privacy policy",
    contact: "Contact",
    bobby: "A Bobby alternative",
    rises: "Price rises in 2026",
    rights: "SubEye. Made in Ukraine.",
  },

  legal: {
    updated: "Last updated",
    backHome: "Back to SubEye",
  },

  bobby: {
    metaTitle: "A Bobby alternative, compared on dated facts — SubEye",
    metaDescription:
      "Bobby and SubEye side by side: last update, platforms, widgets, the free limit and the price, each read on the App Store and dated.",
    title: "A Bobby alternative, on dated facts.",
    lead: (date: string, rating: string, count: string) =>
      `Bobby is a manual subscription tracker for iPhone by Yummygum, rated ${rating} from ${count} ratings on the US App Store. If you are weighing an alternative, here is what its listing said on ${date}, next to SubEye's own.`,
    tableCaption: (date: string) =>
      `Both columns were read on the US App Store listings on ${date}. Listings change; the current one is the authority.`,
    rows: {
      updated: "Latest version",
      price: "Price",
      freeLimit: "Free version",
      platforms: "Runs on",
      widgets: "Widgets",
      timeline: "Price over time",
      installments: "Installments and loans",
    },
    bobbyVersion: (version: string, date: string) => `${version}, ${date}`,
    bobbyPrice: (min: string, max: string) =>
      `Free, with in-app purchases from ${min} to ${max}`,
    bobbyFreeLimit:
      "The listing sells “Unlock Subscription Limit” and “Unlock Category Limit”; it does not state the numbers",
    bobbyPlatforms: (os: string) =>
      `iPhone and iPod touch (iOS ${os} or later); also Apple silicon Macs and Apple Vision. iPad is not listed`,
    bobbyWidgets: "Not mentioned on the listing",
    bobbyTimeline: "Not mentioned on the listing",
    bobbyInstallments: "Not mentioned on the listing",
    subeyeVersion: (version: string, date: string) => `${version}, ${date}`,
    subeyePrice: (pro: string) =>
      `Free; SubEye Pro is ${pro} once, priced per storefront`,
    subeyeFreeLimit: "No limit on subscriptions or installment plans",
    subeyePlatforms: (os: string) =>
      `iPhone (iOS ${os} or later); also iPad and Apple silicon Macs`,
    subeyeWidgets: "Home Screen widgets with Pro; Live Activities free",
    subeyeTimeline:
      "Trial, intro price, standard price and scheduled changes, each dated, with Pro",
    subeyeInstallments: "Beside subscriptions on one calendar, free",
    noAccount:
      "SubEye also asks for no account, no bank login and no inbox access: you type in what you pay, and it stays on the phone.",
    bobbyColumn: "Bobby",
    subeyeColumn: "SubEye",
    switchTitle: "Moving from Bobby.",
    switchBody:
      "There is no importer for Bobby's data. You type each subscription in once — about twenty seconds each — and from then on SubEye keeps the schedule. Nothing leaves the phone in either direction.",
    listingLink: "Bobby on the App Store",
    closeTitle: "See SubEye for yourself.",
    closeBody:
      "Every subscription is free, with no limit; the price timeline is Pro, paid once.",
    closeLink: "Back to the SubEye home page",
  },

  rises: {
    metaTitle:
      "Subscription price rises in 2026, checked at the source — SubEye",
    metaDescription:
      "Every 2026 subscription price rise we could confirm on the service's own pricing page or announcement: plan, storefront, old and new price, the date, and the source.",
    title: "Subscription price rises in 2026.",
    lead: "Each rise below was checked on the service's own pricing page, its own announcement, or an archived copy of that pricing page — never a news roundup. US prices on each service's own website, per month.",
    read: (date: string) => `Sources read on ${date}. Updated monthly.`,
    columns: {
      service: "Service and plan",
      price: "Price",
      year: "Per year",
      when: "When",
      sources: "Sources",
    },
    storefront: { us: "US" },
    perYear: (amount: string) => `+${amount}`,
    percent: (value: string) => `+${value}%`,
    announced: (date: string) => `Announced ${date}`,
    onPage: (date: string) => `On the US pricing page by ${date}`,
    noDate: "The service published no date",
    existingAfter: (date: string) =>
      `Existing members: next bill after ${date}`,
    existingMonth: (month: string) =>
      `Existing members: from the ${month} bill`,
    source: {
      announcement: "Announcement",
      pricingPage: "Pricing page",
      archivedBefore: "Archived, before",
      archivedAfter: "Archived, after",
    } satisfies Record<SourceKind, string>,
    closeTitle: "Put the next one on the calendar.",
    closeBody:
      "When a service emails you about a new price, SubEye Pro can hold it as a scheduled change on its date, so the forecast and the year ahead already include it.",
    closeLink: "See how the timeline works",
  },
};

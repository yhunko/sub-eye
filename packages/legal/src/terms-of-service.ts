import type { LegalDoc, LegalLocale } from "./types";

const EN: LegalDoc = {
  kind: "terms-of-service",
  locale: "en",
  title: "Terms of service",
  description:
    "The agreement between you and SubEye: what the app does, what Pro costs, what you own, and how either side ends it.",
  updated: "2026-08-26",
  lead: [
    {
      p: [
        "These terms are the agreement between you and SubEye. They are deliberately short, because the app is deliberately small.",
      ],
    },
  ],
  sections: [
    {
      id: "who-you-agree-with",
      heading: "Who you are agreeing with",
      blocks: [
        {
          p: [
            "SubEye is built and operated by Yehor Hunko, an individual based in Ukraine. Contact: ",
            { mailto: "privacy@subeye.cc" },
            ".",
          ],
        },
      ],
    },
    {
      id: "what-subeye-is",
      heading: "What SubEye is",
      blocks: [
        {
          p: [
            "An iPhone app for recording subscriptions you already have and seeing what they cost. It is a record of what you tell it. It has no connection to your bank, it does not read your email, it cannot see your actual charges, and it cannot cancel anything on your behalf.",
          ],
        },
        {
          p: [
            "There is no account and no SubEye server. Everything you enter is stored on your device, which means ",
            {
              b: "the data exists in exactly one place and keeping it is up to you.",
            },
            " An iPhone backup is what carries it to a new phone. iCloud Sync, off unless you turn it on, is the one way a second device sees the same list: it goes to your own iCloud under Apple's terms, not to a SubEye server, and nothing can be restored from here.",
          ],
        },
        {
          p: [
            {
              b: "Every figure in the app is arithmetic on the numbers you entered.",
            },
            " If a price you typed is wrong, or a merchant charges something different, or an exchange rate moves, the app will be wrong too. It is a tracker, not a statement, and it is not financial advice.",
          ],
        },
      ],
    },
    {
      id: "using-it",
      heading: "Using it",
      blocks: [
        {
          p: [
            "You must be 16 or older, and you must not use SubEye to break the law or to attack the services it depends on.",
          ],
        },
      ],
    },
    {
      id: "your-data-is-yours",
      heading: "Your data is yours",
      blocks: [
        {
          p: [
            "The subscriptions, notes and categories you enter belong to you, and they stay on your device — SubEye never receives them, so there is nothing here to claim ownership of, nothing to sell, and nothing to hand to anyone else. See the ",
            { doc: "privacy-policy", text: "privacy policy" },
            ".",
          ],
        },
      ],
    },
    {
      id: "free-and-pro",
      heading: "Free and Pro",
      blocks: [
        {
          p: [
            "The free version is not a trial. Unlimited subscriptions, the whole dashboard, search and sorting, every lifecycle action, a renewal reminder the day before, multi-currency conversion, and iCloud Sync between your own devices are free and stay free.",
          ],
        },
        {
          p: [
            { b: "SubEye Pro is a single payment of $11.99" },
            // \u00a0 is the site formatter's non-breaking space, not a plain one.
            ", or the equivalent set for your App Store storefront — about 199\u00a0₴ in Ukraine. It is not a subscription and it does not renew. It unlocks control over when reminders land, trial-ending reminders, the payment calendar, the price history on each subscription, categories with their filter and the spend breakdown, and the Home Screen widgets.",
          ],
        },
        {
          p: [
            "Purchases are made through Apple, under Apple's terms. Refunds are handled by Apple, not by SubEye.",
          ],
        },
      ],
    },
    {
      id: "notifications",
      heading: "Notifications",
      blocks: [
        {
          p: [
            "Renewal reminders are scheduled on your device by iOS. If you deny notification permission, turn the device off, or force-quit the app for a long time, iOS may not deliver them. ",
            {
              b: "Do not rely on SubEye as your only defence against an unwanted renewal.",
            },
          ],
        },
      ],
    },
    {
      id: "availability",
      heading: "Availability",
      blocks: [
        {
          p: [
            "SubEye is provided as it is, with no warranty of any kind. It is a small independent app: it may change, may stop being updated, and may one day be withdrawn from the App Store. A copy already installed keeps working offline, because there is no service behind it to switch off. Nothing here excludes liability that cannot lawfully be excluded, but otherwise liability is limited to what you paid for SubEye Pro, if anything.",
          ],
        },
      ],
    },
    {
      id: "ending-it",
      heading: "Ending it",
      blocks: [
        {
          p: [
            "You can stop at any time: Settings → Erase all data clears the device, and deleting the app removes the rest. Neither needs anyone's permission and neither can be undone.",
          ],
        },
      ],
    },
    {
      id: "changes",
      heading: "Changes",
      blocks: [
        {
          p: [
            "These terms may change. The date at the top of this page will change with them, and a material change will be announced in the app before it takes effect. Continuing to use SubEye after that means you accept the new terms.",
          ],
        },
      ],
    },
    {
      id: "law",
      heading: "Law",
      blocks: [
        {
          p: [
            "These terms are governed by the law of Ukraine. If you are a consumer in the European Union or the United Kingdom, this does not remove the protections of your own country's law.",
          ],
        },
      ],
    },
  ],
};

const UK: LegalDoc = {
  kind: "terms-of-service",
  locale: "uk",
  title: "Умови користування",
  description:
    "Домовленість між вами і SubEye: що робить застосунок, скільки коштує Pro, кому належать дані та як припинити користування.",
  updated: "2026-08-26",
  lead: [
    {
      p: [
        "Ці умови — домовленість між вами і SubEye. Вони навмисно короткі, бо застосунок теж навмисно невеликий.",
      ],
    },
  ],
  sections: [
    {
      id: "who-you-agree-with",
      heading: "З ким ви домовляєтеся",
      blocks: [
        {
          p: [
            "SubEye створює та підтримує Єгор Гунько, фізична особа в Україні. Контакт: ",
            { mailto: "privacy@subeye.cc" },
            ".",
          ],
        },
      ],
    },
    {
      id: "what-subeye-is",
      heading: "Що таке SubEye",
      blocks: [
        {
          p: [
            "Застосунок для iPhone, у якому ви записуєте підписки, що у вас уже є, і бачите, скільки вони коштують. Це запис того, що ви йому розповіли. Він не має зв’язку з вашим банком, не читає вашу пошту, не бачить ваших фактичних списань і не може нічого скасувати замість вас.",
          ],
        },
        {
          p: [
            "Ні акаунта, ні сервера SubEye не існує. Усе, що ви вводите, зберігається на вашому пристрої, а отже ",
            {
              b: "ці дані існують рівно в одному місці, і дбати про них — вам.",
            },
            " На новий телефон їх переносить резервна копія iPhone. Синхронізація з iCloud, вимкнена, доки ви її не ввімкнете, — єдиний спосіб, у який той самий список бачить другий пристрій: дані йдуть у ваш власний iCloud на умовах Apple, а не на сервер SubEye, і відновити щось звідси неможливо.",
          ],
        },
        {
          p: [
            {
              b: "Кожне число в застосунку — це арифметика над тими даними, які ввели ви.",
            },
            " Якщо введена ціна неправильна, або сервіс списав іншу суму, або змінився курс валют — застосунок теж буде неправильним. Це трекер, а не виписка, і це не фінансова порада.",
          ],
        },
      ],
    },
    {
      id: "using-it",
      heading: "Як ним користуватися",
      blocks: [
        {
          p: [
            "Вам має бути щонайменше 16 років. Не використовуйте SubEye для порушення закону чи для атак на сервіси, від яких він залежить.",
          ],
        },
      ],
    },
    {
      id: "your-data-is-yours",
      heading: "Ваші дані належать вам",
      blocks: [
        {
          p: [
            "Підписки, нотатки та категорії, які ви вводите, належать вам і лишаються на вашому пристрої — SubEye їх не отримує, тож тут немає на що заявляти права власності, немає чого продавати і немає чого комусь передавати. Див. ",
            { doc: "privacy-policy", text: "політику конфіденційності" },
            ".",
          ],
        },
      ],
    },
    {
      id: "free-and-pro",
      heading: "Безкоштовна версія і Pro",
      blocks: [
        {
          p: [
            "Безкоштовна версія — це не тріал. Необмежена кількість підписок, уся панель, пошук і сортування, усі дії з підписками, нагадування за день до списання, мультивалютність та синхронізація з iCloud між вашими пристроями безкоштовні й такими лишаються.",
          ],
        },
        {
          p: [
            // \u00a0 is the site formatter's non-breaking space, not a plain one.
            { b: "SubEye Pro — це один платіж 199\u00a0₴" },
            " в Україні або еквівалент, встановлений для вашої вітрини App Store — близько $11.99 у США. Це не підписка, і вона не поновлюється. Pro відкриває власний графік нагадувань, нагадування про кінець пробного періоду, календар платежів, історію цін кожної підписки, категорії з фільтром за ними та розподілом витрат, а також віджети на екрані «Дім».",
          ],
        },
        {
          p: [
            "Покупки здійснюються через Apple і на умовах Apple. Повернення коштів опрацьовує Apple, а не SubEye.",
          ],
        },
      ],
    },
    {
      id: "notifications",
      heading: "Сповіщення",
      blocks: [
        {
          p: [
            "Нагадування про списання плануються на вашому пристрої силами iOS. Якщо ви заборонили сповіщення, вимкнули пристрій або надовго закрили застосунок примусово, iOS може їх не доставити. ",
            {
              b: "Не покладайтеся на SubEye як на єдиний захист від небажаного списання.",
            },
          ],
        },
      ],
    },
    {
      id: "availability",
      heading: "Доступність",
      blocks: [
        {
          p: [
            "SubEye надається як є, без жодних гарантій. Це невеликий незалежний застосунок: він може змінюватися, може перестати оновлюватися і колись може зникнути з App Store. Уже встановлена копія працюватиме далі й без мережі, бо позаду неї немає сервісу, який можна вимкнути. Ніщо тут не виключає відповідальності, яку не можна виключити за законом, але в решті випадків відповідальність обмежена сумою, яку ви заплатили за SubEye Pro, якщо платили.",
          ],
        },
      ],
    },
    {
      id: "ending-it",
      heading: "Як це припинити",
      blocks: [
        {
          p: [
            "Припинити можна будь-коли: «Налаштування → Стерти всі дані» очищає пристрій, а видалення застосунку прибирає решту. Ні для того, ні для того не потрібен нічий дозвіл, і скасувати ні те, ні те неможливо.",
          ],
        },
      ],
    },
    {
      id: "changes",
      heading: "Зміни",
      blocks: [
        {
          p: [
            "Ці умови можуть змінюватися. Разом із ними зміниться дата вгорі сторінки, а про суттєву зміну буде повідомлено в застосунку до того, як вона набуде чинності. Продовження користування SubEye після цього означає згоду з новими умовами.",
          ],
        },
      ],
    },
    {
      id: "law",
      heading: "Право",
      blocks: [
        {
          p: [
            "Ці умови регулюються правом України. Якщо ви споживач у Європейському Союзі чи Великій Британії, це не позбавляє вас захисту, передбаченого правом вашої країни.",
          ],
        },
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: Record<LegalLocale, LegalDoc> = {
  en: EN,
  uk: UK,
};

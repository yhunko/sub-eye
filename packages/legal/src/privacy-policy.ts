import type { LegalDoc, LegalLocale } from "./types";

const EN: LegalDoc = {
  kind: "privacy-policy",
  locale: "en",
  title: "Privacy policy",
  description:
    "What SubEye collects, who processes it, how long it is kept, and how to have it deleted.",
  updated: "2026-08-26",
  lead: [
    {
      p: [
        "SubEye is a subscription tracker for iPhone. You type in what you pay and it tells you what that costs. There is no account, no sign-in and no SubEye server: everything you enter is stored on your own device and stays there unless you switch on iCloud Sync yourself, which copies it to your own iCloud and never to us. It has no access to your bank, no access to your email, and it does not go looking for subscriptions on your behalf.",
      ],
    },
  ],
  sections: [
    {
      id: "who-is-responsible",
      heading: "Who is responsible",
      blocks: [
        {
          p: [
            "SubEye is built and operated by Yehor Hunko, an individual based in Ukraine, acting as the data controller. For anything in this policy, write to ",
            { mailto: "privacy@subeye.cc" },
            ".",
          ],
        },
      ],
    },
    {
      id: "on-your-device",
      heading: "What stays on your device",
      blocks: [
        {
          ul: [
            [
              { b: "The subscriptions you enter:" },
              " service name, website, amount, currency, billing period, payment dates, category, price history and any note you write. All of it typed by you, all of it held in the app's own storage on the phone. SubEye never uploads it and has nowhere to upload it to; the one thing that ever copies it off the phone is iCloud Sync, which you switch on yourself and which is described below.",
            ],
            [
              { b: "Your settings and reminders," },
              " including the reminder schedule iOS holds for you.",
            ],
          ],
        },
        {
          p: [
            "None of this is collected by SubEye in the sense the word usually means. It is included in a device backup if you back your iPhone up, under Apple's own terms.",
          ],
        },
      ],
    },
    {
      id: "what-leaves-the-device",
      heading: "What leaves the device, and to whom",
      blocks: [
        {
          ul: [
            [
              { b: "Your subscriptions, but only if you turn on iCloud Sync:" },
              " the switch in Settings → Data copies them into your own iCloud so that your other devices can show the same list. It is off until you turn it on, it goes to Apple rather than to SubEye, and switching it off again leaves the copy already in your iCloud until you erase it.",
            ],
            [
              { b: "Technical data that any web request carries" },
              " — an IP address and a device user agent — seen by the services listed below at the moment the app talks to one of them.",
            ],
            [
              { b: "Diagnostics, when something goes wrong:" },
              " if the app crashes, the stack trace with your device model and OS version. If you buy SubEye Pro, the App Store receipt for that purchase. Neither carries anything you typed, and neither is tied to a name, an email address or an account.",
            ],
            [
              { b: "What you type into the brand logo search" },
              ", described in full below.",
            ],
          ],
        },
        {
          p: [
            "There is no advertising identifier, no location data, no contacts, no photos, and no advertising or product-analytics SDK in the app. Two SDKs do ship inside it — crash reporting and purchases — and both are listed below.",
          ],
        },
      ],
    },
    {
      id: "sub-processors",
      heading: "Who else processes it",
      blocks: [
        {
          p: [
            "These are every third party the app can reach, and each one is reached only when the app has a reason to. None of them receives your subscriptions — the single exception is Apple's iCloud, and only once you have switched iCloud Sync on yourself. None of them is given a name, an email address or an account identifier, because SubEye holds none of those.",
          ],
        },
        {
          dl: [
            {
              term: "Sentry — crash reporting (European Union)",
              desc: [
                "Receives the stack trace of a crash in the app, with your device model and OS version. That is all of it: no subscription names, no amounts, no notes, no email address, no user identifier, no screenshots and no session recording.",
              ],
            },
            {
              term: "RevenueCat — purchases (United States)",
              desc: [
                'Receives the App Store purchase receipt and the store transaction if you buy SubEye Pro. It is what makes "you bought Pro" survive a reinstall or a new phone. The app user id it works with is anonymous — generated on the device, not linked to any account — and it receives no subscription data and no email address.',
              ],
            },
            {
              term: "Brandfetch — brand logo search",
              desc: [
                "Receives the text you type into the brand picker. Described in full below.",
              ],
            },
            {
              term: "Google — logo images",
              desc: [
                "Service logos are loaded as favicons from ",
                { code: "google.com/s2/favicons" },
                ". That request discloses the website domain of the subscription and your IP address. It carries nothing else you typed.",
              ],
            },
            {
              term: "jsDelivr — exchange rates (global CDN)",
              desc: [
                "Once a day, the app downloads a public exchange-rate file from ",
                { code: "cdn.jsdelivr.net" },
                " so that a hryvnia subscription and a dollar subscription can be added up. It is the same file for everyone and the request carries nothing but your IP address — no subscription data, no currencies you use, no identifier. If the download fails, the rates already on the device keep working, and so does the app.",
              ],
            },
            {
              term: "Apple — the App Store and iCloud",
              desc: [
                "Handles the purchase if you buy SubEye Pro, under Apple's own privacy policy. SubEye never sees your payment details. If you back up your iPhone to iCloud, your SubEye data is inside that backup, under Apple's terms. If you switch on iCloud Sync, your subscriptions are also written to your own iCloud storage so your other devices can read them: they are held under your Apple Account, under Apple's terms, and SubEye still never receives them.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "brand-logo-search",
      heading: "The brand logo search, specifically",
      blocks: [
        {
          p: [
            "When you add or edit a subscription you can search for a service by name to attach its logo. ",
            { b: "What you type in that field is sent to " },
            { code: "api.brandfetch.io", b: true },
            ", along with your IP address, because that is how the search runs.",
          ],
        },
        {
          p: [
            "Nothing else goes with it. No identifier, no email address, no subscription data, no token. The results are used to draw the list on screen and are never written to disk. If you would rather not use it, leave the website field empty and type the service name yourself — the app works exactly the same without a logo.",
          ],
        },
      ],
    },
    {
      id: "why-it-is-held",
      heading: "Why any of this is held",
      blocks: [
        {
          p: [
            "Your subscriptions are held on your device because that is the app: it cannot add up what it cannot store. Under the GDPR, data that stays on your own device and is never transmitted to SubEye is not processed by SubEye at all. For the few requests that do leave the phone, the legal basis is legitimate interest — keeping the app working, fixing crashes, honouring a purchase you made, and converting currencies correctly.",
          ],
        },
        {
          p: [
            "iCloud Sync is the exception, and it is consent: it does nothing until you turn it on, and turning it on is the permission. Even then the copy goes to your own iCloud rather than to SubEye, so there is no point at which SubEye is the recipient of it.",
          ],
        },
        {
          p: [
            {
              b: "Your data is not sold, not shared with advertisers, not used to profile you, and not used to train anything.",
            },
            " There is no tracking across apps or websites, and no third-party advertising or analytics SDK inside the app.",
          ],
        },
        {
          p: [
            "Renewal reminders are scheduled on your device by iOS. There is no push server and no notification token, so no one — including SubEye — learns when a reminder fires.",
          ],
        },
      ],
    },
    {
      id: "retention-and-deletion",
      heading: "How long it is kept, and how to delete it",
      blocks: [
        {
          p: [
            "Your subscriptions are kept on your device for as long as you keep them. Delete a subscription in the app and it is gone from the phone. Delete the app and everything in it goes with it.",
          ],
        },
        {
          p: [
            {
              b: "Settings → Erase all data removes every subscription, reminder and setting from the device in one step.",
            },
            " It is immediate, it is a real deletion rather than a flag, and it cannot be undone. With iCloud Sync on it clears the iCloud copy as well, which is what takes the data off your other devices. There is no further copy to ask anyone to delete — and because there is none, an iPhone backup you made earlier is the only thing that can bring the data back.",
          ],
        },
        {
          p: [
            "A crash report already sent to Sentry is kept under Sentry's own retention policy and then dropped. A purchase record at RevenueCat and Apple is kept as long as those services require, because it is what proves you own Pro.",
          ],
        },
      ],
    },
    {
      id: "your-rights",
      heading: "Your rights",
      blocks: [
        {
          p: [
            "SubEye serves the European Union and Ukraine, so the GDPR and Ukraine's Law on Personal Data Protection apply. You have the right to access a copy of your data, to correct it, to have it erased, to receive it in a portable form, to restrict or object to processing, and to complain to your supervisory authority.",
          ],
        },
        {
          p: [
            "In practice most of those are already in your hands rather than in anyone else's: your data is on your device, you can read it, correct it and erase it in the app without asking permission. For anything else — including a crash report or a purchase record held by one of the services above — write to ",
            { mailto: "privacy@subeye.cc" },
            " and expect an answer within 30 days.",
          ],
        },
      ],
    },
    {
      id: "children",
      heading: "Children",
      blocks: [
        {
          p: [
            "SubEye is not directed at children and does not knowingly collect data from anyone under 16. Since there is no account, and nothing is uploaded unless iCloud Sync is switched on, there is nothing held here to delete on a child's behalf — but if something about this concerns you, write to ",
            { mailto: "privacy@subeye.cc" },
            ".",
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
            "If this policy changes, the date at the top of this page changes with it. A change that materially affects what is collected or who processes it will be announced in the app before it takes effect.",
          ],
        },
      ],
    },
  ],
};

const UK: LegalDoc = {
  kind: "privacy-policy",
  locale: "uk",
  title: "Політика конфіденційності",
  description:
    "Які дані збирає SubEye, хто їх обробляє, скільки вони зберігаються і як їх видалити.",
  updated: "2026-08-26",
  lead: [
    {
      p: [
        "SubEye — це застосунок для iPhone, який веде облік ваших підписок. Ви вводите те, що платите, а він показує, скільки це коштує. Тут немає ні акаунта, ні входу, ні сервера SubEye: усе, що ви вводите, зберігається на вашому власному пристрої і залишається там, доки ви самі не ввімкнете синхронізацію з iCloud, яка копіює ці дані у ваш власний iCloud, а не до нас. Застосунок не має доступу ні до вашого банку, ні до вашої пошти і не шукає підписки замість вас.",
      ],
    },
  ],
  sections: [
    {
      id: "who-is-responsible",
      heading: "Хто відповідає за ці дані",
      blocks: [
        {
          p: [
            "SubEye створює та підтримує Єгор Гунько, фізична особа в Україні, який є володільцем персональних даних. З будь-якого питання щодо цієї політики пишіть на ",
            { mailto: "privacy@subeye.cc" },
            ".",
          ],
        },
      ],
    },
    {
      id: "on-your-device",
      heading: "Що залишається на вашому пристрої",
      blocks: [
        {
          ul: [
            [
              { b: "Підписки, які ви вводите:" },
              " назва сервісу, сайт, сума, валюта, період оплати, дати платежів, категорія, історія цін і будь-яка нотатка, яку ви написали. Усе це вводите ви, і все це лежить у власному сховищі застосунку на телефоні. SubEye нікуди його не вивантажує, та й вивантажувати нікуди; єдине, що взагалі копіює ці дані з телефона, — синхронізація з iCloud, яку вмикаєте ви самі і яку описано нижче.",
            ],
            [
              { b: "Ваші налаштування та нагадування," },
              " зокрема й розклад нагадувань, який тримає для вас iOS.",
            ],
          ],
        },
        {
          p: [
            "Нічого з цього SubEye не збирає в тому сенсі, який зазвичай має це слово. Якщо ви робите резервну копію iPhone, ці дані потрапляють до неї — на умовах самої Apple.",
          ],
        },
      ],
    },
    {
      id: "what-leaves-the-device",
      heading: "Що залишає пристрій і кому саме",
      blocks: [
        {
          ul: [
            [
              {
                b: "Ваші підписки — але лише якщо ви ввімкнете синхронізацію з iCloud:",
              },
              " перемикач у «Налаштування → Дані» копіює їх у ваш власний iCloud, щоб інші ваші пристрої показували той самий список. Він вимкнений, доки ви його не ввімкнете, дані йдуть до Apple, а не до SubEye, і після вимкнення копія лишається у вашому iCloud, доки ви її не зітрете.",
            ],
            [
              { b: "Технічні дані, які несе будь-який запит" },
              " — IP-адресу та user agent пристрою. Їх бачать перелічені нижче сервіси в той момент, коли застосунок звертається до одного з них.",
            ],
            [
              { b: "Діагностику, коли щось ламається:" },
              " якщо застосунок аварійно завершується — стек виклику разом із моделлю вашого пристрою та версією ОС. Якщо ви купуєте SubEye Pro — чек App Store за цю покупку. Жодне з цього не несе нічого з набраного вами і не прив’язане ні до імені, ні до пошти, ні до акаунта.",
            ],
            [
              { b: "Текст, який ви вводите в пошук логотипів" },
              " — детально нижче.",
            ],
          ],
        },
        {
          p: [
            "Жодного рекламного ідентифікатора, даних про місцеперебування, контактів, фотографій, рекламного чи продуктово-аналітичного SDK у застосунку немає. Усередині нього є два SDK — звіти про збої та покупки — і обидва перелічені нижче.",
          ],
        },
      ],
    },
    {
      id: "sub-processors",
      heading: "Хто ще обробляє ці дані",
      blocks: [
        {
          p: [
            "Ось усі треті сторони, до яких застосунок узагалі може звернутися, і звертається він до кожної лише тоді, коли має для цього причину. Жодна з них не отримує ваших підписок — єдиний виняток це iCloud від Apple, і тільки після того, як ви самі ввімкнете синхронізацію. Жодній із них не передають ні імені, ні пошти, ні ідентифікатора акаунта — бо нічого з цього SubEye не має.",
          ],
        },
        {
          dl: [
            {
              term: "Sentry — звіти про збої (Європейський Союз)",
              desc: [
                "Отримує стек виклику збою в застосунку разом із моделлю вашого пристрою та версією ОС. І це все: ні назв підписок, ні сум, ні нотаток, ні пошти, ні ідентифікатора користувача, ні знімків екрана, ні запису сесій.",
              ],
            },
            {
              term: "RevenueCat — покупки (США)",
              desc: [
                "Отримує чек App Store і транзакцію магазину, якщо ви купуєте SubEye Pro. Саме завдяки цьому «ви купили Pro» переживає перевстановлення чи новий телефон. Ідентифікатор користувача, з яким він працює, анонімний — його генерує сам пристрій, і він ні з яким акаунтом не пов’язаний. Ні даних про підписки, ні пошти RevenueCat не отримує.",
              ],
            },
            {
              term: "Brandfetch — пошук логотипів",
              desc: [
                "Отримує текст, який ви вводите в пошук бренду. Детально — нижче.",
              ],
            },
            {
              term: "Google — зображення логотипів",
              desc: [
                "Логотипи сервісів завантажуються як фавікони з ",
                { code: "google.com/s2/favicons" },
                ". Цей запит розкриває домен сайту підписки та вашу IP-адресу. Більше нічого з набраного вами він не несе.",
              ],
            },
            {
              term: "jsDelivr — курси валют (глобальна CDN)",
              desc: [
                "Раз на добу застосунок завантажує з ",
                { code: "cdn.jsdelivr.net" },
                " публічний файл із курсами валют, щоб підписку в гривні й підписку в доларах можна було скласти в одне число. Цей файл однаковий для всіх, а запит не несе нічого, крім вашої IP-адреси: ні даних про підписки, ні того, якими валютами ви користуєтеся, ні ідентифікатора. Якщо завантаження не вдалося, працюють ті курси, що вже є на пристрої, — і застосунок теж працює.",
              ],
            },
            {
              term: "Apple — App Store та iCloud",
              desc: [
                "Обробляє покупку, якщо ви купуєте SubEye Pro, згідно з власною політикою конфіденційності Apple. SubEye ніколи не бачить ваших платіжних даних. Якщо ви робите резервну копію iPhone в iCloud, ваші дані SubEye лежать усередині цієї копії — на умовах Apple. А якщо ви ввімкнете синхронізацію з iCloud, ваші підписки також записуються у ваше власне сховище iCloud, щоб їх бачили інші ваші пристрої: вони лежать під вашим Apple Account, на умовах Apple, і SubEye їх усе одно не отримує.",
              ],
            },
          ],
        },
      ],
    },
    {
      id: "brand-logo-search",
      heading: "Окремо про пошук логотипів",
      blocks: [
        {
          p: [
            "Коли ви додаєте або редагуєте підписку, ви можете знайти сервіс за назвою, щоб підтягнути його логотип. ",
            { b: "Текст, який ви вводите в це поле, надсилається на " },
            { code: "api.brandfetch.io", b: true },
            " разом із вашою IP-адресою — інакше пошук просто не працює.",
          ],
        },
        {
          p: [
            "Більше нічого з цим запитом не йде. Ні ідентифікатора, ні пошти, ні даних про підписки, ні токена. Результати використовуються лише для того, щоб намалювати список на екрані, і ніколи не записуються на диск. Якщо ви не хочете цим користуватися — залиште поле сайту порожнім і введіть назву сервісу вручну: без логотипа застосунок працює точно так само.",
          ],
        },
      ],
    },
    {
      id: "why-it-is-held",
      heading: "Навіщо ці дані",
      blocks: [
        {
          p: [
            "Ваші підписки лежать на вашому пристрої, бо в цьому й полягає застосунок: він не може порахувати те, чого не зберігає. За GDPR дані, які залишаються на вашому власному пристрої і ніколи не передаються до SubEye, SubEye не обробляє взагалі. Для тих небагатьох запитів, які таки залишають телефон, підставою є законний інтерес — щоб застосунок працював, щоб збої виправляли, щоб покупка, яку ви зробили, залишалася вашою, і щоб валюти переводилися правильно.",
          ],
        },
        {
          p: [
            "Синхронізація з iCloud — виняток, і підстава тут згода: вона не робить нічого, доки ви її не ввімкнете, і саме це ввімкнення є дозволом. Та й тоді копія йде у ваш власний iCloud, а не до SubEye, тож SubEye у жодний момент не є її одержувачем.",
          ],
        },
        {
          p: [
            {
              b: "Ваші дані не продаються, не передаються рекламодавцям, не використовуються для профілювання і не використовуються для навчання чого-небудь.",
            },
            " Жодного відстеження між застосунками чи сайтами немає, і жодного стороннього рекламного чи аналітичного SDK у застосунку теж.",
          ],
        },
        {
          p: [
            "Нагадування про списання плануються на вашому пристрої силами iOS. Ні push-сервера, ні токена сповіщень немає, тож ніхто — включно із SubEye — не дізнається, коли спрацювало нагадування.",
          ],
        },
      ],
    },
    {
      id: "retention-and-deletion",
      heading: "Скільки дані зберігаються і як їх видалити",
      blocks: [
        {
          p: [
            "Ваші підписки лежать на пристрої стільки, скільки ви їх там тримаєте. Видалена в застосунку підписка зникає з телефона. Видаліть застосунок — і разом із ним зникне все, що в ньому було.",
          ],
        },
        {
          p: [
            {
              b: "«Налаштування → Стерти всі дані» прибирає з пристрою всі підписки, нагадування й налаштування за один крок.",
            },
            " Це відбувається одразу, це справжнє видалення, а не позначка, і скасувати його неможливо. Якщо синхронізація з iCloud ввімкнена, стирається й копія в iCloud — саме це прибирає дані з інших ваших пристроїв. Іншої копії, яку треба було б у когось просити видалити, немає, — і саме тому єдине, що може повернути ці дані, це резервна копія iPhone, зроблена раніше.",
          ],
        },
        {
          p: [
            "Звіт про збій, уже надісланий до Sentry, зберігається згідно з політикою зберігання самої Sentry, а потім видаляється. Запис про покупку в RevenueCat і в Apple зберігається стільки, скільки вимагають ці сервіси, бо саме він підтверджує, що Pro ваш.",
          ],
        },
      ],
    },
    {
      id: "your-rights",
      heading: "Ваші права",
      blocks: [
        {
          p: [
            "SubEye працює в Європейському Союзі та Україні, тож застосовуються GDPR і Закон України «Про захист персональних даних». Ви маєте право отримати копію своїх даних, виправити їх, вимагати їх видалення, отримати їх у придатному для перенесення форматі, обмежити обробку чи заперечити проти неї, а також поскаржитися до наглядового органу.",
          ],
        },
        {
          p: [
            "На практиці більшість із цього вже у ваших руках, а не в чиїхось: ваші дані на вашому пристрої, і ви можете їх переглянути, виправити й стерти прямо в застосунку, ні в кого не питаючи дозволу. З усього іншого — зокрема щодо звіту про збій чи запису про покупку, які тримає котрийсь із перелічених вище сервісів, — пишіть на ",
            { mailto: "privacy@subeye.cc" },
            " — відповідь буде протягом 30 днів.",
          ],
        },
      ],
    },
    {
      id: "children",
      heading: "Діти",
      blocks: [
        {
          p: [
            "SubEye не призначений для дітей і свідомо не збирає дані осіб, молодших за 16 років. Оскільки акаунта немає, а без увімкненої синхронізації з iCloud нічого нікуди не вивантажується, тут просто немає що видаляти від імені дитини — але якщо вас щось у цьому непокоїть, напишіть на ",
            { mailto: "privacy@subeye.cc" },
            ".",
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
            "Якщо ця політика зміниться, разом із нею зміниться й дата вгорі сторінки. Про зміну, яка суттєво впливає на те, які дані збираються або хто їх обробляє, буде повідомлено в застосунку до того, як вона набуде чинності.",
          ],
        },
      ],
    },
  ],
};

export const PRIVACY_POLICY: Record<LegalLocale, LegalDoc> = { en: EN, uk: UK };

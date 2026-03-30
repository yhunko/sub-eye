import type {
  DashboardAnalyticsDto,
  CashFlowPoint,
  UpcomingRenewalDto,
  MonthlyTrendPoint,
  CategorySpendingDto,
} from "shared";
import {
  addDays,
  format,
  startOfDay,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";

const MONTHLY_BURN_RATE = 142.44;
const YEARLY_FORECAST = MONTHLY_BURN_RATE * 12;

function generateCashFlowForecast(): CashFlowPoint[] {
  const now = new Date();
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = endOfMonth(now);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const paymentsByDay: Map<
    number,
    {
      amount: number;
      subscriptions: {
        name: string;
        brandDomain: string | null;
        amount: number;
      }[];
    }
  > = new Map();

  const subscriptions = [
    {
      nextPaymentDay: 3,
      name: "ChatGPT Plus",
      brandDomain: "openai.com",
      amount: 20,
    },
    {
      nextPaymentDay: 5,
      name: "iCloud+",
      brandDomain: "apple.com",
      amount: 2.99,
    },
    {
      nextPaymentDay: 7,
      name: "Netflix",
      brandDomain: "netflix.com",
      amount: 15.49,
    },
    {
      nextPaymentDay: 7,
      name: "Adobe Creative Cloud",
      brandDomain: "adobe.com",
      amount: 54.99,
    },
    {
      nextPaymentDay: 10,
      name: "YouTube Premium",
      brandDomain: "youtube.com",
      amount: 11.99,
    },
    {
      nextPaymentDay: 12,
      name: "Dropbox Plus",
      brandDomain: "dropbox.com",
      amount: 11.99,
    },
    {
      nextPaymentDay: 14,
      name: "Spotify Premium",
      brandDomain: "spotify.com",
      amount: 10.99,
    },
    {
      nextPaymentDay: 20,
      name: "Notion",
      brandDomain: "notion.so",
      amount: 10,
    },
    {
      nextPaymentDay: 25,
      name: "GitHub Pro",
      brandDomain: "github.com",
      amount: 4,
    },
  ];

  for (const sub of subscriptions) {
    const existing = paymentsByDay.get(sub.nextPaymentDay);
    if (existing) {
      existing.amount += sub.amount;
      existing.subscriptions.push({
        name: sub.name,
        brandDomain: sub.brandDomain,
        amount: sub.amount,
      });
    } else {
      paymentsByDay.set(sub.nextPaymentDay, {
        amount: sub.amount,
        subscriptions: [
          {
            name: sub.name,
            brandDomain: sub.brandDomain,
            amount: sub.amount,
          },
        ],
      });
    }
  }

  const points: CashFlowPoint[] = [];
  let cumulative = 0;

  for (const day of daysInMonth) {
    const dayNum = day.getDate();
    const payment = paymentsByDay.get(dayNum);
    const dailyAmount = payment?.amount ?? 0;

    cumulative += dailyAmount;

    points.push({
      date: format(day, "yyyy-MM-dd"),
      amount: Math.round(dailyAmount * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
      subscriptions: payment?.subscriptions ?? [],
    });
  }

  return points;
}

function calculateRemainingThisMonth(): number {
  const now = new Date();
  const todayDay = now.getDate();

  const paymentsByDay: Map<number, number> = new Map([
    [3, 20],
    [5, 2.99],
    [7, 15.49 + 54.99],
    [10, 11.99],
    [12, 11.99],
    [14, 10.99],
    [20, 10],
    [25, 4],
  ]);

  let remaining = 0;
  for (const [day, amount] of paymentsByDay) {
    if (day >= todayDay) {
      remaining += amount;
    }
  }

  return Math.round(remaining * 100) / 100;
}

function generateUpcomingRenewals(): UpcomingRenewalDto[] {
  const now = new Date();
  return [
    {
      id: "sub-5",
      name: "ChatGPT Plus",
      brandDomain: "openai.com",
      provider: "openai",
      amount: 20,
      currencyCode: "USD",
      nextPaymentDate: format(addDays(now, 3), "yyyy-MM-dd"),
      daysUntil: 3,
    },
    {
      id: "sub-6",
      name: "iCloud+",
      brandDomain: "apple.com",
      provider: "apple",
      amount: 2.99,
      currencyCode: "USD",
      nextPaymentDate: format(addDays(now, 5), "yyyy-MM-dd"),
      daysUntil: 5,
    },
    {
      id: "sub-1",
      name: "Netflix",
      brandDomain: "netflix.com",
      provider: "netflix",
      amount: 15.49,
      currencyCode: "USD",
      nextPaymentDate: format(addDays(now, 7), "yyyy-MM-dd"),
      daysUntil: 7,
    },
    {
      id: "sub-3",
      name: "Adobe Creative Cloud",
      brandDomain: "adobe.com",
      provider: "adobe",
      amount: 54.99,
      currencyCode: "USD",
      nextPaymentDate: format(addDays(now, 7), "yyyy-MM-dd"),
      daysUntil: 7,
    },
    {
      id: "sub-7",
      name: "YouTube Premium",
      brandDomain: "youtube.com",
      provider: "google",
      amount: 11.99,
      currencyCode: "USD",
      nextPaymentDate: format(addDays(now, 10), "yyyy-MM-dd"),
      daysUntil: 10,
    },
  ];
}

function generateMonthlyTrend(): MonthlyTrendPoint[] {
  const now = new Date();
  const points: MonthlyTrendPoint[] = [];

  const monthlyTotals = [
    68.99, 82.45, 82.45, 102.44, 121.43, 142.44, 142.44, 142.44, 142.44, 142.44,
    88.43, 142.44,
  ];

  for (let i = 0; i < 12; i++) {
    const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    points.push({
      date: format(month, "yyyy-MM-01"),
      amount: monthlyTotals[i],
      subscriptions: [],
    });
  }

  return points;
}

function generateCategorySpending(): CategorySpendingDto[] {
  return [
    {
      categoryId: "cat-2",
      name: "Productivity",
      emoji: "💼",
      amount: 68.99,
      subscriptions: [
        {
          id: "sub-3",
          name: "Adobe Creative Cloud",
          brandDomain: "adobe.com",
          monthlyCost: 54.99,
        },
        {
          id: "sub-8",
          name: "Notion",
          brandDomain: "notion.so",
          monthlyCost: 10,
        },
        {
          id: "sub-4",
          name: "GitHub Pro",
          brandDomain: "github.com",
          monthlyCost: 4,
        },
      ],
    },
    {
      categoryId: "cat-1",
      name: "Streaming",
      emoji: "📺",
      amount: 27.48,
      subscriptions: [
        {
          id: "sub-1",
          name: "Netflix",
          brandDomain: "netflix.com",
          monthlyCost: 15.49,
        },
        {
          id: "sub-7",
          name: "YouTube Premium",
          brandDomain: "youtube.com",
          monthlyCost: 11.99,
        },
      ],
    },
    {
      categoryId: "cat-3",
      name: "Cloud",
      emoji: "☁️",
      amount: 14.98,
      subscriptions: [
        {
          id: "sub-9",
          name: "Dropbox Plus",
          brandDomain: "dropbox.com",
          monthlyCost: 11.99,
        },
        {
          id: "sub-6",
          name: "iCloud+",
          brandDomain: "apple.com",
          monthlyCost: 2.99,
        },
      ],
    },
    {
      categoryId: "cat-5",
      name: "AI",
      emoji: "🤖",
      amount: 20,
      subscriptions: [
        {
          id: "sub-5",
          name: "ChatGPT Plus",
          brandDomain: "openai.com",
          monthlyCost: 20,
        },
      ],
    },
    {
      categoryId: "cat-4",
      name: "Music",
      emoji: "🎵",
      amount: 10.99,
      subscriptions: [
        {
          id: "sub-2",
          name: "Spotify Premium",
          brandDomain: "spotify.com",
          monthlyCost: 10.99,
        },
      ],
    },
  ];
}

export const demoDashboardAnalytics: DashboardAnalyticsDto = {
  preferredCurrencyCode: "USD",
  monthlyBurnRate: MONTHLY_BURN_RATE,
  yearlyForecast: YEARLY_FORECAST,
  remainingThisMonth: calculateRemainingThisMonth(),
  nextMonthForecast: MONTHLY_BURN_RATE,
  activeSubscriptionsTotal: 9,
  activeSubscriptionsAuto: 7,
  activeSubscriptionsManual: 2,
  mostExpensiveSubscription: {
    name: "Adobe Creative Cloud",
    yearlyAmount: 659.88,
    brandDomain: "adobe.com",
  },
  cashFlowForecast: generateCashFlowForecast(),
  upcomingRenewals: generateUpcomingRenewals(),
  totalUpcomingMonth: MONTHLY_BURN_RATE,
  monthlyTrend: generateMonthlyTrend(),
  categorySpending: generateCategorySpending(),
};

export const PLANS: Record<string, {
  name:         string;
  amount:       number;
  billingCycle: "monthly" | "quarterly" | "yearly";
  durationDays: number;
  description:  string;
}> = {
  pro_monthly: {
    name:         "Waptrix Pro — Monthly",
    amount:       2,
    billingCycle: "monthly",
    durationDays: 31,
    description:  "Waptrix Pro Plan billed monthly",
  },
  pro_quarterly: {
    name:         "Waptrix Pro — Quarterly",
    amount:       4999,
    billingCycle: "quarterly",
    durationDays: 92,
    description:  "Waptrix Pro Plan billed quarterly (save 17%)",
  },
  pro_yearly: {
    name:         "Waptrix Pro — Yearly",
    amount:       17999,
    billingCycle: "yearly",
    durationDays: 365,
    description:  "Waptrix Pro Plan billed yearly (save 25%)",
  },
};

import type { CustomerGroup, CustomerWithSite } from '@/schemas/customer.schema';

function normalizePhone(phone?: string | null) {
  if (!phone) return '';
  return phone.replace(/\D+/g, '');
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? '';
}

function normalizeName(name?: string | null) {
  return name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

export function getCustomerGroupKey(customer: Pick<CustomerWithSite, 'name' | 'phone' | 'email'>) {
  const phone = normalizePhone(customer.phone);
  if (phone) return `phone:${phone}`;

  const email = normalizeEmail(customer.email);
  if (email) return `email:${email}`;

  const name = normalizeName(customer.name);
  return `name:${name || 'unknown'}`;
}

export function groupCustomerDeals(customers: CustomerWithSite[]) {
  const grouped = new Map<string, CustomerGroup>();

  customers.forEach((customer) => {
    const key = getCustomerGroupKey(customer);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        groupKey: key,
        displayName: customer.name,
        phone: customer.phone,
        email: customer.email,
        deals: [customer],
        dealCount: 1,
        totalSellingPrice: customer.sellingPrice,
        totalBookingAmount: customer.bookingAmount,
        totalPaid: customer.amountPaid,
        totalRemaining: customer.remaining,
      });
      return;
    }

    existing.deals.push(customer);
    existing.dealCount += 1;
    existing.totalSellingPrice += customer.sellingPrice;
    existing.totalBookingAmount += customer.bookingAmount;
    existing.totalPaid += customer.amountPaid;
    existing.totalRemaining += customer.remaining;
  });

  return Array.from(grouped.values()).map((group) => ({
    ...group,
    deals: [...group.deals].sort((a, b) => {
      const first = new Date(b.createdAt).getTime();
      const second = new Date(a.createdAt).getTime();
      return first - second;
    }),
  }));
}

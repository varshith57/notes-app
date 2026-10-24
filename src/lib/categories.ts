import type { Direction } from '@/db/types';

export interface Category {
  name: string;
  icon: string;
  subcategories: string[];
}

// Names are stored as plain text in SQLite, so renaming one here won't rewrite existing
// rows: add new entries instead, or move old rows with a migration (see
// LEGACY_CATEGORY_SQL in db/migrations.ts, which also runs on restored backups).
export const CATEGORIES: Record<Direction, Category[]> = {
  expense: [
    { name: 'Food & Dining', icon: '🍽️', subcategories: ['Restaurants', 'Coffee & Snacks', 'Food Delivery'] },
    { name: 'Groceries', icon: '🛒', subcategories: ['Vegetables & Fruits', 'Staples & Grains', 'Dairy & Eggs', 'Meat & Fish', 'Household Supplies', 'Online Grocery'] },
    { name: 'Housing', icon: '🏠', subcategories: ['Rent', 'Mortgage / Home Loan', 'Maintenance', 'Property Tax', 'Furnishing'] },
    { name: 'Utilities', icon: '💡', subcategories: ['Electricity', 'Water', 'Gas', 'Internet', 'Mobile'] },
    { name: 'Transport', icon: '🚗', subcategories: ['Fuel', 'Public Transport', 'Taxi / Ride-share', 'Vehicle Service', 'Parking & Tolls'] },
    { name: 'Shopping', icon: '🛍️', subcategories: ['Clothing', 'Electronics', 'Household', 'Personal Care'] },
    { name: 'Health', icon: '🩺', subcategories: ['Doctor', 'Pharmacy', 'Health Insurance', 'Fitness'] },
    { name: 'Entertainment', icon: '🎬', subcategories: ['Movies & Events', 'Subscriptions', 'Hobbies', 'Games'] },
    { name: 'Travel', icon: '✈️', subcategories: ['Flights', 'Hotels', 'Local Travel', 'Visa & Fees'] },
    { name: 'Education', icon: '📚', subcategories: ['Tuition / School Fees', 'Courses', 'Books & Supplies'] },
    { name: 'Bills', icon: '🧾', subcategories: ['Credit Card', 'Insurance Premium', 'Taxes', 'Fees & Charges'] },
    { name: 'EMIs', icon: '🏦', subcategories: ['Loan EMI', 'Home Loan', 'Vehicle Loan', 'Personal Loan', 'Education Loan', 'Consumer Durable EMI'] },
    { name: 'Family & Gifts', icon: '🎁', subcategories: ['Gifts', 'Donations', 'Childcare', 'Pets'] },
    { name: 'Savings & Investments', icon: '📈', subcategories: ['Mutual Funds / SIP', 'Stocks', 'Fixed Deposit', 'Retirement', 'Gold'] },
    { name: 'Other', icon: '📦', subcategories: ['Miscellaneous'] },
  ],
  income: [
    { name: 'Salary', icon: '💼', subcategories: ['Monthly Salary', 'Bonus', 'Overtime', 'Allowances'] },
    { name: 'Business', icon: '🏪', subcategories: ['Sales', 'Services', 'Consulting'] },
    { name: 'Freelance', icon: '💻', subcategories: ['Projects', 'Contracts', 'Tips'] },
    { name: 'Investments', icon: '📈', subcategories: ['Interest', 'Dividends', 'Capital Gains'] },
    { name: 'Rental', icon: '🏘️', subcategories: ['House Rent', 'Shop / Office Rent', 'Land Lease', 'Parking / Storage'] },
    { name: 'Gifts & Refunds', icon: '🎁', subcategories: ['Gifts Received', 'Refunds', 'Cashback & Rewards'] },
    { name: 'Other', icon: '💰', subcategories: ['Miscellaneous'] },
  ],
};

export function findCategory(direction: Direction, name: string): Category | undefined {
  return CATEGORIES[direction].find((c) => c.name === name);
}

export function categoryIcon(direction: Direction, name: string): string {
  return findCategory(direction, name)?.icon ?? '💰';
}

import type { Direction } from '@/db/types';

export interface Category {
  name: string;
  icon: string;
  subcategories: string[];
}

// Names are stored as plain text in SQLite, so renaming one here won't rewrite
// existing rows — add new entries instead of renaming shipped ones.
export const CATEGORIES: Record<Direction, Category[]> = {
  expense: [
    { name: 'Food & Dining', icon: '🍽️', subcategories: ['Groceries', 'Restaurants', 'Coffee & Snacks', 'Food Delivery'] },
    { name: 'Housing', icon: '🏠', subcategories: ['Rent', 'Mortgage / Home Loan', 'Maintenance', 'Property Tax', 'Furnishing'] },
    { name: 'Utilities', icon: '💡', subcategories: ['Electricity', 'Water', 'Gas', 'Internet', 'Mobile'] },
    { name: 'Transport', icon: '🚗', subcategories: ['Fuel', 'Public Transport', 'Taxi / Ride-share', 'Vehicle Service', 'Parking & Tolls'] },
    { name: 'Shopping', icon: '🛍️', subcategories: ['Clothing', 'Electronics', 'Household', 'Personal Care'] },
    { name: 'Health', icon: '🩺', subcategories: ['Doctor', 'Pharmacy', 'Health Insurance', 'Fitness'] },
    { name: 'Entertainment', icon: '🎬', subcategories: ['Movies & Events', 'Subscriptions', 'Hobbies', 'Games'] },
    { name: 'Travel', icon: '✈️', subcategories: ['Flights', 'Hotels', 'Local Travel', 'Visa & Fees'] },
    { name: 'Education', icon: '📚', subcategories: ['Tuition / School Fees', 'Courses', 'Books & Supplies'] },
    { name: 'Bills & EMIs', icon: '🧾', subcategories: ['Loan EMI', 'Credit Card', 'Insurance Premium', 'Taxes'] },
    { name: 'Family & Gifts', icon: '🎁', subcategories: ['Gifts', 'Donations', 'Childcare', 'Pets'] },
    { name: 'Savings & Investments', icon: '📈', subcategories: ['Mutual Funds / SIP', 'Stocks', 'Fixed Deposit', 'Retirement', 'Gold'] },
    { name: 'Other', icon: '📦', subcategories: ['Miscellaneous'] },
  ],
  income: [
    { name: 'Salary', icon: '💼', subcategories: ['Monthly Salary', 'Bonus', 'Overtime', 'Allowances'] },
    { name: 'Business', icon: '🏪', subcategories: ['Sales', 'Services', 'Consulting'] },
    { name: 'Freelance', icon: '💻', subcategories: ['Projects', 'Contracts', 'Tips'] },
    { name: 'Investments', icon: '📈', subcategories: ['Interest', 'Dividends', 'Capital Gains', 'Rental Income'] },
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

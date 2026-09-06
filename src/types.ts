export type SupportedCurrency = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'AUD' | 'JPY';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'credit_card'
  | 'brokerage'
  | 'retirement'
  | 'other';

export type AssetCategory =
  | 'cash'
  | 'bank_account'
  | 'investments'
  | 'real_estate'
  | 'vehicles'
  | 'business'
  | 'other_asset';

export type LiabilityCategory =
  | 'mortgage'
  | 'credit_card_debt'
  | 'student_loan'
  | 'auto_loan'
  | 'personal_loan'
  | 'other_debt';

export type InvestmentAssetType =
  | 'stocks'
  | 'etfs'
  | 'mutual_funds'
  | 'bonds'
  | 'crypto'
  | 'cash'
  | 'other';

export type InvestmentTxType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'deposit'
  | 'withdrawal'
  | 'fee'
  | 'split';

export interface UserProfile {
  uid: string;
  email: string;
  currency: SupportedCurrency;
  budgetAlertThreshold: number;
  dateFormat?: string;
  hideBalances?: boolean;
  createdAt?: string | Date;
}

export interface AccountItem {
  id: string;
  userUid: string;
  name: string;
  type: AccountType;
  institution?: string | null;
  initialBalance: string;
  currentBalance?: string;
  currency: string;
  notes?: string | null;
  isArchived: boolean;
  createdAt?: string | Date;
}

export interface CategoryItem {
  id: string;
  userUid: string;
  name: string;
  type: 'income' | 'expense';
  isCustom: boolean;
}

export interface TransactionItem {
  id: string;
  userUid: string;
  accountId?: string | null;
  categoryName: string;
  subcategory?: string | null;
  date: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  notes?: string | null;
  isRecurring: boolean;
  createdAt?: string | Date;
}

export interface BudgetItem {
  id: string;
  userUid: string;
  month: string; // YYYY-MM
  categoryName: string;
  amount: string;
  rollover: boolean;
}

export interface BudgetUtilization {
  id?: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  status: 'green' | 'yellow' | 'orange' | 'red';
  alertMessage?: string;
}

export interface AssetLiabilityItem {
  id: string;
  userUid: string;
  name: string;
  kind: 'asset' | 'liability';
  category: string;
  value: string;
  asOfDate: string;
  notes?: string | null;
}

export interface NetWorthSnapshotItem {
  id: string;
  userUid: string;
  month: string;
  assetsTotal: string;
  liabilitiesTotal: string;
  netWorth: string;
  createdAt?: string | Date;
}

export interface SecurityItem {
  id: string;
  userUid: string;
  accountId?: string | null;
  symbol: string;
  name: string;
  assetType: InvestmentAssetType;
  quantity: string;
  averageCost: string;
  currentPrice: string;
  currency: string;
  notes?: string | null;
  marketValue?: number;
  costBasis?: number;
  unrealizedGainLoss?: number;
  gainLossPercentage?: number;
}

export interface InvestmentTransactionItem {
  id: string;
  userUid: string;
  accountId?: string | null;
  securitySymbol: string;
  securityName?: string | null;
  type: InvestmentTxType;
  date: string;
  quantity: string;
  price: string;
  fees: string;
  totalAmount: string;
  notes?: string | null;
}

export interface DashboardSummaryData {
  netWorth: number;
  lastMonthNetWorth: number;
  netWorthGrowthPct: number;
  totalAssets: number;
  totalLiabilities: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthSavings: number;
  savingsRate: number;
  investmentPortfolioValue: number;
  currency: SupportedCurrency;
  selectedMonth: string;
  netWorthTrend: { month: string; netWorth: number; assets: number; liabilities: number }[];
  incomeExpenseTrend: { month: string; income: number; expenses: number; savings: number }[];
  expenseCategories: { name: string; amount: number; percentage: number }[];
  budgetProgress: BudgetUtilization[];
  alerts: string[];
}

export type DashboardSummary = DashboardSummaryData;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing',
  'Groceries',
  'Restaurants',
  'Transportation',
  'Utilities',
  'Insurance',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Travel',
  'Education',
  'Subscriptions',
  'Personal',
  'Taxes',
  'Other',
];

export type NavigationTab =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'net-worth'
  | 'investments'
  | 'reports'
  | 'settings';

export type SecurityHoldingItem = SecurityItem;

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Bonus',
  'Freelance',
  'Business',
  'Interest',
  'Dividends',
  'Rental income',
  'Other',
];

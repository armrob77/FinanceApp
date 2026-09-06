import { boolean, index, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  currency: text('currency').default('CAD').notNull(),
  budgetAlertThreshold: integer('budget_alert_threshold').default(80).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // checking, savings, cash, credit_card, brokerage, retirement, other
  institution: text('institution'),
  initialBalance: numeric('initial_balance', { precision: 14, scale: 2 }).default('0.00').notNull(),
  currency: text('currency').default('CAD').notNull(),
  notes: text('notes'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('accounts_user_idx').on(table.userUid),
]);

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // income, expense
  isCustom: boolean('is_custom').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('categories_user_idx').on(table.userUid),
]);

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  accountId: text('account_id'),
  categoryName: text('category_name').notNull(),
  subcategory: text('subcategory'),
  date: text('date').notNull(), // YYYY-MM-DD
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  type: text('type').notNull(), // income, expense
  notes: text('notes'),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('transactions_user_idx').on(table.userUid),
  index('transactions_date_idx').on(table.date),
  index('transactions_account_idx').on(table.accountId),
]);

export const budgets = pgTable('budgets', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  month: text('month').notNull(), // YYYY-MM
  categoryName: text('category_name').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  rollover: boolean('rollover').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('budgets_user_month_idx').on(table.userUid, table.month),
]);

export const assetsLiabilities = pgTable('assets_liabilities', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  name: text('name').notNull(),
  kind: text('kind').notNull(), // asset, liability
  category: text('category').notNull(), // real_estate, vehicles, cash, investments, mortgage, student_loan, auto_loan, personal_loan, credit_card_debt, other
  value: numeric('value', { precision: 14, scale: 2 }).notNull(),
  asOfDate: text('as_of_date').notNull(), // YYYY-MM-DD
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('assets_liabilities_user_idx').on(table.userUid),
]);

export const netWorthSnapshots = pgTable('net_worth_snapshots', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  month: text('month').notNull(), // YYYY-MM
  assetsTotal: numeric('assets_total', { precision: 14, scale: 2 }).notNull(),
  liabilitiesTotal: numeric('liabilities_total', { precision: 14, scale: 2 }).notNull(),
  netWorth: numeric('net_worth', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('net_worth_snapshots_user_month_idx').on(table.userUid, table.month),
]);

export const securities = pgTable('securities', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  accountId: text('account_id'),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  assetType: text('asset_type').notNull(), // stocks, etfs, mutual_funds, bonds, crypto, cash, other
  quantity: numeric('quantity', { precision: 14, scale: 4 }).default('0.0000').notNull(),
  averageCost: numeric('average_cost', { precision: 14, scale: 2 }).default('0.00').notNull(),
  currentPrice: numeric('current_price', { precision: 14, scale: 2 }).default('0.00').notNull(),
  currency: text('currency').default('CAD').notNull(),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('securities_user_idx').on(table.userUid),
]);

export const investmentTransactions = pgTable('investment_transactions', {
  id: text('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  accountId: text('account_id'),
  securitySymbol: text('security_symbol').notNull(),
  securityName: text('security_name'),
  type: text('type').notNull(), // buy, sell, dividend, deposit, withdrawal, fee, split
  date: text('date').notNull(), // YYYY-MM-DD
  quantity: numeric('quantity', { precision: 14, scale: 4 }).default('0.0000').notNull(),
  price: numeric('price', { precision: 14, scale: 2 }).default('0.00').notNull(),
  fees: numeric('fees', { precision: 14, scale: 2 }).default('0.00').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('inv_transactions_user_idx').on(table.userUid),
  index('inv_transactions_date_idx').on(table.date),
]);

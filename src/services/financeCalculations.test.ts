import { describe, it, expect } from 'vitest';
import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetCashFlow,
  calculateSavingsRate,
  calculateNetWorth,
  calculateBudgetUtilization,
  computeHoldings,
  calculatePortfolioSummary,
} from './financeCalculations.ts';
import { BudgetItem, InvestmentTransactionItem, SecurityItem, TransactionItem } from '../types.ts';
import { formatCurrency } from '../utils/format.ts';

describe('Financial Calculations Unit Tests', () => {
  const sampleTxs: TransactionItem[] = [
    {
      id: '1',
      userUid: 'user1',
      categoryName: 'Salary',
      date: '2026-08-01',
      description: 'Biweekly Paycheck',
      amount: '3500.00',
      type: 'income',
      isRecurring: true,
    },
    {
      id: '2',
      userUid: 'user1',
      categoryName: 'Bonus',
      date: '2026-08-15',
      description: 'Performance Bonus',
      amount: '1500.50',
      type: 'income',
      isRecurring: false,
    },
    {
      id: '3',
      userUid: 'user1',
      categoryName: 'Groceries',
      date: '2026-08-05',
      description: 'Supermarket',
      amount: '200.25',
      type: 'expense',
      isRecurring: false,
    },
    {
      id: '4',
      userUid: 'user1',
      categoryName: 'Housing',
      date: '2026-08-01',
      description: 'Rent',
      amount: '1800.00',
      type: 'expense',
      isRecurring: true,
    },
  ];

  it('calculateTotalIncome sums income items accurately', () => {
    const income = calculateTotalIncome(sampleTxs);
    expect(income).toBe(5000.5);
  });

  it('calculateTotalExpenses sums expense items accurately', () => {
    const expenses = calculateTotalExpenses(sampleTxs);
    expect(expenses).toBe(2000.25);
  });

  it('calculateNetCashFlow computes income - expenses', () => {
    const income = calculateTotalIncome(sampleTxs);
    const expenses = calculateTotalExpenses(sampleTxs);
    const netFlow = calculateNetCashFlow(income, expenses);
    expect(netFlow).toBe(3000.25);
  });

  it('calculateSavingsRate computes correct percentage', () => {
    const income = calculateTotalIncome(sampleTxs);
    const expenses = calculateTotalExpenses(sampleTxs);
    const savingsRate = calculateSavingsRate(income, expenses);
    expect(savingsRate).toBe(60);
  });

  it('calculateNetWorth correctly subtracts liabilities from assets', () => {
    const netWorth = calculateNetWorth(250000.5, 95000.25);
    expect(netWorth).toBe(155000.25);
  });

  it('calculates budget utilization and alert thresholds', () => {
    const sampleBudgets: BudgetItem[] = [
      {
        id: 'b1',
        userUid: 'user1',
        month: '2026-08',
        categoryName: 'Groceries',
        amount: '250.00',
        rollover: false,
      },
      {
        id: 'b2',
        userUid: 'user1',
        month: '2026-08',
        categoryName: 'Housing',
        amount: '1500.00',
        rollover: false,
      },
    ];

    const utilization = calculateBudgetUtilization(sampleBudgets, sampleTxs, 80);
    const groceries = utilization.find((u) => u.categoryName === 'Groceries');
    const housing = utilization.find((u) => u.categoryName === 'Housing');

    expect(groceries?.spentAmount).toBe(200.25);
    expect(groceries?.percentageUsed).toBe(80);
    expect(groceries?.status).toBe('yellow');

    expect(housing?.spentAmount).toBe(1800);
    expect(housing?.percentageUsed).toBe(120);
    expect(housing?.status).toBe('red');
  });

  it('computes holdings, cost basis, and portfolio gain/loss accurately', () => {
    const initialSecurities: SecurityItem[] = [
      {
        id: 's1',
        userUid: 'user1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'stocks',
        quantity: '10',
        averageCost: '150.00',
        currentPrice: '170.00',
        currency: 'USD',
      },
    ];

    const invTxs: InvestmentTransactionItem[] = [
      {
        id: 't1',
        userUid: 'user1',
        securitySymbol: 'AAPL',
        type: 'buy',
        date: '2026-08-10',
        quantity: '10',
        price: '170.00',
        fees: '5.00',
        totalAmount: '1705.00',
      },
    ];

    const holdings = computeHoldings(initialSecurities, invTxs);
    const aapl = holdings.find((h) => h.symbol === 'AAPL');
    expect(aapl?.quantity).toBe('20');
    expect(aapl?.costBasis).toBe(3205);

    const summary = calculatePortfolioSummary(holdings);
    expect(summary.totalPortfolioValue).toBe(3400);
    expect(summary.totalGainLoss).toBe(195);
  });

  it('formats currency correctly', () => {
    expect(formatCurrency(1250.5, 'CAD')).toBe('CA$1,250.50');
    expect(formatCurrency(-500, 'USD')).toBe('-$500.00');
    expect(formatCurrency(100, 'EUR')).toBe('€100.00');
  });
});

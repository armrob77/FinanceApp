import {
  AccountItem,
  AssetLiabilityItem,
  BudgetItem,
  BudgetUtilization,
  InvestmentTransactionItem,
  SecurityItem,
  TransactionItem,
} from '../types.ts';
import { roundToCents } from '../utils/format.ts';

export function calculateTotalIncome(txs: TransactionItem[]): number {
  const sum = txs
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
  return roundToCents(sum);
}

export function calculateTotalExpenses(txs: TransactionItem[]): number {
  const sum = txs
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
  return roundToCents(sum);
}

export function calculateNetCashFlow(income: number, expenses: number): number {
  return roundToCents(income - expenses);
}

export function calculateSavingsRate(income: number, expenses: number): number {
  if (income <= 0) return 0;
  const savings = income - expenses;
  if (savings <= 0) return 0;
  const rate = (savings / income) * 100;
  return Math.round(rate * 10) / 10;
}

export function calculateAccountBalances(
  accounts: AccountItem[],
  txs: TransactionItem[]
): Map<string, number> {
  const balanceMap = new Map<string, number>();

  // Start with initial balance
  for (const acc of accounts) {
    const init = parseFloat(acc.initialBalance) || 0;
    balanceMap.set(acc.id, init);
  }

  // Apply transactions
  for (const t of txs) {
    if (!t.accountId) continue;
    const current = balanceMap.get(t.accountId) ?? 0;
    const amount = parseFloat(t.amount) || 0;
    if (t.type === 'income') {
      balanceMap.set(t.accountId, roundToCents(current + amount));
    } else {
      balanceMap.set(t.accountId, roundToCents(current - amount));
    }
  }

  return balanceMap;
}

export function calculateTotalAssets(
  assets: AssetLiabilityItem[],
  accountBalances: Map<string, number>,
  accounts: AccountItem[],
  portfolioValue: number
): number {
  // Sum manual assets
  const manualAssets = assets
    .filter((a) => a.kind === 'asset')
    .reduce((acc, a) => acc + (parseFloat(a.value) || 0), 0);

  // Sum positive bank/cash accounts
  let accountsTotal = 0;
  for (const acc of accounts) {
    if (acc.isArchived) continue;
    // brokerage accounts might reflect securities separately or cash in them
    if (acc.type === 'credit_card') continue; // credit card is liability
    const bal = accountBalances.get(acc.id) ?? (parseFloat(acc.initialBalance) || 0);
    if (bal > 0) {
      accountsTotal += bal;
    }
  }

  return roundToCents(manualAssets + accountsTotal + portfolioValue);
}

export function calculateTotalLiabilities(
  liabilities: AssetLiabilityItem[],
  accountBalances: Map<string, number>,
  accounts: AccountItem[]
): number {
  // Manual liabilities
  const manualLiabilities = liabilities
    .filter((l) => l.kind === 'liability')
    .reduce((acc, l) => acc + (parseFloat(l.value) || 0), 0);

  // Credit card accounts (positive balance on credit card = debt owed) or negative account balances
  let accountsDebt = 0;
  for (const acc of accounts) {
    if (acc.isArchived) continue;
    const bal = accountBalances.get(acc.id) ?? (parseFloat(acc.initialBalance) || 0);
    if (acc.type === 'credit_card') {
      if (bal > 0) accountsDebt += bal;
    } else if (bal < 0) {
      accountsDebt += Math.abs(bal);
    }
  }

  return roundToCents(manualLiabilities + accountsDebt);
}

export function calculateNetWorth(totalAssets: number, totalLiabilities: number): number {
  return roundToCents(totalAssets - totalLiabilities);
}

export function calculateBudgetUtilization(
  budgets: BudgetItem[],
  txsInMonth: TransactionItem[],
  alertThresholdPct: number = 80
): BudgetUtilization[] {
  const expenseMap = new Map<string, number>();

  for (const t of txsInMonth) {
    if (t.type === 'expense') {
      const cat = t.categoryName.trim();
      const current = expenseMap.get(cat) || 0;
      expenseMap.set(cat, current + (parseFloat(t.amount) || 0));
    }
  }

  return budgets.map((b) => {
    const budgetAmount = parseFloat(b.amount) || 0;
    const spentAmount = roundToCents(expenseMap.get(b.categoryName.trim()) || 0);
    const remainingAmount = roundToCents(budgetAmount - spentAmount);
    const percentageUsed =
      budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : spentAmount > 0 ? 100 : 0;

    let status: 'green' | 'yellow' | 'orange' | 'red' = 'green';
    let alertMessage: string | undefined;

    if (percentageUsed >= 100) {
      status = 'red';
      const over = roundToCents(spentAmount - budgetAmount);
      alertMessage = `You have exceeded your ${b.categoryName} budget by $${over.toLocaleString()}.`;
    } else if (percentageUsed >= 90) {
      status = 'orange';
      alertMessage = `You have used ${percentageUsed}% of your ${b.categoryName} budget.`;
    } else if (percentageUsed >= alertThresholdPct) {
      status = 'yellow';
      alertMessage = `You have used ${percentageUsed}% of your ${b.categoryName} budget.`;
    }

    return {
      id: b.id,
      categoryName: b.categoryName,
      budgetAmount,
      spentAmount,
      remainingAmount,
      percentageUsed,
      status,
      alertMessage,
    };
  });
}

export function computeHoldings(
  existingSecurities: SecurityItem[],
  invTransactions: InvestmentTransactionItem[]
): SecurityItem[] {
  // Map of symbol -> stats
  const symbolMap = new Map<
    string,
    {
      symbol: string;
      name: string;
      assetType: string;
      quantity: number;
      totalCost: number;
      currentPrice: number;
      currency: string;
      accountId?: string | null;
    }
  >();

  // Initialize from existing securities to keep custom current price
  for (const s of existingSecurities) {
    symbolMap.set(s.symbol.toUpperCase(), {
      symbol: s.symbol.toUpperCase(),
      name: s.name,
      assetType: s.assetType,
      quantity: parseFloat(s.quantity) || 0,
      totalCost: (parseFloat(s.averageCost) || 0) * (parseFloat(s.quantity) || 0),
      currentPrice: parseFloat(s.currentPrice) || 0,
      currency: s.currency || 'CAD',
      accountId: s.accountId,
    });
  }

  // Sort transactions chronologically
  const sorted = [...invTransactions].sort((a, b) => a.date.localeCompare(b.date));

  for (const tx of sorted) {
    const sym = tx.securitySymbol.toUpperCase();
    const existing = symbolMap.get(sym) || {
      symbol: sym,
      name: tx.securityName || sym,
      assetType: 'stocks',
      quantity: 0,
      totalCost: 0,
      currentPrice: parseFloat(tx.price) || 0,
      currency: 'CAD',
      accountId: tx.accountId,
    };

    const qty = parseFloat(tx.quantity) || 0;
    const price = parseFloat(tx.price) || 0;
    const fees = parseFloat(tx.fees) || 0;

    switch (tx.type) {
      case 'buy': {
        existing.quantity += qty;
        existing.totalCost += qty * price + fees;
        if (price > 0) existing.currentPrice = price;
        break;
      }
      case 'sell': {
        if (existing.quantity > 0) {
          const avgCost = existing.totalCost / existing.quantity;
          existing.quantity = Math.max(0, existing.quantity - qty);
          existing.totalCost = Math.max(0, existing.quantity * avgCost);
        }
        if (price > 0) existing.currentPrice = price;
        break;
      }
      case 'split': {
        // e.g. quantity is multiplier (e.g. 2 for 2:1 split)
        if (qty > 0) {
          existing.quantity = existing.quantity * qty;
          // total cost basis remains same, average cost lowers
        }
        break;
      }
      case 'dividend':
      case 'deposit':
      case 'withdrawal':
      case 'fee':
        // Recorded for history and account tracking
        break;
    }

    symbolMap.set(sym, existing);
  }

  const result: SecurityItem[] = [];
  for (const [_, item] of symbolMap) {
    if (item.quantity <= 0.00001 && item.totalCost <= 0.01) continue;
    const avgCost = item.quantity > 0 ? roundToCents(item.totalCost / item.quantity) : 0;
    const marketValue = roundToCents(item.quantity * item.currentPrice);
    const costBasis = roundToCents(item.totalCost);
    const unrealizedGainLoss = roundToCents(marketValue - costBasis);
    const gainLossPercentage =
      costBasis > 0 ? Math.round(((marketValue - costBasis) / costBasis) * 1000) / 10 : 0;

    result.push({
      id: item.symbol,
      userUid: '',
      symbol: item.symbol,
      name: item.name,
      assetType: item.assetType as any,
      quantity: item.quantity.toString(),
      averageCost: avgCost.toString(),
      currentPrice: item.currentPrice.toString(),
      currency: item.currency,
      accountId: item.accountId,
      marketValue,
      costBasis,
      unrealizedGainLoss,
      gainLossPercentage,
    });
  }

  return result;
}

export function calculatePortfolioSummary(holdings: SecurityItem[]): {
  totalPortfolioValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  gainLossPercentage: number;
} {
  let totalPortfolioValue = 0;
  let totalCostBasis = 0;

  for (const h of holdings) {
    totalPortfolioValue += h.marketValue ?? 0;
    totalCostBasis += h.costBasis ?? 0;
  }

  totalPortfolioValue = roundToCents(totalPortfolioValue);
  totalCostBasis = roundToCents(totalCostBasis);
  const totalGainLoss = roundToCents(totalPortfolioValue - totalCostBasis);
  const gainLossPercentage =
    totalCostBasis > 0
      ? Math.round(((totalPortfolioValue - totalCostBasis) / totalCostBasis) * 1000) / 10
      : 0;

  return {
    totalPortfolioValue,
    totalCostBasis,
    totalGainLoss,
    gainLossPercentage,
  };
}

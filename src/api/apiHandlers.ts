import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.ts';
import * as dbQueries from '../db/queries.ts';
import { seedDemoDataForUser } from '../db/seedData.ts';
import {
  calculateAccountBalances,
  calculateBudgetUtilization,
  calculateNetCashFlow,
  calculateNetWorth,
  calculatePortfolioSummary,
  calculateSavingsRate,
  calculateTotalAssets,
  calculateTotalExpenses,
  calculateTotalIncome,
  calculateTotalLiabilities,
  computeHoldings,
} from '../services/financeCalculations.ts';
import { roundToCents } from '../utils/format.ts';

export const apiRouter = Router();

// Helper to get authenticated UID safely
function getUid(req: AuthRequest): string {
  if (!req.user?.uid) {
    throw new Error('Unauthorized user token');
  }
  return req.user.uid;
}

// ---------------- USER / PROFILE ----------------
apiRouter.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const email = req.user?.email || 'user@example.com';
    const profile = await dbQueries.getOrCreateUser(uid, email);
    res.json(profile);
  } catch (err: any) {
    console.error('API /me error:', err);
    res.status(500).json({ error: err.message || 'Failed to load profile' });
  }
});

apiRouter.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      currency: z.enum(['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY']).optional(),
      budgetAlertThreshold: z.number().min(1).max(100).optional(),
      dateFormat: z.string().optional(),
      hideBalances: z.boolean().optional(),
    });
    const parsed = schema.parse(req.body);
    // Persist currency and threshold in users table
    await dbQueries.updateUserProfile(uid, {
      currency: parsed.currency as any,
      budgetAlertThreshold: parsed.budgetAlertThreshold,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid input' });
  }
});

// ---------------- ACCOUNTS ----------------
apiRouter.get('/accounts', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const [accountsList, txsResult] = await Promise.all([
      dbQueries.getAccounts(uid),
      dbQueries.getTransactions(uid, { limit: 5000 }),
    ]);

    const balanceMap = calculateAccountBalances(accountsList, txsResult.transactions);

    const accountsWithBalance = accountsList.map((acc) => ({
      ...acc,
      currentBalance: (balanceMap.get(acc.id) ?? (parseFloat(acc.initialBalance) || 0)).toFixed(2),
    }));

    res.json(accountsWithBalance);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch accounts' });
  }
});

apiRouter.post('/accounts', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      name: z.string().min(1),
      type: z.enum(['checking', 'savings', 'cash', 'credit_card', 'brokerage', 'retirement', 'other']),
      institution: z.string().optional().nullable(),
      initialBalance: z.string().default('0.00'),
      currency: z.string().default('CAD'),
      notes: z.string().optional().nullable(),
      isArchived: z.boolean().default(false),
    });
    const parsed = schema.parse(req.body);
    const created = await dbQueries.createAccount(uid, parsed);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid account data' });
  }
});

apiRouter.patch('/accounts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const updated = await dbQueries.updateAccount(uid, req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update account' });
  }
});

apiRouter.delete('/accounts/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await dbQueries.deleteAccount(uid, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete account' });
  }
});

// ---------------- CATEGORIES ----------------
apiRouter.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const categoriesList = await dbQueries.getCategories(uid);
    res.json(categoriesList);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch categories' });
  }
});

apiRouter.post('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      name: z.string().min(1),
      type: z.enum(['income', 'expense']),
    });
    const { name, type } = schema.parse(req.body);
    const created = await dbQueries.createCategory(uid, name, type);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid category data' });
  }
});

apiRouter.patch('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({ name: z.string().min(1) });
    const { name } = schema.parse(req.body);
    const updated = await dbQueries.updateCategory(uid, req.params.id, name);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update category' });
  }
});

apiRouter.delete('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await dbQueries.deleteCategory(uid, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete category' });
  }
});

// ---------------- TRANSACTIONS ----------------
apiRouter.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const {
      startDate,
      endDate,
      category,
      accountId,
      type,
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = req.query;

    const result = await dbQueries.getTransactions(uid, {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      category: category as string | undefined,
      accountId: accountId as string | undefined,
      type: (type as 'income' | 'expense') || undefined,
      search: search as string | undefined,
      sortBy: (sortBy as 'date' | 'amount') || 'date',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch transactions' });
  }
});

apiRouter.post('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      accountId: z.string().optional().nullable(),
      categoryName: z.string().min(1),
      subcategory: z.string().optional().nullable(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
      description: z.string().min(1),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid monetary number'),
      type: z.enum(['income', 'expense']),
      notes: z.string().optional().nullable(),
      isRecurring: z.boolean().default(false),
    });

    const parsed = schema.parse(req.body);
    const created = await dbQueries.createTransaction(uid, parsed);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid transaction data' });
  }
});

apiRouter.post('/transactions/batch', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.array(
      z.object({
        accountId: z.string().optional().nullable(),
        categoryName: z.string().min(1),
        subcategory: z.string().optional().nullable(),
        date: z.string(),
        description: z.string().min(1),
        amount: z.string(),
        type: z.enum(['income', 'expense']),
        notes: z.string().optional().nullable(),
        isRecurring: z.boolean().default(false),
      })
    );

    const parsed = schema.parse(req.body);
    const count = await dbQueries.batchCreateTransactions(uid, parsed);
    res.status(201).json({ count, success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to batch import transactions' });
  }
});

apiRouter.patch('/transactions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const updated = await dbQueries.updateTransaction(uid, req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update transaction' });
  }
});

apiRouter.delete('/transactions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await dbQueries.deleteTransaction(uid, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete transaction' });
  }
});

// ---------------- BUDGETS ----------------
apiRouter.get('/budgets', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);

    // Get user profile for alert threshold
    const profile = await dbQueries.getOrCreateUser(uid, req.user?.email || '');
    const threshold = profile.budgetAlertThreshold || 80;

    // Fetch budgets for the month
    const budgetList = await dbQueries.getBudgets(uid, month);

    // Fetch transactions in this month to calculate utilization
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const txResult = await dbQueries.getTransactions(uid, {
      startDate,
      endDate,
      type: 'expense',
      limit: 1000,
    });

    const utilization = calculateBudgetUtilization(budgetList, txResult.transactions, threshold);
    res.json({ month, budgets: utilization });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch budgets' });
  }
});

apiRouter.post('/budgets', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      categoryName: z.string().min(1),
      amount: z.string().min(1),
      rollover: z.boolean().default(false),
    });

    const parsed = schema.parse(req.body);
    const saved = await dbQueries.upsertBudget(uid, parsed);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save budget' });
  }
});

apiRouter.post('/budgets/copy-previous', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      targetMonth: z.string().regex(/^\d{4}-\d{2}$/),
      prevMonth: z.string().regex(/^\d{4}-\d{2}$/),
    });
    const { targetMonth, prevMonth } = schema.parse(req.body);
    const copied = await dbQueries.copyPreviousMonthBudgets(uid, targetMonth, prevMonth);
    res.json(copied);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to copy budgets' });
  }
});

apiRouter.delete('/budgets/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await dbQueries.deleteBudget(uid, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete budget' });
  }
});

// ---------------- ASSETS & LIABILITIES / NET WORTH ----------------
apiRouter.get('/assets-liabilities', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const items = await dbQueries.getAssetsLiabilities(uid);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch assets and liabilities' });
  }
});

apiRouter.post('/assets-liabilities', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      name: z.string().min(1),
      kind: z.enum(['asset', 'liability']),
      category: z.string().min(1),
      value: z.string().min(1),
      asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional().nullable(),
    });
    const parsed = schema.parse(req.body);
    const created = await dbQueries.createAssetLiability(uid, parsed);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid asset/liability data' });
  }
});

apiRouter.patch('/assets-liabilities/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const updated = await dbQueries.updateAssetLiability(uid, req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update item' });
  }
});

apiRouter.delete('/assets-liabilities/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await dbQueries.deleteAssetLiability(uid, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete item' });
  }
});

apiRouter.get('/net-worth/snapshots', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const snapshots = await dbQueries.getNetWorthSnapshots(uid);
    res.json(snapshots);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch snapshots' });
  }
});

apiRouter.post('/net-worth/snapshots', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      assetsTotal: z.number(),
      liabilitiesTotal: z.number(),
    });
    const { month, assetsTotal, liabilitiesTotal } = schema.parse(req.body);
    const saved = await dbQueries.saveNetWorthSnapshot(uid, month, assetsTotal, liabilitiesTotal);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save snapshot' });
  }
});

// ---------------- INVESTMENTS ----------------
apiRouter.get('/investments/overview', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const [securitiesList, invTxs] = await Promise.all([
      dbQueries.getSecurities(uid),
      dbQueries.getInvestmentTransactions(uid),
    ]);

    const holdings = computeHoldings(securitiesList, invTxs);
    const summary = calculatePortfolioSummary(holdings);

    // Group by asset type
    const allocationMap = new Map<string, number>();
    for (const h of holdings) {
      const type = h.assetType || 'other';
      const cur = allocationMap.get(type) || 0;
      allocationMap.set(type, cur + (h.marketValue ?? 0));
    }

    const allocation = Array.from(allocationMap.entries()).map(([name, value]) => ({
      name: name.toUpperCase(),
      value: roundToCents(value),
    }));

    res.json({
      summary,
      holdings,
      allocation,
      recentTransactions: invTxs.slice(0, 10),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch investment overview' });
  }
});

apiRouter.get('/investments/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const list = await dbQueries.getInvestmentTransactions(uid);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch investment transactions' });
  }
});

apiRouter.post('/investments/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      accountId: z.string().optional().nullable(),
      securitySymbol: z.string().min(1),
      securityName: z.string().optional().nullable(),
      type: z.enum(['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee', 'split']),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      quantity: z.string().default('0.0000'),
      price: z.string().default('0.00'),
      fees: z.string().default('0.00'),
      totalAmount: z.string().min(1),
      notes: z.string().optional().nullable(),
    });

    const parsed = schema.parse(req.body);
    const created = await dbQueries.createInvestmentTransaction(uid, parsed);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid investment transaction' });
  }
});

apiRouter.post('/investments/holdings', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const schema = z.object({
      accountId: z.string().optional().nullable(),
      symbol: z.string().min(1),
      name: z.string().min(1),
      assetType: z.enum(['stocks', 'etfs', 'mutual_funds', 'bonds', 'crypto', 'cash', 'other']),
      quantity: z.string().default('0.0000'),
      averageCost: z.string().default('0.00'),
      currentPrice: z.string().default('0.00'),
      currency: z.string().default('CAD'),
      notes: z.string().optional().nullable(),
    });
    const parsed = schema.parse(req.body);
    const saved = await dbQueries.upsertSecurity(uid, parsed);
    res.status(201).json(saved);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save holding' });
  }
});

apiRouter.delete('/investments/transactions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await dbQueries.deleteInvestmentTransaction(uid, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete investment transaction' });
  }
});

// ---------------- DASHBOARD AGGREGATE SUMMARY ----------------
apiRouter.get('/dashboard/summary', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const selectedMonth = (req.query.month as string) || new Date().toISOString().substring(0, 7);

    // Calculate previous month
    const [yearStr, monthStr] = selectedMonth.split('-');
    let prevYear = parseInt(yearStr, 10);
    let prevMonthNum = parseInt(monthStr, 10) - 1;
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYear -= 1;
    }
    const prevMonth = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

    // Parallel fetch
    const [
      profile,
      accountsList,
      allTxsResult,
      assetsLiabList,
      securitiesList,
      invTxs,
      budgetList,
      snapshots,
    ] = await Promise.all([
      dbQueries.getOrCreateUser(uid, req.user?.email || ''),
      dbQueries.getAccounts(uid),
      dbQueries.getTransactions(uid, { limit: 5000 }),
      dbQueries.getAssetsLiabilities(uid),
      dbQueries.getSecurities(uid),
      dbQueries.getInvestmentTransactions(uid),
      dbQueries.getBudgets(uid, selectedMonth),
      dbQueries.getNetWorthSnapshots(uid),
    ]);

    const txs = allTxsResult.transactions;
    const accountBalances = calculateAccountBalances(accountsList, txs);
    const holdings = computeHoldings(securitiesList, invTxs);
    const portfolioSummary = calculatePortfolioSummary(holdings);

    // Current month transactions
    const curMonthTxs = txs.filter((t) => t.date.startsWith(selectedMonth));
    const prevMonthTxs = txs.filter((t) => t.date.startsWith(prevMonth));

    const currentMonthIncome = calculateTotalIncome(curMonthTxs);
    const currentMonthExpenses = calculateTotalExpenses(curMonthTxs);
    const currentMonthSavings = calculateNetCashFlow(currentMonthIncome, currentMonthExpenses);
    const savingsRate = calculateSavingsRate(currentMonthIncome, currentMonthExpenses);

    const prevMonthIncome = calculateTotalIncome(prevMonthTxs);
    const prevMonthExpenses = calculateTotalExpenses(prevMonthTxs);

    // Assets & Liabilities
    const totalAssets = calculateTotalAssets(
      assetsLiabList,
      accountBalances,
      accountsList,
      portfolioSummary.totalPortfolioValue
    );
    const totalLiabilities = calculateTotalLiabilities(
      assetsLiabList,
      accountBalances,
      accountsList
    );
    const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

    // Compare with last month snapshot or compute
    const prevSnapshot = snapshots.find((s) => s.month === prevMonth);
    const lastMonthNetWorth = prevSnapshot ? parseFloat(prevSnapshot.netWorth) || 0 : 0;
    const netWorthGrowthPct =
      lastMonthNetWorth > 0
        ? Math.round(((netWorth - lastMonthNetWorth) / lastMonthNetWorth) * 1000) / 10
        : 0;

    // Monthly income/expense trend for last 6 months
    const trendMonths: string[] = [];
    const currentD = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentD.getFullYear(), currentD.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trendMonths.push(mStr);
    }

    const incomeExpenseTrend = trendMonths.map((m) => {
      const mTxs = txs.filter((t) => t.date.startsWith(m));
      const inc = calculateTotalIncome(mTxs);
      const exp = calculateTotalExpenses(mTxs);
      return {
        month: m,
        income: inc,
        expenses: exp,
        savings: calculateNetCashFlow(inc, exp),
      };
    });

    // Net worth trend (from snapshots + current calculated)
    const netWorthTrendMap = new Map<string, { netWorth: number; assets: number; liabilities: number }>();
    for (const snap of snapshots) {
      netWorthTrendMap.set(snap.month, {
        netWorth: parseFloat(snap.netWorth) || 0,
        assets: parseFloat(snap.assetsTotal) || 0,
        liabilities: parseFloat(snap.liabilitiesTotal) || 0,
      });
    }
    // ensure current month is present
    netWorthTrendMap.set(selectedMonth, {
      netWorth,
      assets: totalAssets,
      liabilities: totalLiabilities,
    });

    const netWorthTrend = Array.from(netWorthTrendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month,
        ...data,
      }));

    // Spending by category in current month
    const categorySpendingMap = new Map<string, number>();
    for (const t of curMonthTxs) {
      if (t.type === 'expense') {
        const cat = t.categoryName.trim();
        categorySpendingMap.set(cat, (categorySpendingMap.get(cat) || 0) + (parseFloat(t.amount) || 0));
      }
    }
    const expenseCategories = Array.from(categorySpendingMap.entries())
      .map(([name, amount]) => ({
        name,
        amount: roundToCents(amount),
        percentage:
          currentMonthExpenses > 0 ? Math.round((amount / currentMonthExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Budget Progress & alerts
    const budgetProgress = calculateBudgetUtilization(
      budgetList,
      curMonthTxs,
      profile.budgetAlertThreshold || 80
    );

    const alerts = budgetProgress
      .filter((b) => b.alertMessage)
      .map((b) => b.alertMessage as string);

    res.json({
      netWorth,
      lastMonthNetWorth,
      netWorthGrowthPct,
      totalAssets,
      totalLiabilities,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthSavings,
      savingsRate,
      investmentPortfolioValue: portfolioSummary.totalPortfolioValue,
      currency: profile.currency || 'CAD',
      selectedMonth,
      netWorthTrend,
      incomeExpenseTrend,
      expenseCategories,
      budgetProgress,
      alerts,
    });
  } catch (err: any) {
    console.error('API /dashboard/summary error:', err);
    res.status(500).json({ error: err.message || 'Failed to compute dashboard summary' });
  }
});

// ---------------- FINANCIAL REPORTS ----------------
apiRouter.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    const startDate = (req.query.start as string) || `${new Date().getFullYear()}-01-01`;
    const endDate = (req.query.end as string) || new Date().toISOString().substring(0, 10);

    const [profile, txResult, assetsLiab, accountsList, securitiesList, invTxs] = await Promise.all([
      dbQueries.getOrCreateUser(uid, req.user?.email || ''),
      dbQueries.getTransactions(uid, { startDate, endDate, limit: 5000 }),
      dbQueries.getAssetsLiabilities(uid),
      dbQueries.getAccounts(uid),
      dbQueries.getSecurities(uid),
      dbQueries.getInvestmentTransactions(uid),
    ]);

    const txs = txResult.transactions;
    const totalIncome = calculateTotalIncome(txs);
    const totalExpenses = calculateTotalExpenses(txs);
    const netCashFlow = calculateNetCashFlow(totalIncome, totalExpenses);
    const savingsRate = calculateSavingsRate(totalIncome, totalExpenses);

    // Breakdown income by category
    const incomeByCategoryMap = new Map<string, number>();
    const expenseByCategoryMap = new Map<string, number>();

    for (const t of txs) {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') {
        incomeByCategoryMap.set(t.categoryName, (incomeByCategoryMap.get(t.categoryName) || 0) + amt);
      } else {
        expenseByCategoryMap.set(t.categoryName, (expenseByCategoryMap.get(t.categoryName) || 0) + amt);
      }
    }

    const incomeByCategory = Array.from(incomeByCategoryMap.entries()).map(([name, amount]) => ({
      name,
      amount: roundToCents(amount),
      percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
    }));

    const expensesByCategory = Array.from(expenseByCategoryMap.entries()).map(([name, amount]) => ({
      name,
      amount: roundToCents(amount),
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }));

    // Largest expenses
    const largestExpenses = [...txs]
      .filter((t) => t.type === 'expense')
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 10);

    // Holdings & portfolio
    const holdings = computeHoldings(securitiesList, invTxs);
    const portfolioSummary = calculatePortfolioSummary(holdings);

    // Net worth
    const accountBalances = calculateAccountBalances(accountsList, txs);
    const totalAssets = calculateTotalAssets(
      assetsLiab,
      accountBalances,
      accountsList,
      portfolioSummary.totalPortfolioValue
    );
    const totalLiabilities = calculateTotalLiabilities(assetsLiab, accountBalances, accountsList);
    const netWorth = calculateNetWorth(totalAssets, totalLiabilities);

    res.json({
      period: { startDate, endDate },
      currency: profile.currency || 'CAD',
      totalIncome,
      totalExpenses,
      netCashFlow,
      savingsRate,
      incomeByCategory,
      expensesByCategory,
      largestExpenses,
      totalAssets,
      totalLiabilities,
      netWorth,
      portfolioSummary,
      holdings,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate financial report' });
  }
});

// ---------------- DEMO SEED / RESET ----------------
apiRouter.post(['/demo/seed', '/seed-demo'], async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await seedDemoDataForUser(uid);
    res.json({ success: true, message: 'Realistic demo financial data seeded successfully' });
  } catch (err: any) {
    console.error('Seed demo error:', err);
    res.status(500).json({ error: err.message || 'Failed to seed demo data' });
  }
});

apiRouter.post('/user/clear-data', async (req: AuthRequest, res: Response) => {
  try {
    const uid = getUid(req);
    await dbQueries.clearUserData(uid);
    res.json({ success: true, message: 'User financial data cleared' });
  } catch (err: any) {
    console.error('Clear user data error:', err);
    res.status(500).json({ error: err.message || 'Failed to clear user data' });
  }
});


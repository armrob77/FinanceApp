import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  accounts,
  assetsLiabilities,
  budgets,
  categories,
  investmentTransactions,
  netWorthSnapshots,
  securities,
  transactions,
  users,
} from './schema.ts';
import {
  AccountItem,
  AssetLiabilityItem,
  BudgetItem,
  CategoryItem,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  InvestmentTransactionItem,
  NetWorthSnapshotItem,
  SecurityItem,
  SupportedCurrency,
  TransactionItem,
  UserProfile,
} from '../types.ts';

// ---------------- USER PROFILE ----------------
export async function getOrCreateUser(uid: string, email: string): Promise<UserProfile> {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return {
        uid: existing[0].uid,
        email: existing[0].email,
        currency: (existing[0].currency as SupportedCurrency) || 'CAD',
        budgetAlertThreshold: existing[0].budgetAlertThreshold ?? 80,
      };
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        currency: 'CAD',
        budgetAlertThreshold: 80,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    // Initialize default categories for new user
    const defaultCatValues = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        id: `cat_exp_${Math.random().toString(36).substring(2, 9)}`,
        userUid: uid,
        name,
        type: 'expense' as const,
        isCustom: false,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
        id: `cat_inc_${Math.random().toString(36).substring(2, 9)}`,
        userUid: uid,
        name,
        type: 'income' as const,
        isCustom: false,
      })),
    ];

    await db.insert(categories).values(defaultCatValues).onConflictDoNothing();

    // Initialize default checking and savings account
    const defaultAccounts = [
      {
        id: `acc_${Math.random().toString(36).substring(2, 9)}`,
        userUid: uid,
        name: 'Main Checking',
        type: 'checking',
        institution: 'TD Bank',
        initialBalance: '2500.00',
        currency: 'CAD',
        isArchived: false,
      },
      {
        id: `acc_${Math.random().toString(36).substring(2, 9)}`,
        userUid: uid,
        name: 'High-Interest Savings',
        type: 'savings',
        institution: 'EQ Bank',
        initialBalance: '10000.00',
        currency: 'CAD',
        isArchived: false,
      },
    ];
    await db.insert(accounts).values(defaultAccounts).onConflictDoNothing();

    return {
      uid: inserted[0].uid,
      email: inserted[0].email,
      currency: (inserted[0].currency as SupportedCurrency) || 'CAD',
      budgetAlertThreshold: inserted[0].budgetAlertThreshold ?? 80,
    };
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('Failed to retrieve or create user profile', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  data: { currency?: SupportedCurrency; budgetAlertThreshold?: number }
): Promise<void> {
  try {
    await db.update(users).set(data).where(eq(users.uid, uid));
  } catch (error) {
    console.error('updateUserProfile error:', error);
    throw new Error('Failed to update user profile', { cause: error });
  }
}

// ---------------- ACCOUNTS ----------------
export async function getAccounts(uid: string): Promise<AccountItem[]> {
  try {
    const list = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userUid, uid))
      .orderBy(accounts.isArchived, desc(accounts.createdAt));
    return list as AccountItem[];
  } catch (error) {
    console.error('getAccounts error:', error);
    throw new Error('Failed to fetch accounts', { cause: error });
  }
}

export async function createAccount(uid: string, data: Omit<AccountItem, 'id' | 'userUid' | 'createdAt'>): Promise<AccountItem> {
  try {
    const id = `acc_${Math.random().toString(36).substring(2, 10)}`;
    const [created] = await db
      .insert(accounts)
      .values({
        id,
        userUid: uid,
        name: data.name,
        type: data.type,
        institution: data.institution || null,
        initialBalance: data.initialBalance || '0.00',
        currency: data.currency || 'CAD',
        notes: data.notes || null,
        isArchived: data.isArchived || false,
      })
      .returning();
    return created as AccountItem;
  } catch (error) {
    console.error('createAccount error:', error);
    throw new Error('Failed to create account', { cause: error });
  }
}

export async function updateAccount(
  uid: string,
  id: string,
  data: Partial<AccountItem>
): Promise<AccountItem> {
  try {
    const [updated] = await db
      .update(accounts)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.institution !== undefined && { institution: data.institution }),
        ...(data.initialBalance !== undefined && { initialBalance: data.initialBalance }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      })
      .where(and(eq(accounts.id, id), eq(accounts.userUid, uid)))
      .returning();
    return updated as AccountItem;
  } catch (error) {
    console.error('updateAccount error:', error);
    throw new Error('Failed to update account', { cause: error });
  }
}

export async function deleteAccount(uid: string, id: string): Promise<void> {
  try {
    // Instead of deleting historical references, archive it by default or remove if no transactions
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userUid, uid)));
  } catch (error) {
    console.error('deleteAccount error:', error);
    throw new Error('Failed to delete account', { cause: error });
  }
}

// ---------------- CATEGORIES ----------------
export async function getCategories(uid: string): Promise<CategoryItem[]> {
  try {
    const list = await db
      .select()
      .from(categories)
      .where(eq(categories.userUid, uid))
      .orderBy(categories.name);

    if (list.length === 0) {
      // Seed default categories if somehow missing
      const defaults = [
        ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
          id: `cat_exp_${Math.random().toString(36).substring(2, 9)}`,
          userUid: uid,
          name,
          type: 'expense' as const,
          isCustom: false,
        })),
        ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
          id: `cat_inc_${Math.random().toString(36).substring(2, 9)}`,
          userUid: uid,
          name,
          type: 'income' as const,
          isCustom: false,
        })),
      ];
      await db.insert(categories).values(defaults).onConflictDoNothing();
      return defaults;
    }

    return list as CategoryItem[];
  } catch (error) {
    console.error('getCategories error:', error);
    throw new Error('Failed to fetch categories', { cause: error });
  }
}

export async function createCategory(
  uid: string,
  name: string,
  type: 'income' | 'expense'
): Promise<CategoryItem> {
  try {
    const id = `cat_${Math.random().toString(36).substring(2, 10)}`;
    const [created] = await db
      .insert(categories)
      .values({
        id,
        userUid: uid,
        name: name.trim(),
        type,
        isCustom: true,
      })
      .returning();
    return created as CategoryItem;
  } catch (error) {
    console.error('createCategory error:', error);
    throw new Error('Failed to create category', { cause: error });
  }
}

export async function updateCategory(
  uid: string,
  id: string,
  name: string
): Promise<CategoryItem> {
  try {
    const [updated] = await db
      .update(categories)
      .set({ name: name.trim() })
      .where(and(eq(categories.id, id), eq(categories.userUid, uid)))
      .returning();
    return updated as CategoryItem;
  } catch (error) {
    console.error('updateCategory error:', error);
    throw new Error('Failed to update category', { cause: error });
  }
}

export async function deleteCategory(uid: string, id: string): Promise<void> {
  try {
    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userUid, uid)));
  } catch (error) {
    console.error('deleteCategory error:', error);
    throw new Error('Failed to delete category', { cause: error });
  }
}

// ---------------- TRANSACTIONS ----------------
export async function getTransactions(
  uid: string,
  filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
    accountId?: string;
    type?: 'income' | 'expense';
    search?: string;
    sortBy?: 'date' | 'amount';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ transactions: TransactionItem[]; totalCount: number }> {
  try {
    const conditions = [eq(transactions.userUid, uid)];

    if (filters.startDate) {
      conditions.push(gte(transactions.date, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(transactions.date, filters.endDate));
    }
    if (filters.category && filters.category !== 'all') {
      conditions.push(eq(transactions.categoryName, filters.category));
    }
    if (filters.accountId && filters.accountId !== 'all') {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }
    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    if (filters.search) {
      conditions.push(ilike(transactions.description, `%${filters.search}%`));
    }

    const whereClause = and(...conditions);

    // Count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(whereClause);
    const totalCount = countResult[0]?.count || 0;

    let query = db.select().from(transactions).where(whereClause).$dynamic();

    if (filters.sortBy === 'amount') {
      query = filters.sortOrder === 'asc' ? query.orderBy(transactions.amount) : query.orderBy(desc(transactions.amount));
    } else {
      query = filters.sortOrder === 'asc' ? query.orderBy(transactions.date) : query.orderBy(desc(transactions.date), desc(transactions.createdAt));
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    const list = await query;
    return { transactions: list as TransactionItem[], totalCount };
  } catch (error) {
    console.error('getTransactions error:', error);
    throw new Error('Failed to fetch transactions', { cause: error });
  }
}

export async function createTransaction(
  uid: string,
  data: Omit<TransactionItem, 'id' | 'userUid' | 'createdAt'>
): Promise<TransactionItem> {
  try {
    const id = `tx_${Math.random().toString(36).substring(2, 10)}`;
    const [created] = await db
      .insert(transactions)
      .values({
        id,
        userUid: uid,
        accountId: data.accountId || null,
        categoryName: data.categoryName,
        subcategory: data.subcategory || null,
        date: data.date,
        description: data.description,
        amount: data.amount,
        type: data.type,
        notes: data.notes || null,
        isRecurring: data.isRecurring || false,
      })
      .returning();
    return created as TransactionItem;
  } catch (error) {
    console.error('createTransaction error:', error);
    throw new Error('Failed to create transaction', { cause: error });
  }
}

export async function batchCreateTransactions(
  uid: string,
  txs: Omit<TransactionItem, 'id' | 'userUid' | 'createdAt'>[]
): Promise<number> {
  try {
    if (txs.length === 0) return 0;
    const values = txs.map((t) => ({
      id: `tx_${Math.random().toString(36).substring(2, 10)}`,
      userUid: uid,
      accountId: t.accountId || null,
      categoryName: t.categoryName,
      subcategory: t.subcategory || null,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      notes: t.notes || null,
      isRecurring: t.isRecurring || false,
    }));
    await db.insert(transactions).values(values);
    return values.length;
  } catch (error) {
    console.error('batchCreateTransactions error:', error);
    throw new Error('Failed to batch create transactions', { cause: error });
  }
}

export async function updateTransaction(
  uid: string,
  id: string,
  data: Partial<TransactionItem>
): Promise<TransactionItem> {
  try {
    const [updated] = await db
      .update(transactions)
      .set({
        ...(data.accountId !== undefined && { accountId: data.accountId || null }),
        ...(data.categoryName !== undefined && { categoryName: data.categoryName }),
        ...(data.subcategory !== undefined && { subcategory: data.subcategory || null }),
        ...(data.date !== undefined && { date: data.date }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userUid, uid)))
      .returning();
    return updated as TransactionItem;
  } catch (error) {
    console.error('updateTransaction error:', error);
    throw new Error('Failed to update transaction', { cause: error });
  }
}

export async function deleteTransaction(uid: string, id: string): Promise<void> {
  try {
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userUid, uid)));
  } catch (error) {
    console.error('deleteTransaction error:', error);
    throw new Error('Failed to delete transaction', { cause: error });
  }
}

// ---------------- BUDGETS ----------------
export async function getBudgets(uid: string, month: string): Promise<BudgetItem[]> {
  try {
    const list = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userUid, uid), eq(budgets.month, month)))
      .orderBy(budgets.categoryName);
    return list as BudgetItem[];
  } catch (error) {
    console.error('getBudgets error:', error);
    throw new Error('Failed to fetch budgets', { cause: error });
  }
}

export async function upsertBudget(
  uid: string,
  data: { month: string; categoryName: string; amount: string; rollover?: boolean }
): Promise<BudgetItem> {
  try {
    const existing = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userUid, uid),
          eq(budgets.month, data.month),
          eq(budgets.categoryName, data.categoryName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(budgets)
        .set({
          amount: data.amount,
          rollover: data.rollover ?? false,
        })
        .where(eq(budgets.id, existing[0].id))
        .returning();
      return updated as BudgetItem;
    }

    const id = `bud_${Math.random().toString(36).substring(2, 10)}`;
    const [inserted] = await db
      .insert(budgets)
      .values({
        id,
        userUid: uid,
        month: data.month,
        categoryName: data.categoryName,
        amount: data.amount,
        rollover: data.rollover ?? false,
      })
      .returning();
    return inserted as BudgetItem;
  } catch (error) {
    console.error('upsertBudget error:', error);
    throw new Error('Failed to upsert budget', { cause: error });
  }
}

export async function copyPreviousMonthBudgets(
  uid: string,
  targetMonth: string,
  prevMonth: string
): Promise<BudgetItem[]> {
  try {
    const prev = await getBudgets(uid, prevMonth);
    if (prev.length === 0) return [];

    const newBudgets = prev.map((b) => ({
      id: `bud_${Math.random().toString(36).substring(2, 10)}`,
      userUid: uid,
      month: targetMonth,
      categoryName: b.categoryName,
      amount: b.amount,
      rollover: b.rollover,
    }));

    await db.insert(budgets).values(newBudgets);
    return getBudgets(uid, targetMonth);
  } catch (error) {
    console.error('copyPreviousMonthBudgets error:', error);
    throw new Error('Failed to copy budgets', { cause: error });
  }
}

export async function deleteBudget(uid: string, id: string): Promise<void> {
  try {
    await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userUid, uid)));
  } catch (error) {
    console.error('deleteBudget error:', error);
    throw new Error('Failed to delete budget', { cause: error });
  }
}

// ---------------- ASSETS & LIABILITIES ----------------
export async function getAssetsLiabilities(uid: string): Promise<AssetLiabilityItem[]> {
  try {
    const list = await db
      .select()
      .from(assetsLiabilities)
      .where(eq(assetsLiabilities.userUid, uid))
      .orderBy(desc(assetsLiabilities.value));
    return list as AssetLiabilityItem[];
  } catch (error) {
    console.error('getAssetsLiabilities error:', error);
    throw new Error('Failed to fetch assets and liabilities', { cause: error });
  }
}

export async function createAssetLiability(
  uid: string,
  data: Omit<AssetLiabilityItem, 'id' | 'userUid'>
): Promise<AssetLiabilityItem> {
  try {
    const id = `al_${Math.random().toString(36).substring(2, 10)}`;
    const [created] = await db
      .insert(assetsLiabilities)
      .values({
        id,
        userUid: uid,
        name: data.name,
        kind: data.kind,
        category: data.category,
        value: data.value,
        asOfDate: data.asOfDate,
        notes: data.notes || null,
      })
      .returning();
    return created as AssetLiabilityItem;
  } catch (error) {
    console.error('createAssetLiability error:', error);
    throw new Error('Failed to create asset/liability', { cause: error });
  }
}

export async function updateAssetLiability(
  uid: string,
  id: string,
  data: Partial<AssetLiabilityItem>
): Promise<AssetLiabilityItem> {
  try {
    const [updated] = await db
      .update(assetsLiabilities)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.kind !== undefined && { kind: data.kind }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.asOfDate !== undefined && { asOfDate: data.asOfDate }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      })
      .where(and(eq(assetsLiabilities.id, id), eq(assetsLiabilities.userUid, uid)))
      .returning();
    return updated as AssetLiabilityItem;
  } catch (error) {
    console.error('updateAssetLiability error:', error);
    throw new Error('Failed to update asset/liability', { cause: error });
  }
}

export async function deleteAssetLiability(uid: string, id: string): Promise<void> {
  try {
    await db
      .delete(assetsLiabilities)
      .where(and(eq(assetsLiabilities.id, id), eq(assetsLiabilities.userUid, uid)));
  } catch (error) {
    console.error('deleteAssetLiability error:', error);
    throw new Error('Failed to delete asset/liability', { cause: error });
  }
}

// ---------------- NET WORTH SNAPSHOTS ----------------
export async function getNetWorthSnapshots(uid: string): Promise<NetWorthSnapshotItem[]> {
  try {
    const list = await db
      .select()
      .from(netWorthSnapshots)
      .where(eq(netWorthSnapshots.userUid, uid))
      .orderBy(netWorthSnapshots.month);
    return list as NetWorthSnapshotItem[];
  } catch (error) {
    console.error('getNetWorthSnapshots error:', error);
    throw new Error('Failed to fetch net worth snapshots', { cause: error });
  }
}

export async function saveNetWorthSnapshot(
  uid: string,
  month: string,
  assetsTotal: number,
  liabilitiesTotal: number
): Promise<NetWorthSnapshotItem> {
  try {
    const netWorth = assetsTotal - liabilitiesTotal;
    const existing = await db
      .select()
      .from(netWorthSnapshots)
      .where(and(eq(netWorthSnapshots.userUid, uid), eq(netWorthSnapshots.month, month)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(netWorthSnapshots)
        .set({
          assetsTotal: assetsTotal.toFixed(2),
          liabilitiesTotal: liabilitiesTotal.toFixed(2),
          netWorth: netWorth.toFixed(2),
        })
        .where(eq(netWorthSnapshots.id, existing[0].id))
        .returning();
      return updated as NetWorthSnapshotItem;
    }

    const id = `nws_${Math.random().toString(36).substring(2, 10)}`;
    const [inserted] = await db
      .insert(netWorthSnapshots)
      .values({
        id,
        userUid: uid,
        month,
        assetsTotal: assetsTotal.toFixed(2),
        liabilitiesTotal: liabilitiesTotal.toFixed(2),
        netWorth: netWorth.toFixed(2),
      })
      .returning();
    return inserted as NetWorthSnapshotItem;
  } catch (error) {
    console.error('saveNetWorthSnapshot error:', error);
    throw new Error('Failed to save net worth snapshot', { cause: error });
  }
}

// ---------------- INVESTMENTS ----------------
export async function getSecurities(uid: string): Promise<SecurityItem[]> {
  try {
    const list = await db
      .select()
      .from(securities)
      .where(eq(securities.userUid, uid))
      .orderBy(securities.symbol);
    return list as SecurityItem[];
  } catch (error) {
    console.error('getSecurities error:', error);
    throw new Error('Failed to fetch securities', { cause: error });
  }
}

export async function upsertSecurity(
  uid: string,
  data: Omit<SecurityItem, 'id' | 'userUid'>
): Promise<SecurityItem> {
  try {
    const sym = data.symbol.trim().toUpperCase();
    const existing = await db
      .select()
      .from(securities)
      .where(and(eq(securities.userUid, uid), eq(securities.symbol, sym)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(securities)
        .set({
          name: data.name || existing[0].name,
          assetType: data.assetType || existing[0].assetType,
          quantity: data.quantity ?? existing[0].quantity,
          averageCost: data.averageCost ?? existing[0].averageCost,
          currentPrice: data.currentPrice ?? existing[0].currentPrice,
          currency: data.currency || existing[0].currency,
          notes: data.notes !== undefined ? data.notes : existing[0].notes,
          accountId: data.accountId !== undefined ? data.accountId : existing[0].accountId,
          updatedAt: new Date(),
        })
        .where(eq(securities.id, existing[0].id))
        .returning();
      return updated as SecurityItem;
    }

    const id = `sec_${Math.random().toString(36).substring(2, 10)}`;
    const [inserted] = await db
      .insert(securities)
      .values({
        id,
        userUid: uid,
        accountId: data.accountId || null,
        symbol: sym,
        name: data.name,
        assetType: data.assetType,
        quantity: data.quantity || '0.0000',
        averageCost: data.averageCost || '0.00',
        currentPrice: data.currentPrice || '0.00',
        currency: data.currency || 'CAD',
        notes: data.notes || null,
      })
      .returning();
    return inserted as SecurityItem;
  } catch (error) {
    console.error('upsertSecurity error:', error);
    throw new Error('Failed to upsert security', { cause: error });
  }
}

export async function getInvestmentTransactions(uid: string): Promise<InvestmentTransactionItem[]> {
  try {
    const list = await db
      .select()
      .from(investmentTransactions)
      .where(eq(investmentTransactions.userUid, uid))
      .orderBy(desc(investmentTransactions.date), desc(investmentTransactions.createdAt));
    return list as InvestmentTransactionItem[];
  } catch (error) {
    console.error('getInvestmentTransactions error:', error);
    throw new Error('Failed to fetch investment transactions', { cause: error });
  }
}

export async function createInvestmentTransaction(
  uid: string,
  data: Omit<InvestmentTransactionItem, 'id' | 'userUid'>
): Promise<InvestmentTransactionItem> {
  try {
    const id = `itx_${Math.random().toString(36).substring(2, 10)}`;
    const sym = data.securitySymbol.trim().toUpperCase();

    const [created] = await db
      .insert(investmentTransactions)
      .values({
        id,
        userUid: uid,
        accountId: data.accountId || null,
        securitySymbol: sym,
        securityName: data.securityName || null,
        type: data.type,
        date: data.date,
        quantity: data.quantity || '0.0000',
        price: data.price || '0.00',
        fees: data.fees || '0.00',
        totalAmount: data.totalAmount,
        notes: data.notes || null,
      })
      .returning();

    // Auto update or create holding
    const existing = await db
      .select()
      .from(securities)
      .where(and(eq(securities.userUid, uid), eq(securities.symbol, sym)))
      .limit(1);

    const qty = parseFloat(data.quantity) || 0;
    const price = parseFloat(data.price) || 0;
    const fees = parseFloat(data.fees) || 0;

    if (existing.length > 0) {
      const curQty = parseFloat(existing[0].quantity) || 0;
      const curCost = (parseFloat(existing[0].averageCost) || 0) * curQty;

      let newQty = curQty;
      let newCost = curCost;

      if (data.type === 'buy') {
        newQty = curQty + qty;
        newCost = curCost + (qty * price + fees);
      } else if (data.type === 'sell') {
        const avg = curQty > 0 ? curCost / curQty : 0;
        newQty = Math.max(0, curQty - qty);
        newCost = Math.max(0, newQty * avg);
      }

      const newAvgCost = newQty > 0 ? (newCost / newQty).toFixed(2) : '0.00';

      await db
        .update(securities)
        .set({
          quantity: newQty.toFixed(4),
          averageCost: newAvgCost,
          currentPrice: price > 0 ? price.toFixed(2) : existing[0].currentPrice,
          updatedAt: new Date(),
        })
        .where(eq(securities.id, existing[0].id));
    } else {
      const initialCost = qty * price + fees;
      const initialAvg = qty > 0 ? (initialCost / qty).toFixed(2) : price.toFixed(2);
      await db.insert(securities).values({
        id: `sec_${Math.random().toString(36).substring(2, 10)}`,
        userUid: uid,
        accountId: data.accountId || null,
        symbol: sym,
        name: data.securityName || sym,
        assetType: 'stocks',
        quantity: qty.toFixed(4),
        averageCost: initialAvg,
        currentPrice: price.toFixed(2),
        currency: 'CAD',
      });
    }

    return created as InvestmentTransactionItem;
  } catch (error) {
    console.error('createInvestmentTransaction error:', error);
    throw new Error('Failed to create investment transaction', { cause: error });
  }
}

export async function deleteInvestmentTransaction(uid: string, id: string): Promise<void> {
  try {
    await db
      .delete(investmentTransactions)
      .where(and(eq(investmentTransactions.id, id), eq(investmentTransactions.userUid, uid)));
  } catch (error) {
    console.error('deleteInvestmentTransaction error:', error);
    throw new Error('Failed to delete investment transaction', { cause: error });
  }
}

export async function clearUserData(uid: string): Promise<void> {
  try {
    await db.delete(transactions).where(eq(transactions.userUid, uid));
    await db.delete(budgets).where(eq(budgets.userUid, uid));
    await db.delete(investmentTransactions).where(eq(investmentTransactions.userUid, uid));
    await db.delete(securities).where(eq(securities.userUid, uid));
    await db.delete(assetsLiabilities).where(eq(assetsLiabilities.userUid, uid));
    await db.delete(netWorthSnapshots).where(eq(netWorthSnapshots.userUid, uid));
    await db.delete(accounts).where(eq(accounts.userUid, uid));
  } catch (error) {
    console.error('clearUserData error:', error);
    throw new Error('Failed to clear user data', { cause: error });
  }
}

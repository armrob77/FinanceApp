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
import { db } from './index.ts';
import { eq } from 'drizzle-orm';

export async function seedDemoDataForUser(uid: string) {
  // Clean existing demo data for this user to allow clean reset
  await db.delete(transactions).where(eq(transactions.userUid, uid));
  await db.delete(budgets).where(eq(budgets.userUid, uid));
  await db.delete(investmentTransactions).where(eq(investmentTransactions.userUid, uid));
  await db.delete(securities).where(eq(securities.userUid, uid));
  await db.delete(assetsLiabilities).where(eq(assetsLiabilities.userUid, uid));
  await db.delete(netWorthSnapshots).where(eq(netWorthSnapshots.userUid, uid));
  await db.delete(accounts).where(eq(accounts.userUid, uid));

  // 1. Accounts
  const demoAccounts = [
    {
      id: `acc_chk_${uid.slice(0, 5)}`,
      userUid: uid,
      name: 'Primary Checking',
      type: 'checking',
      institution: 'TD Bank',
      initialBalance: '4850.00',
      currency: 'CAD',
      isArchived: false,
    },
    {
      id: `acc_sav_${uid.slice(0, 5)}`,
      userUid: uid,
      name: 'Emergency Savings (4.5%)',
      type: 'savings',
      institution: 'EQ Bank',
      initialBalance: '22500.00',
      currency: 'CAD',
      isArchived: false,
    },
    {
      id: `acc_cc_${uid.slice(0, 5)}`,
      userUid: uid,
      name: 'Cash Back Visa',
      type: 'credit_card',
      institution: 'Scotiabank',
      initialBalance: '1240.50',
      currency: 'CAD',
      isArchived: false,
    },
    {
      id: `acc_inv_${uid.slice(0, 5)}`,
      userUid: uid,
      name: 'Self-Directed TFSA',
      type: 'brokerage',
      institution: 'Questrade',
      initialBalance: '1500.00',
      currency: 'CAD',
      isArchived: false,
    },
    {
      id: `acc_rrsp_${uid.slice(0, 5)}`,
      userUid: uid,
      name: 'Group RRSP',
      type: 'retirement',
      institution: 'Sun Life',
      initialBalance: '35000.00',
      currency: 'CAD',
      isArchived: false,
    },
  ];
  await db.insert(accounts).values(demoAccounts);

  const chkId = demoAccounts[0].id;
  const ccId = demoAccounts[2].id;
  const invId = demoAccounts[3].id;

  // 2. Transactions across last 3 months (e.g. 2026-06, 2026-07, 2026-08, 2026-09)
  const txList = [
    // June 2026
    { id: `tx_j1_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Salary', date: '2026-06-01', description: 'Tech Corp Biweekly Pay', amount: '4250.00', type: 'income', isRecurring: true },
    { id: `tx_j2_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Salary', date: '2026-06-15', description: 'Tech Corp Biweekly Pay', amount: '4250.00', type: 'income', isRecurring: true },
    { id: `tx_j3_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Housing', date: '2026-06-01', description: 'Apartment Rent', amount: '2100.00', type: 'expense', isRecurring: true },
    { id: `tx_j4_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Groceries', date: '2026-06-04', description: 'Whole Foods Market', amount: '185.40', type: 'expense', isRecurring: false },
    { id: `tx_j5_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Restaurants', date: '2026-06-08', description: 'Dinner with friends', amount: '112.50', type: 'expense', isRecurring: false },
    { id: `tx_j6_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Utilities', date: '2026-06-10', description: 'Hydro & Internet', amount: '145.00', type: 'expense', isRecurring: true },
    { id: `tx_j7_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Transportation', date: '2026-06-12', description: 'Gasoline & Transit pass', amount: '165.00', type: 'expense', isRecurring: false },
    { id: `tx_j8_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Subscriptions', date: '2026-06-15', description: 'Spotify & Netflix', amount: '34.99', type: 'expense', isRecurring: true },

    // July 2026
    { id: `tx_jl1_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Salary', date: '2026-07-01', description: 'Tech Corp Biweekly Pay', amount: '4250.00', type: 'income', isRecurring: true },
    { id: `tx_jl2_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Salary', date: '2026-07-15', description: 'Tech Corp Biweekly Pay', amount: '4250.00', type: 'income', isRecurring: true },
    { id: `tx_jl3_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Freelance', date: '2026-07-20', description: 'Web consulting gig', amount: '1200.00', type: 'income', isRecurring: false },
    { id: `tx_jl4_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Housing', date: '2026-07-01', description: 'Apartment Rent', amount: '2100.00', type: 'expense', isRecurring: true },
    { id: `tx_jl5_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Groceries', date: '2026-07-06', description: 'Costco Wholesale', amount: '340.25', type: 'expense', isRecurring: false },
    { id: `tx_jl6_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Entertainment', date: '2026-07-11', description: 'Summer concert tickets', amount: '190.00', type: 'expense', isRecurring: false },
    { id: `tx_jl7_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Travel', date: '2026-07-18', description: 'Weekend cabin rental', amount: '480.00', type: 'expense', isRecurring: false },

    // August 2026
    { id: `tx_a1_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Salary', date: '2026-08-01', description: 'Tech Corp Biweekly Pay', amount: '4250.00', type: 'income', isRecurring: true },
    { id: `tx_a2_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Salary', date: '2026-08-15', description: 'Tech Corp Biweekly Pay', amount: '4250.00', type: 'income', isRecurring: true },
    { id: `tx_a3_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Dividends', date: '2026-08-25', description: 'Vanguard Index ETF Div', amount: '320.00', type: 'income', isRecurring: false },
    { id: `tx_a4_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Housing', date: '2026-08-01', description: 'Apartment Rent', amount: '2100.00', type: 'expense', isRecurring: true },
    { id: `tx_a5_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Groceries', date: '2026-08-05', description: 'Loblaws Supermarket', amount: '265.80', type: 'expense', isRecurring: false },
    { id: `tx_a6_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Restaurants', date: '2026-08-12', description: 'Bistro dinner', amount: '145.20', type: 'expense', isRecurring: false },
    { id: `tx_a7_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Utilities', date: '2026-08-14', description: 'Electricity & Gas', amount: '155.00', type: 'expense', isRecurring: true },
    { id: `tx_a8_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Shopping', date: '2026-08-19', description: 'Clothing & Books', amount: '210.00', type: 'expense', isRecurring: false },

    // September 2026 (Current month)
    { id: `tx_s1_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Salary', date: '2026-09-01', description: 'Tech Corp Biweekly Pay', amount: '4250.00', type: 'income', isRecurring: true },
    { id: `tx_s2_${uid.slice(0, 4)}`, userUid: uid, accountId: chkId, categoryName: 'Housing', date: '2026-09-01', description: 'Apartment Rent', amount: '2100.00', type: 'expense', isRecurring: true },
    { id: `tx_s3_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Groceries', date: '2026-09-03', description: 'Metro Grocery Store', amount: '192.40', type: 'expense', isRecurring: false },
    { id: `tx_s4_${uid.slice(0, 4)}`, userUid: uid, accountId: ccId, categoryName: 'Restaurants', date: '2026-09-04', description: 'Sushi dinner', amount: '84.50', type: 'expense', isRecurring: false },
  ];
  await db.insert(transactions).values(txList);

  // 3. Monthly Budgets for August & September 2026
  const budgetList = [
    { id: `b_h_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', categoryName: 'Housing', amount: '2100.00', rollover: false },
    { id: `b_g_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', categoryName: 'Groceries', amount: '650.00', rollover: false },
    { id: `b_r_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', categoryName: 'Restaurants', amount: '350.00', rollover: false },
    { id: `b_t_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', categoryName: 'Transportation', amount: '300.00', rollover: false },
    { id: `b_u_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', categoryName: 'Utilities', amount: '180.00', rollover: false },
    { id: `b_e_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', categoryName: 'Entertainment', amount: '250.00', rollover: false },
    { id: `b_s_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', categoryName: 'Shopping', amount: '300.00', rollover: false },
  ];
  await db.insert(budgets).values(budgetList);

  // 4. Assets & Liabilities
  const alList = [
    // Assets
    { id: `al_1_${uid.slice(0, 4)}`, userUid: uid, name: 'Downtown Condo (Market Value)', kind: 'asset', category: 'real_estate', value: '540000.00', asOfDate: '2026-09-01', notes: 'Appraisal based on building comps' },
    { id: `al_2_${uid.slice(0, 4)}`, userUid: uid, name: '2022 Honda Civic Touring', kind: 'asset', category: 'vehicles', value: '24500.00', asOfDate: '2026-09-01', notes: 'Clean condition, 45k km' },
    { id: `al_3_${uid.slice(0, 4)}`, userUid: uid, name: 'Jewelry & Antiques Collection', kind: 'asset', category: 'other_asset', value: '6500.00', asOfDate: '2026-09-01', notes: 'Insured' },

    // Liabilities
    { id: `al_4_${uid.slice(0, 4)}`, userUid: uid, name: 'Condo Mortgage (5-Yr Fixed 4.69%)', kind: 'liability', category: 'mortgage', value: '385000.00', asOfDate: '2026-09-01', notes: 'Maturity 2029' },
    { id: `al_5_${uid.slice(0, 4)}`, userUid: uid, name: 'Canada Student Loan (Interest-free)', kind: 'liability', category: 'student_loan', value: '14200.00', asOfDate: '2026-09-01', notes: 'Monthly payment $210' },
    { id: `al_6_${uid.slice(0, 4)}`, userUid: uid, name: 'Auto Loan', kind: 'liability', category: 'auto_loan', value: '8500.00', asOfDate: '2026-09-01', notes: 'Financed at 3.99%' },
  ];
  await db.insert(assetsLiabilities).values(alList);

  // 5. Net Worth Snapshots (historical trend)
  const nwSnapshots = [
    { id: `nws_1_${uid.slice(0, 4)}`, userUid: uid, month: '2026-04', assetsTotal: '610000.00', liabilitiesTotal: '425000.00', netWorth: '185000.00' },
    { id: `nws_2_${uid.slice(0, 4)}`, userUid: uid, month: '2026-05', assetsTotal: '615000.00', liabilitiesTotal: '422000.00', netWorth: '193000.00' },
    { id: `nws_3_${uid.slice(0, 4)}`, userUid: uid, month: '2026-06', assetsTotal: '622000.00', liabilitiesTotal: '418000.00', netWorth: '204000.00' },
    { id: `nws_4_${uid.slice(0, 4)}`, userUid: uid, month: '2026-07', assetsTotal: '631000.00', liabilitiesTotal: '414000.00', netWorth: '217000.00' },
    { id: `nws_5_${uid.slice(0, 4)}`, userUid: uid, month: '2026-08', assetsTotal: '640000.00', liabilitiesTotal: '410000.00', netWorth: '230000.00' },
    { id: `nws_6_${uid.slice(0, 4)}`, userUid: uid, month: '2026-09', assetsTotal: '649000.00', liabilitiesTotal: '407700.00', netWorth: '241300.00' },
  ];
  await db.insert(netWorthSnapshots).values(nwSnapshots);

  // 6. Securities & Investment Transactions
  const demoSecurities = [
    {
      id: `sec_1_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      symbol: 'VFV',
      name: 'Vanguard S&P 500 Index ETF',
      assetType: 'etfs',
      quantity: '180.0000',
      averageCost: '115.40',
      currentPrice: '142.20',
      currency: 'CAD',
      notes: 'Core US equity exposure',
    },
    {
      id: `sec_2_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      symbol: 'XEQT',
      name: 'iShares All-Equity ETF Portfolio',
      assetType: 'etfs',
      quantity: '450.0000',
      averageCost: '27.80',
      currentPrice: '32.60',
      currency: 'CAD',
      notes: 'Globally diversified all-equity ETF',
    },
    {
      id: `sec_3_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'stocks',
      quantity: '40.0000',
      averageCost: '175.00',
      currentPrice: '228.50',
      currency: 'CAD',
      notes: 'Long term tech holding',
    },
    {
      id: `sec_4_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      symbol: 'ETH',
      name: 'Ethereum',
      assetType: 'crypto',
      quantity: '2.5000',
      averageCost: '2800.00',
      currentPrice: '3450.00',
      currency: 'CAD',
      notes: 'Cold storage stake',
    },
  ];
  await db.insert(securities).values(demoSecurities);

  const demoInvTxs = [
    {
      id: `itx_1_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      securitySymbol: 'VFV',
      securityName: 'Vanguard S&P 500 Index ETF',
      type: 'buy',
      date: '2026-03-15',
      quantity: '80.0000',
      price: '112.00',
      fees: '4.95',
      totalAmount: '8964.95',
      notes: 'Monthly DCA',
    },
    {
      id: `itx_2_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      securitySymbol: 'VFV',
      securityName: 'Vanguard S&P 500 Index ETF',
      type: 'buy',
      date: '2026-06-15',
      quantity: '100.0000',
      price: '118.00',
      fees: '4.95',
      totalAmount: '11804.95',
      notes: 'Reinvestment',
    },
    {
      id: `itx_3_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      securitySymbol: 'AAPL',
      securityName: 'Apple Inc.',
      type: 'buy',
      date: '2026-04-10',
      quantity: '40.0000',
      price: '175.00',
      fees: '4.95',
      totalAmount: '7004.95',
      notes: 'Post-earnings purchase',
    },
    {
      id: `itx_4_${uid.slice(0, 4)}`,
      userUid: uid,
      accountId: invId,
      securitySymbol: 'VFV',
      securityName: 'Vanguard S&P 500 Index ETF',
      type: 'dividend',
      date: '2026-06-30',
      quantity: '0.0000',
      price: '0.00',
      fees: '0.00',
      totalAmount: '142.50',
      notes: 'Q2 Dividend Payout',
    },
  ];
  await db.insert(investmentTransactions).values(demoInvTxs);
}

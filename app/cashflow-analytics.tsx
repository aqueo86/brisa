'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  Building2,
  Smartphone,
  CreditCard,
  Banknote,
  Repeat
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { money, today, type Movement } from '@/lib/finance';
import { budgetCategory } from '@/lib/categories';

interface CashflowAnalyticsProps {
  rows: Movement[];
  month: string;
  demo: boolean;
  onNavigate?: (view: string) => void;
  onOpenMovement?: (movement?: Movement) => void;
}

// Visual palette tailored for "Salvia Mate & Lino Cálido" (Zen, sober, elegant)
const PALETTE = {
  sageIncome: '#2a6955',        // Calming eucalyptus sage
  sageIncomeLight: '#3d8670',
  slateExpense: '#63756c',      // Muted slate taupe
  slateExpenseLight: '#8a9b92',
  taupeSaving: '#8e7a68',       // Warm terracotta / muted bronze
  taupeSavingLight: '#ab9582',
  linenBg: '#f7f8f6',
  cardBg: '#ffffff',
  border: '#e3eae5',
  textMain: '#1e2d27',
  textMuted: '#64766d',
  accentNequi: '#7c3f68',       // Sober plum/wine for Nequi
  accentDaviplata: '#9e433b',   // Sober brick red for Daviplata
  accentNu: '#5b4a7d',          // Sober lavender for Nu
  accentBancolombia: '#917937', // Sober warm gold for Bancolombia
  accentDefault: '#3c695b'
};

function getAccountBadge(accountName: string) {
  const norm = accountName.toLowerCase();
  if (norm.includes('nequi')) return { label: 'Nequi', icon: Smartphone, color: PALETTE.accentNequi, bg: '#fbf2f7' };
  if (norm.includes('daviplata')) return { label: 'Daviplata', icon: Smartphone, color: PALETTE.accentDaviplata, bg: '#fcf3f2' };
  if (norm.includes('nu')) return { label: 'Nu Colombia', icon: CreditCard, color: PALETTE.accentNu, bg: '#f5f3fa' };
  if (norm.includes('bancolombia')) return { label: 'Bancolombia', icon: Building2, color: PALETTE.accentBancolombia, bg: '#fcf8ec' };
  if (norm.includes('efectivo') || norm.includes('cash')) return { label: 'Efectivo', icon: Banknote, color: '#4a6755', bg: '#f2f7f4' };
  return { label: accountName, icon: Wallet, color: PALETTE.accentDefault, bg: '#f3f6f4' };
}

export default function CashflowAnalytics({ rows, month, demo, onNavigate }: CashflowAnalyticsProps) {
  const [periodType, setPeriodType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(() => month.slice(0, 4) || '2026');
  const [selectedMonth, setSelectedMonth] = useState(() => month || '2026-11');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [activeAccountCard, setActiveAccountCard] = useState<string | null>(null);

  // Available years from rows
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(month.slice(0, 4));
    years.add('2026');
    rows.forEach(r => {
      if (r.date && r.date.length >= 4) years.add(r.date.slice(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [rows, month]);

  // Filter rows by period (Monthly vs Yearly)
  const scopedRows = useMemo(() => {
    return rows.filter(r => {
      if (periodType === 'monthly') {
        return r.date.startsWith(selectedMonth);
      } else {
        return r.date.startsWith(selectedYear);
      }
    });
  }, [rows, periodType, selectedMonth, selectedYear]);

  // Account filter
  const filteredRows = useMemo(() => {
    if (selectedAccountFilter === 'all') return scopedRows;
    return scopedRows.filter(r => r.account === selectedAccountFilter);
  }, [scopedRows, selectedAccountFilter]);

  // Helper to distinguish transfers between own accounts
  const isTransfer = (r: Movement) => {
    return (
      r.category === 'Traslado entre cuentas' ||
      r.category === 'Traslado propio' ||
      /traslado|transferencia entre cuentas|pasar a mi|de nequi a/i.test(r.description)
    );
  };

  // High-level totals
  const metrics = useMemo(() => {
    let rawIncome = 0;
    let rawExpense = 0;
    let savings = 0;
    let internalTransfers = 0;

    filteredRows.forEach(r => {
      if (isTransfer(r)) {
        internalTransfers += r.amount;
      } else if (r.kind === 'income') {
        rawIncome += r.amount;
      } else if (r.kind === 'saving') {
        savings += r.amount;
      } else {
        rawExpense += r.amount;
      }
    });

    const netAvailable = rawIncome - rawExpense - savings;
    const savingsRate = rawIncome > 0 ? Math.round((savings / rawIncome) * 100) : 0;
    const expenseRate = rawIncome > 0 ? Math.round((rawExpense / rawIncome) * 100) : 0;

    return {
      rawIncome,
      rawExpense,
      savings,
      internalTransfers,
      netAvailable,
      savingsRate,
      expenseRate
    };
  }, [filteredRows]);

  // Breakdown by accounts (specifically for Nequi, Daviplata, Bancolombia, etc.)
  const accountBreakdown = useMemo(() => {
    const map = new Map<string, {
      account: string;
      income: number;
      expense: number;
      savings: number;
      transfersIn: number;
      transfersOut: number;
      count: number;
      movements: Movement[];
    }>();

    scopedRows.forEach(r => {
      const acc = r.account.trim() || 'Sin asignar';
      if (!map.has(acc)) {
        map.set(acc, {
          account: acc,
          income: 0,
          expense: 0,
          savings: 0,
          transfersIn: 0,
          transfersOut: 0,
          count: 0,
          movements: []
        });
      }
      const entry = map.get(acc)!;
      entry.count += 1;
      entry.movements.push(r);

      if (isTransfer(r)) {
        if (r.kind === 'income') entry.transfersIn += r.amount;
        else entry.transfersOut += r.amount;
      } else if (r.kind === 'income') {
        entry.income += r.amount;
      } else if (r.kind === 'saving') {
        entry.savings += r.amount;
      } else {
        entry.expense += r.amount;
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [scopedRows]);

  // Chart data: Monthly timeline (weeks/days) or Yearly timeline (12 months)
  const chartTimeline = useMemo(() => {
    if (periodType === 'yearly') {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return months.map((name, i) => {
        const mKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
        const monthMovements = filteredRows.filter(r => r.date.startsWith(mKey));
        let inc = 0;
        let exp = 0;
        let sav = 0;
        monthMovements.forEach(r => {
          if (!isTransfer(r)) {
            if (r.kind === 'income') inc += r.amount;
            else if (r.kind === 'saving') sav += r.amount;
            else exp += r.amount;
          }
        });
        return {
          period: name,
          Ingresos: inc,
          Gastos: exp,
          Ahorro: sav,
          Disponible: inc - exp - sav
        };
      });
    } else {
      // Monthly view: Group into 4 periods / weeks or cumulative daily
      const daysInMonth = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).getDate();
      const points = [
        { label: 'Día 1-7', start: 1, end: 7 },
        { label: 'Día 8-14', start: 8, end: 14 },
        { label: 'Día 15-21', start: 15, end: 21 },
        { label: `Día 22-${daysInMonth}`, start: 22, end: daysInMonth }
      ];

      return points.map(p => {
        let inc = 0;
        let exp = 0;
        let sav = 0;
        filteredRows.forEach(r => {
          if (!isTransfer(r)) {
            const day = Number(r.date.slice(8, 10));
            if (day >= p.start && day <= p.end) {
              if (r.kind === 'income') inc += r.amount;
              else if (r.kind === 'saving') sav += r.amount;
              else exp += r.amount;
            }
          }
        });
        return {
          period: p.label,
          Ingresos: inc,
          Gastos: exp,
          Ahorro: sav,
          Disponible: inc - exp - sav
        };
      });
    }
  }, [periodType, selectedYear, selectedMonth, filteredRows]);

  // Breakdown of top categories of expenses in the period
  const categorySpending = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.filter(r => r.kind === 'expense' && !isTransfer(r)).forEach(r => {
      const cat = budgetCategory(r.category);
      map.set(cat, (map.get(cat) || 0) + r.amount);
    });
    return Array.from(map.entries())
      .map(([name, total]) => ({
        name,
        total,
        percentage: metrics.rawExpense > 0 ? Math.round((total / metrics.rawExpense) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRows, metrics.rawExpense]);

  // Concrete textual narrative generation (what the user explicitly requested)
  const concreteNarrative = useMemo(() => {
    const periodLabel = periodType === 'yearly'
      ? `el año ${selectedYear}`
      : new Date(`${selectedMonth}-02T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    if (metrics.rawIncome === 0 && metrics.rawExpense === 0) {
      return `No se registran movimientos para ${periodLabel}. En cuanto anotes tus cobros o gastos, verás aquí el desglose detallado.`;
    }

    const topCategory = categorySpending[0];
    const secondCategory = categorySpending[1];

    let story = `Durante ${periodLabel}, registraste ingresos totales por ${money(metrics.rawIncome)}. `;

    if (metrics.rawExpense > 0) {
      story += `De esos ingresos, destinaste el ${metrics.expenseRate}% (${money(metrics.rawExpense)}) a cubrir tus gastos. `;
      if (topCategory) {
        story += `Tu mayor concentración de gasto estuvo en ${topCategory.name} con ${money(topCategory.total)} (${topCategory.percentage}% del gasto total)`;
        if (secondCategory && secondCategory.percentage > 10) {
          story += `, seguido de ${secondCategory.name} con ${money(secondCategory.total)} (${secondCategory.percentage}%)`;
        }
        story += `. `;
      }
    } else {
      story += `No registraste gastos de consumo en este período. `;
    }

    if (metrics.savings > 0) {
      story += `Separaste ${money(metrics.savings)} (${metrics.savingsRate}% de tus ingresos) para fortalecer tus metas de ahorro y tranquilidad. `;
    }

    if (metrics.netAvailable > 0) {
      story += `El balance final es favorable: te queda un remanente disponible de ${money(metrics.netAvailable)} (${Math.round((metrics.netAvailable / (metrics.rawIncome || 1)) * 100)}% de tus ingresos retenidos).`;
    } else if (metrics.netAvailable === 0) {
      story += `Tus ingresos cubrieron con precisión la totalidad de los gastos y metas del período.`;
    } else {
      story += `Los egresos superaron los ingresos registrados en ${money(Math.abs(metrics.netAvailable))}. Si utilizaste ahorros previos o crédito, revisa si tienes ingresos adicionales pendientes por registrar.`;
    }

    if (metrics.internalTransfers > 0) {
      story += ` Se identificaron además ${money(metrics.internalTransfers)} en traslados entre tus propias cuentas, los cuales se aíslan automáticamente para no distorsionar tu ingreso real.`;
    }

    return story;
  }, [periodType, selectedYear, selectedMonth, metrics, categorySpending]);

  // Export report to CSV
  function exportAccountReport() {
    const headers = ['Cuenta / Billetera', 'Ingresos Recibidos', 'Gastos Realizados', 'Aportes Ahorro', 'Traslados Entrantes', 'Traslados Salientes', 'Balance Neto'];
    const rowsCSV = accountBreakdown.map(a => [
      `"${a.account}"`,
      a.income,
      a.expense,
      a.savings,
      a.transfersIn,
      a.transfersOut,
      (a.income + a.transfersIn) - (a.expense + a.savings + a.transfersOut)
    ]);
    const content = [headers.join(','), ...rowsCSV.map(r => r.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Brisa-Informe-Cuentas-${periodType === 'yearly' ? selectedYear : selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cashflow-analytics-space">
      {/* Top Controls Bar */}
      <div className="analytics-header-card">
        <div className="analytics-header-left">
          <div className="analytics-pill">
            <TrendingUp size={14} />
            <span>ANÁLISIS FINANCIERO Y CUENTAS</span>
          </div>
          <h2>Balance y Flujo de Fondos</h2>
          <p className="analytics-subtitle">
            Observa con calma y orden cómo entra tu dinero, en qué se transforma y el rendimiento de cada cuenta o billetera.
          </p>
        </div>

        <div className="analytics-controls-toolbar">
          {/* Period Mode Toggle */}
          <div className="analytics-segmented-toggle" role="group" aria-label="Tipo de período">
            <button
              type="button"
              className={periodType === 'monthly' ? 'active' : ''}
              onClick={() => setPeriodType('monthly')}
            >
              <Calendar size={14} />
              <span>Mensual</span>
            </button>
            <button
              type="button"
              className={periodType === 'yearly' ? 'active' : ''}
              onClick={() => setPeriodType('yearly')}
            >
              <Layers size={14} />
              <span>Anual</span>
            </button>
          </div>

          {/* Month or Year Selector */}
          {periodType === 'monthly' ? (
            <div className="analytics-date-picker">
              <input
                type="month"
                value={selectedMonth}
                onChange={e => e.target.value && setSelectedMonth(e.target.value)}
                aria-label="Seleccionar mes de análisis"
              />
            </div>
          ) : (
            <div className="analytics-date-picker">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                aria-label="Seleccionar año de análisis"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>Año {yr}</option>
                ))}
              </select>
            </div>
          )}

          {/* Account Filter Dropdown */}
          <div className="analytics-account-filter">
            <Filter size={14} className="filter-icon" />
            <select
              value={selectedAccountFilter}
              onChange={e => setSelectedAccountFilter(e.target.value)}
              aria-label="Filtrar por cuenta bancaria o billetera"
            >
              <option value="all">Todas las cuentas</option>
              {accountBreakdown.map(acc => (
                <option key={acc.account} value={acc.account}>
                  {acc.account}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="analytics-export-btn"
            onClick={exportAccountReport}
            title="Exportar informe a formato CSV"
          >
            <Download size={14} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Main KPI Row: Calm, Elegant, Sober styling */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card income-kpi">
          <div className="kpi-top">
            <span className="kpi-icon-wrap income-icon">
              <ArrowDownLeft size={17} />
            </span>
            <span className="kpi-tag">Entradas reales</span>
          </div>
          <span className="kpi-label">Ingresos del período</span>
          <strong className="kpi-amount">{money(metrics.rawIncome)}</strong>
          <span className="kpi-foot">
            {metrics.internalTransfers > 0
              ? `+ ${money(metrics.internalTransfers)} en traslados propios`
              : 'Cobros, salario y transferencias recibidas'}
          </span>
        </div>

        <div className="analytics-kpi-card expense-kpi">
          <div className="kpi-top">
            <span className="kpi-icon-wrap expense-icon">
              <ArrowUpRight size={17} />
            </span>
            <span className="kpi-tag">{metrics.expenseRate}% del ingreso</span>
          </div>
          <span className="kpi-label">Gastos realizados</span>
          <strong className="kpi-amount">{money(metrics.rawExpense)}</strong>
          <span className="kpi-foot">Pagos y salidas de dinero</span>
        </div>

        <div className="analytics-kpi-card saving-kpi">
          <div className="kpi-top">
            <span className="kpi-icon-wrap saving-icon">
              <Sparkles size={17} />
            </span>
            <span className="kpi-tag">{metrics.savingsRate}% del ingreso</span>
          </div>
          <span className="kpi-label">Aporte a metas y ahorro</span>
          <strong className="kpi-amount">{money(metrics.savings)}</strong>
          <span className="kpi-foot">Separado para tu tranquilidad</span>
        </div>

        <div className={`analytics-kpi-card balance-kpi ${metrics.netAvailable >= 0 ? 'positive' : 'negative'}`}>
          <div className="kpi-top">
            <span className="kpi-icon-wrap balance-icon">
              <Wallet size={17} />
            </span>
            <span className="kpi-tag">{metrics.netAvailable >= 0 ? 'Superávit' : 'Déficit'}</span>
          </div>
          <span className="kpi-label">Remanente disponible</span>
          <strong className="kpi-amount">{money(metrics.netAvailable)}</strong>
          <span className="kpi-foot">
            {metrics.netAvailable >= 0
              ? 'Margen a favor que conservas'
              : 'Egresos superan los ingresos anotados'}
          </span>
        </div>
      </div>

      {/* Concrete Narrative Banner (The clear textual explanation requested by the user) */}
      <section className="analytics-narrative-card">
        <div className="narrative-badge">
          <Sparkles size={16} />
          <span>DESCRIPCIÓN CONCRETA Y NARRATIVA</span>
        </div>
        <h3>Resumen de tus movimientos</h3>
        <p className="narrative-body">{concreteNarrative}</p>

        {/* Visual Allocation Bar (How income was distributed) */}
        {metrics.rawIncome > 0 && (
          <div className="income-allocation-container">
            <div className="allocation-bar-label">
              <span>Asignación de cada peso ingresado:</span>
              <span className="allocation-legend-row">
                <span className="legend-dot dot-expense" /> Gastos ({metrics.expenseRate}%)
                <span className="legend-dot dot-saving" /> Ahorro ({metrics.savingsRate}%)
                <span className="legend-dot dot-available" /> Disponible ({Math.max(0, 100 - metrics.expenseRate - metrics.savingsRate)}%)
              </span>
            </div>
            <div className="income-allocation-bar">
              <div
                className="alloc-segment alloc-expense"
                style={{ width: `${Math.min(100, metrics.expenseRate)}%` }}
                title={`Gastos: ${money(metrics.rawExpense)} (${metrics.expenseRate}%)`}
              />
              <div
                className="alloc-segment alloc-saving"
                style={{ width: `${Math.min(100 - Math.min(100, metrics.expenseRate), metrics.savingsRate)}%` }}
                title={`Ahorro: ${money(metrics.savings)} (${metrics.savingsRate}%)`}
              />
              <div
                className="alloc-segment alloc-available"
                style={{
                  width: `${Math.max(0, 100 - Math.min(100, metrics.expenseRate) - metrics.savingsRate)}%`
                }}
                title={`Disponible: ${money(Math.max(0, metrics.netAvailable))}`}
              />
            </div>
          </div>
        )}
      </section>

      {/* Main Two-Column Analytics Layout */}
      <div className="analytics-main-grid">
        {/* Left Column: Visual Chart (Income vs Expense) */}
        <section className="analytics-card chart-section">
          <div className="analytics-card-header">
            <div>
              <h3>Evolución de Ingresos y Gastos</h3>
              <p className="section-sub">
                {periodType === 'yearly'
                  ? `Comparativa mes a mes a lo largo del año ${selectedYear}`
                  : `Comportamiento acumulado por etapas del mes`}
              </p>
            </div>
            <div className="chart-legend-clean">
              <span>
                <i style={{ background: PALETTE.sageIncome }} /> Ingresos
              </span>
              <span>
                <i style={{ background: PALETTE.slateExpense }} /> Gastos
              </span>
              <span>
                <i style={{ background: PALETTE.taupeSaving }} /> Ahorro
              </span>
            </div>
          </div>

          <div className="analytics-chart-canvas">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={chartTimeline} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2ee" />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: '#e3eae5' }}
                  tick={{ fill: '#73847c', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#73847c', fontSize: 12 }}
                  tickFormatter={v => (v >= 1e6 ? `${v / 1e6}M` : v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip
                  formatter={(val: any) => money(Number(val))}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    border: '1px solid #e3eae5',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    fontSize: 13
                  }}
                />
                <Bar dataKey="Ingresos" fill={PALETTE.sageIncome} radius={[4, 4, 0, 0]} maxBarSize={38} />
                <Bar dataKey="Gastos" fill={PALETTE.slateExpense} radius={[4, 4, 0, 0]} maxBarSize={38} />
                <Bar dataKey="Ahorro" fill={PALETTE.taupeSaving} radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Spending Categories List */}
          <div className="category-ranking-subpanel">
            <span className="subpanel-title">Distribución por principales rubros:</span>
            <div className="ranking-chips-row">
              {categorySpending.slice(0, 5).map(cat => (
                <div key={cat.name} className="ranking-chip">
                  <span className="chip-name">{cat.name}</span>
                  <span className="chip-amount">{money(cat.total)}</span>
                  <span className="chip-pct">{cat.percentage}%</span>
                </div>
              ))}
              {categorySpending.length === 0 && (
                <span className="no-data-muted">Sin gastos registrados en el período</span>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Special Report for Nequi, Daviplata, Bancolombia, etc. */}
        <section className="analytics-card accounts-section">
          <div className="analytics-card-header">
            <div>
              <div className="sub-tag-inline">
                <Smartphone size={13} />
                <span>NEQUI, DAVIPLATA Y BANCOS</span>
              </div>
              <h3>Informe por Cuenta y Billetera</h3>
              <p className="section-sub">
                Relación clara de entradas y pagos por cada canal donde recibes dinero
              </p>
            </div>
          </div>

          <div className="account-cards-flow">
            {accountBreakdown.map(acc => {
              const badge = getAccountBadge(acc.account);
              const IconComp = badge.icon;
              const netFlow = (acc.income + acc.transfersIn) - (acc.expense + acc.savings + acc.transfersOut);
              const isSelected = activeAccountCard === acc.account;

              return (
                <div
                  key={acc.account}
                  className={`account-flow-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setActiveAccountCard(isSelected ? null : acc.account)}
                >
                  <div className="account-card-top">
                    <div className="account-identity">
                      <span className="account-avatar" style={{ backgroundColor: badge.bg, color: badge.color }}>
                        <IconComp size={16} />
                      </span>
                      <div>
                        <strong>{acc.account}</strong>
                        <small>{acc.count} transacciones</small>
                      </div>
                    </div>
                    <div className={`account-net-tag ${netFlow >= 0 ? 'pos' : 'neg'}`}>
                      <span>Balance neto:</span>
                      <strong>{netFlow >= 0 ? '+' : ''}{money(netFlow)}</strong>
                    </div>
                  </div>

                  <div className="account-in-out-grid">
                    <div className="in-out-col in-col">
                      <span className="io-label">
                        <ArrowDownLeft size={13} /> Entradas recibidas
                      </span>
                      <strong className="io-value">{money(acc.income)}</strong>
                      {acc.transfersIn > 0 && (
                        <small className="io-sub">+{money(acc.transfersIn)} traslados</small>
                      )}
                    </div>
                    <div className="in-out-col out-col">
                      <span className="io-label">
                        <ArrowUpRight size={13} /> Pagos y gastos
                      </span>
                      <strong className="io-value">{money(acc.expense + acc.savings)}</strong>
                      {acc.transfersOut > 0 && (
                        <small className="io-sub">+{money(acc.transfersOut)} traslados</small>
                      )}
                    </div>
                  </div>

                  {/* Concrete descriptive sentence per account */}
                  <div className="account-sentence">
                    {acc.income > 0 && acc.expense > 0 ? (
                      <span>
                        En <b>{acc.account}</b> recibiste {money(acc.income)} y pagaste {money(acc.expense)}, dejando un flujo neto de {money(netFlow)}.
                      </span>
                    ) : acc.income > 0 ? (
                      <span>
                        Canal principal de cobro: recibiste {money(acc.income)} sin gastos directos debitados.
                      </span>
                    ) : acc.expense > 0 ? (
                      <span>
                        Medio de pago: se realizaron {money(acc.expense)} en consumos desde esta cuenta.
                      </span>
                    ) : (
                      <span>Cuenta utilizada principalmente para traslados y movimientos internos.</span>
                    )}
                  </div>

                  {isSelected && (
                    <div className="account-expanded-details">
                      <div className="expanded-title">Últimos movimientos en {acc.account}:</div>
                      <div className="mini-ledger">
                        {acc.movements.slice(0, 4).map(m => (
                          <div key={m.id} className="mini-ledger-row">
                            <span className="ml-desc">{m.description}</span>
                            <span className="ml-date">{m.date.slice(5)}</span>
                            <span className={`ml-amount ${m.kind === 'income' ? 'pos' : ''}`}>
                              {m.kind === 'income' ? '+' : '-'}{money(m.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {accountBreakdown.length === 0 && (
              <div className="empty-account-state">
                <Smartphone size={32} />
                <h4>Sin cuentas con movimientos</h4>
                <p>Al registrar ingresos en Nequi, Daviplata o bancos, aparecerán aquí automáticamente.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

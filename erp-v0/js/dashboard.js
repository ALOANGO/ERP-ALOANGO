/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - DASHBOARD MODULE (dashboard.js)
 * KPI calculations, comparison metrics & 4 Chart.js visualizations
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Wait until domain services are available
  if (typeof DashboardService === 'undefined') return;

  renderDashboardKPIs();
  renderDashboardCharts();
  renderRecentActivity();
});

/**
 * Render Executive KPI Cards (Requirement 5)
 */
function renderDashboardKPIs() {
  const kpis = DashboardService.getKPIs();

  // 1. Ventas de hoy
  const todayValEl = document.getElementById('kpi-today-sales-val');
  const todayCountEl = document.getElementById('kpi-today-sales-count');
  const todayTrendEl = document.getElementById('kpi-today-sales-trend');

  if (todayValEl) todayValEl.textContent = ERPUtils.formatCurrency(kpis.todaySales.total);
  if (todayCountEl) todayCountEl.textContent = `${kpis.todaySales.count} ventas registradas hoy`;
  if (todayTrendEl) {
    const diff = kpis.todaySales.diffPercentage;
    const isUp = diff >= 0;
    todayTrendEl.className = `trend-badge ${isUp ? 'up' : 'down'}`;
    todayTrendEl.innerHTML = `${isUp ? '▲' : '▼'} ${Math.abs(diff)}% vs ayer`;
  }

  // 2. Cuentas por cobrar
  const arTotalEl = document.getElementById('kpi-ar-total-val');
  const arOverdueEl = document.getElementById('kpi-ar-overdue-val');
  const arCountEl = document.getElementById('kpi-ar-count-val');

  if (arTotalEl) arTotalEl.textContent = ERPUtils.formatCurrency(kpis.receivables.total);
  if (arOverdueEl) arOverdueEl.textContent = `Vencida: ${ERPUtils.formatCurrency(kpis.receivables.overdue)}`;
  if (arCountEl) arCountEl.textContent = `${kpis.receivables.count} facturas pendientes`;

  // 3. Stock crítico
  const stockCritValEl = document.getElementById('kpi-stock-crit-val');
  const stockCritSubEl = document.getElementById('kpi-stock-crit-sub');

  if (stockCritValEl) stockCritValEl.textContent = `${kpis.criticalStock.count} productos`;
  if (stockCritSubEl) {
    stockCritSubEl.textContent = `${kpis.criticalStock.percentage}% del total (${kpis.criticalStock.totalProducts} ítems)`;
  }

  // 4. Ganancia estimada del mes (Historical cost!)
  const profitValEl = document.getElementById('kpi-profit-val');
  const profitSubEl = document.getElementById('kpi-profit-sub');

  if (profitValEl) profitValEl.textContent = ERPUtils.formatCurrency(kpis.monthlyProfit.profit);
  if (profitSubEl) {
    profitSubEl.textContent = `Ventas: ${ERPUtils.formatCurrency(kpis.monthlyProfit.revenue)} | Costo Hist: ${ERPUtils.formatCurrency(kpis.monthlyProfit.historicalCost)}`;
  }
}

/**
 * Render 4 Chart.js charts (Requirement 6)
 */
function renderDashboardCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js library is not loaded');
    return;
  }

  const chartData = DashboardService.getChartData();

  // Gráfico 1 — Ventas últimos 7 días (Línea)
  const ctxSales7 = document.getElementById('chart-sales-7days');
  if (ctxSales7) {
    new Chart(ctxSales7, {
      type: 'line',
      data: {
        labels: chartData.last7Days.labels,
        datasets: [
          {
            label: 'Ventas Diarias ($)',
            data: chartData.last7Days.data,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#2563eb',
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${ERPUtils.formatCurrency(item.raw)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${(value / 1000000).toFixed(1)}M`,
            },
          },
        },
      },
    });
  }

  // Gráfico 2 — Ventas por categoría (Doughnut)
  const ctxCat = document.getElementById('chart-categories-sales');
  if (ctxCat) {
    new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: chartData.categories.labels,
        datasets: [
          {
            data: chartData.categories.sales,
            backgroundColor: [
              '#2563eb',
              '#0d9488',
              '#f59e0b',
              '#8b5cf6',
              '#ec4899',
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${ERPUtils.formatCurrency(item.raw)}`,
            },
          },
        },
      },
    });
  }

  // Gráfico 3 — Margen / Ganancia por categoría (Barras)
  const ctxMargin = document.getElementById('chart-margin-category');
  if (ctxMargin) {
    new Chart(ctxMargin, {
      type: 'bar',
      data: {
        labels: chartData.categories.labels,
        datasets: [
          {
            label: 'Ventas Totales',
            data: chartData.categories.sales,
            backgroundColor: '#93c5fd',
            borderRadius: 4,
          },
          {
            label: 'Margen / Utilidad Bruta',
            data: chartData.categories.profits,
            backgroundColor: '#10b981',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ${ERPUtils.formatCurrency(item.raw)}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${(value / 1000000).toFixed(1)}M`,
            },
          },
        },
      },
    });
  }

  // Gráfico 4 — Estado de cartera (Corriente, Vencida, Pagada)
  const ctxCartera = document.getElementById('chart-cartera-status');
  if (ctxCartera) {
    new Chart(ctxCartera, {
      type: 'doughnut',
      data: {
        labels: chartData.cartera.labels,
        datasets: [
          {
            data: chartData.cartera.data,
            backgroundColor: ['#3b82f6', '#ef4444', '#10b981'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${ERPUtils.formatCurrency(item.raw)}`,
            },
          },
        },
      },
    });
  }
}

/**
 * Render recent operational activity table
 */
function renderRecentActivity() {
  const container = document.getElementById('recent-sales-table-body');
  if (!container || typeof SalesService === 'undefined') return;

  const sales = SalesService.getAll()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  if (sales.length === 0) {
    container.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No hay ventas registradas</td></tr>`;
    return;
  }

  container.innerHTML = sales
    .map(
      (s) => `
    <tr>
      <td><strong>${s.docNumber}</strong></td>
      <td>${ERPUtils.formatDate(s.date)}</td>
      <td>${ERPUtils.escapeHtml(s.customerName)}</td>
      <td style="font-weight: 600;">${ERPUtils.formatCurrency(s.total)}</td>
      <td style="color: ${s.balance > 0 ? 'var(--warning)' : 'var(--success)'}; font-weight: 600;">
        ${ERPUtils.formatCurrency(s.balance)}
      </td>
      <td>${ERPUtils.getStatusBadge(s.status)}</td>
    </tr>
  `
    )
    .join('');
}

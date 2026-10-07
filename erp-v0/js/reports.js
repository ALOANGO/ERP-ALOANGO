/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - REPORTS MODULE (reports.js)
 * Executive analytics, Sales, Inventory Valuation, Cartera Aging & Cash Flow
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof SalesService === 'undefined') return;

  setupReportTabs();
  loadSalesReport();
});

function setupReportTabs() {
  const tabBtns = document.querySelectorAll('.report-tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.getAttribute('data-target');
      document.querySelectorAll('.report-section').forEach((sec) => (sec.style.display = 'none'));
      document.getElementById(target).style.display = 'block';

      if (target === 'sec-report-sales') loadSalesReport();
      if (target === 'sec-report-inventory') loadInventoryReport();
      if (target === 'sec-report-cartera') loadCarteraReport();
      if (target === 'sec-report-cashflow') loadCashFlowReport();
    });
  });
}

/**
 * 1. Sales Report
 */
function loadSalesReport() {
  const sales = SalesService.getAll().filter((s) => s.status !== 'ANULADO' && s.status !== 'BORRADOR');

  // By Product
  const productMap = {};
  // By Client
  const clientMap = {};
  // By Category
  const categoryMap = {};

  let totalSalesVal = 0;
  let totalCostVal = 0;

  sales.forEach((s) => {
    totalSalesVal += s.subtotal || s.total;

    // By Client
    clientMap[s.customerName] = (clientMap[s.customerName] || 0) + s.total;

    if (s.items) {
      s.items.forEach((it) => {
        const prod = InventoryService.getProductById(it.productId);
        const cat = prod ? prod.category : 'General';
        const cost = it.totalCost || (it.quantity * (it.unitCost || 0));
        const net = it.lineNet || (it.quantity * it.unitPrice);

        totalCostVal += cost;

        // By Product
        if (!productMap[it.productName]) {
          productMap[it.productName] = { quantity: 0, revenue: 0, cost: 0 };
        }
        productMap[it.productName].quantity += it.quantity;
        productMap[it.productName].revenue += net;
        productMap[it.productName].cost += cost;

        // By Category
        categoryMap[cat] = (categoryMap[cat] || 0) + net;
      });
    }
  });

  const grossProfit = totalSalesVal - totalCostVal;
  const marginPct = totalSalesVal > 0 ? ((grossProfit / totalSalesVal) * 100).toFixed(1) : 0;

  document.getElementById('rep-sales-total').textContent = ERPUtils.formatCurrency(totalSalesVal);
  document.getElementById('rep-sales-cost').textContent = ERPUtils.formatCurrency(totalCostVal);
  document.getElementById('rep-sales-profit').textContent = ERPUtils.formatCurrency(grossProfit);
  document.getElementById('rep-sales-margin-pct').textContent = `${marginPct}%`;

  // Render Top Products Table
  const prodTbody = document.getElementById('rep-sales-by-product-tbody');
  if (prodTbody) {
    const sortedProds = Object.keys(productMap)
      .map((name) => ({ name, ...productMap[name] }))
      .sort((a, b) => b.revenue - a.revenue);

    prodTbody.innerHTML = sortedProds
      .slice(0, 10)
      .map(
        (p) => `
      <tr>
        <td style="font-weight: 600;">${ERPUtils.escapeHtml(p.name)}</td>
        <td style="text-align: center;">${p.quantity}</td>
        <td style="font-weight: 700;">${ERPUtils.formatCurrency(p.revenue)}</td>
        <td>${ERPUtils.formatCurrency(p.cost)}</td>
        <td style="color: var(--success); font-weight: 700;">${ERPUtils.formatCurrency(p.revenue - p.cost)}</td>
      </tr>
    `
      )
      .join('');
  }

  // Render Top Clients Table
  const clientTbody = document.getElementById('rep-sales-by-client-tbody');
  if (clientTbody) {
    const sortedClients = Object.keys(clientMap)
      .map((name) => ({ name, total: clientMap[name] }))
      .sort((a, b) => b.total - a.total);

    clientTbody.innerHTML = sortedClients
      .slice(0, 10)
      .map(
        (c) => `
      <tr>
        <td style="font-weight: 600;">${ERPUtils.escapeHtml(c.name)}</td>
        <td style="font-weight: 700; color: var(--primary);">${ERPUtils.formatCurrency(c.total)}</td>
      </tr>
    `
      )
      .join('');
  }
}

/**
 * 2. Inventory Report
 */
function loadInventoryReport() {
  const products = InventoryService.getAllProducts();
  const critical = products.filter((p) => InventoryService.getInventoryStatus(p) !== 'Normal');

  let totalValuation = 0;
  let totalUnits = 0;

  products.forEach((p) => {
    totalValuation += p.stock * p.cost;
    totalUnits += p.stock;
  });

  document.getElementById('rep-inv-total-val').textContent = ERPUtils.formatCurrency(totalValuation);
  document.getElementById('rep-inv-total-units').textContent = `${totalUnits} uds`;
  document.getElementById('rep-inv-critical-count').textContent = `${critical.length} productos`;

  const tbody = document.getElementById('rep-inv-critical-tbody');
  if (tbody) {
    if (critical.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--success); padding: 1.5rem;">Todo el inventario está en niveles óptimos.</td></tr>`;
    } else {
      tbody.innerHTML = critical
        .map(
          (p) => `
        <tr>
          <td><strong>${ERPUtils.escapeHtml(p.sku)}</strong></td>
          <td style="font-weight: 600;">${ERPUtils.escapeHtml(p.name)}</td>
          <td>${ERPUtils.escapeHtml(p.category)}</td>
          <td style="color: var(--danger); font-weight: 800;">${p.stock}</td>
          <td>${p.minStock}</td>
          <td>${ERPUtils.getStatusBadge(InventoryService.getInventoryStatus(p))}</td>
        </tr>
      `
        )
        .join('');
    }
  }
}

/**
 * 3. Cartera Aging Report
 */
function loadCarteraReport() {
  const receivables = PaymentService.getAccountsReceivable();
  const payables = PaymentService.getAccountsPayable();

  const totalAR = receivables.reduce((acc, r) => acc + r.balance, 0);
  const overdueAR = receivables.filter((r) => r.isOverdue).reduce((acc, r) => acc + r.balance, 0);

  const totalAP = payables.reduce((acc, p) => acc + p.balance, 0);
  const overdueAP = payables.filter((p) => p.isOverdue).reduce((acc, p) => acc + p.balance, 0);

  document.getElementById('rep-cartera-ar-total').textContent = ERPUtils.formatCurrency(totalAR);
  document.getElementById('rep-cartera-ar-overdue').textContent = ERPUtils.formatCurrency(overdueAR);
  document.getElementById('rep-cartera-ap-total').textContent = ERPUtils.formatCurrency(totalAP);
  document.getElementById('rep-cartera-ap-overdue').textContent = ERPUtils.formatCurrency(overdueAP);

  // Group AR by Client
  const arByClient = {};
  receivables.forEach((r) => {
    arByClient[r.customerName] = (arByClient[r.customerName] || 0) + r.balance;
  });

  const tbody = document.getElementById('rep-cartera-client-tbody');
  if (tbody) {
    const sorted = Object.keys(arByClient)
      .map((name) => ({ name, balance: arByClient[name] }))
      .sort((a, b) => b.balance - a.balance);

    tbody.innerHTML = sorted
      .map(
        (c) => `
      <tr>
        <td style="font-weight: 600;">${ERPUtils.escapeHtml(c.name)}</td>
        <td style="font-weight: 800; color: var(--warning);">${ERPUtils.formatCurrency(c.balance)}</td>
      </tr>
    `
      )
      .join('');
  }
}

/**
 * 4. Cash Flow (Ingresos vs Egresos = Flujo Neto - Requirement 22)
 */
function loadCashFlowReport() {
  const payments = PaymentService.getAll();

  const customerReceipts = payments.filter((p) => p.docType === 'VENTA');
  const supplierPayments = payments.filter((p) => p.docType === 'COMPRA');

  const totalInflows = customerReceipts.reduce((acc, p) => acc + p.amount, 0);
  const totalOutflows = supplierPayments.reduce((acc, p) => acc + p.amount, 0);
  const netCashFlow = totalInflows - totalOutflows;

  document.getElementById('rep-cash-inflows').textContent = ERPUtils.formatCurrency(totalInflows);
  document.getElementById('rep-cash-outflows').textContent = ERPUtils.formatCurrency(totalOutflows);

  const netEl = document.getElementById('rep-cash-net');
  netEl.textContent = ERPUtils.formatCurrency(netCashFlow);
  netEl.style.color = netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)';

  // Cash flow log table
  const tbody = document.getElementById('rep-cashflow-table-tbody');
  if (tbody) {
    const sortedPayments = payments.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sortedPayments
      .map(
        (p) => `
      <tr>
        <td>${ERPUtils.formatDateTime(p.date)}</td>
        <td><strong>${p.docCode}</strong></td>
        <td><span class="badge ${p.docType === 'VENTA' ? 'badge-success' : 'badge-warning'}">${p.docType === 'VENTA' ? 'Ingreso (Cliente)' : 'Egreso (Proveedor)'}</span></td>
        <td>${p.docNumber} — ${ERPUtils.escapeHtml(p.thirdPartyName)}</td>
        <td>${p.paymentMethod}</td>
        <td style="font-weight: 700; color: ${p.docType === 'VENTA' ? 'var(--success)' : 'var(--danger)'};">
          ${p.docType === 'VENTA' ? '+' : '-'} ${ERPUtils.formatCurrency(p.amount)}
        </td>
      </tr>
    `
      )
      .join('');
  }
}

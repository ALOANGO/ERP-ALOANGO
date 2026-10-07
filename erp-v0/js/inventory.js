/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - INVENTORY MODULE (inventory.js)
 * Stock monitoring, valuation, multi-warehouse view & critical stock indicators
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof InventoryService === 'undefined') return;

  setupInventoryListeners();
  loadInventoryTable();
});

function setupInventoryListeners() {
  const searchInput = document.getElementById('inv-search');
  const catSelect = document.getElementById('inv-category');
  const statusSelect = document.getElementById('inv-status');

  if (searchInput) searchInput.addEventListener('input', ERPUtils.debounce(loadInventoryTable, 250));
  if (catSelect) catSelect.addEventListener('change', loadInventoryTable);
  if (statusSelect) statusSelect.addEventListener('change', loadInventoryTable);
}

function loadInventoryTable() {
  const q = (document.getElementById('inv-search')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('inv-category')?.value || 'ALL';
  const status = document.getElementById('inv-status')?.value || 'ALL';

  let products = InventoryService.getAllProducts();

  if (q) {
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }

  if (cat !== 'ALL') {
    products = products.filter((p) => p.category === cat);
  }

  if (status !== 'ALL') {
    products = products.filter((p) => {
      const invStatus = InventoryService.getInventoryStatus(p);
      return invStatus === status;
    });
  }

  renderInventoryTable(products);
}

function renderInventoryTable(products) {
  const tbody = document.getElementById('inventory-table-body');
  const totalValuationEl = document.getElementById('inv-total-valuation');
  const totalUnitsEl = document.getElementById('inv-total-units');
  const criticalCountEl = document.getElementById('inv-critical-count');
  if (!tbody) return;

  let totalValuation = 0;
  let totalUnits = 0;
  let criticalCount = 0;

  tbody.innerHTML = products
    .map((p) => {
      const stock = Number(p.stock) || 0;
      const cost = Number(p.cost) || 0;
      const invValue = stock * cost;
      const invStatus = InventoryService.getInventoryStatus(p);

      totalValuation += invValue;
      totalUnits += stock;
      if (invStatus !== 'Normal') criticalCount++;

      return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${ERPUtils.escapeHtml(p.imageUrl)}" alt="${ERPUtils.escapeHtml(p.name)}" class="table-img" onerror="this.src='https://placehold.co/80x80?text=IMG'"/>
            <div>
              <div style="font-weight: 600;">${ERPUtils.escapeHtml(p.name)}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${ERPUtils.escapeHtml(p.category)}</div>
            </div>
          </div>
        </td>
        <td><strong>${ERPUtils.escapeHtml(p.sku)}</strong></td>
        <td><span class="badge badge-secondary">Bodega Principal</span></td>
        <td>
          <span style="font-size: 1.05rem; font-weight: 800; color: ${invStatus === 'Sin stock' ? 'var(--danger)' : invStatus === 'Stock crítico' ? 'var(--warning)' : 'var(--text-main)'};">
            ${stock} ${ERPUtils.escapeHtml(p.unit || 'UND')}
          </span>
        </td>
        <td>${p.minStock}</td>
        <td>${ERPUtils.getStatusBadge(invStatus)}</td>
        <td>${ERPUtils.formatCurrency(cost)}</td>
        <td style="font-weight: 700; color: var(--primary);">
          ${ERPUtils.formatCurrency(invValue)}
        </td>
        <td style="text-align: right;">
          <a href="kardex.html?productId=${p.id}" class="btn btn-secondary btn-sm" title="Consultar Kárdex">
            📜 Kárdex
          </a>
        </td>
      </tr>
    `;
    })
    .join('');

  if (totalValuationEl) totalValuationEl.textContent = ERPUtils.formatCurrency(totalValuation);
  if (totalUnitsEl) totalUnitsEl.textContent = `${totalUnits} unidades`;
  if (criticalCountEl) criticalCountEl.textContent = `${criticalCount} productos`;
}

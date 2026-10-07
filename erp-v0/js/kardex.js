/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - KARDEX MODULE (kardex.js)
 * Immutable movement ledger, audit tracking & physical inventory adjustments
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof InventoryService === 'undefined') return;

  populateProductFilter();
  setupKardexListeners();

  // If routed with specific product ID
  const urlParams = new URLSearchParams(window.location.search);
  const prodId = urlParams.get('productId');
  if (prodId) {
    const prodSelect = document.getElementById('kardex-filter-product');
    if (prodSelect) {
      prodSelect.value = prodId;
    }
  }

  loadKardexTable();
});

function populateProductFilter() {
  const select = document.getElementById('kardex-filter-product');
  const modalProdSelect = document.getElementById('adj-product-id');
  if (!select) return;

  const products = InventoryService.getAllProducts().sort((a, b) => a.name.localeCompare(b.name));

  let options = '<option value="">Todos los productos</option>';
  let modalOptions = '<option value="">Seleccione un producto...</option>';

  products.forEach((p) => {
    options += `<option value="${p.id}">${ERPUtils.escapeHtml(p.sku)} — ${ERPUtils.escapeHtml(p.name)}</option>`;
    modalOptions += `<option value="${p.id}" data-cost="${p.cost}" data-stock="${p.stock}">${ERPUtils.escapeHtml(p.sku)} — ${ERPUtils.escapeHtml(p.name)} (Stock: ${p.stock})</option>`;
  });

  select.innerHTML = options;
  if (modalProdSelect) modalProdSelect.innerHTML = modalOptions;
}

function setupKardexListeners() {
  const prodSelect = document.getElementById('kardex-filter-product');
  const typeSelect = document.getElementById('kardex-filter-type');
  const docInput = document.getElementById('kardex-filter-doc');
  const startInput = document.getElementById('kardex-filter-start');
  const endInput = document.getElementById('kardex-filter-end');

  if (prodSelect) prodSelect.addEventListener('change', loadKardexTable);
  if (typeSelect) typeSelect.addEventListener('change', loadKardexTable);
  if (docInput) docInput.addEventListener('input', ERPUtils.debounce(loadKardexTable, 250));
  if (startInput) startInput.addEventListener('change', loadKardexTable);
  if (endInput) endInput.addEventListener('change', loadKardexTable);

  const adjForm = document.getElementById('adjustment-form');
  if (adjForm) adjForm.addEventListener('submit', handleAdjustmentSubmit);
}

function loadKardexTable() {
  const productId = document.getElementById('kardex-filter-product')?.value || '';
  const movementType = document.getElementById('kardex-filter-type')?.value || '';
  const documentRef = document.getElementById('kardex-filter-doc')?.value || '';
  const startDate = document.getElementById('kardex-filter-start')?.value || '';
  const endDate = document.getElementById('kardex-filter-end')?.value || '';

  const movements = InventoryService.getKardex({
    productId,
    movementType,
    documentRef,
    startDate,
    endDate,
  });

  renderKardexTable(movements);
}

function renderKardexTable(movements) {
  const tbody = document.getElementById('kardex-table-body');
  const countEl = document.getElementById('kardex-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${movements.length} movimientos`;

  if (movements.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron movimientos registrados en el Kárdex</td></tr>`;
    return;
  }

  tbody.innerHTML = movements
    .map((m) => {
      const isEntry = m.entry > 0;
      const typeBadgeClass = isEntry ? 'badge-success' : 'badge-danger';

      return `
      <tr>
        <td style="white-space: nowrap;">${ERPUtils.formatDateTime(m.date)}</td>
        <td><strong>${ERPUtils.escapeHtml(m.documentRef)}</strong></td>
        <td>
          <div style="font-weight: 600;">${ERPUtils.escapeHtml(m.productName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${ERPUtils.escapeHtml(m.productSku)}</div>
        </td>
        <td><span class="badge ${typeBadgeClass}">${ERPUtils.escapeHtml(m.movementType)}</span></td>
        <td style="color: var(--success); font-weight: 700;">${m.entry > 0 ? `+${m.entry}` : '-'}</td>
        <td style="color: var(--danger); font-weight: 700;">${m.exit > 0 ? `-${m.exit}` : '-'}</td>
        <td style="font-size: 1rem; font-weight: 800; color: var(--primary);">${m.balance}</td>
        <td>${ERPUtils.formatCurrency(m.unitCost)}</td>
        <td style="font-weight: 600;">${ERPUtils.formatCurrency(m.movementValue)}</td>
        <td style="font-size: 0.78rem; color: var(--text-muted);">${ERPUtils.escapeHtml(m.userName || 'Sistema')}</td>
      </tr>
    `;
    })
    .join('');
}

/**
 * Open Modal to Register Manual Inventory Adjustment
 */
function openAdjustmentModal() {
  const form = document.getElementById('adjustment-form');
  if (form) form.reset();

  const modal = document.getElementById('adjustment-modal-overlay');
  if (modal) modal.classList.add('active');
}

/**
 * Handle Adjustment Submit
 */
function handleAdjustmentSubmit(e) {
  e.preventDefault();

  const productId = document.getElementById('adj-product-id').value;
  const movementType = document.getElementById('adj-type').value; // 'Ajuste entrada' | 'Ajuste salida'
  const quantity = Number(document.getElementById('adj-quantity').value);
  const notes = document.getElementById('adj-notes').value.trim();

  if (!productId) {
    ERPUtils.showToast('Validación', 'Seleccione un producto.', 'danger');
    return;
  }
  if (quantity <= 0) {
    ERPUtils.showToast('Validación', 'La cantidad debe ser mayor a cero.', 'danger');
    return;
  }

  const product = InventoryService.getProductById(productId);
  if (!product) return;

  const docCode = ERPStorage.getNextSequence('adjustments', 'AJ-', 5);

  try {
    InventoryService.registerMovement({
      productId,
      movementType,
      quantity,
      unitCost: product.cost,
      documentRef: docCode,
      notes,
    });

    AuditService.log({
      action: 'UPDATE',
      module: 'INVENTARIO',
      recordId: docCode,
      newValues: { productId, movementType, quantity, notes },
      description: `Ajuste manual de inventario (${movementType}) para ${product.sku} x ${quantity}`,
    });

    ERPUtils.showToast('Ajuste Registrado', `Movimiento ${docCode} guardado exitosamente.`, 'success');
    closeAdjustmentModal();
    loadKardexTable();
    populateProductFilter();
  } catch (error) {
    ERPUtils.showToast('Error', error.message, 'danger');
  }
}

function closeAdjustmentModal() {
  const modal = document.getElementById('adjustment-modal-overlay');
  if (modal) modal.classList.remove('active');
}

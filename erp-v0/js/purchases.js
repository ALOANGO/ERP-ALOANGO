/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - PURCHASES MODULE (purchases.js)
 * Purchase orders, inventory replenishment, vendor debts & voucher printing
 * ============================================================================
 */

let activePurchaseItems = [];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof PurchaseService === 'undefined') return;

  setupPurchaseListeners();
  loadPurchasesTable();

  // If routed with doc query
  const urlParams = new URLSearchParams(window.location.search);
  const docQuery = urlParams.get('doc');
  if (docQuery) {
    const searchInput = document.getElementById('purchases-filter-search');
    if (searchInput) {
      searchInput.value = docQuery;
      applyPurchaseFilters();
    }
  }
});

function setupPurchaseListeners() {
  const searchInput = document.getElementById('purchases-filter-search');
  const statusSelect = document.getElementById('purchases-filter-status');
  const dateStart = document.getElementById('purchases-filter-start');
  const dateEnd = document.getElementById('purchases-filter-end');

  if (searchInput) searchInput.addEventListener('input', ERPUtils.debounce(applyPurchaseFilters, 250));
  if (statusSelect) statusSelect.addEventListener('change', applyPurchaseFilters);
  if (dateStart) dateStart.addEventListener('change', applyPurchaseFilters);
  if (dateEnd) dateEnd.addEventListener('change', applyPurchaseFilters);

  const purchaseForm = document.getElementById('purchase-form');
  if (purchaseForm) purchaseForm.addEventListener('submit', handlePurchaseSubmit);

  const prodSelect = document.getElementById('purchase-line-product');
  if (prodSelect) prodSelect.addEventListener('change', onPurchaseProductSelected);

  const addLineBtn = document.getElementById('btn-add-purchase-line');
  if (addLineBtn) addLineBtn.addEventListener('click', addPurchaseLineItem);
}

function loadPurchasesTable() {
  applyPurchaseFilters();
}

function applyPurchaseFilters() {
  const q = (document.getElementById('purchases-filter-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('purchases-filter-status')?.value || 'ALL';
  const start = document.getElementById('purchases-filter-start')?.value || '';
  const end = document.getElementById('purchases-filter-end')?.value || '';

  let list = PurchaseService.getAll();

  if (q) {
    list = list.filter(
      (p) => p.docNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)
    );
  }

  if (status !== 'ALL') {
    list = list.filter((p) => p.status === status);
  }

  if (start) {
    list = list.filter((p) => p.date >= start);
  }

  if (end) {
    list = list.filter((p) => p.date <= end);
  }

  renderPurchasesTable(list);
}

function renderPurchasesTable(purchases) {
  const tbody = document.getElementById('purchases-table-body');
  const countEl = document.getElementById('purchases-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${purchases.length} órdenes de compra`;

  purchases.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (purchases.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron compras registradas</td></tr>`;
    return;
  }

  tbody.innerHTML = purchases
    .map(
      (p) => `
    <tr>
      <td><strong>${p.docNumber}</strong></td>
      <td>${ERPUtils.formatDate(p.date)}</td>
      <td style="font-weight: 600;">${ERPUtils.escapeHtml(p.supplierName)}</td>
      <td>${ERPUtils.formatCurrency(p.subtotal)}</td>
      <td>${ERPUtils.formatCurrency(p.tax)}</td>
      <td style="font-weight: 700; color: var(--primary);">${ERPUtils.formatCurrency(p.total)}</td>
      <td style="color: var(--success); font-weight: 600;">${ERPUtils.formatCurrency(p.paidAmount || 0)}</td>
      <td style="color: ${p.balance > 0 ? 'var(--warning)' : 'var(--text-muted)'}; font-weight: 700;">
        ${ERPUtils.formatCurrency(p.balance)}
      </td>
      <td>${ERPUtils.getStatusBadge(p.status)}</td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn btn-secondary btn-sm" onclick="viewPurchaseDetail('${p.id}')" title="Ver detalle">
          👁️
        </button>
        ${p.status === 'BORRADOR' ? `
          <button class="btn btn-success btn-sm" onclick="approvePurchaseAction('${p.id}')" title="Aprobar Compra">
            ✓ Aprobar
          </button>
        ` : ''}
        ${!['BORRADOR', 'ANULADO', 'PAGADO', 'FINALIZADO'].includes(p.status) && p.balance > 0 ? `
          <button class="btn btn-primary btn-sm" onclick="openPaymentForPurchase('${p.docNumber}')" title="Pagar Proveedor">
            💵 Pagar
          </button>
        ` : ''}
      </td>
    </tr>
  `
    )
    .join('');
}

function openNewPurchaseModal() {
  const form = document.getElementById('purchase-form');
  if (form) form.reset();

  activePurchaseItems = [];
  renderPurchaseLineItemsTable();

  // Populate Suppliers
  const supplierSelect = document.getElementById('purchase-supplier-id');
  if (supplierSelect) {
    const suppliers = PartnerService.getAll().filter((p) => p.type === 'PROVEEDOR' || p.type === 'AMBOS');
    supplierSelect.innerHTML =
      '<option value="">Seleccione un proveedor...</option>' +
      suppliers
        .map(
          (s) =>
            `<option value="${s.id}" data-doc="${s.docNumber}" data-name="${ERPUtils.escapeHtml(s.legalName)}">${ERPUtils.escapeHtml(s.legalName)} (${s.docNumber})</option>`
        )
        .join('');
  }

  // Populate Products
  const prodSelect = document.getElementById('purchase-line-product');
  if (prodSelect) {
    const prods = InventoryService.getAllProducts();
    prodSelect.innerHTML =
      '<option value="">Seleccione un producto...</option>' +
      prods
        .map(
          (p) =>
            `<option value="${p.id}" data-cost="${p.cost}" data-stock="${p.stock}" data-sku="${p.sku}" data-tax="${p.taxRate || 0.19}">${ERPUtils.escapeHtml(p.sku)} - ${ERPUtils.escapeHtml(p.name)} (Costo actual: ${ERPUtils.formatCurrency(p.cost)})</option>`
        )
        .join('');
  }

  document.getElementById('purchase-date').value = ERPUtils.getTodayISO();
  document.getElementById('purchase-due-date').value = ERPUtils.getTodayISO();

  const modal = document.getElementById('purchase-modal-overlay');
  if (modal) modal.classList.add('active');
}

function onPurchaseProductSelected(e) {
  const select = e.target;
  const opt = select.selectedOptions[0];
  if (!opt || !opt.value) return;

  const cost = opt.getAttribute('data-cost') || 0;
  document.getElementById('purchase-line-cost').value = cost;
  document.getElementById('purchase-line-quantity').value = 1;
}

function addPurchaseLineItem() {
  const prodSelect = document.getElementById('purchase-line-product');
  const opt = prodSelect.selectedOptions[0];
  if (!opt || !opt.value) {
    ERPUtils.showToast('Validación', 'Seleccione un producto.', 'warning');
    return;
  }

  const productId = opt.value;
  const quantity = Number(document.getElementById('purchase-line-quantity').value);
  const unitCost = Number(document.getElementById('purchase-line-cost').value);
  const taxRate = Number(opt.getAttribute('data-tax')) || 0.19;
  const sku = opt.getAttribute('data-sku');
  const name = opt.textContent.split(' (Costo actual:')[0];

  if (quantity <= 0) {
    ERPUtils.showToast('Validación', 'La cantidad debe ser mayor a cero.', 'warning');
    return;
  }
  if (unitCost < 0) {
    ERPUtils.showToast('Validación', 'El costo no puede ser negativo.', 'warning');
    return;
  }

  activePurchaseItems.push({
    productId,
    productSku: sku,
    productName: name,
    quantity,
    unitCost,
    taxRate,
  });

  // Reset
  prodSelect.value = '';
  document.getElementById('purchase-line-quantity').value = 1;
  document.getElementById('purchase-line-cost').value = '';

  renderPurchaseLineItemsTable();
}

function removePurchaseLineItem(index) {
  activePurchaseItems.splice(index, 1);
  renderPurchaseLineItemsTable();
}

function renderPurchaseLineItemsTable() {
  const tbody = document.getElementById('purchase-items-table-body');
  if (!tbody) return;

  const totals = PurchaseService.calculatePurchaseTotals(activePurchaseItems);

  if (activePurchaseItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1rem;">No se han agregado productos a la compra</td></tr>`;
  } else {
    tbody.innerHTML = totals.items
      .map(
        (it, idx) => `
      <tr>
        <td>
          <div style="font-weight: 600;">${ERPUtils.escapeHtml(it.productName)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${ERPUtils.escapeHtml(it.productSku)}</div>
        </td>
        <td>${it.quantity}</td>
        <td>${ERPUtils.formatCurrency(it.unitCost)}</td>
        <td>${ERPUtils.formatCurrency(it.lineTax)}</td>
        <td style="font-weight: 700;">${ERPUtils.formatCurrency(it.lineTotal)}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-danger btn-sm" onclick="removePurchaseLineItem(${idx})">&times;</button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  document.getElementById('purchase-summary-subtotal').textContent = ERPUtils.formatCurrency(totals.subtotal);
  document.getElementById('purchase-summary-tax').textContent = ERPUtils.formatCurrency(totals.tax);
  document.getElementById('purchase-summary-total').textContent = ERPUtils.formatCurrency(totals.total);
}

function handlePurchaseSubmit(e) {
  e.preventDefault();

  const supplierSelect = document.getElementById('purchase-supplier-id');
  const opt = supplierSelect.selectedOptions[0];
  if (!opt || !opt.value) {
    ERPUtils.showToast('Validación', 'Seleccione un proveedor.', 'danger');
    return;
  }

  if (activePurchaseItems.length === 0) {
    ERPUtils.showToast('Validación', 'Debe agregar al menos un ítem.', 'danger');
    return;
  }

  const supplierId = opt.value;
  const supplierName = opt.getAttribute('data-name');
  const supplierDoc = opt.getAttribute('data-doc');
  const date = document.getElementById('purchase-date').value;
  const dueDate = document.getElementById('purchase-due-date').value;
  const warehouse = document.getElementById('purchase-warehouse').value;
  const notes = document.getElementById('purchase-notes').value.trim();

  try {
    const purchase = PurchaseService.createPurchase({
      supplierId,
      supplierName,
      supplierDoc,
      date,
      dueDate,
      warehouse,
      notes,
      items: activePurchaseItems,
    });

    ERPUtils.showToast('Compra Registrada', `Orden ${purchase.docNumber} creada en estado BORRADOR.`, 'success');
    closePurchaseModal();
    loadPurchasesTable();
    viewPurchaseDetail(purchase.id);
  } catch (err) {
    ERPUtils.showToast('Error', err.message, 'danger');
  }
}

function closePurchaseModal() {
  const modal = document.getElementById('purchase-modal-overlay');
  if (modal) modal.classList.remove('active');
}

function approvePurchaseAction(id) {
  ERPUtils.showConfirmModal({
    title: 'Aprobar Orden de Compra',
    message: '¿Desea aprobar esta orden de compra? Se incrementará el stock en inventario, se registrará el ingreso en Kárdex y se creará la cuenta por pagar con el proveedor.',
    confirmText: 'Aprobar compra',
    confirmClass: 'btn-success',
    onConfirm: () => {
      try {
        const approved = PurchaseService.approvePurchase(id);
        ERPUtils.showToast('Compra Aprobada', `La compra ${approved.docNumber} ingresó a inventario exitosamente.`, 'success');
        loadPurchasesTable();
        const detailModal = document.getElementById('purchase-detail-modal-overlay');
        if (detailModal && detailModal.classList.contains('active')) {
          viewPurchaseDetail(id);
        }
      } catch (err) {
        ERPUtils.showToast('Error', err.message, 'danger');
      }
    },
  });
}

function cancelPurchaseAction(id) {
  ERPUtils.showConfirmModal({
    title: 'Anular Compra',
    message: 'Esta acción revertirá las existencias en inventario y anulará el documento. ¿Continuar?',
    confirmText: 'Sí, anular compra',
    confirmClass: 'btn-danger',
    onConfirm: () => {
      try {
        const cancelled = PurchaseService.cancelPurchase(id);
        ERPUtils.showToast('Compra Anulada', `La orden ${cancelled.docNumber} fue anulada.`, 'warning');
        loadPurchasesTable();
        const detailModal = document.getElementById('purchase-detail-modal-overlay');
        if (detailModal && detailModal.classList.contains('active')) {
          viewPurchaseDetail(id);
        }
      } catch (err) {
        ERPUtils.showToast('Error', err.message, 'danger');
      }
    },
  });
}

function viewPurchaseDetail(id) {
  const purchase = PurchaseService.getById(id);
  if (!purchase) return;

  const payments = PaymentService.getByDocument('COMPRA', purchase.docNumber);

  let detailModal = document.getElementById('purchase-detail-modal-overlay');
  if (!detailModal) {
    detailModal = document.createElement('div');
    detailModal.id = 'purchase-detail-modal-overlay';
    detailModal.className = 'modal-overlay';
    document.body.appendChild(detailModal);
  }

  const isApproved = ['APROBADO', 'PARCIALMENTE PAGADO', 'PAGADO', 'FINALIZADO'].includes(purchase.status);

  detailModal.innerHTML = `
    <div class="modal-dialog modal-dialog-xl">
      <div class="modal-header">
        <h3 class="modal-title">Orden de Compra — ${purchase.docNumber}</h3>
        <button type="button" class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <div class="voucher-box">
          <div class="voucher-header">
            <div>
              <div class="voucher-company-name">ERP EMPRESARIAL S.A.S.</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">NIT: 900.800.700-1 | Régimen Común</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Bodega Destino: ${ERPUtils.escapeHtml(purchase.warehouse || 'Principal')}</div>
            </div>
            <div class="voucher-meta-tag">
              <div class="voucher-doc-number">${purchase.docNumber}</div>
              <div style="margin-top: 0.35rem;">${ERPUtils.getStatusBadge(purchase.status)}</div>
              ${isApproved ? '<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Documento aprobado — solo lectura</div>' : ''}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; font-size: 0.85rem;">
            <div><strong>Proveedor:</strong> ${ERPUtils.escapeHtml(purchase.supplierName)}</div>
            <div><strong>Documento:</strong> ${ERPUtils.escapeHtml(purchase.supplierDoc || '-')}</div>
            <div><strong>Fecha:</strong> ${ERPUtils.formatDate(purchase.date)}</div>
            <div><strong>Vencimiento:</strong> ${ERPUtils.formatDate(purchase.dueDate)}</div>
            <div><strong>Registrado por:</strong> ${ERPUtils.escapeHtml(purchase.buyerName || '-')}</div>
          </div>

          <table class="voucher-items-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Costo Unit.</th>
                <th style="text-align: right;">IVA (19%)</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${purchase.items
                .map(
                  (it) => `
                <tr>
                  <td>
                    <strong>${ERPUtils.escapeHtml(it.productName)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${ERPUtils.escapeHtml(it.productSku)}</div>
                  </td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">${ERPUtils.formatCurrency(it.unitCost)}</td>
                  <td style="text-align: right;">${ERPUtils.formatCurrency(it.lineTax)}</td>
                  <td style="text-align: right; font-weight: 700;">${ERPUtils.formatCurrency(it.lineTotal)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="voucher-totals-summary">
            <div class="totals-card">
              <div class="totals-row">
                <span>Subtotal:</span>
                <strong>${ERPUtils.formatCurrency(purchase.subtotal)}</strong>
              </div>
              <div class="totals-row">
                <span>Impuestos (IVA):</span>
                <strong>${ERPUtils.formatCurrency(purchase.tax)}</strong>
              </div>
              <div class="totals-row grand-total">
                <span>Total Compra:</span>
                <strong>${ERPUtils.formatCurrency(purchase.total)}</strong>
              </div>
              <div class="totals-row" style="color: var(--success); font-weight: 600;">
                <span>Total Abonado / Pagado:</span>
                <span>${ERPUtils.formatCurrency(purchase.paidAmount || 0)}</span>
              </div>
              <div class="totals-row" style="color: ${purchase.balance > 0 ? 'var(--warning)' : 'var(--text-muted)'}; font-weight: 700;">
                <span>Saldo Pendiente:</span>
                <span>${ERPUtils.formatCurrency(purchase.balance)}</span>
              </div>
            </div>
          </div>

          <!-- Payments history -->
          <div style="margin-top: 1.5rem;">
            <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Pagos Realizados al Proveedor</h4>
            ${
              payments.length === 0
                ? '<div style="font-size: 0.82rem; color: var(--text-muted);">No se han registrado pagos para esta compra.</div>'
                : `
              <table class="table" style="font-size: 0.8rem;">
                <thead>
                  <tr>
                    <th>Comprobante</th>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th>Referencia</th>
                    <th>Monto</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments
                    .map(
                      (p) => `
                    <tr>
                      <td><strong>${p.docCode}</strong></td>
                      <td>${ERPUtils.formatDateTime(p.date)}</td>
                      <td>${p.paymentMethod}</td>
                      <td>${ERPUtils.escapeHtml(p.reference || '-')}</td>
                      <td style="font-weight: 700; color: var(--success);">${ERPUtils.formatCurrency(p.amount)}</td>
                      <td>${ERPUtils.escapeHtml(p.userName || '-')}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
            }
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="window.print()">🖨️ Imprimir Orden</button>
        ${purchase.status === 'BORRADOR' ? `
          <button type="button" class="btn btn-success" onclick="approvePurchaseAction('${purchase.id}')">✓ Aprobar Compra</button>
        ` : ''}
        ${!['BORRADOR', 'ANULADO', 'PAGADO', 'FINALIZADO'].includes(purchase.status) && purchase.balance > 0 ? `
          <button type="button" class="btn btn-primary" onclick="openPaymentForPurchase('${purchase.docNumber}')">💵 Pagar Proveedor</button>
        ` : ''}
        ${purchase.status !== 'ANULADO' && purchase.status !== 'FINALIZADO' && payments.length === 0 ? `
          <button type="button" class="btn btn-danger" onclick="cancelPurchaseAction('${purchase.id}')">✕ Anular Orden</button>
        ` : ''}
        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').classList.remove('active')">Cerrar</button>
      </div>
    </div>
  `;

  detailModal.classList.add('active');
}

function openPaymentForPurchase(docNumber) {
  const currentDetailModal = document.getElementById('purchase-detail-modal-overlay');
  if (currentDetailModal) currentDetailModal.classList.remove('active');

  if (typeof openRegisterPaymentModal === 'function') {
    openRegisterPaymentModal('COMPRA', docNumber);
  } else {
    window.location.href = `cartera.html?payDoc=${encodeURIComponent(docNumber)}&type=COMPRA`;
  }
}

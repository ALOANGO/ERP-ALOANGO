/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - SALES MODULE (sales.js)
 * Order creation, multi-item invoicing, atomic approval & invoice printing
 * ============================================================================
 */

let activeSaleItems = [];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof SalesService === 'undefined') return;

  setupSalesListeners();
  loadSalesTable();

  // If routed with doc query
  const urlParams = new URLSearchParams(window.location.search);
  const docQuery = urlParams.get('doc');
  if (docQuery) {
    const searchInput = document.getElementById('sales-filter-search');
    if (searchInput) {
      searchInput.value = docQuery;
      applySalesFilters();
    }
  }
});

function setupSalesListeners() {
  const searchInput = document.getElementById('sales-filter-search');
  const statusSelect = document.getElementById('sales-filter-status');
  const dateStart = document.getElementById('sales-filter-start');
  const dateEnd = document.getElementById('sales-filter-end');

  if (searchInput) searchInput.addEventListener('input', ERPUtils.debounce(applySalesFilters, 250));
  if (statusSelect) statusSelect.addEventListener('change', applySalesFilters);
  if (dateStart) dateStart.addEventListener('change', applySalesFilters);
  if (dateEnd) dateEnd.addEventListener('change', applySalesFilters);

  // New Sale Form
  const saleForm = document.getElementById('sale-form');
  if (saleForm) saleForm.addEventListener('submit', handleSaleSubmit);

  // Product selector in sale line
  const prodSelect = document.getElementById('sale-line-product');
  if (prodSelect) {
    prodSelect.addEventListener('change', onSaleProductSelected);
  }

  // Add line button
  const addLineBtn = document.getElementById('btn-add-sale-line');
  if (addLineBtn) {
    addLineBtn.addEventListener('click', addSaleLineItem);
  }
}

function loadSalesTable() {
  applySalesFilters();
}

function applySalesFilters() {
  const q = (document.getElementById('sales-filter-search')?.value || '').toLowerCase().trim();
  const status = document.getElementById('sales-filter-status')?.value || 'ALL';
  const start = document.getElementById('sales-filter-start')?.value || '';
  const end = document.getElementById('sales-filter-end')?.value || '';

  let list = SalesService.getAll();

  if (q) {
    list = list.filter(
      (s) => s.docNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q)
    );
  }

  if (status !== 'ALL') {
    list = list.filter((s) => s.status === status);
  }

  if (start) {
    list = list.filter((s) => s.date >= start);
  }

  if (end) {
    list = list.filter((s) => s.date <= end);
  }

  renderSalesTable(list);
}

function renderSalesTable(sales) {
  const tbody = document.getElementById('sales-table-body');
  const countEl = document.getElementById('sales-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${sales.length} facturas de venta`;

  // Sort newest first
  sales.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron ventas con los filtros indicados</td></tr>`;
    return;
  }

  tbody.innerHTML = sales
    .map(
      (s) => `
    <tr>
      <td><strong>${s.docNumber}</strong></td>
      <td>${ERPUtils.formatDate(s.date)}</td>
      <td>${ERPUtils.formatDate(s.dueDate)}</td>
      <td style="font-weight: 600;">${ERPUtils.escapeHtml(s.customerName)}</td>
      <td style="font-size: 0.78rem; color: var(--text-muted);">${ERPUtils.escapeHtml(s.sellerName || 'Ventas')}</td>
      <td>${ERPUtils.formatCurrency(s.subtotal)}</td>
      <td>${ERPUtils.formatCurrency(s.tax)}</td>
      <td style="font-weight: 700; color: var(--primary);">${ERPUtils.formatCurrency(s.total)}</td>
      <td style="color: var(--success); font-weight: 600;">${ERPUtils.formatCurrency(s.paidAmount || 0)}</td>
      <td style="color: ${s.balance > 0 ? 'var(--warning)' : 'var(--text-muted)'}; font-weight: 700;">
        ${ERPUtils.formatCurrency(s.balance)}
      </td>
      <td>${ERPUtils.getStatusBadge(s.status)}</td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn btn-secondary btn-sm" onclick="viewSaleDetail('${s.id}')" title="Ver detalle">
          👁️
        </button>
        ${s.status === 'BORRADOR' ? `
          <button class="btn btn-success btn-sm" onclick="approveSaleAction('${s.id}')" title="Aprobar Venta">
            ✓ Aprobar
          </button>
        ` : ''}
        ${!['BORRADOR', 'ANULADO', 'PAGADO', 'FINALIZADO'].includes(s.status) && s.balance > 0 ? `
          <button class="btn btn-primary btn-sm" onclick="openPaymentForSale('${s.docNumber}')" title="Registrar Pago">
            💵 Pagar
          </button>
        ` : ''}
      </td>
    </tr>
  `
    )
    .join('');
}

/**
 * Open Modal to Create New Sale
 */
function openNewSaleModal() {
  const form = document.getElementById('sale-form');
  if (form) form.reset();

  activeSaleItems = [];
  renderSaleLineItemsTable();

  // Populate Customers
  const customerSelect = document.getElementById('sale-customer-id');
  if (customerSelect) {
    const clients = PartnerService.getAll().filter((p) => p.type === 'CLIENTE' || p.type === 'AMBOS');
    customerSelect.innerHTML =
      '<option value="">Seleccione un cliente...</option>' +
      clients
        .map(
          (c) =>
            `<option value="${c.id}" data-doc="${c.docNumber}" data-name="${ERPUtils.escapeHtml(c.legalName)}">${ERPUtils.escapeHtml(c.legalName)} (${c.docNumber})</option>`
        )
        .join('');
  }

  // Populate Products for lines
  const prodSelect = document.getElementById('sale-line-product');
  if (prodSelect) {
    const prods = InventoryService.getAllProducts().filter((p) => p.status === 'ACTIVO');
    prodSelect.innerHTML =
      '<option value="">Seleccione un producto...</option>' +
      prods
        .map(
          (p) =>
            `<option value="${p.id}" data-price="${p.price}" data-cost="${p.cost}" data-stock="${p.stock}" data-sku="${p.sku}" data-tax="${p.taxRate || 0.19}">${ERPUtils.escapeHtml(p.sku)} - ${ERPUtils.escapeHtml(p.name)} (Stock: ${p.stock})</option>`
        )
        .join('');
  }

  document.getElementById('sale-date').value = ERPUtils.getTodayISO();
  document.getElementById('sale-due-date').value = ERPUtils.getTodayISO();

  const modal = document.getElementById('sale-modal-overlay');
  if (modal) modal.classList.add('active');
}

function onSaleProductSelected(e) {
  const select = e.target;
  const opt = select.selectedOptions[0];
  if (!opt || !opt.value) return;

  const price = opt.getAttribute('data-price') || 0;
  const stock = opt.getAttribute('data-stock') || 0;

  document.getElementById('sale-line-price').value = price;
  document.getElementById('sale-line-quantity').value = 1;
  document.getElementById('sale-line-discount').value = 0;
  document.getElementById('sale-line-stock-info').textContent = `Stock disponible: ${stock} unidades`;
}

function addSaleLineItem() {
  const prodSelect = document.getElementById('sale-line-product');
  const opt = prodSelect.selectedOptions[0];
  if (!opt || !opt.value) {
    ERPUtils.showToast('Validación', 'Seleccione un producto para agregar.', 'warning');
    return;
  }

  const productId = opt.value;
  const quantity = Number(document.getElementById('sale-line-quantity').value);
  const unitPrice = Number(document.getElementById('sale-line-price').value);
  const discount = Number(document.getElementById('sale-line-discount').value) || 0;
  const availableStock = Number(opt.getAttribute('data-stock')) || 0;
  const unitCost = Number(opt.getAttribute('data-cost')) || 0;
  const taxRate = Number(opt.getAttribute('data-tax')) || 0.19;
  const sku = opt.getAttribute('data-sku');
  const name = opt.textContent.split(' (Stock:')[0];

  if (quantity <= 0) {
    ERPUtils.showToast('Validación', 'La cantidad debe ser mayor a cero.', 'warning');
    return;
  }
  if (unitPrice < 0) {
    ERPUtils.showToast('Validación', 'El precio no puede ser negativo.', 'warning');
    return;
  }

  // Pre-validate stock availability warning
  if (quantity > availableStock) {
    ERPUtils.showToast(
      'Alerta de Stock',
      `Atención: El stock disponible es ${availableStock}. Al intentar aprobar la venta el sistema exigirá stock suficiente.`,
      'warning'
    );
  }

  activeSaleItems.push({
    productId,
    productSku: sku,
    productName: name,
    quantity,
    unitPrice,
    unitCost,
    discount,
    taxRate,
  });

  // Reset inputs
  prodSelect.value = '';
  document.getElementById('sale-line-quantity').value = 1;
  document.getElementById('sale-line-price').value = '';
  document.getElementById('sale-line-discount').value = 0;
  document.getElementById('sale-line-stock-info').textContent = '';

  renderSaleLineItemsTable();
}

function removeSaleLineItem(index) {
  activeSaleItems.splice(index, 1);
  renderSaleLineItemsTable();
}

function renderSaleLineItemsTable() {
  const tbody = document.getElementById('sale-items-table-body');
  if (!tbody) return;

  const totals = SalesService.calculateSaleTotals(activeSaleItems);

  if (activeSaleItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1rem;">No se han agregado productos a la venta</td></tr>`;
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
        <td>${ERPUtils.formatCurrency(it.unitPrice)}</td>
        <td>${it.discount}%</td>
        <td>${ERPUtils.formatCurrency(it.lineTax)}</td>
        <td style="font-weight: 700;">${ERPUtils.formatCurrency(it.lineTotal)}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-danger btn-sm" onclick="removeSaleLineItem(${idx})" title="Eliminar ítem">&times;</button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  // Update summary totals
  document.getElementById('sale-summary-subtotal').textContent = ERPUtils.formatCurrency(totals.subtotal);
  document.getElementById('sale-summary-tax').textContent = ERPUtils.formatCurrency(totals.tax);
  document.getElementById('sale-summary-total').textContent = ERPUtils.formatCurrency(totals.total);
  document.getElementById('sale-summary-profit').textContent = ERPUtils.formatCurrency(totals.profit);
}

function handleSaleSubmit(e) {
  e.preventDefault();

  const customerSelect = document.getElementById('sale-customer-id');
  const opt = customerSelect.selectedOptions[0];
  if (!opt || !opt.value) {
    ERPUtils.showToast('Validación', 'Seleccione un cliente.', 'danger');
    return;
  }

  if (activeSaleItems.length === 0) {
    ERPUtils.showToast('Validación', 'Debe agregar al menos un ítem a la venta.', 'danger');
    return;
  }

  const customerId = opt.value;
  const customerName = opt.getAttribute('data-name');
  const customerDoc = opt.getAttribute('data-doc');
  const date = document.getElementById('sale-date').value;
  const dueDate = document.getElementById('sale-due-date').value;
  const warehouse = document.getElementById('sale-warehouse').value;
  const notes = document.getElementById('sale-notes').value.trim();

  try {
    const sale = SalesService.createSale({
      customerId,
      customerName,
      customerDoc,
      date,
      dueDate,
      warehouse,
      notes,
      items: activeSaleItems,
    });

    ERPUtils.showToast('Venta Creada', `Venta ${sale.docNumber} guardada en estado BORRADOR.`, 'success');
    closeSaleModal();
    loadSalesTable();
    viewSaleDetail(sale.id);
  } catch (err) {
    ERPUtils.showToast('Error', err.message, 'danger');
  }
}

function closeSaleModal() {
  const modal = document.getElementById('sale-modal-overlay');
  if (modal) modal.classList.remove('active');
}

/**
 * Approve Sale with Atomic Transaction & Stock Validation (Requirement 14, 34)
 */
function approveSaleAction(id) {
  ERPUtils.showConfirmModal({
    title: 'Aprobar Venta',
    message: '¿Desea aprobar esta venta? Una vez aprobada no podrá modificarse y se generará automáticamente la salida de inventario, el movimiento en el Kárdex y la cuenta por cobrar.',
    confirmText: 'Aprobar venta',
    confirmClass: 'btn-success',
    onConfirm: () => {
      try {
        const approved = SalesService.approveSale(id);
        ERPUtils.showToast('Venta Aprobada', `La venta ${approved.docNumber} ha sido aprobada con éxito.`, 'success');
        loadSalesTable();
        // If modal was open, refresh detail
        const currentDetailModal = document.getElementById('sale-detail-modal-overlay');
        if (currentDetailModal && currentDetailModal.classList.contains('active')) {
          viewSaleDetail(id);
        }
      } catch (err) {
        ERPUtils.showToast('Operación Rechazada', err.message, 'danger', 6000);
      }
    },
  });
}

/**
 * Cancel Sale Action
 */
function cancelSaleAction(id) {
  ERPUtils.showConfirmModal({
    title: 'Anular Venta',
    message: 'Esta acción generará reversión de inventario y afectará la trazabilidad del documento. ¿Desea continuar?',
    confirmText: 'Sí, anular venta',
    confirmClass: 'btn-danger',
    onConfirm: () => {
      try {
        const cancelled = SalesService.cancelSale(id);
        ERPUtils.showToast('Venta Anulada', `La venta ${cancelled.docNumber} fue anulada y su stock revertido.`, 'warning');
        loadSalesTable();
        const currentDetailModal = document.getElementById('sale-detail-modal-overlay');
        if (currentDetailModal && currentDetailModal.classList.contains('active')) {
          viewSaleDetail(id);
        }
      } catch (err) {
        ERPUtils.showToast('Error', err.message, 'danger');
      }
    },
  });
}

/**
 * View Sale Detail & Printable Voucher (Requirement 35, 36)
 */
function viewSaleDetail(id) {
  const sale = SalesService.getById(id);
  if (!sale) return;

  const payments = PaymentService.getByDocument('VENTA', sale.docNumber);

  let detailModal = document.getElementById('sale-detail-modal-overlay');
  if (!detailModal) {
    detailModal = document.createElement('div');
    detailModal.id = 'sale-detail-modal-overlay';
    detailModal.className = 'modal-overlay';
    document.body.appendChild(detailModal);
  }

  const isApproved = ['APROBADO', 'PARCIALMENTE PAGADO', 'PAGADO', 'FINALIZADO'].includes(sale.status);

  detailModal.innerHTML = `
    <div class="modal-dialog modal-dialog-xl">
      <div class="modal-header">
        <h3 class="modal-title">Factura de Venta — ${sale.docNumber}</h3>
        <button type="button" class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body" id="printable-sale-area">
        <div class="voucher-box">
          <div class="voucher-header">
            <div>
              <div class="voucher-company-name">ERP EMPRESARIAL S.A.S.</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">NIT: 900.800.700-1 | Régimen Común</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Bodega: ${ERPUtils.escapeHtml(sale.warehouse || 'Principal')}</div>
            </div>
            <div class="voucher-meta-tag">
              <div class="voucher-doc-number">${sale.docNumber}</div>
              <div style="margin-top: 0.35rem;">${ERPUtils.getStatusBadge(sale.status)}</div>
              ${isApproved ? '<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Documento aprobado — solo lectura</div>' : ''}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; font-size: 0.85rem;">
            <div><strong>Cliente:</strong> ${ERPUtils.escapeHtml(sale.customerName)}</div>
            <div><strong>Documento:</strong> ${ERPUtils.escapeHtml(sale.customerDoc || '-')}</div>
            <div><strong>Fecha Emisión:</strong> ${ERPUtils.formatDate(sale.date)}</div>
            <div><strong>Fecha Vencimiento:</strong> ${ERPUtils.formatDate(sale.dueDate)}</div>
            <div><strong>Vendedor:</strong> ${ERPUtils.escapeHtml(sale.sellerName || '-')}</div>
          </div>

          <!-- Items Table -->
          <table class="voucher-items-table">
            <thead>
              <tr>
                <th>Ítem / Producto</th>
                <th style="text-align: center;">Cant</th>
                <th style="text-align: right;">Precio Unit.</th>
                <th style="text-align: center;">Desc %</th>
                <th style="text-align: right;">IVA</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items
                .map(
                  (it) => `
                <tr>
                  <td>
                    <strong>${ERPUtils.escapeHtml(it.productName)}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${ERPUtils.escapeHtml(it.productSku)}</div>
                  </td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">${ERPUtils.formatCurrency(it.unitPrice)}</td>
                  <td style="text-align: center;">${it.discount}%</td>
                  <td style="text-align: right;">${ERPUtils.formatCurrency(it.lineTax)}</td>
                  <td style="text-align: right; font-weight: 700;">${ERPUtils.formatCurrency(it.lineTotal)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <!-- Totals Breakdown -->
          <div class="voucher-totals-summary">
            <div class="totals-card">
              <div class="totals-row">
                <span>Subtotal:</span>
                <strong>${ERPUtils.formatCurrency(sale.subtotal)}</strong>
              </div>
              <div class="totals-row">
                <span>Impuestos (IVA 19%):</span>
                <strong>${ERPUtils.formatCurrency(sale.tax)}</strong>
              </div>
              <div class="totals-row grand-total">
                <span>Total Factura:</span>
                <strong>${ERPUtils.formatCurrency(sale.total)}</strong>
              </div>
              <div class="totals-row" style="color: var(--success); font-weight: 600;">
                <span>Total Pagado:</span>
                <span>${ERPUtils.formatCurrency(sale.paidAmount || 0)}</span>
              </div>
              <div class="totals-row" style="color: ${sale.balance > 0 ? 'var(--warning)' : 'var(--text-muted)'}; font-weight: 700;">
                <span>Saldo Pendiente:</span>
                <span>${ERPUtils.formatCurrency(sale.balance)}</span>
              </div>
            </div>
          </div>

          <!-- Payments History Section -->
          <div style="margin-top: 1.5rem;">
            <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Historial de Pagos / Recaudos</h4>
            ${
              payments.length === 0
                ? '<div style="font-size: 0.82rem; color: var(--text-muted);">No se han registrado pagos para este documento.</div>'
                : `
              <table class="table" style="font-size: 0.8rem;">
                <thead>
                  <tr>
                    <th>Recibo</th>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th>Referencia</th>
                    <th>Monto</th>
                    <th>Registrado Por</th>
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
        <button type="button" class="btn btn-secondary" onclick="window.print()">🖨️ Imprimir Factura</button>
        ${sale.status === 'BORRADOR' ? `
          <button type="button" class="btn btn-success" onclick="approveSaleAction('${sale.id}')">✓ Aprobar Venta</button>
        ` : ''}
        ${!['BORRADOR', 'ANULADO', 'PAGADO', 'FINALIZADO'].includes(sale.status) && sale.balance > 0 ? `
          <button type="button" class="btn btn-primary" onclick="openPaymentForSale('${sale.docNumber}')">💵 Registrar Pago</button>
        ` : ''}
        ${sale.status !== 'ANULADO' && sale.status !== 'FINALIZADO' && payments.length === 0 ? `
          <button type="button" class="btn btn-danger" onclick="cancelSaleAction('${sale.id}')">✕ Anular Documento</button>
        ` : ''}
        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').classList.remove('active')">Cerrar</button>
      </div>
    </div>
  `;

  detailModal.classList.add('active');
}

/**
 * Quick trigger for payment modal from Sales
 */
function openPaymentForSale(docNumber) {
  // Close sale detail if open
  const currentDetailModal = document.getElementById('sale-detail-modal-overlay');
  if (currentDetailModal) currentDetailModal.classList.remove('active');

  if (typeof openRegisterPaymentModal === 'function') {
    openRegisterPaymentModal('VENTA', docNumber);
  } else {
    // Redirect to cartera
    window.location.href = `cartera.html?payDoc=${encodeURIComponent(docNumber)}&type=VENTA`;
  }
}

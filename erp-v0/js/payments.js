/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - PAYMENTS & CARTERA MODULE (payments.js)
 * Accounts Receivable, Accounts Payable, Strict Overpayment Defense & Receipts
 * ============================================================================
 */

let activeTab = 'AR'; // 'AR' (Cobrar), 'AP' (Pagar), 'HISTORY' (Historial)

document.addEventListener('DOMContentLoaded', () => {
  if (typeof PaymentService === 'undefined') return;

  setupCarteraListeners();
  loadCarteraViews();

  // If redirected to pay specific doc
  const urlParams = new URLSearchParams(window.location.search);
  const payDoc = urlParams.get('payDoc');
  const type = urlParams.get('type') || 'VENTA';
  if (payDoc) {
    setTimeout(() => {
      openRegisterPaymentModal(type, payDoc);
    }, 200);
  }
});

function setupCarteraListeners() {
  const searchInput = document.getElementById('cartera-search');
  const filterOverdue = document.getElementById('cartera-filter-overdue');

  if (searchInput) searchInput.addEventListener('input', ERPUtils.debounce(loadCarteraViews, 250));
  if (filterOverdue) filterOverdue.addEventListener('change', loadCarteraViews);

  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) paymentForm.addEventListener('submit', handlePaymentSubmit);

  // Tab switching
  const tabBtns = document.querySelectorAll('.cartera-tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');

      document.getElementById('sec-cuentas-cobrar').style.display = activeTab === 'AR' ? 'block' : 'none';
      document.getElementById('sec-cuentas-pagar').style.display = activeTab === 'AP' ? 'block' : 'none';
      document.getElementById('sec-historial-pagos').style.display = activeTab === 'HISTORY' ? 'block' : 'none';

      loadCarteraViews();
    });
  });
}

function loadCarteraViews() {
  const q = (document.getElementById('cartera-search')?.value || '').toLowerCase().trim();
  const onlyOverdue = document.getElementById('cartera-filter-overdue')?.checked || false;

  // 1. Cuentas por Cobrar
  let arList = PaymentService.getAccountsReceivable();
  if (q) {
    arList = arList.filter((s) => s.docNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q));
  }
  if (onlyOverdue) {
    arList = arList.filter((s) => s.isOverdue);
  }
  renderARTable(arList);

  // 2. Cuentas por Pagar
  let apList = PaymentService.getAccountsPayable();
  if (q) {
    apList = apList.filter((p) => p.docNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q));
  }
  if (onlyOverdue) {
    apList = apList.filter((p) => p.isOverdue);
  }
  renderAPTable(apList);

  // 3. Historial de Pagos
  let payments = PaymentService.getAll();
  if (q) {
    payments = payments.filter(
      (p) =>
        p.docCode.toLowerCase().includes(q) ||
        p.docNumber.toLowerCase().includes(q) ||
        p.thirdPartyName.toLowerCase().includes(q)
    );
  }
  renderPaymentsHistoryTable(payments);
}

function renderARTable(list) {
  const tbody = document.getElementById('ar-table-body');
  const countEl = document.getElementById('ar-count');
  const totalBalanceEl = document.getElementById('ar-total-balance');
  if (!tbody) return;

  const totalBalance = list.reduce((acc, r) => acc + r.balance, 0);
  if (countEl) countEl.textContent = `${list.length} documentos pendientes`;
  if (totalBalanceEl) totalBalanceEl.textContent = ERPUtils.formatCurrency(totalBalance);

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay cuentas por cobrar pendientes con los filtros seleccionados</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (s) => `
    <tr>
      <td style="font-weight: 600;">${ERPUtils.escapeHtml(s.customerName)}</td>
      <td><strong>${s.docNumber}</strong></td>
      <td>${ERPUtils.formatDate(s.date)}</td>
      <td>${ERPUtils.formatDate(s.dueDate)}</td>
      <td>${ERPUtils.formatCurrency(s.total)}</td>
      <td style="color: var(--success); font-weight: 600;">${ERPUtils.formatCurrency(s.paidAmount || 0)}</td>
      <td style="font-weight: 700; color: ${s.isOverdue ? 'var(--danger)' : 'var(--warning)'};">${ERPUtils.formatCurrency(s.balance)}</td>
      <td>
        ${
          s.isOverdue
            ? `<span class="badge badge-danger">${s.daysOverdue} días vencida</span>`
            : `<span class="badge badge-info">Al día</span>`
        }
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn btn-primary btn-sm" onclick="openRegisterPaymentModal('VENTA', '${s.docNumber}')">
          💵 Recaudar
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

function renderAPTable(list) {
  const tbody = document.getElementById('ap-table-body');
  const countEl = document.getElementById('ap-count');
  const totalBalanceEl = document.getElementById('ap-total-balance');
  if (!tbody) return;

  const totalBalance = list.reduce((acc, r) => acc + r.balance, 0);
  if (countEl) countEl.textContent = `${list.length} documentos pendientes`;
  if (totalBalanceEl) totalBalanceEl.textContent = ERPUtils.formatCurrency(totalBalance);

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay cuentas por pagar pendientes</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map(
      (p) => `
    <tr>
      <td style="font-weight: 600;">${ERPUtils.escapeHtml(p.supplierName)}</td>
      <td><strong>${p.docNumber}</strong></td>
      <td>${ERPUtils.formatDate(p.date)}</td>
      <td>${ERPUtils.formatDate(p.dueDate)}</td>
      <td>${ERPUtils.formatCurrency(p.total)}</td>
      <td style="color: var(--success); font-weight: 600;">${ERPUtils.formatCurrency(p.paidAmount || 0)}</td>
      <td style="font-weight: 700; color: ${p.isOverdue ? 'var(--danger)' : 'var(--warning)'};">${ERPUtils.formatCurrency(p.balance)}</td>
      <td>
        ${
          p.isOverdue
            ? `<span class="badge badge-danger">${p.daysOverdue} días vencida</span>`
            : `<span class="badge badge-info">Al día</span>`
        }
      </td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn btn-primary btn-sm" onclick="openRegisterPaymentModal('COMPRA', '${p.docNumber}')">
          💵 Pagar
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

function renderPaymentsHistoryTable(payments) {
  const tbody = document.getElementById('history-payments-table-body');
  const countEl = document.getElementById('history-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${payments.length} pagos registrados`;

  // Sort newest first
  payments.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay pagos registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = payments
    .map(
      (p) => `
    <tr>
      <td><strong>${p.docCode}</strong></td>
      <td><span class="badge ${p.docType === 'VENTA' ? 'badge-success' : 'badge-warning'}">${p.docType}</span></td>
      <td><strong>${p.docNumber}</strong></td>
      <td style="font-weight: 600;">${ERPUtils.escapeHtml(p.thirdPartyName)}</td>
      <td>${p.paymentMethod}</td>
      <td style="font-weight: 800; color: ${p.docType === 'VENTA' ? 'var(--success)' : 'var(--danger)'};">
        ${p.docType === 'VENTA' ? '+' : '-'} ${ERPUtils.formatCurrency(p.amount)}
      </td>
      <td>${ERPUtils.formatDateTime(p.date)}</td>
      <td style="font-size: 0.78rem; color: var(--text-muted);">${ERPUtils.escapeHtml(p.userName || '-')}</td>
    </tr>
  `
    )
    .join('');
}

/**
 * Open Register Payment Modal
 * (Requirement 18: Never permit paying more than pending balance)
 */
function openRegisterPaymentModal(docType, docNumber) {
  let doc = null;
  if (docType === 'VENTA') {
    doc = SalesService.getByDocNumber(docNumber);
  } else {
    doc = PurchaseService.getByDocNumber(docNumber);
  }

  if (!doc) {
    ERPUtils.showToast('Error', 'Documento no encontrado', 'danger');
    return;
  }

  if (doc.balance <= 0) {
    ERPUtils.showToast('Documento Pagado', 'Este documento ya tiene saldo cero.', 'info');
    return;
  }

  const form = document.getElementById('payment-form');
  if (form) form.reset();

  document.getElementById('pay-doc-type').value = docType;
  document.getElementById('pay-doc-number').value = docNumber;
  document.getElementById('pay-third-party-info').textContent = `${docType === 'VENTA' ? 'Cliente' : 'Proveedor'}: ${doc.customerName || doc.supplierName}`;
  document.getElementById('pay-total-info').textContent = `Total Documento: ${ERPUtils.formatCurrency(doc.total)}`;
  document.getElementById('pay-current-balance-info').textContent = `Saldo Pendiente: ${ERPUtils.formatCurrency(doc.balance)}`;
  document.getElementById('pay-max-balance-hidden').value = doc.balance;

  // Auto-fill full balance as suggestion
  const amtInput = document.getElementById('pay-amount');
  amtInput.value = doc.balance;
  amtInput.max = doc.balance;

  const modal = document.getElementById('payment-modal-overlay');
  if (modal) modal.classList.add('active');
}

/**
 * Handle Payment Form Submit with Strict Validation
 */
function handlePaymentSubmit(e) {
  e.preventDefault();

  const docType = document.getElementById('pay-doc-type').value;
  const docNumber = document.getElementById('pay-doc-number').value;
  const amount = Number(document.getElementById('pay-amount').value);
  const paymentMethod = document.getElementById('pay-method').value;
  const reference = document.getElementById('pay-reference').value.trim();
  const notes = document.getElementById('pay-notes').value.trim();

  // Validate amount > 0
  if (amount <= 0) {
    ERPUtils.showToast('Validación', 'El monto a pagar debe ser mayor a cero.', 'danger');
    return;
  }

  try {
    // Calling domain service: PaymentService.createPayment validates overpayment inside!
    const payment = PaymentService.createPayment({
      docType,
      docNumber,
      amount,
      paymentMethod,
      reference,
      notes,
    });

    ERPUtils.showToast(
      'Pago Registrado',
      `Comprobante ${payment.docCode} por ${ERPUtils.formatCurrency(payment.amount)} registrado con éxito.`,
      'success'
    );

    closePaymentModal();
    loadCarteraViews();
  } catch (err) {
    // Shows strict business rule error: "El pago excede el saldo pendiente del documento."
    ERPUtils.showToast('Validación de Cartera', err.message, 'danger', 5000);
  }
}

function closePaymentModal() {
  const modal = document.getElementById('payment-modal-overlay');
  if (modal) modal.classList.remove('active');
}

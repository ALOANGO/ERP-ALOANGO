/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - PARTNERS MODULE (partners.js)
 * Customers & Suppliers management, uniqueness validation, filters & modal CRUD
 * ============================================================================
 */

let currentPartners = [];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof PartnerService === 'undefined') return;

  setupPartnerEventListeners();
  loadPartnersTable();

  // If routed with doc search query
  const urlParams = new URLSearchParams(window.location.search);
  const docQuery = urlParams.get('doc');
  if (docQuery) {
    const searchInput = document.getElementById('filter-partner-search');
    if (searchInput) {
      searchInput.value = docQuery;
      applyPartnerFilters();
    }
  }
});

function setupPartnerEventListeners() {
  const searchInput = document.getElementById('filter-partner-search');
  const typeSelect = document.getElementById('filter-partner-type');

  if (searchInput) searchInput.addEventListener('input', ERPUtils.debounce(applyPartnerFilters, 250));
  if (typeSelect) typeSelect.addEventListener('change', applyPartnerFilters);

  const form = document.getElementById('partner-form');
  if (form) form.addEventListener('submit', handlePartnerFormSubmit);
}

function loadPartnersTable() {
  currentPartners = PartnerService.getAll();
  applyPartnerFilters();
}

function applyPartnerFilters() {
  const q = (document.getElementById('filter-partner-search')?.value || '').trim();
  const type = document.getElementById('filter-partner-type')?.value || 'all';

  currentPartners = PartnerService.search(q, type);
  renderPartnersTable(currentPartners);
}

function renderPartnersTable(partners) {
  const tbody = document.getElementById('partners-table-body');
  const countEl = document.getElementById('partners-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${partners.length} terceros`;

  if (partners.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron registros de clientes o proveedores</td></tr>`;
    return;
  }

  tbody.innerHTML = partners
    .map(
      (p) => `
    <tr>
      <td><strong>${ERPUtils.escapeHtml(p.docType || 'NIT')} ${ERPUtils.escapeHtml(p.docNumber)}</strong></td>
      <td style="font-weight: 600;">${ERPUtils.escapeHtml(p.legalName)}</td>
      <td>${p.commercialName ? ERPUtils.escapeHtml(p.commercialName) : '-'}</td>
      <td>
        <span class="badge ${p.type === 'AMBOS' ? 'badge-purple' : p.type === 'PROVEEDOR' ? 'badge-warning' : 'badge-info'}">
          ${p.type}
        </span>
      </td>
      <td>${ERPUtils.escapeHtml(p.phone || '-')}</td>
      <td>${ERPUtils.escapeHtml(p.email || '-')}</td>
      <td>${ERPUtils.escapeHtml(p.city || '-')}</td>
      <td style="text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="openEditPartnerModal('${p.id}')" title="Editar">
          ✏️
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

function openNewPartnerModal() {
  const form = document.getElementById('partner-form');
  if (form) form.reset();

  document.getElementById('partner-modal-title').textContent = 'Nuevo Tercero (Cliente / Proveedor)';
  document.getElementById('partner-id').value = '';
  document.getElementById('partner-doc-number').disabled = false;
  document.getElementById('partner-status').value = 'ACTIVO';

  const modal = document.getElementById('partner-modal-overlay');
  if (modal) modal.classList.add('active');
}

function openEditPartnerModal(id) {
  const p = PartnerService.getById(id);
  if (!p) return;

  document.getElementById('partner-modal-title').textContent = `Editar Tercero — ${p.legalName}`;
  document.getElementById('partner-id').value = p.id;
  document.getElementById('partner-type').value = p.type;
  document.getElementById('partner-doc-type').value = p.docType || 'NIT';
  document.getElementById('partner-doc-number').value = p.docNumber;
  document.getElementById('partner-doc-number').disabled = false;
  document.getElementById('partner-legal-name').value = p.legalName;
  document.getElementById('partner-commercial-name').value = p.commercialName || '';
  document.getElementById('partner-email').value = p.email || '';
  document.getElementById('partner-phone').value = p.phone || '';
  document.getElementById('partner-address').value = p.address || '';
  document.getElementById('partner-city').value = p.city || '';
  document.getElementById('partner-tax-regime').value = p.taxRegime || 'Responsable de IVA';
  document.getElementById('partner-status').value = p.status || 'ACTIVO';

  const modal = document.getElementById('partner-modal-overlay');
  if (modal) modal.classList.add('active');
}

function handlePartnerFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('partner-id').value;
  const type = document.getElementById('partner-type').value;
  const docType = document.getElementById('partner-doc-type').value;
  const docNumber = document.getElementById('partner-doc-number').value.trim();
  const legalName = document.getElementById('partner-legal-name').value.trim();
  const commercialName = document.getElementById('partner-commercial-name').value.trim();
  const email = document.getElementById('partner-email').value.trim();
  const phone = document.getElementById('partner-phone').value.trim();
  const address = document.getElementById('partner-address').value.trim();
  const city = document.getElementById('partner-city').value.trim();
  const taxRegime = document.getElementById('partner-tax-regime').value;
  const status = document.getElementById('partner-status').value;

  if (!docNumber) {
    ERPUtils.showToast('Validación', 'El número de documento es obligatorio.', 'danger');
    return;
  }
  if (!legalName) {
    ERPUtils.showToast('Validación', 'La razón social / nombre es obligatorio.', 'danger');
    return;
  }

  try {
    if (id) {
      PartnerService.update(id, {
        type,
        docType,
        docNumber,
        legalName,
        commercialName,
        email,
        phone,
        address,
        city,
        taxRegime,
        status,
      });
      ERPUtils.showToast('Tercero Actualizado', `${legalName} actualizado satisfactoriamente.`, 'success');
    } else {
      PartnerService.create({
        type,
        docType,
        docNumber,
        legalName,
        commercialName,
        email,
        phone,
        address,
        city,
        taxRegime,
        status,
      });
      ERPUtils.showToast('Tercero Creado', `${legalName} registrado con éxito.`, 'success');
    }

    closePartnerModal();
    loadPartnersTable();
  } catch (error) {
    ERPUtils.showToast('Error', error.message, 'danger');
  }
}

function closePartnerModal() {
  const modal = document.getElementById('partner-modal-overlay');
  if (modal) modal.classList.remove('active');
}

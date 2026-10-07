/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - PRODUCTS MODULE (products.js)
 * Products management, search, filters, validation, SKU uniqueness & modal details
 * ============================================================================
 */

let currentProducts = [];
let sortCol = 'name';
let sortAsc = true;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof InventoryService === 'undefined') return;

  setupProductEventListeners();
  loadProductsTable();

  // Check URL query for SKU (if routed from global search)
  const urlParams = new URLSearchParams(window.location.search);
  const searchSku = urlParams.get('sku');
  if (searchSku) {
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.value = searchSku;
      applyFilters();
    }
  }
});

function setupProductEventListeners() {
  const searchInput = document.getElementById('filter-search');
  const catSelect = document.getElementById('filter-category');
  const statusSelect = document.getElementById('filter-status');

  if (searchInput) searchInput.addEventListener('input', ERPUtils.debounce(applyFilters, 250));
  if (catSelect) catSelect.addEventListener('change', applyFilters);
  if (statusSelect) statusSelect.addEventListener('change', applyFilters);

  // Sorting columns
  const tableHeaders = document.querySelectorAll('th.sortable');
  tableHeaders.forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (sortCol === col) {
        sortAsc = !sortAsc;
      } else {
        sortCol = col;
        sortAsc = true;
      }
      renderProductsList(currentProducts);
    });
  });

  // Product form submission
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', handleProductFormSubmit);
  }
}

function loadProductsTable() {
  currentProducts = InventoryService.getAllProducts();
  applyFilters();
}

function applyFilters() {
  const q = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('filter-category')?.value || 'ALL';
  const status = document.getElementById('filter-status')?.value || 'ALL';

  let list = InventoryService.getAllProducts();

  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }

  if (cat !== 'ALL') {
    list = list.filter((p) => p.category === cat);
  }

  if (status !== 'ALL') {
    list = list.filter((p) => {
      const invStatus = InventoryService.getInventoryStatus(p);
      if (status === 'STOCK_CRITICO') return invStatus === 'Stock crítico';
      if (status === 'SIN_STOCK') return invStatus === 'Sin stock';
      return p.status === status;
    });
  }

  currentProducts = list;
  renderProductsList(currentProducts);
}

function renderProductsList(products) {
  const tbody = document.getElementById('products-table-body');
  const counterEl = document.getElementById('products-count');
  if (!tbody) return;

  if (counterEl) counterEl.textContent = `${products.length} productos`;

  // Sort
  products.sort((a, b) => {
    let valA = a[sortCol];
    let valB = b[sortCol];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron productos con los filtros aplicados</td></tr>`;
    return;
  }

  tbody.innerHTML = products
    .map((p) => {
      const invStatus = InventoryService.getInventoryStatus(p);
      const isCritical = invStatus !== 'Normal';

      return `
      <tr>
        <td>
          <img src="${ERPUtils.escapeHtml(p.imageUrl)}" alt="${ERPUtils.escapeHtml(p.name)}" class="table-img" onerror="this.src='https://placehold.co/80x80?text=IMG'"/>
        </td>
        <td><strong>${ERPUtils.escapeHtml(p.sku)}</strong></td>
        <td>${p.barcode ? ERPUtils.escapeHtml(p.barcode) : '<span style="color:var(--text-light)">N/A</span>'}</td>
        <td style="font-weight: 600; max-width: 260px;">${ERPUtils.escapeHtml(p.name)}</td>
        <td><span class="badge badge-secondary">${ERPUtils.escapeHtml(p.category)}</span></td>
        <td>${ERPUtils.formatCurrency(p.cost)}</td>
        <td style="font-weight: 700; color: var(--primary);">${ERPUtils.formatCurrency(p.price)}</td>
        <td>
          <span style="font-weight: 700; color: ${isCritical ? 'var(--danger)' : 'var(--text-main)'};">
            ${p.stock}
          </span>
        </td>
        <td>${p.minStock}</td>
        <td>
          ${p.status === 'INACTIVO' ? '<span class="badge badge-secondary">Inactivo</span>' : (isCritical ? ERPUtils.getStatusBadge(invStatus) : '<span class="badge badge-success">Activo</span>')}
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="viewProductDetail('${p.id}')" title="Ver detalle">
              👁️
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openEditProductModal('${p.id}')" title="Editar">
              ✏️
            </button>
            <button class="btn btn-secondary btn-sm" onclick="toggleProductStatus('${p.id}')" title="${p.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}">
              ${p.status === 'ACTIVO' ? '⏸️' : '▶️'}
            </button>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');
}

/**
 * Open Modal to Create New Product
 */
function openNewProductModal() {
  const form = document.getElementById('product-form');
  if (form) form.reset();

  document.getElementById('product-modal-title').textContent = 'Nuevo Producto';
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-sku').disabled = false;
  document.getElementById('prod-status').value = 'ACTIVO';
  document.getElementById('prod-tax').value = '0.19';

  const modal = document.getElementById('product-modal-overlay');
  if (modal) modal.classList.add('active');
}

/**
 * Open Modal to Edit Product
 */
function openEditProductModal(id) {
  const product = InventoryService.getProductById(id);
  if (!product) return;

  document.getElementById('product-modal-title').textContent = `Editar Producto — ${product.sku}`;
  document.getElementById('prod-id').value = product.id;
  document.getElementById('prod-sku').value = product.sku;
  document.getElementById('prod-sku').disabled = true; // SKU immutable after creation
  document.getElementById('prod-name').value = product.name;
  document.getElementById('prod-category').value = product.category;
  document.getElementById('prod-barcode').value = product.barcode || '';
  document.getElementById('prod-unit').value = product.unit || 'UND';
  document.getElementById('prod-cost').value = product.cost;
  document.getElementById('prod-price').value = product.price;
  document.getElementById('prod-min-stock').value = product.minStock;
  document.getElementById('prod-image').value = product.imageUrl || '';
  document.getElementById('prod-description').value = product.description || '';
  document.getElementById('prod-tax').value = product.taxRate || 0.19;
  document.getElementById('prod-status').value = product.status || 'ACTIVO';

  const modal = document.getElementById('product-modal-overlay');
  if (modal) modal.classList.add('active');
}

/**
 * Handle submit for Product (Create / Update)
 */
function handleProductFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('prod-id').value;
  const sku = document.getElementById('prod-sku').value.trim();
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const barcode = document.getElementById('prod-barcode').value.trim();
  const unit = document.getElementById('prod-unit').value.trim();
  const cost = Number(document.getElementById('prod-cost').value);
  const price = Number(document.getElementById('prod-price').value);
  const minStock = Number(document.getElementById('prod-min-stock').value);
  const imageUrl = document.getElementById('prod-image').value.trim() || `https://picsum.photos/seed/${sku.toLowerCase()}/400/400`;
  const description = document.getElementById('prod-description').value.trim();
  const taxRate = Number(document.getElementById('prod-tax').value);
  const status = document.getElementById('prod-status').value;

  // Validation rules (Requirement 7)
  if (!sku) {
    ERPUtils.showToast('Validación', 'El SKU es obligatorio.', 'danger');
    return;
  }
  if (!name) {
    ERPUtils.showToast('Validación', 'El nombre es obligatorio.', 'danger');
    return;
  }
  if (cost < 0 || price < 0 || minStock < 0) {
    ERPUtils.showToast('Validación', 'Los valores de costo, precio y stock mínimo deben ser mayores o iguales a cero.', 'danger');
    return;
  }

  try {
    if (id) {
      // Update
      InventoryService.updateProduct(id, {
        name,
        category,
        barcode,
        unit,
        cost,
        price,
        minStock,
        imageUrl,
        description,
        taxRate,
        status,
      });
      ERPUtils.showToast('Producto Actualizado', `El producto ${sku} ha sido actualizado correctamente.`, 'success');
    } else {
      // Create (Uniqueness checked inside service)
      InventoryService.createProduct({
        sku,
        name,
        category,
        barcode,
        unit,
        cost,
        price,
        stock: 0,
        minStock,
        imageUrl,
        description,
        taxRate,
        status,
      });
      ERPUtils.showToast('Producto Creado', `El producto ${sku} se ha creado satisfactoriamente.`, 'success');
    }

    closeProductModal();
    loadProductsTable();
  } catch (error) {
    ERPUtils.showToast('Error', error.message, 'danger');
  }
}

function closeProductModal() {
  const modal = document.getElementById('product-modal-overlay');
  if (modal) modal.classList.remove('active');
}

/**
 * Toggle Active / Inactive
 */
function toggleProductStatus(id) {
  const product = InventoryService.getProductById(id);
  if (!product) return;

  const nextStatus = product.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  InventoryService.updateProduct(id, { status: nextStatus });
  ERPUtils.showToast('Estado Modificado', `El producto ${product.sku} ahora está ${nextStatus}.`, 'info');
  loadProductsTable();
}

/**
 * View Product Detail Modal with Large Image (Requirement 8)
 */
function viewProductDetail(id) {
  const p = InventoryService.getProductById(id);
  if (!p) return;

  let detailModal = document.getElementById('product-detail-modal-overlay');
  if (!detailModal) {
    detailModal = document.createElement('div');
    detailModal.id = 'product-detail-modal-overlay';
    detailModal.className = 'modal-overlay';
    document.body.appendChild(detailModal);
  }

  const invStatus = InventoryService.getInventoryStatus(p);

  detailModal.innerHTML = `
    <div class="modal-dialog modal-dialog-lg">
      <div class="modal-header">
        <h3 class="modal-title">Ficha Técnica — ${ERPUtils.escapeHtml(p.name)}</h3>
        <button type="button" class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
          <div style="width: 280px; flex-shrink: 0;">
            <img src="${ERPUtils.escapeHtml(p.imageUrl)}" alt="${ERPUtils.escapeHtml(p.name)}" style="width: 100%; height: 280px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border);" onerror="this.src='https://placehold.co/300x300?text=SIN+IMAGEN'"/>
            <div style="margin-top: 1rem; text-align: center;">
              <span class="badge ${p.status === 'ACTIVO' ? 'badge-success' : 'badge-secondary'}" style="font-size: 0.85rem; padding: 0.35rem 0.8rem;">
                ${p.status}
              </span>
              <div style="margin-top: 0.5rem;">
                ${ERPUtils.getStatusBadge(invStatus)}
              </div>
            </div>
          </div>
          <div style="flex: 1; min-width: 280px;">
            <table class="table" style="font-size: 0.9rem;">
              <tr><th style="width: 140px;">SKU:</th><td><strong>${ERPUtils.escapeHtml(p.sku)}</strong></td></tr>
              <tr><th>Código de Barras:</th><td>${p.barcode ? ERPUtils.escapeHtml(p.barcode) : 'No asignado'}</td></tr>
              <tr><th>Categoría:</th><td>${ERPUtils.escapeHtml(p.category)}</td></tr>
              <tr><th>Unidad Medida:</th><td>${ERPUtils.escapeHtml(p.unit || 'UND')}</td></tr>
              <tr><th>Stock Actual:</th><td><span style="font-size: 1.1rem; font-weight: 800; color: ${invStatus !== 'Normal' ? 'var(--danger)' : 'var(--success)'};">${p.stock}</span></td></tr>
              <tr><th>Stock Mínimo:</th><td>${p.minStock}</td></tr>
              <tr><th>Costo Unitario:</th><td>${ERPUtils.formatCurrency(p.cost)}</td></tr>
              <tr><th>Precio Venta:</th><td><strong style="color: var(--primary); font-size: 1.1rem;">${ERPUtils.formatCurrency(p.price)}</strong></td></tr>
              <tr><th>Impuesto (IVA):</th><td>${((p.taxRate || 0.19) * 100).toFixed(0)}%</td></tr>
              <tr><th>Margen Estimado:</th><td>${ERPUtils.formatCurrency(p.price - p.cost)} (${p.cost > 0 ? Math.round(((p.price - p.cost) / p.cost) * 100) : 100}%)</td></tr>
              <tr><th>Descripción:</th><td>${p.description ? ERPUtils.escapeHtml(p.description) : 'Sin observaciones adicionales.'}</td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <a href="kardex.html?productId=${p.id}" class="btn btn-secondary">Ver Kárdex</a>
        <button type="button" class="btn btn-primary" onclick="this.closest('.modal-overlay').classList.remove('active')">Cerrar</button>
      </div>
    </div>
  `;

  detailModal.classList.add('active');
}

/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - CORE APP COORDINATOR (app.js)
 * Global layout, drawer sidebar, global grouped search, seed trigger & notifications
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Seed Data if first time
  if (typeof SeedService !== 'undefined') {
    SeedService.initSeed(false);
  }

  // 2. Auth Session Guard & UI Render
  if (typeof AuthService !== 'undefined') {
    AuthService.renderUserUI();

    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        ERPUtils.showConfirmModal({
          title: 'Cerrar Sesión',
          message: '¿Está seguro de salir del sistema ERP?',
          confirmText: 'Cerrar Sesión',
          confirmClass: 'btn-danger',
          onConfirm: () => {
            AuthService.logout();
          },
        });
      });
    });
  }

  // 3. Setup Responsive Sidebar Toggle
  const sidebarToggleBtn = document.querySelector('.sidebar-toggle-btn');
  const sidebar = document.querySelector('.sidebar');
  let backdrop = document.querySelector('.sidebar-backdrop');

  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      backdrop.classList.toggle('active');
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('show');
      backdrop.classList.remove('active');
    });
  }

  // 4. Highlight Active Navigation Item
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 5. Global Search Handler (Requirement 23)
  setupGlobalSearch();

  // 6. Check System Alerts for Notifications Pill
  setupSystemAlerts();
});

/**
 * Setup Global Search across Products, Sales, Purchases, Partners
 */
function setupGlobalSearch() {
  const searchInput = document.getElementById('global-search-input');
  const resultsContainer = document.getElementById('search-results-dropdown');

  if (!searchInput || !resultsContainer) return;

  const performSearch = ERPUtils.debounce((query) => {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) {
      resultsContainer.classList.remove('show');
      resultsContainer.innerHTML = '';
      return;
    }

    const products = typeof InventoryService !== 'undefined'
      ? InventoryService.getAllProducts().filter((p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))
        ).slice(0, 4)
      : [];

    const partners = typeof PartnerService !== 'undefined'
      ? PartnerService.getAll().filter((p) =>
          p.legalName.toLowerCase().includes(q) || p.docNumber.toLowerCase().includes(q)
        ).slice(0, 4)
      : [];

    const sales = typeof SalesService !== 'undefined'
      ? SalesService.getAll().filter((s) =>
          s.docNumber.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q)
        ).slice(0, 4)
      : [];

    const purchases = typeof PurchaseService !== 'undefined'
      ? PurchaseService.getAll().filter((p) =>
          p.docNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)
        ).slice(0, 4)
      : [];

    const hasResults = products.length > 0 || partners.length > 0 || sales.length > 0 || purchases.length > 0;

    if (!hasResults) {
      resultsContainer.innerHTML = `<div style="padding: 1rem; color: var(--text-muted); text-align: center; font-size: 0.85rem;">No se encontraron resultados para "${ERPUtils.escapeHtml(q)}"</div>`;
      resultsContainer.classList.add('show');
      return;
    }

    let html = '';

    // Group 1: Products
    if (products.length > 0) {
      html += `<div class="search-group"><div class="search-group-header">Productos</div>`;
      products.forEach((p) => {
        html += `
          <a href="productos.html?sku=${encodeURIComponent(p.sku)}" class="search-result-item">
            <div>
              <div class="search-result-title">${ERPUtils.escapeHtml(p.name)}</div>
              <div class="search-result-meta">SKU: ${ERPUtils.escapeHtml(p.sku)} | Stock: ${p.stock}</div>
            </div>
            <span style="font-weight: 600; font-size: 0.85rem;">${ERPUtils.formatCurrency(p.price)}</span>
          </a>
        `;
      });
      html += `</div>`;
    }

    // Group 2: Partners
    if (partners.length > 0) {
      html += `<div class="search-group"><div class="search-group-header">Terceros (Clientes / Proveedores)</div>`;
      partners.forEach((p) => {
        html += `
          <a href="terceros.html?doc=${encodeURIComponent(p.docNumber)}" class="search-result-item">
            <div>
              <div class="search-result-title">${ERPUtils.escapeHtml(p.legalName)}</div>
              <div class="search-result-meta">${p.type} - Doc: ${ERPUtils.escapeHtml(p.docNumber)}</div>
            </div>
            <span class="badge badge-info">${p.type}</span>
          </a>
        `;
      });
      html += `</div>`;
    }

    // Group 3: Sales
    if (sales.length > 0) {
      html += `<div class="search-group"><div class="search-group-header">Ventas</div>`;
      sales.forEach((s) => {
        html += `
          <a href="ventas.html?doc=${encodeURIComponent(s.docNumber)}" class="search-result-item">
            <div>
              <div class="search-result-title">${s.docNumber} - ${ERPUtils.escapeHtml(s.customerName)}</div>
              <div class="search-result-meta">Fecha: ${ERPUtils.formatDate(s.date)} | Saldo: ${ERPUtils.formatCurrency(s.balance)}</div>
            </div>
            <span style="font-weight: 600;">${ERPUtils.formatCurrency(s.total)}</span>
          </a>
        `;
      });
      html += `</div>`;
    }

    // Group 4: Purchases
    if (purchases.length > 0) {
      html += `<div class="search-group"><div class="search-group-header">Compras</div>`;
      purchases.forEach((p) => {
        html += `
          <a href="compras.html?doc=${encodeURIComponent(p.docNumber)}" class="search-result-item">
            <div>
              <div class="search-result-title">${p.docNumber} - ${ERPUtils.escapeHtml(p.supplierName)}</div>
              <div class="search-result-meta">Fecha: ${ERPUtils.formatDate(p.date)} | Saldo: ${ERPUtils.formatCurrency(p.balance)}</div>
            </div>
            <span style="font-weight: 600;">${ERPUtils.formatCurrency(p.total)}</span>
          </a>
        `;
      });
      html += `</div>`;
    }

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('show');
  }, 250);

  searchInput.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.remove('show');
    }
  });
}

/**
 * Global Notifications Indicator & Alerts (Requirement 24)
 */
function setupSystemAlerts() {
  if (typeof InventoryService === 'undefined' || typeof PaymentService === 'undefined') return;

  const criticalStockList = InventoryService.getAllProducts().filter(
    (p) => InventoryService.getInventoryStatus(p) !== 'Normal'
  );
  const overdueReceivables = PaymentService.getAccountsReceivable().filter((r) => r.isOverdue);

  const notifBtn = document.getElementById('btn-system-notifications');
  const notifBadge = document.getElementById('notif-badge-count');

  const totalAlerts = criticalStockList.length + overdueReceivables.length;

  if (notifBadge) {
    if (totalAlerts > 0) {
      notifBadge.textContent = totalAlerts;
      notifBadge.style.display = 'inline-block';
    } else {
      notifBadge.style.display = 'none';
    }
  }

  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      let message = ``;
      if (criticalStockList.length > 0) {
        message += `<strong>${criticalStockList.length} producto(s)</strong> con inventario crítico o agotado.<br>`;
      }
      if (overdueReceivables.length > 0) {
        message += `<strong>${overdueReceivables.length} factura(s)</strong> de clientes actualmente vencidas.<br>`;
      }
      if (totalAlerts === 0) {
        message = 'No hay alertas críticas en el sistema. Todo se encuentra al día.';
      }

      ERPUtils.showToast(
        'Centro de Alertas ERP',
        message,
        totalAlerts > 0 ? 'warning' : 'info',
        6000
      );
    });
  }
}

/**
 * Global Reset Database helper
 */
function resetSystemData() {
  ERPUtils.showConfirmModal({
    title: 'Reiniciar Base de Datos Local',
    message: 'Esta acción borrará todas las transacciones actuales y re-generará los 50 productos, clientes, compras y ventas iniciales de prueba. ¿Desea continuar?',
    confirmText: 'Sí, reiniciar datos',
    confirmClass: 'btn-danger',
    onConfirm: () => {
      SeedService.initSeed(true);
      ERPUtils.showToast('Sistema Reiniciado', 'Los datos se han reestablecido con éxito.', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    },
  });
}

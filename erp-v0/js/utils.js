/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - UTILITIES & HELPERS (utils.js)
 * Formatting, Notifications (Toasts), Dialogs, DOM Helpers
 * ============================================================================
 */

const ERPUtils = (() => {
  /**
   * Format numbers to currency format: $ 1.250.000
   * @param {number|string} amount 
   */
  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  /**
   * Format quantity with thousands separator
   */
  const formatNumber = (num, decimals = 0) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(num) || 0);
  };

  /**
   * Format ISO string to DD/MM/YYYY
   */
  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  /**
   * Format ISO string to DD/MM/YYYY HH:mm
   */
  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get current date in YYYY-MM-DD format for HTML date inputs
   */
  const getTodayISO = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  /**
   * Calculate difference in days between a date and today (or target)
   */
  const getDaysDifference = (targetDateString) => {
    if (!targetDateString) return 0;
    const target = new Date(targetDateString);
    const now = new Date();
    // Reset hours to compare purely days
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - target.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * Escape HTML to prevent XSS
   */
  const escapeHtml = (unsafe) => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  /**
   * Display a floating Toast notification
   * @param {string} title 
   * @param {string} message 
   * @param {string} type 'success' | 'warning' | 'danger' | 'info'
   * @param {number} duration ms
   */
  const showToast = (title, message, type = 'info', duration = 4500) => {
    let container = document.getElementById('erp-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'erp-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button type="button" class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          toast.style.transition = 'all 0.3s ease';
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  };

  /**
   * Show confirmation modal with customizable callbacks
   */
  const showConfirmModal = ({
    title = 'Confirmación requerida',
    message = '¿Está seguro de continuar?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    confirmClass = 'btn-primary',
    onConfirm = () => {},
  }) => {
    let modalOverlay = document.getElementById('erp-confirm-modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'erp-confirm-modal-overlay';
      modalOverlay.className = 'modal-overlay';
      document.body.appendChild(modalOverlay);
    }

    modalOverlay.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="modal-title">${escapeHtml(title)}</h3>
          <button type="button" class="modal-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-main);">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-cancel-confirm">${escapeHtml(cancelText)}</button>
          <button type="button" class="btn ${confirmClass} btn-do-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    const closeModal = () => {
      modalOverlay.classList.remove('active');
    };

    modalOverlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modalOverlay.querySelector('.btn-cancel-confirm').addEventListener('click', closeModal);

    modalOverlay.querySelector('.btn-do-confirm').addEventListener('click', () => {
      closeModal();
      onConfirm();
    });

    modalOverlay.classList.add('active');
  };

  /**
   * Return standardized status badge HTML
   */
  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'BORRADOR':
        return `<span class="badge badge-info">Borrador</span>`;
      case 'APROBADO':
        return `<span class="badge badge-purple">Aprobado</span>`;
      case 'PARCIALMENTE PAGADO':
      case 'PARCIAL':
        return `<span class="badge badge-warning">Parcial</span>`;
      case 'PAGADO':
        return `<span class="badge badge-success">Pagado</span>`;
      case 'FINALIZADO':
        return `<span class="badge badge-success">Finalizado</span>`;
      case 'ANULADO':
        return `<span class="badge badge-danger">Anulado</span>`;
      case 'ACTIVO':
        return `<span class="badge badge-success">Activo</span>`;
      case 'INACTIVO':
        return `<span class="badge badge-secondary">Inactivo</span>`;
      case 'NORMAL':
        return `<span class="badge badge-success">Normal</span>`;
      case 'STOCK CRITICO':
      case 'STOCK CRÍTICO':
        return `<span class="badge badge-warning">Stock Crítico</span>`;
      case 'SIN STOCK':
        return `<span class="badge badge-danger">Sin Stock</span>`;
      default:
        return `<span class="badge badge-secondary">${escapeHtml(status)}</span>`;
    }
  };

  /**
   * Debounce helper
   */
  const debounce = (func, delay = 300) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  return {
    formatCurrency,
    formatNumber,
    formatDate,
    formatDateTime,
    getTodayISO,
    getDaysDifference,
    escapeHtml,
    showToast,
    showConfirmModal,
    getStatusBadge,
    debounce,
  };
})();

/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - AUDITORIA MODULE (auditoria.js)
 * Traceability viewer, before/after diff inspector & transaction logs
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof AuditService === 'undefined') return;

  setupAuditListeners();
  loadAuditLogs();
});

function setupAuditListeners() {
  const searchInput = document.getElementById('audit-search');
  const moduleSelect = document.getElementById('audit-module');
  const actionSelect = document.getElementById('audit-action');

  if (searchInput) searchInput.addEventListener('input', ERPUtils.debounce(loadAuditLogs, 250));
  if (moduleSelect) moduleSelect.addEventListener('change', loadAuditLogs);
  if (actionSelect) actionSelect.addEventListener('change', loadAuditLogs);
}

function loadAuditLogs() {
  const search = (document.getElementById('audit-search')?.value || '').trim();
  const module = document.getElementById('audit-module')?.value || '';
  const action = document.getElementById('audit-action')?.value || '';

  const logs = AuditService.getLogs({
    search,
    module,
    action,
  });

  renderAuditTable(logs);
}

function renderAuditTable(logs) {
  const tbody = document.getElementById('audit-table-body');
  const countEl = document.getElementById('audit-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${logs.length} registros`;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron registros de auditoría</td></tr>`;
    return;
  }

  tbody.innerHTML = logs
    .map((l) => {
      let badgeClass = 'badge-secondary';
      if (l.action === 'CREATE') badgeClass = 'badge-success';
      if (l.action === 'APPROVE') badgeClass = 'badge-purple';
      if (l.action === 'CANCEL') badgeClass = 'badge-danger';
      if (l.action === 'PAYMENT') badgeClass = 'badge-info';
      if (l.action === 'UPDATE') badgeClass = 'badge-warning';

      return `
      <tr>
        <td style="white-space: nowrap; font-size: 0.8rem;">${ERPUtils.formatDateTime(l.created_at)}</td>
        <td><span class="badge ${badgeClass}">${l.action}</span></td>
        <td><strong>${l.module}</strong></td>
        <td><code>${ERPUtils.escapeHtml(l.recordId)}</code></td>
        <td>${ERPUtils.escapeHtml(l.description)}</td>
        <td>
          <div style="font-weight: 600;">${ERPUtils.escapeHtml(l.userName)}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${ERPUtils.escapeHtml(l.userRole)}</div>
        </td>
        <td style="text-align: right;">
          ${
            l.oldValues || l.newValues
              ? `<button class="btn btn-secondary btn-sm" onclick="viewAuditDiff('${l.id}')">🔍 Ver Datos</button>`
              : '-'
          }
        </td>
      </tr>
    `;
    })
    .join('');
}

function viewAuditDiff(id) {
  const log = ERPStorage.findById('audit_logs', id);
  if (!log) return;

  let modal = document.getElementById('audit-diff-modal-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'audit-diff-modal-overlay';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-lg">
      <div class="modal-header">
        <h3 class="modal-title">Detalle de Auditoría — Evento #${log.id.substring(0, 8)}</h3>
        <button type="button" class="modal-close-btn" onclick="this.closest('.modal-overlay').classList.remove('active')">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 1rem; font-size: 0.85rem;">
          <strong>Acción:</strong> ${log.action} | <strong>Módulo:</strong> ${log.module} | <strong>Registro:</strong> ${log.recordId}<br>
          <strong>Usuario:</strong> ${log.userName} (${log.userRole}) | <strong>Fecha:</strong> ${ERPUtils.formatDateTime(log.created_at)}<br>
          <strong>Descripción:</strong> ${ERPUtils.escapeHtml(log.description)}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div>
            <h4 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.35rem;">Valores Anteriores:</h4>
            <pre style="background: #f1f5f9; padding: 0.85rem; border-radius: var(--radius-sm); font-size: 0.75rem; max-height: 320px; overflow: auto; border: 1px solid var(--border);">${log.oldValues ? JSON.stringify(log.oldValues, null, 2) : 'Sin datos previos'}</pre>
          </div>
          <div>
            <h4 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.35rem;">Valores Nuevos:</h4>
            <pre style="background: #f0fdf4; padding: 0.85rem; border-radius: var(--radius-sm); font-size: 0.75rem; max-height: 320px; overflow: auto; border: 1px solid #bbf7d0;">${log.newValues ? JSON.stringify(log.newValues, null, 2) : 'Sin datos posteriores'}</pre>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').classList.remove('active')">Cerrar</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

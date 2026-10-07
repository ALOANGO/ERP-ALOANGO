/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - AUDIT LOG SERVICE (audit.js)
 * Enterprise traceability trail logging every state mutation
 * Actions: CREATE, UPDATE, DELETE, APPROVE, CANCEL, PAYMENT
 * ============================================================================
 */

const AuditService = (() => {
  const COLLECTION = 'audit_logs';

  /**
   * Log an audit event
   * @param {object} param0
   * @param {string} param0.action 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'CANCEL' | 'PAYMENT'
   * @param {string} param0.module 'PRODUCTOS' | 'TERCEROS' | 'VENTAS' | 'COMPRAS' | 'INVENTARIO' | 'PAGOS'
   * @param {string} param0.recordId Document or entity ID / code
   * @param {object|null} param0.oldValues Previous state
   * @param {object|null} param0.newValues New state
   * @param {string} param0.description Human readable note
   */
  const log = ({
    action,
    module,
    recordId,
    oldValues = null,
    newValues = null,
    description = '',
  }) => {
    try {
      const user = AuthService.getCurrentUser();
      const auditEntry = {
        id: ERPStorage.generateId(),
        action: String(action).toUpperCase(),
        module: String(module).toUpperCase(),
        recordId: String(recordId),
        userId: user ? user.id : 'system',
        userName: user ? user.name : 'Sistema ERP',
        userRole: user ? user.role : 'system',
        description,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
        created_at: new Date().toISOString(),
      };

      ERPStorage.addItem(COLLECTION, auditEntry);
      return auditEntry;
    } catch (error) {
      console.warn('[AuditService] Failed to record audit log:', error);
    }
  };

  /**
   * Retrieve all audit logs sorted descending by date
   */
  const getLogs = (filter = {}) => {
    let logs = ERPStorage.getCollection(COLLECTION);
    
    if (filter.module) {
      logs = logs.filter((l) => l.module === filter.module.toUpperCase());
    }
    if (filter.action) {
      logs = logs.filter((l) => l.action === filter.action.toUpperCase());
    }
    if (filter.recordId) {
      logs = logs.filter((l) => String(l.recordId).toLowerCase().includes(filter.recordId.toLowerCase()));
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          l.recordId.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  return {
    log,
    getLogs,
  };
})();

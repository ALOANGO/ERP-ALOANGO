/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - AUTHENTICATION & DEMO ROLES (auth.js)
 * Demo role-based access control, session management & navigation guarding
 * ============================================================================
 */

const AuthService = (() => {
  const SESSION_KEY = 'erp_session_user';

  // Demo user catalog
  const DEMO_USERS = [
    {
      id: 'usr-admin-1',
      name: 'Carlos Mendoza',
      email: 'admin@erp.com',
      password: 'password',
      role: 'admin',
      roleName: 'Administrador General',
      permissions: ['*'], // Total access
    },
    {
      id: 'usr-almacen-1',
      name: 'Mario Beltrán',
      email: 'almacen@erp.com',
      password: 'password',
      role: 'almacen',
      roleName: 'Jefe de Almacén',
      permissions: ['productos', 'inventario', 'kardex', 'compras'],
    },
    {
      id: 'usr-vendedor-1',
      name: 'Laura Gómez',
      email: 'vendedor@erp.com',
      password: 'password',
      role: 'vendedor',
      roleName: 'Ejecutivo de Ventas',
      permissions: ['clientes', 'ventas', 'inventario_read'],
    },
    {
      id: 'usr-contador-1',
      name: 'Felipe Duarte',
      email: 'contador@erp.com',
      password: 'password',
      role: 'contador',
      roleName: 'Contador General',
      permissions: ['compras', 'ventas', 'cartera', 'reportes', 'dashboard'],
    },
  ];

  /**
   * Get active logged in user or default to Admin if initial demo session
   */
  const getCurrentUser = () => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading session user', e);
    }
    // Default demo user is admin
    return DEMO_USERS[0];
  };

  /**
   * Attempt login
   */
  const login = (email, password) => {
    const user = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.password === password
    );

    if (!user) {
      throw new Error('Credenciales inválidas. Compruebe el correo y contraseña.');
    }

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleName: user.roleName,
      permissions: user.permissions,
      logged_at: new Date().toISOString(),
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return sessionData;
  };

  /**
   * Logout current session
   */
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  };

  /**
   * Check if current user has permission for a specific module
   */
  const hasPermission = (moduleName) => {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(moduleName);
  };

  /**
   * Update UI header and sidebar with current user info
   */
  const renderUserUI = () => {
    const user = getCurrentUser();
    if (!user) return;

    const nameElements = document.querySelectorAll('.user-name');
    nameElements.forEach((el) => (el.textContent = user.name));

    const roleElements = document.querySelectorAll('.user-role-tag');
    roleElements.forEach((el) => (el.textContent = user.roleName || user.role));

    const avatarElements = document.querySelectorAll('.user-avatar');
    avatarElements.forEach((el) => {
      const initials = user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
      el.textContent = initials;
    });

    // Guard links based on role
    const navLinks = document.querySelectorAll('[data-permission]');
    navLinks.forEach((link) => {
      const reqPerm = link.getAttribute('data-permission');
      if (reqPerm && !hasPermission(reqPerm)) {
        link.style.display = 'none';
      } else {
        link.style.display = 'flex';
      }
    });
  };

  return {
    DEMO_USERS,
    getCurrentUser,
    login,
    logout,
    hasPermission,
    renderUserUI,
  };
})();

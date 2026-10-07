/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - DOMAIN BUSINESS SERVICES (services.js)
 * Core business rules, data integrity validations & transactions
 * ============================================================================
 */

/* ==========================================================================
   1. VALIDATORS & BUSINESS RULE ENFORCEMENT
   ========================================================================== */
const BusinessRules = {
  /**
   * Status transitions validation (Requirement 19)
   */
  validateStatusTransition: (currentStatus, targetStatus) => {
    const cur = String(currentStatus || '').toUpperCase();
    const tgt = String(targetStatus || '').toUpperCase();

    if (cur === tgt) return true;

    const allowedTransitions = {
      'BORRADOR': ['APROBADO', 'ANULADO'],
      'APROBADO': ['PARCIALMENTE PAGADO', 'PAGADO', 'ANULADO'],
      'PARCIALMENTE PAGADO': ['PAGADO', 'ANULADO'],
      'PAGADO': ['FINALIZADO'],
      'FINALIZADO': [], // Terminal
      'ANULADO': [],    // Terminal
    };

    const allowed = allowedTransitions[cur] || [];
    if (!allowed.includes(tgt)) {
      throw new Error(`Transición de estado inválida: no es posible cambiar de '${cur}' a '${tgt}'.`);
    }
    return true;
  },
};

/* ==========================================================================
   2. PARTNER SERVICE (Clientes y Proveedores - Requirement 9)
   ========================================================================== */
const PartnerService = {
  COLLECTION: 'partners',

  getAll: () => ERPStorage.getCollection(PartnerService.COLLECTION),

  getById: (id) => ERPStorage.findById(PartnerService.COLLECTION, id),

  getByDocNumber: (docNumber) => {
    const all = PartnerService.getAll();
    return all.find((p) => String(p.docNumber).trim() === String(docNumber).trim()) || null;
  },

  create: (partnerData) => {
    // Validations: Doc number unique, legal name required
    if (!partnerData.docNumber || !String(partnerData.docNumber).trim()) {
      throw new Error('El número de documento de identificación es obligatorio.');
    }
    if (!partnerData.legalName || !String(partnerData.legalName).trim()) {
      throw new Error('La razón social / nombre legal es obligatorio.');
    }

    const existing = PartnerService.getByDocNumber(partnerData.docNumber);
    if (existing) {
      throw new Error(`Ya existe un tercero registrado con el documento: ${partnerData.docNumber}`);
    }

    const newPartner = ERPStorage.addItem(PartnerService.COLLECTION, {
      ...partnerData,
      status: partnerData.status || 'ACTIVO',
    });

    AuditService.log({
      action: 'CREATE',
      module: 'TERCEROS',
      recordId: newPartner.docNumber,
      newValues: newPartner,
      description: `Creación de tercero: ${newPartner.legalName} (${newPartner.type})`,
    });

    return newPartner;
  },

  update: (id, updates) => {
    const current = PartnerService.getById(id);
    if (!current) throw new Error('Tercero no encontrado');

    if (updates.docNumber && updates.docNumber !== current.docNumber) {
      const existing = PartnerService.getByDocNumber(updates.docNumber);
      if (existing && String(existing.id) !== String(id)) {
        throw new Error(`El número de documento ${updates.docNumber} ya está en uso.`);
      }
    }

    const updated = ERPStorage.updateItem(PartnerService.COLLECTION, id, updates);

    AuditService.log({
      action: 'UPDATE',
      module: 'TERCEROS',
      recordId: updated.docNumber,
      oldValues: current,
      newValues: updated,
      description: `Actualización de tercero: ${updated.legalName}`,
    });

    return updated;
  },

  search: (query, type = 'all') => {
    const all = PartnerService.getAll();
    const q = String(query || '').toLowerCase().trim();

    return all.filter((p) => {
      const matchType = type === 'all' || p.type === type || p.type === 'AMBOS';
      if (!matchType) return false;
      if (!q) return true;
      return (
        p.docNumber.toLowerCase().includes(q) ||
        p.legalName.toLowerCase().includes(q) ||
        (p.commercialName && p.commercialName.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    });
  },
};

/* ==========================================================================
   3. INVENTORY & KARDEX SERVICE (Requirements 10, 11, 12)
   ========================================================================== */
const InventoryService = {
  COLLECTION_PRODUCTS: 'products',
  COLLECTION_KARDEX: 'kardex',

  getAllProducts: () => ERPStorage.getCollection(InventoryService.COLLECTION_PRODUCTS),

  getProductById: (id) => ERPStorage.findById(InventoryService.COLLECTION_PRODUCTS, id),

  getProductBySKU: (sku) => {
    const products = InventoryService.getAllProducts();
    return products.find((p) => String(p.sku).trim().toUpperCase() === String(sku).trim().toUpperCase()) || null;
  },

  createProduct: (productData) => {
    if (!productData.sku || !String(productData.sku).trim()) {
      throw new Error('El SKU del producto es obligatorio.');
    }
    if (!productData.name || !String(productData.name).trim()) {
      throw new Error('El nombre del producto es obligatorio.');
    }

    const existing = InventoryService.getProductBySKU(productData.sku);
    if (existing) {
      throw new Error(`No es posible registrar el producto. El SKU '${productData.sku}' ya existe.`);
    }

    const cost = Math.max(0, Number(productData.cost) || 0);
    const price = Math.max(0, Number(productData.price) || 0);
    const minStock = Math.max(0, Number(productData.minStock) || 0);
    const initialStock = Math.max(0, Number(productData.stock) || 0);

    const product = ERPStorage.addItem(InventoryService.COLLECTION_PRODUCTS, {
      sku: String(productData.sku).trim().toUpperCase(),
      barcode: productData.barcode || '',
      name: String(productData.name).trim(),
      description: productData.description || '',
      category: productData.category || 'General',
      unit: productData.unit || 'UND',
      cost,
      price,
      stock: 0,
      minStock,
      taxRate: productData.taxRate !== undefined ? Number(productData.taxRate) : 0.19,
      imageUrl: productData.imageUrl || `https://picsum.photos/seed/${productData.sku}/400/400`,
      status: productData.status || 'ACTIVO',
    });

    AuditService.log({
      action: 'CREATE',
      module: 'PRODUCTOS',
      recordId: product.sku,
      newValues: product,
      description: `Creación de producto: ${product.name} (SKU: ${product.sku})`,
    });

    // If initial stock > 0, register initial adjustment in Kardex
    if (initialStock > 0) {
      InventoryService.registerMovement({
        productId: product.id,
        movementType: 'Ajuste entrada',
        quantity: initialStock,
        unitCost: cost,
        documentRef: 'INVENTARIO-INICIAL',
        notes: 'Carga inicial de inventario',
      });
    }

    return InventoryService.getProductById(product.id);
  },

  updateProduct: (id, updates) => {
    const current = InventoryService.getProductById(id);
    if (!current) throw new Error('Producto no encontrado');

    if (updates.sku && updates.sku.toUpperCase() !== current.sku.toUpperCase()) {
      const existing = InventoryService.getProductBySKU(updates.sku);
      if (existing && String(existing.id) !== String(id)) {
        throw new Error(`El SKU '${updates.sku}' ya pertenece a otro producto.`);
      }
    }

    const updated = ERPStorage.updateItem(InventoryService.COLLECTION_PRODUCTS, id, {
      ...updates,
      sku: updates.sku ? updates.sku.toUpperCase() : current.sku,
    });

    AuditService.log({
      action: 'UPDATE',
      module: 'PRODUCTOS',
      recordId: updated.sku,
      oldValues: current,
      newValues: updated,
      description: `Actualización de producto: ${updated.name}`,
    });

    return updated;
  },

  /**
   * CRITICAL BUSINESS RULE (Requirement 12):
   * Never allow negative stock!
   */
  validateStockAvailability: (productId, requestedQuantity) => {
    const product = InventoryService.getProductById(productId);
    if (!product) {
      throw new Error('Producto no encontrado en inventario.');
    }
    const currentStock = Number(product.stock) || 0;
    const qty = Number(requestedQuantity) || 0;

    if (qty <= 0) {
      throw new Error('La cantidad solicitada debe ser mayor a cero.');
    }

    if (currentStock < qty) {
      throw new Error('No es posible realizar la operación. El stock disponible es insuficiente.');
    }
    return true;
  },

  /**
   * Append-only Kardex movement registration (Requirement 11)
   */
  registerMovement: ({
    productId,
    movementType, // 'Compra', 'Venta', 'Ajuste entrada', 'Ajuste salida', 'Devolución venta', 'Devolución compra', 'Reversión'
    quantity,
    unitCost,
    documentRef,
    notes = '',
  }) => {
    const product = InventoryService.getProductById(productId);
    if (!product) throw new Error('Producto no encontrado para registrar movimiento en Kárdex');

    const qty = Number(quantity);
    if (qty <= 0) throw new Error('La cantidad de movimiento debe ser positiva.');

    const isExit = ['Venta', 'Ajuste salida', 'Devolución compra'].includes(movementType);
    const isEntry = ['Compra', 'Ajuste entrada', 'Devolución venta', 'Reversión'].includes(movementType);

    const currentStock = Number(product.stock) || 0;
    let newStock = currentStock;

    if (isExit) {
      if (currentStock < qty) {
        throw new Error('No es posible realizar la operación. El stock disponible es insuficiente.');
      }
      newStock = currentStock - qty;
    } else if (isEntry) {
      newStock = currentStock + qty;
    }

    // Persist new stock in product
    ERPStorage.updateItem(InventoryService.COLLECTION_PRODUCTS, product.id, { stock: newStock });

    const user = AuthService.getCurrentUser();
    const kardexItem = ERPStorage.addItem(InventoryService.COLLECTION_KARDEX, {
      date: new Date().toISOString(),
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      documentRef,
      movementType,
      entry: isEntry ? qty : 0,
      exit: isExit ? qty : 0,
      balance: newStock,
      unitCost: Number(unitCost) || product.cost,
      movementValue: qty * (Number(unitCost) || product.cost),
      userId: user ? user.id : 'system',
      userName: user ? user.name : 'Sistema',
      notes,
    });

    return { product: InventoryService.getProductById(product.id), kardex: kardexItem };
  },

  getKardex: (filter = {}) => {
    let list = ERPStorage.getCollection(InventoryService.COLLECTION_KARDEX);

    if (filter.productId) {
      list = list.filter((k) => String(k.productId) === String(filter.productId));
    }
    if (filter.movementType) {
      list = list.filter((k) => k.movementType === filter.movementType);
    }
    if (filter.documentRef) {
      list = list.filter((k) => k.documentRef.toLowerCase().includes(filter.documentRef.toLowerCase()));
    }
    if (filter.startDate) {
      list = list.filter((k) => k.date.substring(0, 10) >= filter.startDate);
    }
    if (filter.endDate) {
      list = list.filter((k) => k.date.substring(0, 10) <= filter.endDate);
    }

    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  getInventoryStatus: (product) => {
    const stock = Number(product.stock) || 0;
    const min = Number(product.minStock) || 0;
    if (stock <= 0) return 'Sin stock';
    if (stock <= min) return 'Stock crítico';
    return 'Normal';
  },
};

/* ==========================================================================
   4. SALES SERVICE (Requirement 13, 14, 29, 37)
   ========================================================================== */
const SalesService = {
  COLLECTION: 'sales',

  getAll: () => ERPStorage.getCollection(SalesService.COLLECTION),

  getById: (id) => ERPStorage.findById(SalesService.COLLECTION, id),

  getByDocNumber: (docNumber) => {
    const sales = SalesService.getAll();
    return sales.find((s) => s.docNumber === docNumber) || null;
  },

  calculateSaleTotals: (items) => {
    let subtotal = 0;
    let tax = 0;
    let total = 0;
    let totalCost = 0;

    const enrichedItems = items.map((item) => {
      const product = InventoryService.getProductById(item.productId);
      const qty = Number(item.quantity) || 1;
      const unitPrice = item.unitPrice !== undefined && item.unitPrice !== null ? Number(item.unitPrice) : (product ? product.price : 0);
      const discount = Number(item.discount) || 0; // percentage e.g. 5 for 5%
      const taxRate = item.taxRate !== undefined && item.taxRate !== null ? Number(item.taxRate) : (product && product.taxRate !== undefined ? Number(product.taxRate) : 0.19);
      // Historical cost capture
      const historicalCost = item.unitCost !== undefined && item.unitCost !== null ? Number(item.unitCost) : (product ? Number(product.cost) : 0);

      const lineGross = qty * unitPrice;
      const discountVal = lineGross * (discount / 100);
      const lineNet = lineGross - discountVal;
      const lineTax = lineNet * taxRate;
      const lineTotal = lineNet + lineTax;
      const lineCost = qty * historicalCost;

      subtotal += lineNet;
      tax += lineTax;
      total += lineTotal;
      totalCost += lineCost;

      return {
        productId: item.productId,
        productSku: product ? product.sku : item.productSku,
        productName: product ? product.name : item.productName,
        quantity: qty,
        unitPrice,
        discount,
        taxRate,
        lineNet,
        lineTax,
        lineTotal,
        unitCost: historicalCost,
        totalCost: lineCost,
      };
    });

    return {
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      total: Math.round(total),
      totalCost: Math.round(totalCost),
      profit: Math.round(total - tax - totalCost),
      items: enrichedItems,
    };
  },

  createSale: (saleData) => {
    if (!saleData.customerId) throw new Error('Debe seleccionar un cliente.');
    if (!saleData.items || !saleData.items.length) throw new Error('Debe agregar al menos un producto a la venta.');

    const totals = SalesService.calculateSaleTotals(saleData.items);
    const docNumber = ERPStorage.getNextSequence('sales', 'VEN-', 5);
    const user = AuthService.getCurrentUser();

    const sale = ERPStorage.addItem(SalesService.COLLECTION, {
      docNumber,
      date: saleData.date || ERPUtils.getTodayISO(),
      dueDate: saleData.dueDate || saleData.date || ERPUtils.getTodayISO(),
      customerId: saleData.customerId,
      customerName: saleData.customerName,
      customerDoc: saleData.customerDoc,
      sellerId: user ? user.id : 'usr-vendedor-1',
      sellerName: user ? user.name : 'Vendedor Demo',
      warehouse: saleData.warehouse || 'Bodega Principal',
      notes: saleData.notes || '',
      items: totals.items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      totalCost: totals.totalCost,
      profit: totals.profit,
      paidAmount: 0,
      balance: totals.total,
      status: 'BORRADOR', // Initial state
    });

    AuditService.log({
      action: 'CREATE',
      module: 'VENTAS',
      recordId: sale.docNumber,
      newValues: sale,
      description: `Creación de venta ${sale.docNumber} por ${ERPUtils.formatCurrency(sale.total)}`,
    });

    return sale;
  },

  updateDraftSale: (id, updates) => {
    const current = SalesService.getById(id);
    if (!current) throw new Error('Venta no encontrada');

    if (current.status !== 'BORRADOR') {
      throw new Error('Solo las ventas en estado BORRADOR pueden ser editadas. Un documento aprobado es inmutable.');
    }

    let calculatedTotals = {};
    if (updates.items) {
      calculatedTotals = SalesService.calculateSaleTotals(updates.items);
    }

    const updated = ERPStorage.updateItem(SalesService.COLLECTION, id, {
      ...updates,
      ...(updates.items
        ? {
            items: calculatedTotals.items,
            subtotal: calculatedTotals.subtotal,
            tax: calculatedTotals.tax,
            total: calculatedTotals.total,
            totalCost: calculatedTotals.totalCost,
            profit: calculatedTotals.profit,
            balance: calculatedTotals.total,
          }
        : {}),
    });

    AuditService.log({
      action: 'UPDATE',
      module: 'VENTAS',
      recordId: updated.docNumber,
      oldValues: current,
      newValues: updated,
      description: `Edición de borrador venta ${updated.docNumber}`,
    });

    return updated;
  },

  /**
   * ATOMIC APPROVAL (Requirement 14)
   * 1. Validate stock availability for all lines
   * 2. If any fails, rollback / cancel operation
   * 3. Register inventory exit & Kardex movements
   * 4. Transition status to APROBADO
   */
  approveSale: (id) => {
    return ERPStorage.runTransaction(() => {
      const sale = SalesService.getById(id);
      if (!sale) throw new Error('Venta no encontrada.');

      if (sale.status !== 'BORRADOR') {
        throw new Error(`La venta ya se encuentra en estado ${sale.status}.`);
      }

      // Step 1: Pre-validate stock for every single item
      for (const item of sale.items) {
        InventoryService.validateStockAvailability(item.productId, item.quantity);
      }

      // Step 2: Register stock reduction and Kardex movements
      for (const item of sale.items) {
        InventoryService.registerMovement({
          productId: item.productId,
          movementType: 'Venta',
          quantity: item.quantity,
          unitCost: item.unitCost,
          documentRef: sale.docNumber,
          notes: `Venta aprobada a ${sale.customerName}`,
        });
      }

      // Step 3: Transition state
      BusinessRules.validateStatusTransition(sale.status, 'APROBADO');

      const approvedSale = ERPStorage.updateItem(SalesService.COLLECTION, sale.id, {
        status: 'APROBADO',
        approved_at: new Date().toISOString(),
      });

      AuditService.log({
        action: 'APPROVE',
        module: 'VENTAS',
        recordId: approvedSale.docNumber,
        oldValues: sale,
        newValues: approvedSale,
        description: `Aprobación de venta ${approvedSale.docNumber} y salida de inventario`,
      });

      return approvedSale;
    });
  },

  /**
   * Cancel sale and reverse inventory (Requirement 34, 38)
   */
  cancelSale: (id) => {
    return ERPStorage.runTransaction(() => {
      const sale = SalesService.getById(id);
      if (!sale) throw new Error('Venta no encontrada.');

      if (['FINALIZADO', 'ANULADO'].includes(sale.status)) {
        throw new Error(`No es posible anular una venta en estado ${sale.status}.`);
      }

      // Check if any payment was registered
      const payments = PaymentService.getByDocument('VENTA', sale.docNumber);
      if (payments.length > 0) {
        throw new Error('No es posible anular la venta porque ya tiene pagos asociados. Revierta los pagos primero.');
      }

      // If sale was already approved, reverse inventory with a reverse Kardex movement!
      if (['APROBADO', 'PARCIALMENTE PAGADO'].includes(sale.status)) {
        for (const item of sale.items) {
          InventoryService.registerMovement({
            productId: item.productId,
            movementType: 'Reversión',
            quantity: item.quantity,
            unitCost: item.unitCost,
            documentRef: `REV-${sale.docNumber}`,
            notes: `Reversión por anulación de venta ${sale.docNumber}`,
          });
        }
      }

      BusinessRules.validateStatusTransition(sale.status, 'ANULADO');

      const cancelledSale = ERPStorage.updateItem(SalesService.COLLECTION, sale.id, {
        status: 'ANULADO',
        cancelled_at: new Date().toISOString(),
      });

      AuditService.log({
        action: 'CANCEL',
        module: 'VENTAS',
        recordId: cancelledSale.docNumber,
        oldValues: sale,
        newValues: cancelledSale,
        description: `Anulación de venta ${cancelledSale.docNumber} y reversión de inventario`,
      });

      return cancelledSale;
    });
  },

  /**
   * Recalculate sale balance strictly from its recorded payments (Requirement 37)
   */
  syncSaleBalance: (saleDocNumber) => {
    const sale = SalesService.getByDocNumber(saleDocNumber);
    if (!sale) return;

    const payments = PaymentService.getByDocument('VENTA', saleDocNumber);
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, sale.total - totalPaid);

    let nextStatus = sale.status;
    if (sale.status !== 'ANULADO' && sale.status !== 'BORRADOR') {
      if (balance === 0) {
        nextStatus = 'PAGADO';
      } else if (totalPaid > 0) {
        nextStatus = 'PARCIALMENTE PAGADO';
      } else {
        nextStatus = 'APROBADO';
      }
    }

    return ERPStorage.updateItem(SalesService.COLLECTION, sale.id, {
      paidAmount: totalPaid,
      balance,
      status: nextStatus,
    });
  },
};

/* ==========================================================================
   5. PURCHASES SERVICE (Requirement 15)
   ========================================================================== */
const PurchaseService = {
  COLLECTION: 'purchases',

  getAll: () => ERPStorage.getCollection(PurchaseService.COLLECTION),

  getById: (id) => ERPStorage.findById(PurchaseService.COLLECTION, id),

  getByDocNumber: (docNumber) => {
    const purchases = PurchaseService.getAll();
    return purchases.find((p) => p.docNumber === docNumber) || null;
  },

  calculatePurchaseTotals: (items) => {
    let subtotal = 0;
    let tax = 0;
    let total = 0;

    const enrichedItems = items.map((item) => {
      const product = InventoryService.getProductById(item.productId);
      const qty = Number(item.quantity) || 1;
      const unitCost = item.unitCost !== undefined && item.unitCost !== null ? Number(item.unitCost) : (product ? Number(product.cost) : 0);
      const taxRate = item.taxRate !== undefined && item.taxRate !== null ? Number(item.taxRate) : (product && product.taxRate !== undefined ? Number(product.taxRate) : 0.19);

      const lineGross = qty * unitCost;
      const lineTax = lineGross * taxRate;
      const lineTotal = lineGross + lineTax;

      subtotal += lineGross;
      tax += lineTax;
      total += lineTotal;

      return {
        productId: item.productId,
        productSku: product ? product.sku : item.productSku,
        productName: product ? product.name : item.productName,
        quantity: qty,
        unitCost,
        taxRate,
        lineGross,
        lineTax,
        lineTotal,
      };
    });

    return {
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      total: Math.round(total),
      items: enrichedItems,
    };
  },

  createPurchase: (purchaseData) => {
    if (!purchaseData.supplierId) throw new Error('Debe seleccionar un proveedor.');
    if (!purchaseData.items || !purchaseData.items.length) throw new Error('Debe agregar al menos un producto a la compra.');

    const totals = PurchaseService.calculatePurchaseTotals(purchaseData.items);
    const docNumber = ERPStorage.getNextSequence('purchases', 'COM-', 5);
    const user = AuthService.getCurrentUser();

    const purchase = ERPStorage.addItem(PurchaseService.COLLECTION, {
      docNumber,
      date: purchaseData.date || ERPUtils.getTodayISO(),
      dueDate: purchaseData.dueDate || purchaseData.date || ERPUtils.getTodayISO(),
      supplierId: purchaseData.supplierId,
      supplierName: purchaseData.supplierName,
      supplierDoc: purchaseData.supplierDoc,
      buyerId: user ? user.id : 'usr-admin-1',
      buyerName: user ? user.name : 'Administrador',
      warehouse: purchaseData.warehouse || 'Bodega Principal',
      notes: purchaseData.notes || '',
      items: totals.items,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      paidAmount: 0,
      balance: totals.total,
      status: 'BORRADOR',
    });

    AuditService.log({
      action: 'CREATE',
      module: 'COMPRAS',
      recordId: purchase.docNumber,
      newValues: purchase,
      description: `Creación de orden de compra ${purchase.docNumber} por ${ERPUtils.formatCurrency(purchase.total)}`,
    });

    return purchase;
  },

  approvePurchase: (id) => {
    return ERPStorage.runTransaction(() => {
      const purchase = PurchaseService.getById(id);
      if (!purchase) throw new Error('Compra no encontrada.');

      if (purchase.status !== 'BORRADOR') {
        throw new Error(`La compra ya se encuentra en estado ${purchase.status}.`);
      }

      // Increase stock and create Kardex entries
      for (const item of purchase.items) {
        InventoryService.registerMovement({
          productId: item.productId,
          movementType: 'Compra',
          quantity: item.quantity,
          unitCost: item.unitCost,
          documentRef: purchase.docNumber,
          notes: `Compra a proveedor ${purchase.supplierName}`,
        });
      }

      BusinessRules.validateStatusTransition(purchase.status, 'APROBADO');

      const approvedPurchase = ERPStorage.updateItem(PurchaseService.COLLECTION, purchase.id, {
        status: 'APROBADO',
        approved_at: new Date().toISOString(),
      });

      AuditService.log({
        action: 'APPROVE',
        module: 'COMPRAS',
        recordId: approvedPurchase.docNumber,
        oldValues: purchase,
        newValues: approvedPurchase,
        description: `Aprobación de compra ${approvedPurchase.docNumber} e ingreso de mercancía`,
      });

      return approvedPurchase;
    });
  },

  cancelPurchase: (id) => {
    return ERPStorage.runTransaction(() => {
      const purchase = PurchaseService.getById(id);
      if (!purchase) throw new Error('Compra no encontrada.');

      if (['FINALIZADO', 'ANULADO'].includes(purchase.status)) {
        throw new Error(`No es posible anular una compra en estado ${purchase.status}.`);
      }

      const payments = PaymentService.getByDocument('COMPRA', purchase.docNumber);
      if (payments.length > 0) {
        throw new Error('No es posible anular la compra porque ya registra pagos a proveedor.');
      }

      // If approved, reverse inventory
      if (['APROBADO', 'PARCIALMENTE PAGADO'].includes(purchase.status)) {
        for (const item of purchase.items) {
          // Check stock before exit
          InventoryService.validateStockAvailability(item.productId, item.quantity);
          InventoryService.registerMovement({
            productId: item.productId,
            movementType: 'Devolución compra',
            quantity: item.quantity,
            unitCost: item.unitCost,
            documentRef: `DEV-${purchase.docNumber}`,
            notes: `Anulación y devolución de compra ${purchase.docNumber}`,
          });
        }
      }

      BusinessRules.validateStatusTransition(purchase.status, 'ANULADO');

      const cancelled = ERPStorage.updateItem(PurchaseService.COLLECTION, purchase.id, {
        status: 'ANULADO',
        cancelled_at: new Date().toISOString(),
      });

      AuditService.log({
        action: 'CANCEL',
        module: 'COMPRAS',
        recordId: cancelled.docNumber,
        oldValues: purchase,
        newValues: cancelled,
        description: `Anulación de compra ${cancelled.docNumber}`,
      });

      return cancelled;
    });
  },

  syncPurchaseBalance: (purchaseDocNumber) => {
    const purchase = PurchaseService.getByDocNumber(purchaseDocNumber);
    if (!purchase) return;

    const payments = PaymentService.getByDocument('COMPRA', purchaseDocNumber);
    const totalPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, purchase.total - totalPaid);

    let nextStatus = purchase.status;
    if (purchase.status !== 'ANULADO' && purchase.status !== 'BORRADOR') {
      if (balance === 0) {
        nextStatus = 'PAGADO';
      } else if (totalPaid > 0) {
        nextStatus = 'PARCIALMENTE PAGADO';
      } else {
        nextStatus = 'APROBADO';
      }
    }

    return ERPStorage.updateItem(PurchaseService.COLLECTION, purchase.id, {
      paidAmount: totalPaid,
      balance,
      status: nextStatus,
    });
  },
};

/* ==========================================================================
   6. PAYMENTS & CARTERA SERVICE (Requirements 16, 17, 18)
   ========================================================================== */
const PaymentService = {
  COLLECTION: 'payments',

  getAll: () => ERPStorage.getCollection(PaymentService.COLLECTION),

  getByDocument: (docType, docNumber) => {
    const all = PaymentService.getAll();
    return all.filter((p) => p.docType === docType && p.docNumber === docNumber);
  },

  /**
   * CRITICAL PAYMENT VALIDATION (Requirement 18):
   * Never allow payment greater than pending balance!
   */
  validatePaymentAmount: (docType, docNumber, amount) => {
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      throw new Error('El monto del pago debe ser mayor a cero.');
    }

    let targetDoc = null;
    if (docType === 'VENTA') {
      targetDoc = SalesService.getByDocNumber(docNumber);
    } else if (docType === 'COMPRA') {
      targetDoc = PurchaseService.getByDocNumber(docNumber);
    } else {
      throw new Error(`Tipo de documento inválido para pago: ${docType}`);
    }

    if (!targetDoc) {
      throw new Error(`Documento no encontrado: ${docNumber}`);
    }

    if (['BORRADOR', 'ANULADO'].includes(targetDoc.status)) {
      throw new Error(`No se pueden registrar pagos a un documento en estado ${targetDoc.status}.`);
    }

    const currentBalance = Number(targetDoc.balance) || 0;

    if (amt > currentBalance) {
      throw new Error('El pago excede el saldo pendiente del documento.');
    }

    return { targetDoc, currentBalance };
  },

  /**
   * Register Payment atomically
   */
  createPayment: ({
    docType, // 'VENTA' | 'COMPRA'
    docNumber,
    amount,
    paymentMethod = 'Efectivo', // 'Efectivo', 'Transferencia', 'Tarjeta', 'Cheque'
    reference = '',
    notes = '',
  }) => {
    return ERPStorage.runTransaction(() => {
      // Step 1: Validate payment amount against document balance
      const { targetDoc, currentBalance } = PaymentService.validatePaymentAmount(docType, docNumber, amount);

      const paymentCode = ERPStorage.getNextSequence('payments', 'PAG-', 5);
      const user = AuthService.getCurrentUser();
      const numAmount = Number(amount);

      const payment = ERPStorage.addItem(PaymentService.COLLECTION, {
        docCode: paymentCode,
        docType,
        docNumber,
        targetId: targetDoc.id,
        thirdPartyName: docType === 'VENTA' ? targetDoc.customerName : targetDoc.supplierName,
        paymentMethod,
        amount: numAmount,
        date: new Date().toISOString(),
        reference,
        notes,
        userId: user ? user.id : 'system',
        userName: user ? user.name : 'Usuario',
      });

      // Step 2: Recalculate document balance & update document state
      if (docType === 'VENTA') {
        SalesService.syncSaleBalance(docNumber);
      } else {
        PurchaseService.syncPurchaseBalance(docNumber);
      }

      AuditService.log({
        action: 'PAYMENT',
        module: 'PAGOS',
        recordId: payment.docCode,
        newValues: payment,
        description: `Pago registrado de ${ERPUtils.formatCurrency(numAmount)} para ${docType} ${docNumber}`,
      });

      return payment;
    });
  },

  /**
   * Get Accounts Receivable (Cuentas por Cobrar)
   */
  getAccountsReceivable: () => {
    const sales = SalesService.getAll();
    const today = ERPUtils.getTodayISO();

    return sales
      .filter((s) => !['BORRADOR', 'ANULADO'].includes(s.status) && s.balance > 0)
      .map((s) => {
        const daysOverdue = ERPUtils.getDaysDifference(s.dueDate);
        return {
          ...s,
          daysOverdue: Math.max(0, daysOverdue),
          isOverdue: s.dueDate < today && s.balance > 0,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  },

  /**
   * Get Accounts Payable (Cuentas por Pagar)
   */
  getAccountsPayable: () => {
    const purchases = PurchaseService.getAll();
    const today = ERPUtils.getTodayISO();

    return purchases
      .filter((p) => !['BORRADOR', 'ANULADO'].includes(p.status) && p.balance > 0)
      .map((p) => {
        const daysOverdue = ERPUtils.getDaysDifference(p.dueDate);
        return {
          ...p,
          daysOverdue: Math.max(0, daysOverdue),
          isOverdue: p.dueDate < today && p.balance > 0,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  },
};

/* ==========================================================================
   7. DASHBOARD SERVICE (Requirement 5)
   ========================================================================== */
const DashboardService = {
  getKPIs: () => {
    const todayISO = ERPUtils.getTodayISO();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().substring(0, 10);

    const sales = SalesService.getAll().filter((s) => s.status !== 'ANULADO' && s.status !== 'BORRADOR');

    // 1. Today's sales
    const todaySales = sales.filter((s) => s.date === todayISO);
    const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total, 0);
    const todaySalesCount = todaySales.length;

    const yesterdaySales = sales.filter((s) => s.date === yesterdayISO);
    const yesterdaySalesTotal = yesterdaySales.reduce((acc, s) => acc + s.total, 0);

    let salesDiffPercentage = 0;
    if (yesterdaySalesTotal > 0) {
      salesDiffPercentage = Math.round(((todaySalesTotal - yesterdaySalesTotal) / yesterdaySalesTotal) * 100);
    }

    // 2. Accounts Receivable
    const receivables = PaymentService.getAccountsReceivable();
    const totalReceivable = receivables.reduce((acc, r) => acc + r.balance, 0);
    const overdueReceivable = receivables.filter((r) => r.isOverdue).reduce((acc, r) => acc + r.balance, 0);
    const pendingDocumentsCount = receivables.length;

    // 3. Critical stock
    const products = InventoryService.getAllProducts();
    const criticalProducts = products.filter((p) => InventoryService.getInventoryStatus(p) !== 'Normal');
    const criticalStockCount = criticalProducts.length;
    const criticalPercentage = products.length > 0 ? Math.round((criticalStockCount / products.length) * 100) : 0;

    // 4. Monthly Profit (Using HISTORICAL COST registered in each sale item detail - Requirement 5)
    const currentMonth = todayISO.substring(0, 7); // YYYY-MM
    const currentMonthSales = sales.filter((s) => s.date.substring(0, 7) === currentMonth);

    let monthRevenue = 0;
    let monthHistoricalCost = 0;

    currentMonthSales.forEach((sale) => {
      // Revenue without VAT
      monthRevenue += (sale.subtotal || (sale.total - (sale.tax || 0)));
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          // Historical cost stored when the sale was generated
          monthHistoricalCost += (Number(item.quantity) * Number(item.unitCost || 0));
        });
      }
    });

    const monthlyEstimatedProfit = Math.round(monthRevenue - monthHistoricalCost);

    return {
      todaySales: {
        total: todaySalesTotal,
        count: todaySalesCount,
        yesterdayTotal: yesterdaySalesTotal,
        diffPercentage: salesDiffPercentage,
      },
      receivables: {
        total: totalReceivable,
        overdue: overdueReceivable,
        count: pendingDocumentsCount,
      },
      criticalStock: {
        count: criticalStockCount,
        percentage: criticalPercentage,
        totalProducts: products.length,
      },
      monthlyProfit: {
        revenue: monthRevenue,
        historicalCost: monthHistoricalCost,
        profit: monthlyEstimatedProfit,
      },
    };
  },

  getChartData: () => {
    const sales = SalesService.getAll().filter((s) => s.status !== 'ANULADO' && s.status !== 'BORRADOR');

    // Chart 1: Sales last 7 days
    const last7DaysLabels = [];
    const last7DaysValues = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().substring(0, 10);
      last7DaysLabels.push(d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }));
      const dayTotal = sales.filter((s) => s.date === iso).reduce((acc, s) => acc + s.total, 0);
      last7DaysValues.push(dayTotal);
    }

    // Chart 2 & 3: Sales and Margin by Category
    const categoryTotals = {};
    const categoryProfits = {};

    sales.forEach((s) => {
      if (s.items) {
        s.items.forEach((item) => {
          const prod = InventoryService.getProductById(item.productId);
          const cat = prod ? prod.category : 'General';
          const net = item.lineNet || (item.quantity * item.unitPrice);
          const cost = item.totalCost || (item.quantity * (item.unitCost || 0));

          categoryTotals[cat] = (categoryTotals[cat] || 0) + net;
          categoryProfits[cat] = (categoryProfits[cat] || 0) + (net - cost);
        });
      }
    });

    // Chart 4: Cartera breakdown (Corriente, Vencida, Pagada)
    const receivables = PaymentService.getAccountsReceivable();
    const carteraVencida = receivables.filter((r) => r.isOverdue).reduce((acc, r) => acc + r.balance, 0);
    const carteraCorriente = receivables.filter((r) => !r.isOverdue).reduce((acc, r) => acc + r.balance, 0);
    const carteraPagada = sales.reduce((acc, s) => acc + (s.paidAmount || 0), 0);

    return {
      last7Days: { labels: last7DaysLabels, data: last7DaysValues },
      categories: {
        labels: Object.keys(categoryTotals),
        sales: Object.values(categoryTotals),
        profits: Object.values(categoryProfits),
      },
      cartera: {
        labels: ['Cartera Corriente', 'Cartera Vencida', 'Total Cobrado'],
        data: [carteraCorriente, carteraVencida, carteraPagada],
      },
    };
  },
};

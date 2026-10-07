/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - FUNCTIONAL TEST SUITE (tests.js)
 * Executes the 7 mandatory business rule validation tests (Requirement 33)
 * ============================================================================
 */

const ERPTestSuite = {
  runAll: () => {
    const results = [];

    // TEST 1 — Stock Insuficiente (Stock = 10, Intentar venta = 11 -> ERROR)
    try {
      // Create temporary test product with stock 10
      const testSku = `TEST-STK1-${Date.now()}`;
      const prod = InventoryService.createProduct({
        sku: testSku,
        name: 'Producto Test 1 Stock Insuficiente',
        category: 'Tecnología',
        cost: 10000,
        price: 20000,
        stock: 10,
        minStock: 2,
      });

      let failedAsExpected = false;
      let caughtMessage = '';
      try {
        InventoryService.validateStockAvailability(prod.id, 11);
      } catch (err) {
        failedAsExpected = true;
        caughtMessage = err.message;
      }

      // Cleanup test product
      ERPStorage.deleteItem('products', prod.id);

      if (failedAsExpected && caughtMessage.includes('insuficiente')) {
        results.push({
          id: 'TEST-1',
          name: 'TEST 1 — Stock Insuficiente',
          description: 'Stock = 10. Intentar venta = 11. Resultado esperado: ERROR.',
          passed: true,
          output: `CORRECTO: Bloqueado con mensaje "${caughtMessage}"`,
        });
      } else {
        results.push({
          id: 'TEST-1',
          name: 'TEST 1 — Stock Insuficiente',
          description: 'Stock = 10. Intentar venta = 11. Resultado esperado: ERROR.',
          passed: false,
          output: `FALLO: La validación no arrojó el error esperado.`,
        });
      }
    } catch (e) {
      results.push({ id: 'TEST-1', name: 'TEST 1 — Stock Insuficiente', passed: false, output: `Excepción: ${e.message}` });
    }

    // TEST 2 — Stock Válido (Stock = 10, Venta = 5 -> Stock = 5)
    try {
      const testSku = `TEST-STK2-${Date.now()}`;
      const prod = InventoryService.createProduct({
        sku: testSku,
        name: 'Producto Test 2 Stock Válido',
        category: 'Oficina',
        cost: 5000,
        price: 15000,
        stock: 10,
        minStock: 2,
      });

      // Register exit of 5
      InventoryService.registerMovement({
        productId: prod.id,
        movementType: 'Venta',
        quantity: 5,
        unitCost: prod.cost,
        documentRef: 'TEST-DOC-VEN',
        notes: 'Prueba de stock válido',
      });

      const updated = InventoryService.getProductById(prod.id);
      const passed = updated.stock === 5;

      // Cleanup
      ERPStorage.deleteItem('products', prod.id);

      results.push({
        id: 'TEST-2',
        name: 'TEST 2 — Stock Válido',
        description: 'Stock inicial = 10. Venta = 5. Stock final esperado = 5.',
        passed,
        output: passed ? `CORRECTO: Stock actualizado a ${updated.stock}.` : `FALLO: Stock resultó en ${updated.stock}.`,
      });
    } catch (e) {
      results.push({ id: 'TEST-2', name: 'TEST 2 — Stock Válido', passed: false, output: `Excepción: ${e.message}` });
    }

    // TEST 3 — Sobrepago (Factura $1.000.000, Saldo $300.000, Intentar pago $350.000 -> ERROR)
    try {
      const testCustomer = PartnerService.getAll()[0];
      const testSaleDoc = `TEST-VEN-SOBRE-${Date.now()}`;
      const testSale = ERPStorage.addItem('sales', {
        docNumber: testSaleDoc,
        date: ERPUtils.getTodayISO(),
        dueDate: ERPUtils.getTodayISO(),
        customerId: testCustomer.id,
        customerName: testCustomer.legalName,
        total: 1000000,
        subtotal: 840336,
        tax: 159664,
        paidAmount: 700000,
        balance: 300000,
        status: 'PARCIALMENTE PAGADO',
      });

      // Add prior payment of 700.000 in payments collection
      const priorPay = ERPStorage.addItem('payments', {
        docCode: `TEST-PAG-${Date.now()}`,
        docType: 'VENTA',
        docNumber: testSaleDoc,
        targetId: testSale.id,
        amount: 700000,
        paymentMethod: 'Transferencia',
        date: new Date().toISOString(),
      });

      let failedAsExpected = false;
      let errorMsg = '';
      try {
        PaymentService.validatePaymentAmount('VENTA', testSale.docNumber, 350000);
      } catch (err) {
        failedAsExpected = true;
        errorMsg = err.message;
      }

      // Cleanup
      ERPStorage.deleteItem('sales', testSale.id);
      ERPStorage.deleteItem('payments', priorPay.id);

      const passed = failedAsExpected && errorMsg.includes('excede');
      results.push({
        id: 'TEST-3',
        name: 'TEST 3 — Sobrepago no permitido',
        description: 'Factura = $1.000.000, Saldo = $300.000. Intentar pago = $350.000 -> ERROR.',
        passed,
        output: passed ? `CORRECTO: Bloqueado con mensaje "${errorMsg}"` : `FALLO: Se permitió sobrepago o no hubo error.`,
      });
    } catch (e) {
      results.push({ id: 'TEST-3', name: 'TEST 3 — Sobrepago', passed: false, output: `Excepción: ${e.message}` });
    }

    // TEST 4 — Pago Válido (Saldo $300.000, Pago $300.000 -> Saldo 0, Estado PAGADO)
    try {
      const testCustomer = PartnerService.getAll()[0];
      const testSaleDoc = `TEST-VEN-PAG-${Date.now()}`;
      const testSale = ERPStorage.addItem('sales', {
        docNumber: testSaleDoc,
        date: ERPUtils.getTodayISO(),
        dueDate: ERPUtils.getTodayISO(),
        customerId: testCustomer.id,
        customerName: testCustomer.legalName,
        total: 1000000,
        subtotal: 840336,
        tax: 159664,
        paidAmount: 700000,
        balance: 300000,
        status: 'PARCIALMENTE PAGADO',
      });

      // Add prior payment of 700.000 in payments collection
      const priorPay = ERPStorage.addItem('payments', {
        docCode: `TEST-PAG1-${Date.now()}`,
        docType: 'VENTA',
        docNumber: testSaleDoc,
        targetId: testSale.id,
        amount: 700000,
        paymentMethod: 'Transferencia',
        date: new Date().toISOString(),
      });

      // Execute exact payment of 300.000
      const newPay = PaymentService.createPayment({
        docType: 'VENTA',
        docNumber: testSaleDoc,
        amount: 300000,
        paymentMethod: 'Transferencia',
        reference: 'TEST-REF-PAY-OK',
      });

      const updatedSale = SalesService.getByDocNumber(testSaleDoc);
      const passed = updatedSale.balance === 0 && updatedSale.status === 'PAGADO';

      // Cleanup
      ERPStorage.deleteItem('sales', testSale.id);
      ERPStorage.deleteItem('payments', priorPay.id);
      ERPStorage.deleteItem('payments', newPay.id);

      results.push({
        id: 'TEST-4',
        name: 'TEST 4 — Pago Válido y Saldo Cero',
        description: 'Saldo = $300.000. Pago = $300.000. Resultado esperado: Saldo = 0, Estado = PAGADO.',
        passed,
        output: passed ? `CORRECTO: Saldo = $0, Estado = ${updatedSale.status}.` : `FALLO: Saldo = ${updatedSale.balance}, Estado = ${updatedSale.status}`,
      });
    } catch (e) {
      results.push({ id: 'TEST-4', name: 'TEST 4 — Pago Válido', passed: false, output: `Excepción: ${e.message}` });
    }

    // TEST 5 — Inmutabilidad (Venta aprobada, Intentar modificar precio -> ERROR)
    try {
      const testCustomer = PartnerService.getAll()[0];
      const prod = InventoryService.getAllProducts()[0];
      const testSale = ERPStorage.addItem('sales', {
        docNumber: `TEST-VEN-INMUT-${Date.now()}`,
        date: ERPUtils.getTodayISO(),
        dueDate: ERPUtils.getTodayISO(),
        customerId: testCustomer.id,
        customerName: testCustomer.legalName,
        total: 150000,
        subtotal: 126050,
        tax: 23950,
        paidAmount: 0,
        balance: 150000,
        status: 'APROBADO', // Document is already approved!
        items: [{ productId: prod.id, quantity: 1, unitPrice: 150000 }],
      });

      let failedAsExpected = false;
      let errorMsg = '';
      try {
        SalesService.updateDraftSale(testSale.id, {
          items: [{ productId: prod.id, quantity: 1, unitPrice: 99999 }],
        });
      } catch (err) {
        failedAsExpected = true;
        errorMsg = err.message;
      }

      // Cleanup
      ERPStorage.deleteItem('sales', testSale.id);

      const passed = failedAsExpected && errorMsg.includes('BORRADOR');
      results.push({
        id: 'TEST-5',
        name: 'TEST 5 — Inmutabilidad de Documento Aprobado',
        description: 'Venta aprobada. Intentar modificar precio/detalle. Resultado esperado: ERROR.',
        passed,
        output: passed ? `CORRECTO: Modificación bloqueada con mensaje "${errorMsg}".` : `FALLO: Se permitió modificar documento aprobado.`,
      });
    } catch (e) {
      results.push({ id: 'TEST-5', name: 'TEST 5 — Inmutabilidad', passed: false, output: `Excepción: ${e.message}` });
    }

    // TEST 6 — Kárdex (Compra +10, Venta -3 -> Saldo esperado: 7)
    try {
      const testSku = `TEST-KARDEX-${Date.now()}`;
      const prod = InventoryService.createProduct({
        sku: testSku,
        name: 'Producto Test 6 Kárdex',
        category: 'Ferretería',
        cost: 20000,
        price: 35000,
        stock: 0, // Starts at 0
        minStock: 2,
      });

      // Entry: Compra 10
      InventoryService.registerMovement({
        productId: prod.id,
        movementType: 'Compra',
        quantity: 10,
        unitCost: prod.cost,
        documentRef: 'TEST-COM-10',
      });

      // Exit: Venta 3
      InventoryService.registerMovement({
        productId: prod.id,
        movementType: 'Venta',
        quantity: 3,
        unitCost: prod.cost,
        documentRef: 'TEST-VEN-3',
      });

      const updated = InventoryService.getProductById(prod.id);
      const passed = updated.stock === 7;

      // Cleanup
      ERPStorage.deleteItem('products', prod.id);

      results.push({
        id: 'TEST-6',
        name: 'TEST 6 — Trazabilidad Kárdex',
        description: 'Compra +10, Venta -3. Saldo esperado en Kárdex y stock: 7.',
        passed,
        output: passed ? `CORRECTO: Saldo acumulado = ${updated.stock}.` : `FALLO: Saldo resultó en ${updated.stock}.`,
      });
    } catch (e) {
      results.push({ id: 'TEST-6', name: 'TEST 6 — Kárdex', passed: false, output: `Excepción: ${e.message}` });
    }

    // TEST 7 — Auditoría (Modificar producto -> Debe generar audit log)
    try {
      const testSku = `TEST-AUDIT-${Date.now()}`;
      const prod = InventoryService.createProduct({
        sku: testSku,
        name: 'Producto Test 7 Auditoría Original',
        category: 'Papelería',
        cost: 1000,
        price: 2000,
        stock: 5,
        minStock: 1,
      });

      // Mutate product
      InventoryService.updateProduct(prod.id, {
        name: 'Producto Test 7 Auditoría Modificado',
        price: 2500,
      });

      // Check audit logs
      const logs = AuditService.getLogs({ module: 'PRODUCTOS', recordId: testSku, action: 'UPDATE' });
      const passed = logs.length > 0 && logs[0].newValues.name === 'Producto Test 7 Auditoría Modificado';

      // Cleanup
      ERPStorage.deleteItem('products', prod.id);

      results.push({
        id: 'TEST-7',
        name: 'TEST 7 — Registro de Auditoría',
        description: 'Modificar producto. Debe registrar evento UPDATE en audit_logs.',
        passed,
        output: passed ? `CORRECTO: Log registrado con acción "${logs[0].action}" y diff de valores.` : `FALLO: No se encontró el registro de auditoría esperado.`,
      });
    } catch (e) {
      results.push({ id: 'TEST-7', name: 'TEST 7 — Auditoría', passed: false, output: `Excepción: ${e.message}` });
    }

    return results;
  },
};

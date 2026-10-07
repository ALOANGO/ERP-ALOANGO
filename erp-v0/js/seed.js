/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - SEED DATA GENERATOR (seed.js)
 * Produces 100% mathematically consistent initial ERP data:
 * - 50 Realistic Products across 5 Categories
 * - 25+ Third Parties (15 Clients, 10 Suppliers, 5 Both)
 * - 15 Historical Purchases
 * - 30 Historical Sales across various states
 * - Consistent Payments and Append-Only Kárdex History
 * ============================================================================
 */

const SeedService = (() => {
  const CATEGORIES = ['Tecnología', 'Oficina', 'Papelería', 'Aseo', 'Ferretería'];

  const PRODUCTS_CATALOG = [
    // 1. Tecnología (10)
    { sku: 'TEC-001', name: 'Laptop Corporativa ThinkPro 15" i7 16GB', category: 'Tecnología', cost: 2400000, price: 3450000, minStock: 3, stock: 12 },
    { sku: 'TEC-002', name: 'Monitor LED 27" IPS 4K Ultra Slim', category: 'Tecnología', cost: 720000, price: 1150000, minStock: 5, stock: 18 },
    { sku: 'TEC-003', name: 'Teclado Mecánico Ergonómico Bluetooth', category: 'Tecnología', cost: 130000, price: 215000, minStock: 8, stock: 25 },
    { sku: 'TEC-004', name: 'Mouse Óptico Inalámbrico Silencioso', category: 'Tecnología', cost: 45000, price: 85000, minStock: 10, stock: 40 },
    { sku: 'TEC-005', name: 'Diadema con Cancelación Activa de Ruido', category: 'Tecnología', cost: 180000, price: 310000, minStock: 5, stock: 15 },
    { sku: 'TEC-006', name: 'Disco Sólido Externo SSD 1TB USB-C', category: 'Tecnología', cost: 260000, price: 420000, minStock: 6, stock: 20 },
    { sku: 'TEC-007', name: 'Impresora Multifuncional Tanque Continuo', category: 'Tecnología', cost: 650000, price: 980000, minStock: 4, stock: 8 },
    { sku: 'TEC-008', name: 'Router WiFi 6 Mesh Doble Banda Gigabit', category: 'Tecnología', cost: 210000, price: 350000, minStock: 4, stock: 14 },
    { sku: 'TEC-009', name: 'UPS Regulador de Voltaje 1200VA 8 Tomas', category: 'Tecnología', cost: 320000, price: 490000, minStock: 5, stock: 2 }, // Stock crítico!
    { sku: 'TEC-010', name: 'Cámara Web Full HD 1080p con Micrófono', category: 'Tecnología', cost: 95000, price: 175000, minStock: 6, stock: 1 }, // Stock crítico!

    // 2. Oficina (10)
    { sku: 'OFI-001', name: 'Silla Ergonómica Ejecutiva Cabecero Ajustable', category: 'Oficina', cost: 380000, price: 620000, minStock: 4, stock: 10 },
    { sku: 'OFI-002', name: 'Escritorio Eléctrico Ajustable Altura 140x70', category: 'Oficina', cost: 890000, price: 1450000, minStock: 2, stock: 5 },
    { sku: 'OFI-003', name: 'Archivador Metálico 3 Gavetas con Llave', category: 'Oficina', cost: 280000, price: 450000, minStock: 3, stock: 7 },
    { sku: 'OFI-004', name: 'Lámpara LED Escritorio con Cargador Inalámbrico', category: 'Oficina', cost: 75000, price: 135000, minStock: 5, stock: 22 },
    { sku: 'OFI-005', name: 'Destructora de Papel Microcorte 12 Hojas', category: 'Oficina', cost: 340000, price: 540000, minStock: 3, stock: 2 }, // Stock crítico!
    { sku: 'OFI-006', name: 'Tablero Acrílico Magnético 120x80 Marco Aluminio', category: 'Oficina', cost: 110000, price: 195000, minStock: 4, stock: 12 },
    { sku: 'OFI-007', name: 'Soporte Ajustable Doble Monitor Neumático', category: 'Oficina', cost: 140000, price: 240000, minStock: 5, stock: 16 },
    { sku: 'OFI-008', name: 'Papelera Metálica de Malla Redonda 15L', category: 'Oficina', cost: 18000, price: 35000, minStock: 10, stock: 35 },
    { sku: 'OFI-009', name: 'Reposapiés Ergonómico Basculante con Relieve', category: 'Oficina', cost: 42000, price: 78000, minStock: 8, stock: 19 },
    { sku: 'OFI-010', name: 'Módulo Organizador de Documentos Bandeja Triple', category: 'Oficina', cost: 35000, price: 65000, minStock: 6, stock: 28 },

    // 3. Papelería (10)
    { sku: 'PAP-001', name: 'Caja Resma Papel Fotocopia Carta 75g (10 resmas)', category: 'Papelería', cost: 145000, price: 210000, minStock: 8, stock: 30 },
    { sku: 'PAP-002', name: 'Caja Resma Papel Oficio 75g (10 resmas)', category: 'Papelería', cost: 165000, price: 235000, minStock: 6, stock: 22 },
    { sku: 'PAP-003', name: 'Caja Bolígrafo Tinta Seca Azul 0.7mm x50', category: 'Papelería', cost: 28000, price: 52000, minStock: 10, stock: 45 },
    { sku: 'PAP-004', name: 'Caja Bolígrafo Tinta Seca Negro 0.7mm x50', category: 'Papelería', cost: 28000, price: 52000, minStock: 10, stock: 50 },
    { sku: 'PAP-005', name: 'Caja Marcadores Borrables Punta Biselada x12', category: 'Papelería', cost: 32000, price: 58000, minStock: 8, stock: 26 },
    { sku: 'PAP-006', name: 'Caja Notas Adhesivas Amarillas 76x76mm x12', category: 'Papelería', cost: 18000, price: 34000, minStock: 15, stock: 60 },
    { sku: 'PAP-007', name: 'Cosedora Metálica Estándar Uso Pesado', category: 'Papelería', cost: 22000, price: 42000, minStock: 5, stock: 18 },
    { sku: 'PAP-008', name: 'Caja Grapas 26/6 Cobrizadas x5000', category: 'Papelería', cost: 6500, price: 14000, minStock: 20, stock: 80 },
    { sku: 'PAP-009', name: 'Perforadora Metálica Dos Huecos Capacidad 30h', category: 'Papelería', cost: 19000, price: 38000, minStock: 4, stock: 3 }, // Stock crítico!
    { sku: 'PAP-010', name: 'Tijera de Oficina Acero Inoxidable 8 Pulgadas', category: 'Papelería', cost: 8500, price: 17500, minStock: 10, stock: 32 },

    // 4. Aseo (10)
    { sku: 'ASE-001', name: 'Galón Detergente Desinfectante Multiusos Lavanda', category: 'Aseo', cost: 22000, price: 39000, minStock: 12, stock: 40 },
    { sku: 'ASE-002', name: 'Galón Blanqueador Desinfectante Cloro 5.25%', category: 'Aseo', cost: 14000, price: 26000, minStock: 10, stock: 35 },
    { sku: 'ASE-003', name: 'Caja Papel Higiénico Institucional Jumbo x4 rollos', category: 'Aseo', cost: 58000, price: 92000, minStock: 8, stock: 25 },
    { sku: 'ASE-004', name: 'Caja Toalla de Manos Doblada Z x3000 hojas', category: 'Aseo', cost: 62000, price: 98000, minStock: 8, stock: 30 },
    { sku: 'ASE-005', name: 'Galón Jabón Líquido Antibacterial para Manos', category: 'Aseo', cost: 29000, price: 48000, minStock: 10, stock: 18 },
    { sku: 'ASE-006', name: 'Paquete Bolsas Negras Residuos 65x90cm x100', category: 'Aseo', cost: 34000, price: 55000, minStock: 15, stock: 50 },
    { sku: 'ASE-007', name: 'Paño Microfibra Antibacterial 40x40cm x6', category: 'Aseo', cost: 16000, price: 29000, minStock: 10, stock: 42 },
    { sku: 'ASE-008', name: 'Trapeador Industrial Microfibra Mango Aluminio', category: 'Aseo', cost: 24000, price: 44000, minStock: 6, stock: 15 },
    { sku: 'ASE-009', name: 'Dispensador Automático de Jabón / Gel con Sensor', category: 'Aseo', cost: 68000, price: 115000, minStock: 5, stock: 2 }, // Stock crítico!
    { sku: 'ASE-010', name: 'Ambientador Spray Automático Repuesto x3', category: 'Aseo', cost: 27000, price: 46000, minStock: 8, stock: 24 },

    // 5. Ferretería (10)
    { sku: 'FER-001', name: 'Taladro Percutor Inalámbrico 20V con 2 Baterías', category: 'Ferretería', cost: 310000, price: 495000, minStock: 3, stock: 8 },
    { sku: 'FER-002', name: 'Caja Herramientas Plástica 19" Organizadores', category: 'Ferretería', cost: 55000, price: 95000, minStock: 5, stock: 14 },
    { sku: 'FER-003', name: 'Juego Destornilladores Aislados 1000V x7 piezas', category: 'Ferretería', cost: 48000, price: 85000, minStock: 6, stock: 20 },
    { sku: 'FER-004', name: 'Cinta Aislante Autofundente Negra 19mm x 20m', category: 'Ferretería', cost: 6500, price: 14500, minStock: 25, stock: 70 },
    { sku: 'FER-005', name: 'Cinta Métrica Profesional Antigolpe 8 Metros', category: 'Ferretería', cost: 18000, price: 34000, minStock: 10, stock: 28 },
    { sku: 'FER-006', name: 'Multímetro Digital Automático True RMS', category: 'Ferretería', cost: 125000, price: 210000, minStock: 4, stock: 11 },
    { sku: 'FER-007', name: 'Candado de Alta Seguridad Latón Macizo 50mm', category: 'Ferretería', cost: 28000, price: 52000, minStock: 10, stock: 35 },
    { sku: 'FER-008', name: 'Escalera Tijera Aluminio 5 Pasos Uso Pesado', category: 'Ferretería', cost: 220000, price: 360000, minStock: 2, stock: 1 }, // Stock crítico!
    { sku: 'FER-009', name: 'Pistola Silicona Caliente Industrial 100W', category: 'Ferretería', cost: 32000, price: 58000, minStock: 6, stock: 19 },
    { sku: 'FER-010', name: 'Guantes de Nitrilo Resistencia Química Talla L x12', category: 'Ferretería', cost: 24000, price: 45000, minStock: 15, stock: 44 },
  ];

  const PARTNERS_CATALOG = [
    // Clientes (15)
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.123.456-1', legalName: 'Distribuciones Andina SAS', commercialName: 'Andina Express', email: 'compras@andinasas.com', phone: '+57 310 234 5678', address: 'Calle 26 # 68-35', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.234.567-2', legalName: 'Soluciones Tecnológicas del Caribe SA', commercialName: 'CaribeTech', email: 'facturacion@caribetech.co', phone: '+57 300 456 7890', address: 'Cra 53 # 74-89', city: 'Barranquilla', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.345.678-3', legalName: 'Inversiones Antioquia Global SAS', commercialName: 'InverAntioquia', email: 'adquisiciones@inverantioquia.com', phone: '+57 312 987 6543', address: 'Calle 10 # 43E-12', city: 'Medellín', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.456.789-4', legalName: 'Comercializadora Pacífico y Cía Ltda', commercialName: 'Pacífico Store', email: 'contacto@pacificoltda.com', phone: '+57 315 678 1234', address: 'Av 6 Norte # 28-40', city: 'Cali', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.567.890-5', legalName: 'Centro Educativo Vanguardia Siglo XXI', commercialName: 'Colegio Vanguardia', email: 'tesoreria@vanguardia.edu.co', phone: '+57 311 223 3445', address: 'Cra 15 # 124-50', city: 'Bogotá', taxRegime: 'No responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.678.901-6', legalName: 'Clínica Santa María de los Andes', commercialName: 'Clínica Los Andes', email: 'suministros@clinicaandes.org', phone: '+57 318 555 6677', address: 'Calle 134 # 9-20', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'CC', docNumber: '1018456789', legalName: 'Rodrigo Gómez Salazar', commercialName: 'Consultorías Gómez', email: 'rodrigo.gomez@gmail.com', phone: '+57 320 888 9911', address: 'Cra 7 # 72-64 Of 402', city: 'Bogotá', taxRegime: 'No responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.789.012-7', legalName: 'Constructora Bolívar y Asociados SAS', commercialName: 'Bolívar Obras', email: 'compras@bolivarasoc.com', phone: '+57 314 332 1100', address: 'Calle 90 # 14-26', city: 'Bogotá', taxRegime: 'Gran Contribuyente' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.890.123-8', legalName: 'Servicios Logísticos del Eje Cafetero', commercialName: 'LogiEje', email: 'operaciones@logieje.com', phone: '+57 317 444 3322', address: 'Cra 14 # 21-45', city: 'Pereira', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '900.901.234-9', legalName: 'Agencia de Publicidad Prisma Creativo', commercialName: 'Prisma Lab', email: 'admin@prismacreativo.com', phone: '+57 301 777 8899', address: 'Calle 70 # 8-15', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'CC', docNumber: '52890123', legalName: 'María Fernanda Restrepo', commercialName: 'Restrepo & Abogados', email: 'mafe.restrepo@bufete.co', phone: '+57 316 234 1122', address: 'Cra 11 # 86-53', city: 'Bogotá', taxRegime: 'No responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '901.012.345-0', legalName: 'Hoteles del Sol Internacional SAS', commercialName: 'Hotel Sol Real', email: 'compras@solrealhotel.com', phone: '+57 313 890 1234', address: 'Av San Martín # 4-50', city: 'Cartagena', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '901.123.456-1', legalName: 'Cooperativa de Transportes Coontrans', commercialName: 'CoonTrans', email: 'gerencia@coontrans.org', phone: '+57 310 999 1234', address: 'Terminal Salitre Mod 2', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'NIT', docNumber: '901.234.567-2', legalName: 'Alimentos del Campo Natural SAS', commercialName: 'CampoNut', email: 'tesoreria@camponut.com', phone: '+57 312 456 7810', address: 'Km 3 Vía Chía', city: 'Chía', taxRegime: 'Responsable de IVA' },
    { type: 'CLIENTE', docType: 'CC', docNumber: '79654321', legalName: 'Alonso Herrera Peña', commercialName: 'Herrera Arquitectos', email: 'alonso.herrera@herreraarq.com', phone: '+57 315 221 4455', address: 'Cra 19 # 104-32', city: 'Bogotá', taxRegime: 'No responsable de IVA' },

    // Proveedores (10)
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.111.222-1', legalName: 'Mayorista de Tecnología Global SA', commercialName: 'TechGlobal Mayorista', email: 'ventas@techglobal.com', phone: '+57 601 745 0000', address: 'Parque Industrial Celta Bod 14', city: 'Funza', taxRegime: 'Gran Contribuyente' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.222.333-2', legalName: 'Industrias de Papel y Celulosa Nacional', commercialName: 'Papelera Nacional', email: 'pedidos@papelnacional.co', phone: '+57 602 660 1200', address: 'Zona Franca del Pacífico', city: 'Palmira', taxRegime: 'Gran Contribuyente' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.333.444-3', legalName: 'Químicos y Detergentes Ecológicos SAS', commercialName: 'EcoQuim', email: 'corporativo@ecoquim.com', phone: '+57 604 444 8900', address: 'Cra 42 # 33-100', city: 'Itagüí', taxRegime: 'Responsable de IVA' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.444.555-4', legalName: 'Ferretería Industrial y Mayorista SA', commercialName: 'FerroMayor', email: 'ventas@ferromayor.co', phone: '+57 601 320 4000', address: 'Av Las Américas # 42-15', city: 'Bogotá', taxRegime: 'Gran Contribuyente' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.555.666-5', legalName: 'Mobiliario Corporativo Ergonómico Ltda', commercialName: 'MobiOffice', email: 'proyectos@mobioffice.com', phone: '+57 601 288 7766', address: 'Calle 68 # 22-45', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.666.777-6', legalName: 'Importadora Herramientas del Norte SAS', commercialName: 'NorteTools', email: 'info@nortetools.com', phone: '+57 605 385 6000', address: 'Vía 40 # 77-10', city: 'Barranquilla', taxRegime: 'Responsable de IVA' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.777.888-7', legalName: 'Suministros de Empaque y Aseo Express', commercialName: 'Empaques Express', email: 'pedidos@empaquesexpress.com', phone: '+57 601 411 9090', address: 'Calle 17 # 60-22', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.888.999-8', legalName: 'Componentes Electrónicos de Colombia SAS', commercialName: 'ElectroCol', email: 'ventas@electrocol.com', phone: '+57 601 530 2211', address: 'Cra 15 # 77-05', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '800.999.000-9', legalName: 'Distribuidora de Papelería Colombiana SA', commercialName: 'Papelcol Mayorista', email: 'mayorista@papelcol.com', phone: '+57 601 368 4500', address: 'Cra 27 # 12-40', city: 'Bogotá', taxRegime: 'Gran Contribuyente' },
    { type: 'PROVEEDOR', docType: 'NIT', docNumber: '801.000.111-0', legalName: 'Textiles e Insumos de Limpieza del Valle', commercialName: 'TexLimpio', email: 'ventas@texlimpio.co', phone: '+57 602 888 1000', address: 'Calle 15 # 10-30', city: 'Cali', taxRegime: 'Responsable de IVA' },

    // Terceros con rol AMBOS (5)
    { type: 'AMBOS', docType: 'NIT', docNumber: '900.999.111-1', legalName: 'Soluciones Gráficas e Impresos Siglo SAS', commercialName: 'Gráficas Siglo', email: 'contacto@graficassiglo.com', phone: '+57 601 240 5566', address: 'Calle 63 # 24-10', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'AMBOS', docType: 'NIT', docNumber: '900.999.222-2', legalName: 'Red de Servicios y Mantenimiento Pro SAS', commercialName: 'RedMantenimiento', email: 'info@redmantenimiento.com', phone: '+57 601 620 4400', address: 'Cra 45 # 108-20', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'AMBOS', docType: 'NIT', docNumber: '900.999.333-3', legalName: 'Integradores Audiovisuales de Colombia', commercialName: 'AudioVisual Col', email: 'soporte@audiovisualcol.com', phone: '+57 318 700 8090', address: 'Calle 100 # 19-61', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'AMBOS', docType: 'NIT', docNumber: '900.999.444-4', legalName: 'Equipos y Dotaciones Empresariales SAS', commercialName: 'DotaEmpresas', email: 'ventas@dotaempresas.com', phone: '+57 311 500 4030', address: 'Cra 30 # 25-15', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
    { type: 'AMBOS', docType: 'NIT', docNumber: '900.999.555-5', legalName: 'Sistemas Modulares y Mobiliario SAS', commercialName: 'Modulares Express', email: 'ventas@modularesexpress.com', phone: '+57 601 540 8822', address: 'Av Calle 26 # 85D-55', city: 'Bogotá', taxRegime: 'Responsable de IVA' },
  ];

  /**
   * Main seed method
   */
  const initSeed = (forceReset = false) => {
    const existingProducts = ERPStorage.getCollection('products');
    if (existingProducts.length > 0 && !forceReset) {
      console.log('[SeedService] Database already seeded with', existingProducts.length, 'products.');
      return false;
    }

    console.log('[SeedService] Starting database seed process...');
    ERPStorage.clearDatabase();

    // 1. Seed Products
    const createdProducts = [];
    PRODUCTS_CATALOG.forEach((p) => {
      const prod = InventoryService.createProduct({
        ...p,
        imageUrl: `https://picsum.photos/seed/${p.sku.toLowerCase()}/400/400`,
        status: 'ACTIVO',
      });
      createdProducts.push(prod);
    });

    // 2. Seed Partners
    const createdPartners = [];
    PARTNERS_CATALOG.forEach((p) => {
      const part = PartnerService.create(p);
      createdPartners.push(part);
    });

    const clients = createdPartners.filter((p) => p.type === 'CLIENTE' || p.type === 'AMBOS');
    const suppliers = createdPartners.filter((p) => p.type === 'PROVEEDOR' || p.type === 'AMBOS');

    // 3. Seed 15 Historical Purchases
    // We create purchases dating 45 days ago up to 5 days ago
    const today = new Date();
    const createdPurchases = [];

    for (let i = 1; i <= 15; i++) {
      const supplier = suppliers[(i - 1) % suppliers.length];
      const purchaseDate = new Date(today);
      purchaseDate.setDate(purchaseDate.getDate() - (45 - i * 2));
      const dateISO = purchaseDate.toISOString().substring(0, 10);

      const dueDate = new Date(purchaseDate);
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateISO = dueDate.toISOString().substring(0, 10);

      // Select 2 products per purchase
      const prodA = createdProducts[(i * 3) % createdProducts.length];
      const prodB = createdProducts[(i * 3 + 1) % createdProducts.length];

      const purchaseItems = [
        {
          productId: prodA.id,
          productSku: prodA.sku,
          productName: prodA.name,
          quantity: 5 + (i % 4),
          unitCost: prodA.cost,
          taxRate: 0.19,
        },
        {
          productId: prodB.id,
          productSku: prodB.sku,
          productName: prodB.name,
          quantity: 4 + (i % 3),
          unitCost: prodB.cost,
          taxRate: 0.19,
        },
      ];

      const purchase = PurchaseService.createPurchase({
        supplierId: supplier.id,
        supplierName: supplier.legalName,
        supplierDoc: supplier.docNumber,
        date: dateISO,
        dueDate: dueDateISO,
        warehouse: 'Bodega Principal',
        notes: `Orden de compra inicial suministros #${i}`,
        items: purchaseItems,
      });

      // Approve purchases (13 approved, 1 draft, 1 canceled)
      if (i <= 13) {
        PurchaseService.approvePurchase(purchase.id);
        // Payments: 8 fully paid, 3 partially paid, 2 pending
        if (i <= 8) {
          // Full payment
          PaymentService.createPayment({
            docType: 'COMPRA',
            docNumber: purchase.docNumber,
            amount: purchase.total,
            paymentMethod: 'Transferencia',
            reference: `TRF-PROV-${1000 + i}`,
            notes: 'Pago total de factura de compra',
          });
        } else if (i <= 11) {
          // Partial payment (approx 50%)
          const partialAmt = Math.round(purchase.total * 0.5);
          PaymentService.createPayment({
            docType: 'COMPRA',
            docNumber: purchase.docNumber,
            amount: partialAmt,
            paymentMethod: 'Transferencia',
            reference: `TRF-PROV-PARCIAL-${1000 + i}`,
            notes: 'Abono 50% compra',
          });
        }
      } else if (i === 15) {
        // Canceled purchase
        PurchaseService.cancelPurchase(purchase.id);
      }

      createdPurchases.push(PurchaseService.getById(purchase.id));
    }

    // 4. Seed 30 Historical Sales
    // Dates distributed across last 30 days
    const createdSales = [];
    for (let i = 1; i <= 30; i++) {
      const client = clients[(i - 1) % clients.length];
      const saleDate = new Date(today);
      saleDate.setDate(saleDate.getDate() - (30 - i));
      const dateISO = saleDate.toISOString().substring(0, 10);

      const dueDate = new Date(saleDate);
      dueDate.setDate(dueDate.getDate() + 15); // 15 days credit
      const dueDateISO = dueDate.toISOString().substring(0, 10);

      // Select products with sufficient stock
      const prodA = createdProducts[(i * 2) % createdProducts.length];
      const prodB = createdProducts[(i * 2 + 1) % createdProducts.length];

      const saleItems = [
        {
          productId: prodA.id,
          productSku: prodA.sku,
          productName: prodA.name,
          quantity: 1 + (i % 2),
          unitPrice: prodA.price,
          unitCost: prodA.cost,
          discount: i % 5 === 0 ? 5 : 0,
          taxRate: 0.19,
        },
        {
          productId: prodB.id,
          productSku: prodB.sku,
          productName: prodB.name,
          quantity: 1,
          unitPrice: prodB.price,
          unitCost: prodB.cost,
          discount: 0,
          taxRate: 0.19,
        },
      ];

      const sale = SalesService.createSale({
        customerId: client.id,
        customerName: client.legalName,
        customerDoc: client.docNumber,
        date: dateISO,
        dueDate: dueDateISO,
        warehouse: 'Bodega Principal',
        notes: `Factura de venta comercial #${i}`,
        items: saleItems,
      });

      // Distribute states:
      // i = 1..15 -> PAGADO (fully paid)
      // i = 16..22 -> PARCIALMENTE PAGADO
      // i = 23..27 -> APROBADO (pending payment)
      // i = 28..29 -> BORRADOR
      // i = 30 -> ANULADO
      if (i <= 27) {
        SalesService.approveSale(sale.id);

        if (i <= 15) {
          // Full payment
          PaymentService.createPayment({
            docType: 'VENTA',
            docNumber: sale.docNumber,
            amount: sale.total,
            paymentMethod: i % 2 === 0 ? 'Transferencia' : 'Tarjeta',
            reference: `REC-CLI-${2000 + i}`,
            notes: 'Cancelación total factura venta',
          });
        } else if (i <= 22) {
          // Partial payment (approx 40%)
          const partialAmt = Math.round(sale.total * 0.4);
          PaymentService.createPayment({
            docType: 'VENTA',
            docNumber: sale.docNumber,
            amount: partialAmt,
            paymentMethod: 'Efectivo',
            reference: `ABONO-CLI-${2000 + i}`,
            notes: 'Abono 40% a cuenta',
          });
        }
      } else if (i === 30) {
        // Canceled sale
        SalesService.cancelSale(sale.id);
      }

      createdSales.push(SalesService.getById(sale.id));
    }

    console.log('[SeedService] Database seeding completed successfully.');
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Partners: ${createdPartners.length}`);
    console.log(`- Purchases: ${createdPurchases.length}`);
    console.log(`- Sales: ${createdSales.length}`);
    console.log(`- Payments: ${PaymentService.getAll().length}`);
    console.log(`- Kardex records: ${InventoryService.getKardex().length}`);

    return true;
  };

  return {
    initSeed,
  };
})();

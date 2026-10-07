/**
 * ============================================================================
 * ERP EMPRESARIAL V0 - STORAGE SERVICE (storage.js)
 * High-reliability LocalStorage abstraction layer decoupled from UI.
 * Designed to be swapped seamlessly for REST API / PostgreSQL in future phases.
 * ============================================================================
 */

const ERPStorage = (() => {
  const PREFIX = 'erp_loango_v0_';

  /**
   * Helper to get full localStorage key name
   */
  const getKey = (collection) => `${PREFIX}${collection}`;

  /**
   * Retrieve all items in a collection
   * @param {string} collection 
   * @returns {Array} array of objects
   */
  const getCollection = (collection) => {
    try {
      const data = localStorage.getItem(getKey(collection));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`[ERPStorage] Error reading collection ${collection}:`, error);
      return [];
    }
  };

  /**
   * Overwrite entire collection with new array
   * @param {string} collection 
   * @param {Array} items 
   */
  const saveCollection = (collection, items) => {
    try {
      localStorage.setItem(getKey(collection), JSON.stringify(items));
      return true;
    } catch (error) {
      console.error(`[ERPStorage] Error saving collection ${collection}:`, error);
      throw new Error(`Error de almacenamiento local en ${collection}`);
    }
  };

  /**
   * Find item by ID
   * @param {string} collection 
   * @param {string|number} id 
   * @returns {object|null}
   */
  const findById = (collection, id) => {
    const items = getCollection(collection);
    return items.find((item) => String(item.id) === String(id)) || null;
  };

  /**
   * Find items matching a specific key/value
   * @param {string} collection 
   * @param {string} key 
   * @param {any} value 
   * @returns {Array}
   */
  const findByKey = (collection, key, value) => {
    const items = getCollection(collection);
    return items.filter((item) => item[key] === value);
  };

  /**
   * Add a new item to a collection with automatic timestamps
   * @param {string} collection 
   * @param {object} item 
   * @returns {object} created item
   */
  const addItem = (collection, item) => {
    const items = getCollection(collection);
    const now = new Date().toISOString();
    
    const newItem = {
      ...item,
      id: item.id || generateId(),
      created_at: item.created_at || now,
      updated_at: item.updated_at || now,
    };

    items.push(newItem);
    saveCollection(collection, items);
    return newItem;
  };

  /**
   * Update an existing item by ID
   * @param {string} collection 
   * @param {string|number} id 
   * @param {object} updates 
   * @returns {object|null} updated item
   */
  const updateItem = (collection, id, updates) => {
    const items = getCollection(collection);
    const index = items.findIndex((item) => String(item.id) === String(id));
    
    if (index === -1) {
      throw new Error(`Registro no encontrado con ID ${id} en ${collection}`);
    }

    const updatedItem = {
      ...items[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    items[index] = updatedItem;
    saveCollection(collection, items);
    return updatedItem;
  };

  /**
   * Delete an item by ID
   * @param {string} collection 
   * @param {string|number} id 
   * @returns {boolean}
   */
  const deleteItem = (collection, id) => {
    const items = getCollection(collection);
    const filtered = items.filter((item) => String(item.id) !== String(id));
    
    if (filtered.length === items.length) {
      return false;
    }

    saveCollection(collection, filtered);
    return true;
  };

  /**
   * Generate a unique UUID v4 compatible string
   */
  const generateId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  /**
   * Generate incremental document codes like VEN-00001, COM-00001, etc.
   * @param {string} sequenceKey 
   * @param {string} prefix 
   * @param {number} padding 
   */
  const getNextSequence = (sequenceKey, prefix = 'DOC-', padding = 5) => {
    const seqKey = `${PREFIX}seq_${sequenceKey}`;
    let current = parseInt(localStorage.getItem(seqKey) || '0', 10);
    current += 1;
    localStorage.setItem(seqKey, current.toString());
    const paddedNumber = String(current).padStart(padding, '0');
    return `${prefix}${paddedNumber}`;
  };

  /**
   * Set sequence counter to at least a certain value (useful after seed)
   */
  const syncSequence = (sequenceKey, value) => {
    const seqKey = `${PREFIX}seq_${sequenceKey}`;
    const current = parseInt(localStorage.getItem(seqKey) || '0', 10);
    if (value > current) {
      localStorage.setItem(seqKey, value.toString());
    }
  };

  /**
   * Clear all ERP data from LocalStorage
   */
  const clearDatabase = () => {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log('[ERPStorage] Database wiped successfully.');
  };

  /**
   * Simulate atomic transaction in memory.
   * If the callback throws an error, rollback to the previous snapshot.
   * @param {Function} callback 
   */
  const runTransaction = (callback) => {
    const snapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        snapshot[key] = localStorage.getItem(key);
      }
    }

    try {
      const result = callback();
      return result;
    } catch (error) {
      console.warn('[ERPStorage] Transaction failed. Rolling back snapshot...', error.message);
      // Restore all keys to snapshot
      for (const key in snapshot) {
        localStorage.setItem(key, snapshot[key]);
      }
      throw error;
    }
  };

  return {
    getCollection,
    saveCollection,
    addItem,
    updateItem,
    deleteItem,
    findById,
    findByKey,
    generateId,
    getNextSequence,
    syncSequence,
    clearDatabase,
    runTransaction,
  };
})();

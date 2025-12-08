/**
 * IndexedDB Manager - Maneja almacenamiento local de datos y cola de sincronización
 *
 * Stores:
 * - products: Almacena productos localmente
 * - stores: Almacena tiendas localmente
 * - syncQueue: Cola de operaciones pendientes para sincronizar
 */

const DB_NAME = 'AbarrotesDB';
const DB_VERSION = 1;

// Nombres de los stores
const STORES = {
    PRODUCTS: 'products',
    STORES_DATA: 'stores',
    SYNC_QUEUE: 'syncQueue'
};

class DBManager {
    constructor() {
        this.db = null;
    }

    /**
     * Abre/inicializa la base de datos IndexedDB
     * @returns {Promise<IDBDatabase>}
     */
    async openDB() {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Error abriendo IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB abierta correctamente');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Object Store para productos
                if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
                    const productsStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'uuid' });
                    productsStore.createIndex('name', 'name', { unique: false });
                    productsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('Object store "products" creado');
                }

                // Object Store para tiendas
                if (!db.objectStoreNames.contains(STORES.STORES_DATA)) {
                    const storesStore = db.createObjectStore(STORES.STORES_DATA, { keyPath: 'uuid' });
                    storesStore.createIndex('name', 'name', { unique: false });
                    storesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('Object store "stores" creado');
                }

                // Object Store para cola de sincronización
                if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('entity', 'entity', { unique: false });
                    syncStore.createIndex('operation', 'operation', { unique: false });
                    console.log('Object store "syncQueue" creado');
                }
            };
        });
    }

    /**
     * Operaciones genéricas para cualquier store
     */

    /**
     * Obtiene todos los items de un store
     * @param {string} storeName - Nombre del store
     * @returns {Promise<Array>}
     */
    async getAll(storeName) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtiene un item por su clave
     * @param {string} storeName - Nombre del store
     * @param {any} key - Clave del item
     * @returns {Promise<any>}
     */
    async get(storeName, key) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Agrega o actualiza un item
     * @param {string} storeName - Nombre del store
     * @param {any} data - Datos a guardar
     * @returns {Promise<any>}
     */
    async put(storeName, data) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Agrega múltiples items en una transacción
     * @param {string} storeName - Nombre del store
     * @param {Array} items - Array de items a guardar
     * @returns {Promise<void>}
     */
    async putBulk(storeName, items) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

            items.forEach(item => {
                store.put(item);
            });
        });
    }

    /**
     * Elimina un item
     * @param {string} storeName - Nombre del store
     * @param {any} key - Clave del item a eliminar
     * @returns {Promise<void>}
     */
    async delete(storeName, key) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Limpia todos los datos de un store
     * @param {string} storeName - Nombre del store
     * @returns {Promise<void>}
     */
    async clear(storeName) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * ====================================
     * OPERACIONES ESPECÍFICAS PARA PRODUCTOS
     * ====================================
     */

    async getAllProducts() {
        return this.getAll(STORES.PRODUCTS);
    }

    async getProduct(uuid) {
        return this.get(STORES.PRODUCTS, uuid);
    }

    async saveProduct(product) {
        return this.put(STORES.PRODUCTS, product);
    }

    async deleteProduct(uuid) {
        return this.delete(STORES.PRODUCTS, uuid);
    }

    async saveProducts(products) {
        return this.putBulk(STORES.PRODUCTS, products);
    }

    /**
     * ====================================
     * OPERACIONES ESPECÍFICAS PARA TIENDAS
     * ====================================
     */

    async getAllStores() {
        return this.getAll(STORES.STORES_DATA);
    }

    async getStore(uuid) {
        return this.get(STORES.STORES_DATA, uuid);
    }

    async saveStore(store) {
        return this.put(STORES.STORES_DATA, store);
    }

    async deleteStore(uuid) {
        return this.delete(STORES.STORES_DATA, uuid);
    }

    async saveStores(stores) {
        return this.putBulk(STORES.STORES_DATA, stores);
    }

    /**
     * ====================================
     * OPERACIONES PARA COLA DE SINCRONIZACIÓN
     * ====================================
     */

    /**
     * Agrega una operación a la cola de sincronización
     * @param {Object} operation - Operación a encolar
     * @param {string} operation.entity - 'product' o 'store'
     * @param {string} operation.type - 'create', 'update', 'delete'
     * @param {any} operation.data - Datos de la operación
     * @param {string} operation.uuid - UUID del registro (o temporal para creates)
     * @returns {Promise<number>} ID de la operación en la cola
     */
    async addToSyncQueue(operation) {
        const queueItem = {
            ...operation,
            timestamp: Date.now(),
            retries: 0,
            status: 'pending' // pending, syncing, failed
        };

        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const request = store.add(queueItem);

            request.onsuccess = () => {
                console.log('Operación agregada a la cola:', queueItem);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtiene todas las operaciones pendientes de sincronizar
     * @returns {Promise<Array>}
     */
    async getPendingSyncOperations() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SYNC_QUEUE], 'readonly');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const index = store.index('timestamp');
            const request = index.getAll();

            request.onsuccess = () => {
                const operations = request.result.filter(op => op.status === 'pending');
                resolve(operations);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Obtiene el conteo de operaciones pendientes
     * @returns {Promise<number>}
     */
    async getPendingSyncCount() {
        const operations = await this.getPendingSyncOperations();
        return operations.length;
    }

    /**
     * Actualiza el estado de una operación en la cola
     * @param {number} id - ID de la operación
     * @param {string} status - Nuevo estado
     * @returns {Promise<void>}
     */
    async updateSyncOperationStatus(id, status) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const operation = getRequest.result;
                if (operation) {
                    operation.status = status;
                    if (status === 'failed') {
                        operation.retries = (operation.retries || 0) + 1;
                    }
                    const updateRequest = store.put(operation);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Elimina una operación de la cola
     * @param {number} id - ID de la operación
     * @returns {Promise<void>}
     */
    async removeSyncOperation(id) {
        return this.delete(STORES.SYNC_QUEUE, id);
    }

    /**
     * Limpia todas las operaciones completadas de la cola
     * @returns {Promise<void>}
     */
    async clearCompletedSyncOperations() {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const request = store.getAll();

            request.onsuccess = () => {
                const operations = request.result;
                operations.forEach(op => {
                    if (op.status === 'completed') {
                        store.delete(op.id);
                    }
                });
                transaction.oncomplete = () => resolve();
            };
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * Genera un UUID temporal para registros creados offline
     * @returns {string} UUID temporal con prefijo 'temp-'
     */
    generateTempUUID() {
        return 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Verifica si un UUID es temporal
     * @param {string} uuid
     * @returns {boolean}
     */
    isTempUUID(uuid) {
        return uuid && uuid.startsWith('temp-');
    }

    /**
     * Reemplaza un UUID temporal por el UUID real del servidor
     * @param {string} storeName - 'products' o 'stores'
     * @param {string} tempUUID - UUID temporal
     * @param {string} realUUID - UUID real del servidor
     * @param {Object} updatedData - Datos actualizados del servidor
     * @returns {Promise<void>}
     */
    async replaceTempUUID(storeName, tempUUID, realUUID, updatedData) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Eliminar el registro temporal
            const deleteRequest = store.delete(tempUUID);

            deleteRequest.onsuccess = () => {
                // Agregar el registro con el UUID real
                const dataWithRealUUID = { ...updatedData, uuid: realUUID };
                const putRequest = store.put(dataWithRealUUID);

                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };

            deleteRequest.onerror = () => reject(deleteRequest.error);
        });
    }
}

// Exportar instancia singleton
const dbManager = new DBManager();
export default dbManager;

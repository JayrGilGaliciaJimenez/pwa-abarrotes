/**
 * PouchDB Service
 * Servicio de abstracción para operaciones con PouchDB
 * Maneja almacenamiento local offline-first para productos y tiendas
 *
 * Estructura preparada para sincronización futura con CouchDB
 */

class PouchDBService {
    constructor() {
        // Inicializar bases de datos locales
        this.dbProducts = null;
        this.dbStores = null;
        this.isInitialized = false;

        // Estado de conectividad (para sincronización futura)
        this.isOnline = navigator.onLine;

        // Listeners de conectividad
        this.setupConnectivityListeners();
    }

    /**
     * Inicializa las bases de datos PouchDB
     * Debe llamarse antes de usar el servicio
     */
    async initialize() {
        try {
            console.log('[PouchDB] Inicializando bases de datos...');

            // Crear DB local para productos
            this.dbProducts = new PouchDB('products');
            console.log('[PouchDB] Base de datos de productos creada');

            // Crear DB local para tiendas
            this.dbStores = new PouchDB('stores');
            console.log('[PouchDB] Base de datos de tiendas creada');

            // Crear índices para búsquedas eficientes
            await this.createIndexes();

            this.isInitialized = true;
            console.log('[PouchDB] Servicio inicializado correctamente');

            return true;
        } catch (error) {
            console.error('[PouchDB] Error al inicializar:', error);
            throw error;
        }
    }

    /**
     * Crea índices para búsquedas eficientes
     */
    async createIndexes() {
        try {
            // Índice para productos por nombre
            await this.dbProducts.createIndex({
                index: { fields: ['name'] }
            });

            // Índice para productos por fecha de actualización
            await this.dbProducts.createIndex({
                index: { fields: ['updatedAt'] }
            });

            // Índice para tiendas por nombre
            await this.dbStores.createIndex({
                index: { fields: ['name'] }
            });

            console.log('[PouchDB] Índices creados correctamente');
        } catch (error) {
            console.error('[PouchDB] Error al crear índices:', error);
        }
    }

    /**
     * Configura listeners para detectar cambios de conectividad
     * Preparado para sincronización futura
     */
    setupConnectivityListeners() {
        window.addEventListener('online', () => {
            console.log('[PouchDB] Conexión restaurada');
            this.isOnline = true;
            // TODO: Activar sincronización cuando esté configurado CouchDB
        });

        window.addEventListener('offline', () => {
            console.log('[PouchDB] Sin conexión - modo offline');
            this.isOnline = false;
        });
    }

    /**
     * Genera un ID único para documentos
     * Usa timestamp ISO + random para evitar colisiones
     */
    generateId() {
        const timestamp = new Date().toISOString();
        const random = Math.random().toString(36).substring(2, 9);
        return `${timestamp}-${random}`;
    }

    // ==========================================
    // OPERACIONES CRUD - PRODUCTOS
    // ==========================================

    /**
     * Crear un nuevo producto
     * @param {Object} productData - Datos del producto (sin _id ni _rev)
     * @returns {Promise<Object>} Producto creado con _id y _rev
     */
    async createProduct(productData) {
        try {
            console.log('[PouchDB] Creando producto:', productData);

            const doc = {
                _id: this.generateId(),
                ...productData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: 'product' // Tipo de documento
            };

            const result = await this.dbProducts.put(doc);
            console.log('[PouchDB] Producto creado:', result);

            return {
                ...doc,
                _rev: result.rev
            };
        } catch (error) {
            console.error('[PouchDB] Error al crear producto:', error);
            throw error;
        }
    }

    /**
     * Obtener todos los productos
     * @returns {Promise<Array>} Lista de productos
     */
    async getAllProducts() {
        try {
            console.log('[PouchDB] Obteniendo todos los productos...');

            const result = await this.dbProducts.allDocs({
                include_docs: true,
                descending: true // Más recientes primero
            });

            // Filtrar documentos de diseño (_design/*) y documentos internos
            const products = result.rows
                .filter(row => !row.id.startsWith('_design/'))
                .map(row => row.doc);

            console.log(`[PouchDB] ${products.length} productos obtenidos`);

            return products;
        } catch (error) {
            console.error('[PouchDB] Error al obtener productos:', error);
            throw error;
        }
    }

    /**
     * Obtener un producto por ID
     * @param {string} id - ID del producto
     * @returns {Promise<Object>} Producto encontrado
     */
    async getProduct(id) {
        try {
            console.log('[PouchDB] Obteniendo producto:', id);
            const product = await this.dbProducts.get(id);
            return product;
        } catch (error) {
            if (error.name === 'not_found') {
                console.warn('[PouchDB] Producto no encontrado:', id);
                return null;
            }
            console.error('[PouchDB] Error al obtener producto:', error);
            throw error;
        }
    }

    /**
     * Actualizar un producto existente
     * @param {string} id - ID del producto
     * @param {Object} updates - Datos a actualizar
     * @returns {Promise<Object>} Producto actualizado
     */
    async updateProduct(id, updates) {
        try {
            console.log('[PouchDB] Actualizando producto:', id);

            // Obtener el documento actual para tener el _rev
            const currentDoc = await this.dbProducts.get(id);

            // Crear documento actualizado
            const updatedDoc = {
                ...currentDoc,
                ...updates,
                _id: currentDoc._id, // Mantener _id
                _rev: currentDoc._rev, // Mantener _rev actual
                updatedAt: new Date().toISOString()
            };

            const result = await this.dbProducts.put(updatedDoc);
            console.log('[PouchDB] Producto actualizado:', result);

            return {
                ...updatedDoc,
                _rev: result.rev // Nuevo _rev
            };
        } catch (error) {
            console.error('[PouchDB] Error al actualizar producto:', error);
            throw error;
        }
    }

    /**
     * Eliminar un producto
     * @param {string} id - ID del producto a eliminar
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async deleteProduct(id) {
        try {
            console.log('[PouchDB] Eliminando producto:', id);

            // Obtener el documento actual para tener el _rev
            const doc = await this.dbProducts.get(id);

            // Eliminar documento
            const result = await this.dbProducts.remove(doc);
            console.log('[PouchDB] Producto eliminado:', result);

            return result;
        } catch (error) {
            console.error('[PouchDB] Error al eliminar producto:', error);
            throw error;
        }
    }

    /**
     * Buscar productos por nombre
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Promise<Array>} Productos encontrados
     */
    async searchProducts(searchTerm) {
        try {
            console.log('[PouchDB] Buscando productos:', searchTerm);

            const result = await this.dbProducts.find({
                selector: {
                    name: {
                        $regex: new RegExp(searchTerm, 'i')
                    }
                }
            });

            console.log(`[PouchDB] ${result.docs.length} productos encontrados`);
            return result.docs;
        } catch (error) {
            console.error('[PouchDB] Error al buscar productos:', error);
            throw error;
        }
    }

    // ==========================================
    // OPERACIONES CRUD - TIENDAS
    // ==========================================

    /**
     * Crear una nueva tienda
     * @param {Object} storeData - Datos de la tienda (sin _id ni _rev)
     * @returns {Promise<Object>} Tienda creada con _id y _rev
     */
    async createStore(storeData) {
        try {
            console.log('[PouchDB] Creando tienda:', storeData);

            const doc = {
                _id: this.generateId(),
                ...storeData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: 'store' // Tipo de documento
            };

            const result = await this.dbStores.put(doc);
            console.log('[PouchDB] Tienda creada:', result);

            return {
                ...doc,
                _rev: result.rev
            };
        } catch (error) {
            console.error('[PouchDB] Error al crear tienda:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las tiendas
     * @returns {Promise<Array>} Lista de tiendas
     */
    async getAllStores() {
        try {
            console.log('[PouchDB] Obteniendo todas las tiendas...');

            const result = await this.dbStores.allDocs({
                include_docs: true,
                descending: true // Más recientes primero
            });

            // Filtrar documentos de diseño (_design/*) y documentos internos
            const stores = result.rows
                .filter(row => !row.id.startsWith('_design/'))
                .map(row => row.doc);

            console.log(`[PouchDB] ${stores.length} tiendas obtenidas`);

            return stores;
        } catch (error) {
            console.error('[PouchDB] Error al obtener tiendas:', error);
            throw error;
        }
    }

    /**
     * Obtener una tienda por ID
     * @param {string} id - ID de la tienda
     * @returns {Promise<Object>} Tienda encontrada
     */
    async getStore(id) {
        try {
            console.log('[PouchDB] Obteniendo tienda:', id);
            const store = await this.dbStores.get(id);
            return store;
        } catch (error) {
            if (error.name === 'not_found') {
                console.warn('[PouchDB] Tienda no encontrada:', id);
                return null;
            }
            console.error('[PouchDB] Error al obtener tienda:', error);
            throw error;
        }
    }

    /**
     * Actualizar una tienda existente
     * @param {string} id - ID de la tienda
     * @param {Object} updates - Datos a actualizar
     * @returns {Promise<Object>} Tienda actualizada
     */
    async updateStore(id, updates) {
        try {
            console.log('[PouchDB] Actualizando tienda:', id);

            // Obtener el documento actual para tener el _rev
            const currentDoc = await this.dbStores.get(id);

            // Crear documento actualizado
            const updatedDoc = {
                ...currentDoc,
                ...updates,
                _id: currentDoc._id, // Mantener _id
                _rev: currentDoc._rev, // Mantener _rev actual
                updatedAt: new Date().toISOString()
            };

            const result = await this.dbStores.put(updatedDoc);
            console.log('[PouchDB] Tienda actualizada:', result);

            return {
                ...updatedDoc,
                _rev: result.rev // Nuevo _rev
            };
        } catch (error) {
            console.error('[PouchDB] Error al actualizar tienda:', error);
            throw error;
        }
    }

    /**
     * Eliminar una tienda
     * @param {string} id - ID de la tienda a eliminar
     * @returns {Promise<Object>} Resultado de la eliminación
     */
    async deleteStore(id) {
        try {
            console.log('[PouchDB] Eliminando tienda:', id);

            // Obtener el documento actual para tener el _rev
            const doc = await this.dbStores.get(id);

            // Eliminar documento
            const result = await this.dbStores.remove(doc);
            console.log('[PouchDB] Tienda eliminada:', result);

            return result;
        } catch (error) {
            console.error('[PouchDB] Error al eliminar tienda:', error);
            throw error;
        }
    }

    /**
     * Buscar tiendas por nombre
     * @param {string} searchTerm - Término de búsqueda
     * @returns {Promise<Array>} Tiendas encontradas
     */
    async searchStores(searchTerm) {
        try {
            console.log('[PouchDB] Buscando tiendas:', searchTerm);

            const result = await this.dbStores.find({
                selector: {
                    name: {
                        $regex: new RegExp(searchTerm, 'i')
                    }
                }
            });

            console.log(`[PouchDB] ${result.docs.length} tiendas encontradas`);
            return result.docs;
        } catch (error) {
            console.error('[PouchDB] Error al buscar tiendas:', error);
            throw error;
        }
    }

    // ==========================================
    // UTILIDADES Y ADMINISTRACIÓN
    // ==========================================

    /**
     * Obtener información de las bases de datos
     * Útil para debugging y monitoreo
     */
    async getDbInfo() {
        try {
            const productsInfo = await this.dbProducts.info();
            const storesInfo = await this.dbStores.info();

            return {
                products: productsInfo,
                stores: storesInfo,
                isOnline: this.isOnline
            };
        } catch (error) {
            console.error('[PouchDB] Error al obtener info de DBs:', error);
            throw error;
        }
    }

    /**
     * Limpiar todas las bases de datos
     * USAR CON PRECAUCIÓN - Elimina todos los datos locales
     */
    async clearAllData() {
        try {
            console.warn('[PouchDB] Limpiando todas las bases de datos...');

            await this.dbProducts.destroy();
            await this.dbStores.destroy();

            // Reinicializar
            await this.initialize();

            console.log('[PouchDB] Todas las bases de datos limpiadas');
            return true;
        } catch (error) {
            console.error('[PouchDB] Error al limpiar datos:', error);
            throw error;
        }
    }

    /**
     * Exportar todos los datos (para backup o migración)
     * @returns {Promise<Object>} Todos los datos de productos y tiendas
     */
    async exportAllData() {
        try {
            const products = await this.getAllProducts();
            const stores = await this.getAllStores();

            return {
                products,
                stores,
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('[PouchDB] Error al exportar datos:', error);
            throw error;
        }
    }

    // ==========================================
    // SINCRONIZACIÓN (PREPARADO PARA FUTURO)
    // ==========================================

    /**
     * Configurar sincronización con CouchDB remoto
     * NOTA: Actualmente no implementado - preparado para futuro
     *
     * @param {string} remoteUrl - URL de CouchDB remoto
     * @param {Object} options - Opciones de sincronización
     */
    setupSync(remoteUrl, options = {}) {
        console.log('[PouchDB] Sincronización con CouchDB no implementada aún');
        console.log('[PouchDB] Para activar sync en el futuro:');
        console.log(`  1. Configurar CouchDB en: ${remoteUrl}`);
        console.log('  2. Descomentar código de sync en este método');
        console.log('  3. Manejar eventos de sync (change, error, complete)');

        // TODO: Implementar cuando esté listo CouchDB
        /*
        this.syncProducts = this.dbProducts.sync(remoteUrl + '/products', {
            live: true,
            retry: true,
            ...options
        }).on('change', function (info) {
            console.log('[PouchDB Sync] Cambio detectado:', info);
        }).on('error', function (err) {
            console.error('[PouchDB Sync] Error:', err);
        });
        */
    }
}

// Exportar instancia singleton
const pouchDBService = new PouchDBService();

// Hacer disponible globalmente (para usar en otros scripts)
window.pouchDBService = pouchDBService;

console.log('[PouchDB] Servicio cargado - ejecutar pouchDBService.initialize() para comenzar');

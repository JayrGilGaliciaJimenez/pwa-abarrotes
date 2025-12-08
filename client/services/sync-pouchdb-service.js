/**
 * Hybrid Sync Service - SIMPLIFICADO
 * SOLO GET y POST de productos y tiendas
 */

// Usar BASE_URL de properties.js si está disponible, sino usar fallback
const BACKEND_URL = window.BASE_URL || 'http://localhost:82/api/v1';

class HybridSyncService {
    constructor() {
        this.dbProducts = null;
        this.dbStores = null;
        this.isInitialized = false;

        console.log('[HybridSync] Servicio creado');
    }

    /**
     * Inicializar PouchDB
     */
    async initialize() {
        try {
            console.log('[HybridSync] Inicializando PouchDB...');
            this.dbProducts = new PouchDB('products');
            this.dbStores = new PouchDB('stores');
            this.isInitialized = true;

            console.log('[HybridSync] ✅ PouchDB inicializado (productos y tiendas)');

            // Setup auto-sync cuando vuelva conexión
            this.setupAutoSync();

            return true;
        } catch (error) {
            console.error('[HybridSync] ❌ Error al inicializar:', error);
            throw error;
        }
    }

    /**
     * Obtener token de autorización
     */
    getAuthToken() {
        return localStorage.getItem('token');
    }

    /**
     * Headers para requests
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // ==========================================
    // GET PRODUCTS (LISTAR)
    // ==========================================

    /**
     * Obtener todos los productos
     * - Con internet: GET al backend + cachea en PouchDB
     * - Sin internet: Lee de PouchDB
     */
    async getAllProducts() {
        console.log('[HybridSync] 📦 Obteniendo productos...');
        console.log('[HybridSync] Estado de conexión:', navigator.onLine ? '🟢 Online' : '🔴 Offline');

        if (navigator.onLine) {
            try {
                console.log('[HybridSync] 🌐 Cargando productos desde BACKEND...');

                // 1. GET al backend
                const response = await fetch(`${BACKEND_URL}/products`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                const products = responseData.data; // Los productos están en .data
                console.log(`[HybridSync] ✅ ${products.length} productos obtenidos del backend`);

                // 2. Cachear en PouchDB para uso offline
                await this.cacheProductsInPouchDB(products);

                return products;

            } catch (error) {
                console.warn('[HybridSync] ⚠️ Error al cargar del backend, usando caché:', error.message);
                // Si falla, cargar desde caché
                return await this.loadProductsFromCache();
            }
        } else {
            // Sin internet, cargar desde caché
            console.log('[HybridSync] 📴 SIN INTERNET - Cargando desde caché...');
            return await this.loadProductsFromCache();
        }
    }

    /**
     * Cachear productos del backend en PouchDB
     */
    async cacheProductsInPouchDB(products) {
        try {
            console.log('[HybridSync] 💾 Cacheando productos en PouchDB...');

            for (const product of products) {
                try {
                    // Intentar obtener el documento existente
                    const existingDoc = await this.dbProducts.get(product.uuid).catch(() => null);

                    if (existingDoc) {
                        // Actualizar documento existente
                        await this.dbProducts.put({
                            _id: product.uuid,
                            _rev: existingDoc._rev,
                            ...product,
                            cachedAt: new Date().toISOString()
                        });
                    } else {
                        // Crear nuevo documento
                        await this.dbProducts.put({
                            _id: product.uuid,
                            ...product,
                            cachedAt: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.warn(`[HybridSync] ⚠️ Error cacheando producto ${product.name}:`, error.message);
                }
            }

            console.log('[HybridSync] ✅ Productos cacheados correctamente');
        } catch (error) {
            console.error('[HybridSync] ❌ Error al cachear productos:', error);
        }
    }

    /**
     * Cargar productos desde caché local (PouchDB)
     * INCLUYE registros pendientes de sincronización (temp_*)
     */
    async loadProductsFromCache() {
        try {
            console.log('[HybridSync] 📂 Cargando productos desde CACHÉ (PouchDB)...');

            const result = await this.dbProducts.allDocs({
                include_docs: true,
                descending: true
            });

            // INCLUIR TODOS los registros, incluso los temp_* (pendientes)
            const products = result.rows
                .filter(row => !row.id.startsWith('_design/'))
                .map(row => row.doc);

            // Contar cuántos están pendientes
            const pendingCount = products.filter(p => p.syncPending === true).length;

            console.log(`[HybridSync] ✅ ${products.length} productos cargados desde caché (${pendingCount} pendientes)`);
            return products;

        } catch (error) {
            console.error('[HybridSync] ❌ Error al cargar desde caché:', error);
            return [];
        }
    }

    // ==========================================
    // POST PRODUCTS (CREAR)
    // ==========================================

    /**
     * Crear producto
     * - Con internet: POST al backend inmediatamente
     * - Sin internet: Guardar en PouchDB con flag pendiente
     */
    async createProduct(productData) {
        console.log('[HybridSync] ➕ Creando producto:', productData);
        console.log('[HybridSync] Estado de conexión:', navigator.onLine ? '🟢 Online' : '🔴 Offline');

        if (navigator.onLine) {
            try {
                console.log('[HybridSync] 🌐 Enviando producto al BACKEND...');

                // 1. POST al backend
                const response = await fetch(`${BACKEND_URL}/products`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(productData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                const savedProduct = responseData.data; // El producto guardado está en .data
                console.log('[HybridSync] ✅ Producto guardado en backend:', savedProduct.uuid);

                // 2. Cachear en PouchDB
                await this.dbProducts.put({
                    _id: savedProduct.uuid,
                    ...savedProduct,
                    cachedAt: new Date().toISOString()
                });

                console.log('[HybridSync] ✅ Producto cacheado en PouchDB');
                return { success: true, product: savedProduct };

            } catch (error) {
                console.warn('[HybridSync] ⚠️ Error al guardar en backend, guardando localmente:', error.message);
                // Si falla, guardar localmente
                return await this.saveProductOffline(productData);
            }
        } else {
            // Sin internet, guardar localmente
            console.log('[HybridSync] 📴 SIN INTERNET - Guardando localmente...');
            return await this.saveProductOffline(productData);
        }
    }

    /**
     * Guardar producto offline (pendiente de sincronización)
     */
    async saveProductOffline(productData) {
        try {
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

            const doc = {
                _id: tempId,
                ...productData,
                syncPending: true,
                syncOperation: 'create',
                syncTimestamp: Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.dbProducts.put(doc);
            console.log('[HybridSync] ✅ Producto guardado OFFLINE (pendiente de sincronización)');

            return { success: true, product: doc, offline: true };

        } catch (error) {
            console.error('[HybridSync] ❌ Error al guardar offline:', error);
            throw error;
        }
    }

    // ==========================================
    // STORES (TIENDAS) - CRUD HÍBRIDO
    // ==========================================

    /**
     * Obtener todas las tiendas
     * - Con internet: GET al backend + cachea en PouchDB
     * - Sin internet: Lee de PouchDB
     */
    async getAllStores() {
        console.log('[HybridSync] 🏪 Obteniendo tiendas...');
        console.log('[HybridSync] Estado de conexión:', navigator.onLine ? '🟢 Online' : '🔴 Offline');

        if (navigator.onLine) {
            try {
                console.log('[HybridSync] 🌐 Cargando tiendas desde BACKEND...');

                // 1. GET al backend
                const response = await fetch(`${BACKEND_URL}/stores`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                const stores = responseData.data; // Las tiendas están en .data
                console.log(`[HybridSync] ✅ ${stores.length} tiendas obtenidas del backend`);

                // 2. Cachear en PouchDB para uso offline
                await this.cacheStoresInPouchDB(stores);

                return stores;

            } catch (error) {
                console.warn('[HybridSync] ⚠️ Error al cargar del backend, usando caché:', error.message);
                // Si falla, cargar desde caché
                return await this.loadStoresFromCache();
            }
        } else {
            // Sin internet, cargar desde caché
            console.log('[HybridSync] 📴 SIN INTERNET - Cargando desde caché...');
            return await this.loadStoresFromCache();
        }
    }

    /**
     * Cachear tiendas del backend en PouchDB
     */
    async cacheStoresInPouchDB(stores) {
        try {
            console.log('[HybridSync] 💾 Cacheando tiendas en PouchDB...');

            for (const store of stores) {
                try {
                    // Intentar obtener el documento existente
                    const existingDoc = await this.dbStores.get(store.uuid).catch(() => null);

                    if (existingDoc) {
                        // Actualizar documento existente
                        await this.dbStores.put({
                            _id: store.uuid,
                            _rev: existingDoc._rev,
                            ...store,
                            cachedAt: new Date().toISOString()
                        });
                    } else {
                        // Crear nuevo documento
                        await this.dbStores.put({
                            _id: store.uuid,
                            ...store,
                            cachedAt: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.warn(`[HybridSync] ⚠️ Error cacheando tienda ${store.name}:`, error.message);
                }
            }

            console.log('[HybridSync] ✅ Tiendas cacheadas correctamente');
        } catch (error) {
            console.error('[HybridSync] ❌ Error al cachear tiendas:', error);
        }
    }

    /**
     * Cargar tiendas desde caché local (PouchDB)
     * INCLUYE registros pendientes de sincronización (temp_*)
     */
    async loadStoresFromCache() {
        try {
            console.log('[HybridSync] 📂 Cargando tiendas desde CACHÉ (PouchDB)...');

            const result = await this.dbStores.allDocs({
                include_docs: true,
                descending: true
            });

            // INCLUIR TODOS los registros, incluso los temp_* (pendientes)
            const stores = result.rows
                .filter(row => !row.id.startsWith('_design/'))
                .map(row => row.doc);

            // Contar cuántas están pendientes
            const pendingCount = stores.filter(s => s.syncPending === true).length;

            console.log(`[HybridSync] ✅ ${stores.length} tiendas cargadas desde caché (${pendingCount} pendientes)`);
            return stores;

        } catch (error) {
            console.error('[HybridSync] ❌ Error al cargar desde caché:', error);
            return [];
        }
    }

    /**
     * Crear tienda
     * - Con internet: POST al backend inmediatamente
     * - Sin internet: Guardar en PouchDB con flag pendiente
     */
    async createStore(storeData) {
        console.log('[HybridSync] ➕ Creando tienda:', storeData);
        console.log('[HybridSync] Estado de conexión:', navigator.onLine ? '🟢 Online' : '🔴 Offline');

        if (navigator.onLine) {
            try {
                console.log('[HybridSync] 🌐 Enviando tienda al BACKEND...');

                // 1. POST al backend
                const response = await fetch(`${BACKEND_URL}/stores`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(storeData)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const responseData = await response.json();
                const savedStore = responseData.data; // La tienda guardada está en .data
                console.log('[HybridSync] ✅ Tienda guardada en backend:', savedStore.uuid);

                // 2. Cachear en PouchDB
                await this.dbStores.put({
                    _id: savedStore.uuid,
                    ...savedStore,
                    cachedAt: new Date().toISOString()
                });

                console.log('[HybridSync] ✅ Tienda cacheada en PouchDB');
                return { success: true, store: savedStore };

            } catch (error) {
                console.warn('[HybridSync] ⚠️ Error al guardar en backend, guardando localmente:', error.message);
                // Si falla, guardar localmente
                return await this.saveStoreOffline(storeData);
            }
        } else {
            // Sin internet, guardar localmente
            console.log('[HybridSync] 📴 SIN INTERNET - Guardando localmente...');
            return await this.saveStoreOffline(storeData);
        }
    }

    /**
     * Guardar tienda offline (pendiente de sincronización)
     */
    async saveStoreOffline(storeData) {
        try {
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

            const doc = {
                _id: tempId,
                ...storeData,
                syncPending: true,
                syncOperation: 'create',
                syncTimestamp: Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.dbStores.put(doc);
            console.log('[HybridSync] ✅ Tienda guardada OFFLINE (pendiente de sincronización)');

            return { success: true, store: doc, offline: true };

        } catch (error) {
            console.error('[HybridSync] ❌ Error al guardar offline:', error);
            throw error;
        }
    }

    // ==========================================
    // AUTO-SYNC
    // ==========================================

    /**
     * Configurar auto-sincronización cuando vuelva la conexión
     */
    setupAutoSync() {
        window.addEventListener('online', async () => {
            console.log('[HybridSync] 🔄 CONEXIÓN RESTAURADA - Iniciando auto-sincronización...');

            try {
                // ====== SINCRONIZAR PRODUCTOS ======
                const productsResult = await this.dbProducts.allDocs({ include_docs: true });
                const pendingProducts = productsResult.rows
                    .map(row => row.doc)
                    .filter(doc => doc.syncPending === true);

                console.log(`[HybridSync] 📦 ${pendingProducts.length} productos pendientes de sincronización`);

                // Sincronizar cada producto
                for (const doc of pendingProducts) {
                    try {
                        console.log(`[HybridSync] 🔄 Sincronizando producto: ${doc.name}...`);

                        const response = await fetch(`${BACKEND_URL}/products`, {
                            method: 'POST',
                            headers: this.getHeaders(),
                            body: JSON.stringify({
                                name: doc.name,
                                description: doc.description,
                                basePrice: doc.basePrice
                            })
                        });

                        if (response.ok) {
                            const responseData = await response.json();
                            const savedProduct = responseData.data;
                            console.log(`[HybridSync] ✅ Producto sincronizado: ${doc.name} → ${savedProduct.uuid}`);

                            await this.dbProducts.remove(doc);
                            await this.dbProducts.put({
                                _id: savedProduct.uuid,
                                ...savedProduct,
                                cachedAt: new Date().toISOString()
                            });
                        } else {
                            console.error(`[HybridSync] ❌ Error sincronizando producto ${doc.name}: HTTP ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`[HybridSync] ❌ Error sincronizando producto ${doc.name}:`, error.message);
                    }
                }

                // ====== SINCRONIZAR TIENDAS ======
                const storesResult = await this.dbStores.allDocs({ include_docs: true });
                const pendingStores = storesResult.rows
                    .map(row => row.doc)
                    .filter(doc => doc.syncPending === true);

                console.log(`[HybridSync] 🏪 ${pendingStores.length} tiendas pendientes de sincronización`);

                // Sincronizar cada tienda
                for (const doc of pendingStores) {
                    try {
                        console.log(`[HybridSync] 🔄 Sincronizando tienda: ${doc.name}...`);

                        const response = await fetch(`${BACKEND_URL}/stores`, {
                            method: 'POST',
                            headers: this.getHeaders(),
                            body: JSON.stringify({
                                name: doc.name,
                                address: doc.address,
                                latitude: doc.latitude,
                                longitude: doc.longitude
                            })
                        });

                        if (response.ok) {
                            const responseData = await response.json();
                            const savedStore = responseData.data;
                            console.log(`[HybridSync] ✅ Tienda sincronizada: ${doc.name} → ${savedStore.uuid}`);

                            await this.dbStores.remove(doc);
                            await this.dbStores.put({
                                _id: savedStore.uuid,
                                ...savedStore,
                                cachedAt: new Date().toISOString()
                            });
                        } else {
                            console.error(`[HybridSync] ❌ Error sincronizando tienda ${doc.name}: HTTP ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`[HybridSync] ❌ Error sincronizando tienda ${doc.name}:`, error.message);
                    }
                }

                console.log('[HybridSync] ✅ Auto-sincronización completada');

                // LIMPIAR Y REFRESCAR CACHÉ desde el backend
                console.log('[HybridSync] 🧹 Limpiando caché y refrescando desde backend...');
                await this.refreshCacheFromBackend();

                // Notificar a la UI si hay callback
                if (this.onSyncComplete) {
                    this.onSyncComplete(0);
                }

            } catch (error) {
                console.error('[HybridSync] ❌ Error en auto-sincronización:', error);
            }
        });

        window.addEventListener('offline', () => {
            console.log('[HybridSync] 🔴 CONEXIÓN PERDIDA - Modo offline activado');
        });
    }

    // ==========================================
    // UTILIDADES
    // ==========================================

    /**
     * Refrescar caché desde el backend
     * Limpia PouchDB completamente y recarga datos del servidor
     */
    async refreshCacheFromBackend() {
        try {
            console.log('[HybridSync] 🧹 Iniciando limpieza y refresco del caché...');

            // 1. DESTRUIR bases de datos actuales
            console.log('[HybridSync] 🗑️ Eliminando caché antiguo...');
            await this.dbProducts.destroy();
            await this.dbStores.destroy();

            // 2. REINICIALIZAR bases de datos limpias
            console.log('[HybridSync] 📦 Reinicializando bases de datos...');
            this.dbProducts = new PouchDB('products');
            this.dbStores = new PouchDB('stores');

            // 3. OBTENER datos frescos del backend
            console.log('[HybridSync] 🌐 Obteniendo datos frescos del backend...');

            // GET Productos
            try {
                const productsResponse = await fetch(`${BACKEND_URL}/products`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (productsResponse.ok) {
                    const productsData = await productsResponse.json();
                    const products = productsData.data;
                    console.log(`[HybridSync] ✅ ${products.length} productos obtenidos del backend`);

                    // Cachear productos
                    await this.cacheProductsInPouchDB(products);
                }
            } catch (error) {
                console.warn('[HybridSync] ⚠️ Error al obtener productos:', error.message);
            }

            // GET Tiendas
            try {
                const storesResponse = await fetch(`${BACKEND_URL}/stores`, {
                    method: 'GET',
                    headers: this.getHeaders()
                });

                if (storesResponse.ok) {
                    const storesData = await storesResponse.json();
                    const stores = storesData.data;
                    console.log(`[HybridSync] ✅ ${stores.length} tiendas obtenidas del backend`);

                    // Cachear tiendas
                    await this.cacheStoresInPouchDB(stores);
                }
            } catch (error) {
                console.warn('[HybridSync] ⚠️ Error al obtener tiendas:', error.message);
            }

            console.log('[HybridSync] ✨ Caché refrescado exitosamente desde el backend');

        } catch (error) {
            console.error('[HybridSync] ❌ Error al refrescar caché:', error);
            // Reintentar inicializar aunque falle
            try {
                this.dbProducts = new PouchDB('products');
                this.dbStores = new PouchDB('stores');
            } catch (e) {
                console.error('[HybridSync] ❌ Error crítico al reinicializar:', e);
            }
        }
    }

    /**
     * Limpiar toda la base de datos (para testing)
     */
    async clearAllData() {
        try {
            await this.dbProducts.destroy();
            await this.dbStores.destroy();
            console.log('[HybridSync] 🗑️ Bases de datos limpiadas (productos y tiendas)');
            // Reinicializar
            await this.initialize();
        } catch (error) {
            console.error('[HybridSync] ❌ Error al limpiar:', error);
        }
    }

    // Callbacks para UI
    onSyncComplete = null;
    onConnectivityChange = null;
}

// Crear instancia global
const hybridSyncService = new HybridSyncService();
window.hybridSyncService = hybridSyncService;

console.log('[HybridSync] 📦 Servicio híbrido cargado (SIMPLIFICADO - Solo GET y POST para productos y tiendas)');

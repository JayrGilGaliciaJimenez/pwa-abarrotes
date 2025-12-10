/**
 * API Service - Capa centralizada para comunicación con backend
 *
 * Maneja automáticamente:
 * - Detección de conectividad (online/offline)
 * - Cache en IndexedDB para modo offline
 * - Encolado de operaciones cuando no hay conexión
 * - Autenticación JWT
 * - Reintentos y manejo de errores
 */

import dbManager from './db-manager.js';

const BASE_URL = window.BASE_URL || "http://localhost:82/api/v1";

//const BASE_URL = 'http://localhost:82/api/v1';

// Estado de conectividad
let isOnline = navigator.onLine;
const connectivityListeners = new Set();

// Escuchar cambios de conectividad
window.addEventListener('online', () => {
    console.log('🟢 Conexión restablecida');
    isOnline = true;
    notifyConnectivityChange(true);
});

window.addEventListener('offline', () => {
    console.log('🔴 Conexión perdida - modo offline');
    isOnline = false;
    notifyConnectivityChange(false);
});

/**
 * Notifica a los listeners sobre cambios de conectividad
 * @param {boolean} online
 */
function notifyConnectivityChange(online) {
    connectivityListeners.forEach(callback => callback(online));
}

/**
 * Registra un listener para cambios de conectividad
 * @param {Function} callback - Función que recibe (isOnline: boolean)
 * @returns {Function} Función para remover el listener
 */
export function onConnectivityChange(callback) {
    connectivityListeners.add(callback);
    // Notificar estado actual inmediatamente
    callback(isOnline);

    return () => connectivityListeners.delete(callback);
}

/**
 * Obtiene el estado actual de conectividad
 * @returns {boolean}
 */
export function getIsOnline() {
    return isOnline;
}

/**
 * Obtiene los headers de autenticación
 * @returns {Object}
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

/**
 * Realiza un fetch con manejo de errores y timeout
 * @param {string} url
 * @param {Object} options
 * @param {number} timeout - Timeout en ms (default: 10000)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                ...getAuthHeaders(),
                ...(options.headers || {})
            }
        });

        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timeout - revisa tu conexión');
        }
        throw error;
    }
}

/**
 * Valida si la respuesta del servidor es exitosa
 * @param {Response} response
 * @returns {Promise<Object>} JSON parseado
 * @throws {Error} Si la respuesta no es OK
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;

        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorJson.error || 'Error en el servidor';
        } catch {
            errorMessage = errorText || `Error ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
    }

    // Si es 204 No Content, retornar objeto vacío
    if (response.status === 204) {
        return {};
    }

    return response.json();
}

/**
 * ====================================
 * API DE PRODUCTOS
 * ====================================
 */

/**
 * Obtiene todos los productos
 * @returns {Promise<Array>}
 */
export async function getAllProducts() {
    try {
        if (isOnline) {
            console.log('📡 Obteniendo productos desde el servidor...');
            const response = await fetchWithTimeout(`${BASE_URL}/products`);
            const data = await handleResponse(response);

            // El backend retorna { data: [...] } o directamente [...]
            const products = Array.isArray(data) ? data : (data.data || []);

            // Validar que sea un array
            if (!Array.isArray(products)) {
                console.error('⚠️ Respuesta del servidor no es un array:', data);
                throw new Error('Formato de respuesta inválido');
            }

            // Cachear en IndexedDB
            await dbManager.saveProducts(products);
            console.log(`✅ ${products.length} productos cacheados en IndexedDB`);

            return products;
        } else {
            console.log('💾 Modo offline - obteniendo productos desde IndexedDB');
            const products = await dbManager.getAllProducts();
            return products;
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo productos del servidor, usando caché local:', error);
        // Si falla el servidor, intentar obtener desde caché
        const products = await dbManager.getAllProducts();
        return products || [];
    }
}

/**
 * Obtiene un producto por UUID
 * @param {string} uuid
 * @returns {Promise<Object>}
 */
export async function getProduct(uuid) {
    try {
        if (isOnline && !dbManager.isTempUUID(uuid)) {
            console.log(`📡 Obteniendo producto ${uuid} desde el servidor...`);
            const response = await fetchWithTimeout(`${BASE_URL}/products/${uuid}`);
            const data = await handleResponse(response);

            // El backend puede retornar { data: {...} } o directamente {...}
            const product = data.data || data;

            // Cachear en IndexedDB
            await dbManager.saveProduct(product);

            return product;
        } else {
            console.log(`💾 Obteniendo producto ${uuid} desde IndexedDB`);
            const product = await dbManager.getProduct(uuid);

            if (!product) {
                throw new Error('Producto no encontrado');
            }

            return product;
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo producto del servidor, usando caché:', error);
        const product = await dbManager.getProduct(uuid);

        if (!product) {
            throw new Error('Producto no encontrado y no hay caché disponible');
        }

        return product;
    }
}

/**
 * Crea un nuevo producto
 * @param {Object} productData
 * @returns {Promise<Object>} Producto creado
 */
export async function createProduct(productData) {
    if (isOnline) {
        try {
            console.log('📡 Creando producto en el servidor...');
            const response = await fetchWithTimeout(`${BASE_URL}/products`, {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            const data = await handleResponse(response);

            // El backend puede retornar { data: {...} } o directamente {...}
            const product = data.data || data;

            // Guardar en IndexedDB
            await dbManager.saveProduct(product);
            console.log('✅ Producto creado y cacheado:', product.uuid);

            return product;
        } catch (error) {
            console.error('❌ Error creando producto en el servidor:', error);
            throw error;
        }
    } else {
        // Modo offline: crear con UUID temporal
        console.log('💾 Modo offline - creando producto localmente');
        const tempUUID = dbManager.generateTempUUID();
        const tempProduct = {
            ...productData,
            uuid: tempUUID,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _isTemp: true
        };

        // Guardar en IndexedDB
        await dbManager.saveProduct(tempProduct);

        // Encolar para sincronización
        await dbManager.addToSyncQueue({
            entity: 'product',
            type: 'create',
            data: productData,
            uuid: tempUUID
        });

        console.log('✅ Producto creado localmente (pendiente de sincronización):', tempUUID);

        // Disparar evento de sincronización pendiente
        window.dispatchEvent(new CustomEvent('sync-pending', {
            detail: { entity: 'product', type: 'create' }
        }));

        return tempProduct;
    }
}

/**
 * Actualiza un producto existente
 * @param {string} uuid
 * @param {Object} productData
 * @returns {Promise<Object>} Producto actualizado
 */
export async function updateProduct(uuid, productData) {
    if (isOnline && !dbManager.isTempUUID(uuid)) {
        try {
            console.log(`📡 Actualizando producto ${uuid} en el servidor...`);
            const response = await fetchWithTimeout(`${BASE_URL}/products/${uuid}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });

            const data = await handleResponse(response);

            // El backend puede retornar { data: {...} } o directamente {...}
            const product = data.data || data;

            // Actualizar en IndexedDB
            await dbManager.saveProduct(product);
            console.log('✅ Producto actualizado y cacheado:', product.uuid);

            return product;
        } catch (error) {
            console.error('❌ Error actualizando producto en el servidor:', error);
            throw error;
        }
    } else {
        // Modo offline: actualizar localmente
        console.log(`💾 Modo offline - actualizando producto ${uuid} localmente`);
        const existingProduct = await dbManager.getProduct(uuid);

        if (!existingProduct) {
            throw new Error('Producto no encontrado en caché local');
        }

        const updatedProduct = {
            ...existingProduct,
            ...productData,
            uuid, // Mantener el UUID original
            updatedAt: new Date().toISOString()
        };

        // Actualizar en IndexedDB
        await dbManager.saveProduct(updatedProduct);

        // Encolar para sincronización
        await dbManager.addToSyncQueue({
            entity: 'product',
            type: 'update',
            data: productData,
            uuid
        });

        console.log('✅ Producto actualizado localmente (pendiente de sincronización):', uuid);

        window.dispatchEvent(new CustomEvent('sync-pending', {
            detail: { entity: 'product', type: 'update' }
        }));

        return updatedProduct;
    }
}

/**
 * Elimina un producto
 * @param {string} uuid
 * @returns {Promise<void>}
 */
export async function deleteProduct(uuid) {
    if (isOnline && !dbManager.isTempUUID(uuid)) {
        try {
            console.log(`📡 Eliminando producto ${uuid} del servidor...`);
            const response = await fetchWithTimeout(`${BASE_URL}/products/${uuid}`, {
                method: 'DELETE'
            });

            await handleResponse(response);

            // Eliminar de IndexedDB
            await dbManager.deleteProduct(uuid);
            console.log('✅ Producto eliminado:', uuid);

            return;
        } catch (error) {
            console.error('❌ Error eliminando producto del servidor:', error);
            throw error;
        }
    } else {
        // Modo offline: marcar como eliminado
        console.log(`💾 Modo offline - marcando producto ${uuid} como eliminado`);

        // Si es temporal, solo eliminarlo localmente
        if (dbManager.isTempUUID(uuid)) {
            await dbManager.deleteProduct(uuid);
            console.log('✅ Producto temporal eliminado localmente:', uuid);
            return;
        }

        // Si es real, marcarlo para eliminación en el servidor
        await dbManager.deleteProduct(uuid);

        // Encolar para sincronización
        await dbManager.addToSyncQueue({
            entity: 'product',
            type: 'delete',
            data: null,
            uuid
        });

        console.log('✅ Producto eliminado localmente (pendiente de sincronización):', uuid);

        window.dispatchEvent(new CustomEvent('sync-pending', {
            detail: { entity: 'product', type: 'delete' }
        }));
    }
}

/**
 * ====================================
 * API DE TIENDAS
 * ====================================
 */

/**
 * Obtiene todas las tiendas
 * @returns {Promise<Array>}
 */
export async function getAllStores() {
    try {
        if (isOnline) {
            console.log('📡 Obteniendo tiendas desde el servidor...');
            const response = await fetchWithTimeout(`${BASE_URL}/stores`);
            const data = await handleResponse(response);

            // El backend retorna { data: [...] } o directamente [...]
            const stores = Array.isArray(data) ? data : (data.data || []);

            // Validar que sea un array
            if (!Array.isArray(stores)) {
                console.error('⚠️ Respuesta del servidor no es un array:', data);
                throw new Error('Formato de respuesta inválido');
            }

            // Cachear en IndexedDB
            await dbManager.saveStores(stores);
            console.log(`✅ ${stores.length} tiendas cacheadas en IndexedDB`);

            return stores;
        } else {
            console.log('💾 Modo offline - obteniendo tiendas desde IndexedDB');
            const stores = await dbManager.getAllStores();
            return stores;
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo tiendas del servidor, usando caché local:', error);
        const stores = await dbManager.getAllStores();
        return stores || [];
    }
}

/**
 * Obtiene una tienda por UUID
 * @param {string} uuid
 * @returns {Promise<Object>}
 */
export async function getStore(uuid) {
    try {
        if (isOnline && !dbManager.isTempUUID(uuid)) {
            console.log(`📡 Obteniendo tienda ${uuid} desde el servidor...`);
            const response = await fetchWithTimeout(`${BASE_URL}/stores/${uuid}`);
            const data = await handleResponse(response);

            // El backend puede retornar { data: {...} } o directamente {...}
            const store = data.data || data;

            // Cachear en IndexedDB
            await dbManager.saveStore(store);

            return store;
        } else {
            console.log(`💾 Obteniendo tienda ${uuid} desde IndexedDB`);
            const store = await dbManager.getStore(uuid);

            if (!store) {
                throw new Error('Tienda no encontrada');
            }

            return store;
        }
    } catch (error) {
        console.warn('⚠️ Error obteniendo tienda del servidor, usando caché:', error);
        const store = await dbManager.getStore(uuid);

        if (!store) {
            throw new Error('Tienda no encontrada y no hay caché disponible');
        }

        return store;
    }
}

/**
 * Crea una nueva tienda
 * @param {Object} storeData
 * @returns {Promise<Object>} Tienda creada
 */
export async function createStore(storeData) {
    if (isOnline) {
        try {
            console.log('📡 Creando tienda en el servidor...');
            const response = await fetchWithTimeout(`${BASE_URL}/stores`, {
                method: 'POST',
                body: JSON.stringify(storeData)
            });

            const data = await handleResponse(response);

            // El backend puede retornar { data: {...} } o directamente {...}
            const store = data.data || data;

            // Guardar en IndexedDB
            await dbManager.saveStore(store);
            console.log('✅ Tienda creada y cacheada:', store.uuid);

            return store;
        } catch (error) {
            console.error('❌ Error creando tienda en el servidor:', error);
            throw error;
        }
    } else {
        // Modo offline: crear con UUID temporal
        console.log('💾 Modo offline - creando tienda localmente');
        const tempUUID = dbManager.generateTempUUID();
        const tempStore = {
            ...storeData,
            uuid: tempUUID,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _isTemp: true
        };

        // Guardar en IndexedDB
        await dbManager.saveStore(tempStore);

        // Encolar para sincronización
        await dbManager.addToSyncQueue({
            entity: 'store',
            type: 'create',
            data: storeData,
            uuid: tempUUID
        });

        console.log('✅ Tienda creada localmente (pendiente de sincronización):', tempUUID);

        window.dispatchEvent(new CustomEvent('sync-pending', {
            detail: { entity: 'store', type: 'create' }
        }));

        return tempStore;
    }
}

/**
 * Actualiza una tienda existente
 * @param {string} uuid
 * @param {Object} storeData
 * @returns {Promise<Object>} Tienda actualizada
 */
export async function updateStore(uuid, storeData) {
    if (isOnline && !dbManager.isTempUUID(uuid)) {
        try {
            console.log(`📡 Actualizando tienda ${uuid} en el servidor...`);
            const response = await fetchWithTimeout(`${BASE_URL}/stores/${uuid}`, {
                method: 'PUT',
                body: JSON.stringify(storeData)
            });

            const data = await handleResponse(response);

            // El backend puede retornar { data: {...} } o directamente {...}
            const store = data.data || data;

            // Actualizar en IndexedDB
            await dbManager.saveStore(store);
            console.log('✅ Tienda actualizada y cacheada:', store.uuid);

            return store;
        } catch (error) {
            console.error('❌ Error actualizando tienda en el servidor:', error);
            throw error;
        }
    } else {
        // Modo offline: actualizar localmente
        console.log(`💾 Modo offline - actualizando tienda ${uuid} localmente`);
        const existingStore = await dbManager.getStore(uuid);

        if (!existingStore) {
            throw new Error('Tienda no encontrada en caché local');
        }

        const updatedStore = {
            ...existingStore,
            ...storeData,
            uuid, // Mantener el UUID original
            updatedAt: new Date().toISOString()
        };

        // Actualizar en IndexedDB
        await dbManager.saveStore(updatedStore);

        // Encolar para sincronización
        await dbManager.addToSyncQueue({
            entity: 'store',
            type: 'update',
            data: storeData,
            uuid
        });

        console.log('✅ Tienda actualizada localmente (pendiente de sincronización):', uuid);

        window.dispatchEvent(new CustomEvent('sync-pending', {
            detail: { entity: 'store', type: 'update' }
        }));

        return updatedStore;
    }
}

/**
 * Elimina una tienda
 * @param {string} uuid
 * @returns {Promise<void>}
 */
export async function deleteStore(uuid) {
    if (isOnline && !dbManager.isTempUUID(uuid)) {
        try {
            console.log(`📡 Eliminando tienda ${uuid} del servidor...`);
            const response = await fetchWithTimeout(`${BASE_URL}/stores/${uuid}`, {
                method: 'DELETE'
            });

            await handleResponse(response);

            // Eliminar de IndexedDB
            await dbManager.deleteStore(uuid);
            console.log('✅ Tienda eliminada:', uuid);

            return;
        } catch (error) {
            console.error('❌ Error eliminando tienda del servidor:', error);
            throw error;
        }
    } else {
        // Modo offline: marcar como eliminado
        console.log(`💾 Modo offline - marcando tienda ${uuid} como eliminado`);

        // Si es temporal, solo eliminarlo localmente
        if (dbManager.isTempUUID(uuid)) {
            await dbManager.deleteStore(uuid);
            console.log('✅ Tienda temporal eliminada localmente:', uuid);
            return;
        }

        // Si es real, marcarlo para eliminación en el servidor
        await dbManager.deleteStore(uuid);

        // Encolar para sincronización
        await dbManager.addToSyncQueue({
            entity: 'store',
            type: 'delete',
            data: null,
            uuid
        });

        console.log('✅ Tienda eliminada localmente (pendiente de sincronización):', uuid);

        window.dispatchEvent(new CustomEvent('sync-pending', {
            detail: { entity: 'store', type: 'delete' }
        }));
    }
}

/**
 * ====================================
 * UTILIDADES
 * ====================================
 */

/**
 * Fuerza una recarga de datos desde el servidor (si está online)
 * @returns {Promise<void>}
 */
export async function forceRefresh() {
    if (!isOnline) {
        console.warn('No se puede refrescar en modo offline');
        return;
    }

    console.log('🔄 Forzando recarga de datos desde el servidor...');
    await Promise.all([
        getAllProducts(),
        getAllStores()
    ]);
    console.log('✅ Datos actualizados desde el servidor');
}

/**
 * Obtiene estadísticas de sincronización
 * @returns {Promise<Object>}
 */
export async function getSyncStats() {
    const pendingCount = await dbManager.getPendingSyncCount();
    const pendingOps = await dbManager.getPendingSyncOperations();

    return {
        pendingCount,
        isOnline,
        operations: pendingOps
    };
}

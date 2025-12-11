/**
 * Sync Service - Gestiona la sincronización de operaciones offline
 *
 * Características:
 * - Procesa cola de operaciones pendientes cuando vuelve la conexión
 * - Usa Background Sync API si está disponible
 * - Fallback a sincronización manual
 * - Manejo de conflictos y errores
 * - Reemplaza UUIDs temporales por UUIDs reales del servidor
 */

import dbManager from './db-manager.js';
import { getIsOnline, onConnectivityChange } from './api-service.js';

const BASE_URL = (() => {
  if (window.BASE_URL) {
    return window.BASE_URL;
  }
  const fallbackBase =
    (window.__ENV && window.__ENV.API_BASE_URL) ||
    window.API_BASE_URL ||
    "http://localhost:82";
  return `${fallbackBase.replace(/\/+$/, "")}/api/v1`;
})();
const SYNC_TAG = 'offline-sync';

// Estado de sincronización
let isSyncing = false;
let syncInProgress = false;

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
 * Registra Background Sync si está disponible
 */
export async function registerBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register(SYNC_TAG);
            console.log('✅ Background Sync registrado');
            return true;
        } catch (error) {
            console.warn('⚠️ No se pudo registrar Background Sync:', error);
            return false;
        }
    } else {
        console.log('ℹ️ Background Sync API no disponible, usando sincronización manual');
        return false;
    }
}

/**
 * Verifica si Background Sync está disponible
 * @returns {boolean}
 */
export function isBackgroundSyncAvailable() {
    return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Sincroniza todas las operaciones pendientes
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export async function syncPendingOperations() {
    if (syncInProgress) {
        console.log('⏸️ Ya hay una sincronización en progreso');
        return { success: false, message: 'Sincronización ya en progreso' };
    }

    if (!getIsOnline()) {
        console.log('📡 Sin conexión, no se puede sincronizar');
        return { success: false, message: 'Sin conexión a internet' };
    }

    syncInProgress = true;
    isSyncing = true;

    console.log('🔄 Iniciando sincronización de operaciones pendientes...');

    // Notificar inicio de sincronización
    window.dispatchEvent(new CustomEvent('sync-start'));

    const results = {
        success: true,
        total: 0,
        synced: 0,
        failed: 0,
        errors: []
    };

    try {
        // Obtener operaciones pendientes
        const operations = await dbManager.getPendingSyncOperations();
        results.total = operations.length;

        if (operations.length === 0) {
            console.log('✅ No hay operaciones pendientes para sincronizar');
            syncInProgress = false;
            isSyncing = false;
            window.dispatchEvent(new CustomEvent('sync-complete', { detail: results }));
            return results;
        }

        console.log(`📋 ${operations.length} operaciones pendientes de sincronización`);

        // Procesar cada operación en orden
        for (const operation of operations) {
            try {
                console.log(`⚙️ Procesando operación ${operation.id}:`, operation);

                // Marcar como sincronizando
                await dbManager.updateSyncOperationStatus(operation.id, 'syncing');

                let syncResult;

                // Procesar según el tipo de operación
                switch (operation.type) {
                    case 'create':
                        syncResult = await syncCreateOperation(operation);
                        break;
                    case 'update':
                        syncResult = await syncUpdateOperation(operation);
                        break;
                    case 'delete':
                        syncResult = await syncDeleteOperation(operation);
                        break;
                    default:
                        throw new Error(`Tipo de operación desconocida: ${operation.type}`);
                }

                if (syncResult.success) {
                    // Eliminar de la cola si fue exitoso
                    await dbManager.removeSyncOperation(operation.id);
                    results.synced++;
                    console.log(`✅ Operación ${operation.id} sincronizada exitosamente`);
                } else {
                    // Marcar como fallida
                    await dbManager.updateSyncOperationStatus(operation.id, 'failed');
                    results.failed++;
                    results.errors.push({
                        operation: operation.id,
                        error: syncResult.error
                    });
                    console.error(`❌ Operación ${operation.id} falló:`, syncResult.error);
                }
            } catch (error) {
                // Marcar como fallida
                await dbManager.updateSyncOperationStatus(operation.id, 'failed');
                results.failed++;
                results.errors.push({
                    operation: operation.id,
                    error: error.message
                });
                console.error(`❌ Error procesando operación ${operation.id}:`, error);
            }
        }

        // Determinar si fue exitoso
        results.success = results.failed === 0;

        console.log(`🏁 Sincronización completada: ${results.synced}/${results.total} exitosas`);

        // Notificar finalización
        window.dispatchEvent(new CustomEvent('sync-complete', { detail: results }));

        return results;
    } catch (error) {
        console.error('❌ Error durante la sincronización:', error);
        results.success = false;
        results.errors.push({ general: error.message });

        window.dispatchEvent(new CustomEvent('sync-error', { detail: error }));

        return results;
    } finally {
        syncInProgress = false;
        isSyncing = false;
    }
}

/**
 * Sincroniza una operación de creación (CREATE)
 * @param {Object} operation
 * @returns {Promise<Object>}
 */
async function syncCreateOperation(operation) {
    const { entity, data, uuid } = operation;

    try {
        const endpoint = entity === 'product' ? 'products' : 'stores';
        const storeName = entity === 'product' ? 'products' : 'stores';

        console.log(`📤 Creando ${entity} en el servidor...`);

        const response = await fetch(`${BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const createdItem = await response.json();
        console.log(`✅ ${entity} creado en el servidor con UUID:`, createdItem.uuid);

        // Reemplazar UUID temporal por el UUID real
        if (dbManager.isTempUUID(uuid)) {
            await dbManager.replaceTempUUID(storeName, uuid, createdItem.uuid, createdItem);
            console.log(`🔄 UUID temporal ${uuid} reemplazado por ${createdItem.uuid}`);
        } else {
            // Guardar con el UUID del servidor
            if (entity === 'product') {
                await dbManager.saveProduct(createdItem);
            } else {
                await dbManager.saveStore(createdItem);
            }
        }

        return { success: true, data: createdItem };
    } catch (error) {
        console.error(`❌ Error sincronizando creación de ${entity}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Sincroniza una operación de actualización (UPDATE)
 * @param {Object} operation
 * @returns {Promise<Object>}
 */
async function syncUpdateOperation(operation) {
    const { entity, data, uuid } = operation;

    try {
        // Si el UUID es temporal, no podemos actualizar en el servidor
        if (dbManager.isTempUUID(uuid)) {
            console.warn(`⚠️ No se puede actualizar ${entity} con UUID temporal: ${uuid}`);
            return {
                success: false,
                error: 'UUID temporal, debe sincronizar creación primero'
            };
        }

        const endpoint = entity === 'product' ? 'products' : 'stores';

        console.log(`📤 Actualizando ${entity} ${uuid} en el servidor...`);

        const response = await fetch(`${BASE_URL}/${endpoint}/${uuid}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();

            // Si el recurso no existe (404), podría haber sido eliminado
            if (response.status === 404) {
                console.warn(`⚠️ ${entity} ${uuid} no existe en el servidor (posiblemente eliminado)`);
                // Eliminar de IndexedDB también
                if (entity === 'product') {
                    await dbManager.deleteProduct(uuid);
                } else {
                    await dbManager.deleteStore(uuid);
                }
                return { success: true, warning: 'Recurso no encontrado, eliminado de caché' };
            }

            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const updatedItem = await response.json();
        console.log(`✅ ${entity} ${uuid} actualizado en el servidor`);

        // Actualizar en IndexedDB
        if (entity === 'product') {
            await dbManager.saveProduct(updatedItem);
        } else {
            await dbManager.saveStore(updatedItem);
        }

        return { success: true, data: updatedItem };
    } catch (error) {
        console.error(`❌ Error sincronizando actualización de ${entity}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Sincroniza una operación de eliminación (DELETE)
 * @param {Object} operation
 * @returns {Promise<Object>}
 */
async function syncDeleteOperation(operation) {
    const { entity, uuid } = operation;

    try {
        // Si el UUID es temporal, solo eliminarlo localmente
        if (dbManager.isTempUUID(uuid)) {
            console.log(`ℹ️ Eliminando ${entity} con UUID temporal localmente: ${uuid}`);
            if (entity === 'product') {
                await dbManager.deleteProduct(uuid);
            } else {
                await dbManager.deleteStore(uuid);
            }
            return { success: true, message: 'UUID temporal eliminado localmente' };
        }

        const endpoint = entity === 'product' ? 'products' : 'stores';

        console.log(`📤 Eliminando ${entity} ${uuid} del servidor...`);

        const response = await fetch(`${BASE_URL}/${endpoint}/${uuid}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();

            // Si el recurso ya no existe (404), considerarlo exitoso
            if (response.status === 404) {
                console.log(`ℹ️ ${entity} ${uuid} ya no existe en el servidor`);
                return { success: true, message: 'Recurso ya eliminado' };
            }

            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        console.log(`✅ ${entity} ${uuid} eliminado del servidor`);

        // Asegurar que está eliminado de IndexedDB
        if (entity === 'product') {
            await dbManager.deleteProduct(uuid);
        } else {
            await dbManager.deleteStore(uuid);
        }

        return { success: true };
    } catch (error) {
        console.error(`❌ Error sincronizando eliminación de ${entity}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtiene el estado actual de la sincronización
 * @returns {Promise<Object>}
 */
export async function getSyncStatus() {
    const pendingOps = await dbManager.getPendingSyncOperations();
    const pendingCount = pendingOps.length;

    return {
        isSyncing,
        pendingCount,
        isOnline: getIsOnline(),
        operations: pendingOps
    };
}

/**
 * Reintenta sincronizar operaciones fallidas
 * @returns {Promise<Object>}
 */
export async function retrySyncFailedOperations() {
    console.log('🔄 Reintentando operaciones fallidas...');

    // Resetear operaciones fallidas a pending
    const operations = await dbManager.getPendingSyncOperations();
    const failedOps = operations.filter(op => op.status === 'failed');

    for (const op of failedOps) {
        await dbManager.updateSyncOperationStatus(op.id, 'pending');
    }

    console.log(`🔄 ${failedOps.length} operaciones marcadas para reintentar`);

    // Intentar sincronizar
    return await syncPendingOperations();
}

/**
 * Inicializa el servicio de sincronización
 * Configura listeners para iniciar sync automáticamente
 */
export function initSyncService() {
    console.log('🚀 Inicializando servicio de sincronización...');

    // Listener para cambios de conectividad
    onConnectivityChange(async (online) => {
        if (online) {
            console.log('🟢 Conexión restablecida, intentando sincronizar...');

            // Esperar un poco para asegurar que la conexión es estable
            setTimeout(async () => {
                const status = await getSyncStatus();
                if (status.pendingCount > 0) {
                    // Intentar registrar Background Sync
                    const bgSyncRegistered = await registerBackgroundSync();

                    if (!bgSyncRegistered) {
                        // Si no está disponible, sincronizar manualmente
                        await syncPendingOperations();
                    }
                }
            }, 1000);
        }
    });

    // Listener para cuando se agregan operaciones a la cola
    window.addEventListener('sync-pending', async () => {
        if (getIsOnline() && !syncInProgress) {
            console.log('📡 Nueva operación pendiente y hay conexión, sincronizando...');
            await registerBackgroundSync();
        }
    });

    console.log('✅ Servicio de sincronización inicializado');
}

/**
 * Limpia operaciones completadas antiguas
 * @param {number} maxAgeDays - Edad máxima en días (default: 7)
 * @returns {Promise<number>} Número de operaciones limpiadas
 */
export async function cleanOldSyncOperations(maxAgeDays = 7) {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convertir a ms
    const cutoffTime = Date.now() - maxAge;

    const operations = await dbManager.getPendingSyncOperations();
    let cleaned = 0;

    for (const op of operations) {
        if (op.status === 'completed' && op.timestamp < cutoffTime) {
            await dbManager.removeSyncOperation(op.id);
            cleaned++;
        }
    }

    console.log(`🧹 ${cleaned} operaciones antiguas limpiadas`);
    return cleaned;
}

/**
 * Obtiene un resumen detallado de operaciones pendientes
 * @returns {Promise<Object>}
 */
export async function getPendingOperationsSummary() {
    const operations = await dbManager.getPendingSyncOperations();

    const summary = {
        total: operations.length,
        byEntity: {
            product: 0,
            store: 0
        },
        byType: {
            create: 0,
            update: 0,
            delete: 0
        },
        byStatus: {
            pending: 0,
            syncing: 0,
            failed: 0
        }
    };

    operations.forEach(op => {
        if (op.entity) summary.byEntity[op.entity]++;
        if (op.type) summary.byType[op.type]++;
        if (op.status) summary.byStatus[op.status]++;
    });

    return summary;
}

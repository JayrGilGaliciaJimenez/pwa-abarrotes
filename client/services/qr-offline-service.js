/**
 * QR Offline Service
 *
 * Servicio especializado para manejar escaneo de QR y validación de tiendas offline
 * usando PouchDB como caché local.
 *
 * Características:
 * - Caché de datos de tiendas por UUID para consulta offline
 * - Cola de visitas pendientes cuando no hay conexión
 * - Sincronización automática cuando se recupera la conexión
 * - Validación de geolocalización offline
 */

class QROfflineService {
  constructor() {
    this.dbStores = null;           // PouchDB para tiendas
    this.dbVisits = null;           // PouchDB para visitas pendientes
    this.isInitialized = false;

    console.log('[QROffline] Servicio creado');
  }

  /**
   * Inicializa las bases de datos PouchDB
   */
  async initialize() {
    try {
      console.log('[QROffline] Inicializando bases de datos...');

      // Reutilizar la base de datos de tiendas existente
      this.dbStores = new PouchDB('stores');

      // Crear base de datos para visitas pendientes
      this.dbVisits = new PouchDB('pending_visits');

      this.isInitialized = true;
      console.log('[QROffline] ✅ Bases de datos inicializadas');

      // Setup auto-sync cuando vuelva la conexión
      this.setupAutoSync();

      return true;
    } catch (error) {
      console.error('[QROffline] ❌ Error al inicializar:', error);
      throw error;
    }
  }

  /**
   * Verifica si el servicio está inicializado
   */
  checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('QROfflineService no está inicializado. Llama a initialize() primero.');
    }
  }

  // ==========================================
  // CACHÉ DE TIENDAS POR UUID
  // ==========================================

  /**
   * Obtiene los datos de una tienda por UUID desde el caché local
   * @param {string} storeUuid - UUID de la tienda
   * @returns {Promise<Object|null>} - Datos de la tienda o null si no existe
   */
  async getStoreByUuid(storeUuid) {
    this.checkInitialized();

    try {
      console.log(`[QROffline] 🔍 Buscando tienda ${storeUuid} en caché...`);

      const store = await this.dbStores.get(storeUuid);

      // Filtrar documentos marcados para eliminar
      if (store.syncOperation === 'delete' || store.deletedAt) {
        console.log(`[QROffline] ⚠️ Tienda ${storeUuid} marcada para eliminar`);
        return null;
      }

      console.log(`[QROffline] ✅ Tienda encontrada en caché:`, store.name);
      return store;

    } catch (error) {
      if (error.status === 404) {
        console.log(`[QROffline] ⚠️ Tienda ${storeUuid} no encontrada en caché`);
        return null;
      }

      console.error(`[QROffline] ❌ Error al buscar tienda:`, error);
      throw error;
    }
  }

  /**
   * Intenta obtener los datos de una tienda desde el servidor
   * Si tiene éxito, cachea la tienda en PouchDB
   * Si falla (offline), intenta desde caché
   *
   * @param {string} storeUuid - UUID de la tienda
   * @returns {Promise<Object|null>} - Datos de la tienda o null
   */
  async fetchStoreData(storeUuid) {
    this.checkInitialized();

    const BACKEND_URL = this.getBackendUrl();
    const token = localStorage.getItem('token');

    // Intentar desde servidor si estamos online
    if (navigator.onLine) {
      try {
        console.log(`[QROffline] 🌐 Obteniendo tienda ${storeUuid} desde servidor...`);

        const response = await fetch(`${BACKEND_URL}/stores/${storeUuid}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const storeData = await response.json();
        const store = storeData.data || storeData;

        console.log(`[QROffline] ✅ Tienda obtenida del servidor:`, store.name);

        // Cachear en PouchDB para uso futuro offline
        await this.cacheStore(store);

        return store;

      } catch (error) {
        console.warn(`[QROffline] ⚠️ Error al obtener del servidor:`, error.message);
        console.log(`[QROffline] 📴 Intentando desde caché local...`);
      }
    } else {
      console.log(`[QROffline] 📴 Sin conexión, usando caché local...`);
    }

    // Fallback a caché local
    return await this.getStoreByUuid(storeUuid);
  }

  /**
   * Cachea una tienda en PouchDB
   * @param {Object} store - Datos de la tienda
   */
  async cacheStore(store) {
    try {
      const storeUuid = store.uuid || store._id;

      console.log(`[QROffline] 💾 Cacheando tienda ${storeUuid}...`);

      // Intentar obtener el documento existente
      const existingDoc = await this.dbStores.get(storeUuid).catch(() => null);

      if (existingDoc) {
        // Actualizar documento existente preservando _rev
        await this.dbStores.put({
          _id: storeUuid,
          _rev: existingDoc._rev,
          ...store,
          cachedAt: new Date().toISOString()
        });
      } else {
        // Crear nuevo documento
        await this.dbStores.put({
          _id: storeUuid,
          ...store,
          cachedAt: new Date().toISOString()
        });
      }

      console.log(`[QROffline] ✅ Tienda cacheada correctamente`);

    } catch (error) {
      console.error(`[QROffline] ❌ Error al cachear tienda:`, error);
    }
  }

  // ==========================================
  // COLA DE VISITAS PENDIENTES
  // ==========================================

  /**
   * Guarda una visita pendiente para sincronizar cuando haya conexión
   *
   * @param {Object} visitData - Datos de la visita
   * @param {string} visitData.userUuid - UUID del usuario
   * @param {string} visitData.storeUuid - UUID de la tienda
   * @param {Array} visitData.orders - Lista de productos ordenados
   * @param {string} visitData.photoBase64 - Foto en base64
   * @param {number} visitData.latitude - Latitud del usuario
   * @param {number} visitData.longitude - Longitud del usuario
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async savePendingVisit(visitData) {
    this.checkInitialized();

    try {
      console.log('[QROffline] 💾 Guardando visita pendiente...');

      const visitId = `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const visitDoc = {
        _id: visitId,
        type: 'pending_visit',
        status: 'pending',
        userUuid: visitData.userUuid,
        storeUuid: visitData.storeUuid,
        orders: visitData.orders || [],
        photoBase64: visitData.photoBase64,
        latitude: visitData.latitude,
        longitude: visitData.longitude,
        validation: true,
        createdAt: new Date().toISOString(),
        syncAttempts: 0
      };

      await this.dbVisits.put(visitDoc);

      console.log(`[QROffline] ✅ Visita guardada con ID: ${visitId}`);

      // Disparar evento para notificar que hay una nueva visita pendiente
      window.dispatchEvent(new CustomEvent('pending-visit-added', {
        detail: { visitId, storeUuid: visitData.storeUuid }
      }));

      return { success: true, visitId };

    } catch (error) {
      console.error('[QROffline] ❌ Error al guardar visita pendiente:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las visitas pendientes
   * @returns {Promise<Array>} - Lista de visitas pendientes
   */
  async getPendingVisits() {
    this.checkInitialized();

    try {
      const result = await this.dbVisits.allDocs({
        include_docs: true,
        descending: false
      });

      const visits = result.rows
        .filter(row => row.doc.type === 'pending_visit' && row.doc.status === 'pending')
        .map(row => row.doc);

      console.log(`[QROffline] 📋 ${visits.length} visitas pendientes encontradas`);

      return visits;

    } catch (error) {
      console.error('[QROffline] ❌ Error al obtener visitas pendientes:', error);
      return [];
    }
  }

  /**
   * Sincroniza una visita pendiente con el servidor
   * @param {Object} visit - Documento de visita pendiente
   * @returns {Promise<Object>} - Resultado de la sincronización
   */
  async syncVisit(visit) {
    this.checkInitialized();

    const BACKEND_URL = this.getBackendUrl();
    const token = localStorage.getItem('token');

    try {
      console.log(`[QROffline] 🔄 Sincronizando visita ${visit._id}...`);

      // Preparar FormData
      const formData = new FormData();
      formData.append('userUuid', visit.userUuid);
      formData.append('storeUuid', visit.storeUuid);
      formData.append('validation', visit.validation);
      formData.append('ordersJson', JSON.stringify(visit.orders));

      // Agregar foto si existe
      if (visit.photoBase64) {
        const photoFile = this.base64ToFile(
          visit.photoBase64,
          `visit-photo-${Date.now()}.jpg`
        );
        formData.append('photo', photoFile);
      }

      const response = await fetch(`${BACKEND_URL}/visits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();

      console.log(`[QROffline] ✅ Visita ${visit._id} sincronizada exitosamente`);

      // Marcar como sincronizada
      await this.dbVisits.put({
        ...visit,
        status: 'synced',
        syncedAt: new Date().toISOString(),
        serverResponse: result
      });

      return { success: true, result };

    } catch (error) {
      console.error(`[QROffline] ❌ Error al sincronizar visita ${visit._id}:`, error);

      // Incrementar contador de intentos
      await this.dbVisits.put({
        ...visit,
        syncAttempts: (visit.syncAttempts || 0) + 1,
        lastSyncError: error.message,
        lastSyncAttempt: new Date().toISOString()
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Sincroniza todas las visitas pendientes
   * @returns {Promise<Object>} - Resumen de la sincronización
   */
  async syncAllPendingVisits() {
    this.checkInitialized();

    if (!navigator.onLine) {
      console.log('[QROffline] 📴 Sin conexión, no se puede sincronizar');
      return { success: false, message: 'Sin conexión a internet' };
    }

    const pendingVisits = await this.getPendingVisits();

    if (pendingVisits.length === 0) {
      console.log('[QROffline] ✅ No hay visitas pendientes para sincronizar');
      return { success: true, synced: 0, failed: 0, total: 0 };
    }

    console.log(`[QROffline] 🔄 Sincronizando ${pendingVisits.length} visitas pendientes...`);

    const results = {
      success: true,
      total: pendingVisits.length,
      synced: 0,
      failed: 0,
      errors: []
    };

    for (const visit of pendingVisits) {
      const result = await this.syncVisit(visit);

      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push({
          visitId: visit._id,
          error: result.error
        });
      }
    }

    results.success = results.failed === 0;

    console.log(`[QROffline] 🏁 Sincronización completada: ${results.synced}/${results.total} exitosas`);

    // Disparar evento de sincronización completada
    window.dispatchEvent(new CustomEvent('visits-synced', { detail: results }));

    return results;
  }

  /**
   * Limpia visitas ya sincronizadas (más de 7 días)
   * @returns {Promise<number>} - Número de visitas limpiadas
   */
  async cleanSyncedVisits(maxAgeDays = 7) {
    this.checkInitialized();

    try {
      const result = await this.dbVisits.allDocs({
        include_docs: true
      });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

      let cleaned = 0;

      for (const row of result.rows) {
        const visit = row.doc;

        if (visit.status === 'synced' && visit.syncedAt) {
          const syncedDate = new Date(visit.syncedAt);

          if (syncedDate < cutoffDate) {
            await this.dbVisits.remove(visit);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        console.log(`[QROffline] 🧹 ${cleaned} visitas sincronizadas antiguas limpiadas`);
      }

      return cleaned;

    } catch (error) {
      console.error('[QROffline] ❌ Error al limpiar visitas sincronizadas:', error);
      return 0;
    }
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  /**
   * Convierte base64 a File
   * @param {string} base64Data - Datos en base64 (data:image/jpeg;base64,...)
   * @param {string} filename - Nombre del archivo
   * @returns {File}
   */
  base64ToFile(base64Data, filename) {
    const arr = base64Data.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Obtiene la URL base del backend
   * @returns {string}
   */
  getBackendUrl() {
    if (window.BASE_URL) {
      return window.BASE_URL;
    }

    const fallbackBase =
      (window.__ENV && window.__ENV.API_BASE_URL) ||
      window.API_BASE_URL ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:82'
        : window.location.origin);

    return `${fallbackBase.replace(/\/+$/, '')}/api/v1`;
  }

  /**
   * Configura sincronización automática cuando se recupera la conexión
   */
  setupAutoSync() {
    console.log('[QROffline] 🔄 Configurando auto-sync...');

    // Listener para cuando vuelve la conexión
    window.addEventListener('online', async () => {
      console.log('[QROffline] 🟢 Conexión restaurada, sincronizando visitas pendientes...');

      // Esperar 2 segundos para que la conexión se estabilice
      setTimeout(async () => {
        await this.syncAllPendingVisits();
      }, 2000);
    });

    // Listener para Background Sync si está disponible
    if ('serviceWorker' in navigator && 'sync' in window.SyncManager.prototype) {
      navigator.serviceWorker.ready.then(registration => {
        window.addEventListener('pending-visit-added', async () => {
          try {
            await registration.sync.register('sync-visits');
            console.log('[QROffline] 📡 Background Sync registrado');
          } catch (error) {
            console.warn('[QROffline] ⚠️ No se pudo registrar Background Sync:', error);
          }
        });
      });
    }

    console.log('[QROffline] ✅ Auto-sync configurado');
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Promise<Object>}
   */
  async getCacheStats() {
    this.checkInitialized();

    try {
      const storesResult = await this.dbStores.allDocs();
      const visitsResult = await this.dbVisits.allDocs({ include_docs: true });

      const pendingVisits = visitsResult.rows.filter(
        row => row.doc.status === 'pending'
      ).length;

      const syncedVisits = visitsResult.rows.filter(
        row => row.doc.status === 'synced'
      ).length;

      return {
        cachedStores: storesResult.total_rows,
        pendingVisits,
        syncedVisits,
        totalVisits: visitsResult.total_rows
      };

    } catch (error) {
      console.error('[QROffline] ❌ Error al obtener estadísticas:', error);
      return {
        cachedStores: 0,
        pendingVisits: 0,
        syncedVisits: 0,
        totalVisits: 0
      };
    }
  }
}

// Crear instancia global
const qrOfflineService = new QROfflineService();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = qrOfflineService;
}

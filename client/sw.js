/**
 * Service Worker para PWA Abarrotes - Hybrid Sync Version
 *
 * APP SHELL STRATEGY:
 * - Cache-first para assets estáticos del App Shell (HTML, CSS, JS)
 * - Hybrid Sync Service maneja sincronización Backend-first + PouchDB cache
 * - Auto-sync cuando se recupera conexión
 * - Background Sync para POST requests (visitas) cuando hay fallo de red
 *
 * NOTA: Este Service Worker solo cachea archivos estáticos.
 * Los datos (productos, tiendas) son manejados por el Hybrid Sync Service.
 */


const CACHE_NAME = 'abarrotes-hybrid-v6'; // Agregado recursos externos y env-config
const DATA_CACHE_NAME = 'abarrotes-data-hybrid-v1';
const PENDING_REQUESTS_STORE = 'pending-requests';
const DB_NAME = 'pwa-offline-requests';
const DB_VERSION = 1;

/**
 * =====================================================
 * IndexedDB HELPERS - Para guardar solicitudes pendientes
 * =====================================================
 */

/**
 * Abre la base de datos IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[SW] ❌ Error abriendo IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(PENDING_REQUESTS_STORE)) {
                const store = db.createObjectStore(PENDING_REQUESTS_STORE, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('url', 'url', { unique: false });
                console.log('[SW] ✅ Object store creado:', PENDING_REQUESTS_STORE);
            }
        };
    });
}

/**
 * Guarda una solicitud pendiente en IndexedDB
 * @param {object} requestData - Datos de la solicitud a guardar
 * @returns {Promise<number>} - ID de la solicitud guardada
 */
async function savePendingRequest(requestData) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PENDING_REQUESTS_STORE], 'readwrite');
            const store = transaction.objectStore(PENDING_REQUESTS_STORE);

            const data = {
                ...requestData,
                timestamp: Date.now()
            };

            const request = store.add(data);

            request.onsuccess = () => {
                console.log('[SW] ✅ Solicitud pendiente guardada con ID:', request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('[SW] ❌ Error guardando solicitud pendiente:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('[SW] ❌ Error en savePendingRequest:', error);
        throw error;
    }
}

/**
 * Obtiene todas las solicitudes pendientes
 * @returns {Promise<Array>}
 */
async function getPendingRequests() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PENDING_REQUESTS_STORE], 'readonly');
            const store = transaction.objectStore(PENDING_REQUESTS_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                console.error('[SW] ❌ Error obteniendo solicitudes pendientes:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('[SW] ❌ Error en getPendingRequests:', error);
        return [];
    }
}

/**
 * Elimina una solicitud pendiente por ID
 * @param {number} id - ID de la solicitud a eliminar
 * @returns {Promise<void>}
 */
async function deletePendingRequest(id) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([PENDING_REQUESTS_STORE], 'readwrite');
            const store = transaction.objectStore(PENDING_REQUESTS_STORE);
            const request = store.delete(id);

            request.onsuccess = () => {
                console.log('[SW] ✅ Solicitud pendiente eliminada:', id);
                resolve();
            };

            request.onerror = () => {
                console.error('[SW] ❌ Error eliminando solicitud pendiente:', request.error);
                reject(request.error);
            };

            transaction.oncomplete = () => {
                db.close();
            };
        });
    } catch (error) {
        console.error('[SW] ❌ Error en deletePendingRequest:', error);
        throw error;
    }
}

/**
 * Notifica a todos los clientes sobre un evento
 * @param {object} message - Mensaje a enviar a los clientes
 */
async function notifyClients(message) {
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    allClients.forEach(client => {
        client.postMessage(message);
    });
}


/**
 * APP SHELL - Assets críticos que deben cachearse en install
 * Estos archivos permiten que la app funcione completamente offline
 */
/**
 * CDN/External Resources - Recursos externos que deben cachearse
 */
const EXTERNAL_RESOURCES = [
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

const APP_SHELL = [
    // Páginas HTML principales
    '/',
    '/index.html',

    // Configuración de entorno
    '/env-config.js',

    // Vistas principales del CRUD (CRÍTICAS)
    '/pages/products/products.html',
    '/pages/stores/stores.html',

    // Dashboards
    '/pages/admin/dashboard.html',
    '/pages/delivery_man/dashboard.html',
    '/pages/delivery_man/store-visit.html',
    '/pages/drivers/drivers.html',
    '/pages/routes/routes.html',

    // JavaScript - Servicios PWA (CRÍTICOS para offline con Hybrid Sync)
    '/services/sync-pouchdb-service.js',
    '/components/network-status.js',
    '/components/admin-navbar.js',
    '/utils/auth-guard.js',
    '/pwa-init.js',

    // JavaScript - Páginas
    '/pages/products/products.js',
    '/pages/stores/store.js',
    '/pages/admin/dashboard.js',
    '/pages/delivery_man/dashboard.js',
    '/pages/delivery_man/store-visit.js',
    '/pages/drivers/drivers.js',
    '/pages/routes/routes.js',
    '/pages/login/login.js',

    // CSS - Archivos de estilo
    '/assets/bootstrap/css/bootstrap.css',
    '/components/admin-navbar.css',
    '/pages/login/login.css',
    '/pages/delivery_man/dashboard.css',
    '/pages/delivery_man/store-visit.css',

    // JavaScript - Bootstrap y configuración
    '/assets/bootstrap/js/bootstrap.js',
    '/properties.js',

    // PWA Manifest
    '/manifest.json'
];

/**
 * Evento de instalación del Service Worker
 * Cachea todos los archivos del App Shell de forma crítica
 */
self.addEventListener('install', (event) => {
    console.log('[SW] 📦 Instalando Service Worker v6...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                console.log('[SW] 💾 Cacheando App Shell...');

                // Cachear archivos locales del App Shell
                await Promise.all(
                    APP_SHELL.map(url => {
                        return cache.add(url)
                            .then(() => {
                                console.log(`[SW] ✅ Cacheado: ${url}`);
                            })
                            .catch((error) => {
                                console.error(`[SW] ❌ Error cacheando ${url}:`, error);
                                // No lanzar error para continuar con otros archivos
                            });
                    })
                );

                // Cachear recursos externos (CDN)
                console.log('[SW] 💾 Cacheando recursos externos...');
                await Promise.all(
                    EXTERNAL_RESOURCES.map(url => {
                        return fetch(url, { mode: 'cors' })
                            .then(response => {
                                if (response.ok) {
                                    return cache.put(url, response);
                                }
                                throw new Error(`HTTP ${response.status}`);
                            })
                            .then(() => {
                                console.log(`[SW] ✅ Cacheado externo: ${url}`);
                            })
                            .catch((error) => {
                                console.error(`[SW] ❌ Error cacheando externo ${url}:`, error);
                            });
                    })
                );
            })
            .then(() => {
                console.log('[SW] ✅ App Shell y recursos externos cacheados completamente');
                // Forzar activación inmediata
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] ❌ Error durante instalación:', error);
            })
    );
});

/**
 * Evento de activación del Service Worker
 * Limpia cachés antiguas
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] 🔄 Activando Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Eliminar cachés antiguas
                        if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                            console.log('[SW] 🗑️ Eliminando caché antigua:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] ✅ Service Worker activado correctamente');
                // Tomar control de todas las páginas inmediatamente
                return self.clients.claim();
            })
    );
});

/**
 * Evento de fetch - Intercepta todas las peticiones de red
 * Implementa diferentes estrategias según el tipo de recurso
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar peticiones non-HTTP (chrome-extension://, etc.)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // EXCLUIR peticiones de autenticación del Service Worker
    // Las peticiones de login NO deben ser interceptadas ni cacheadas
    if (url.pathname.includes('/api/v1/auth/')) {
        // Dejar que la petición pase directamente sin intervención del SW
        return;
    }

    // Estrategia para peticiones de API (Network First)
    if (url.pathname.includes('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Estrategia para archivos del App Shell (Cache First, Falling back to Network)
    if (
        request.method === 'GET' &&
        (request.destination === 'script' ||
         request.destination === 'style' ||
         request.destination === 'document' ||
         request.destination === 'image' ||
         request.destination === 'font')
    ) {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }

    // Para todo lo demás, intentar red primero
    event.respondWith(
        fetch(request)
            .catch(() => caches.match(request))
    );
});

/**
 * Estrategia Network First - Para datos dinámicos (APIs)
 * Intenta red primero, fallback a caché
 *
 * Ideal para datos dinámicos que queremos mantener actualizados
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkFirstStrategy(request) {
    try {
        // Intentar obtener de la red con timeout
        const networkResponse = await Promise.race([
            fetch(request),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Network timeout')), 10000)
            )
        ]);

        // Si es exitoso, actualizar caché y retornar
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DATA_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            console.log(`[SW] 📡 Network: ${request.url}`);
        }

        return networkResponse;
    } catch (error) {
        console.log(`[SW] 💾 Cache fallback para: ${request.url}`);

        // Si falla la red, buscar en caché
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Si no hay caché, retornar respuesta offline
        return new Response(
            JSON.stringify({
                error: 'Offline',
                message: 'No hay conexión y no hay datos en caché'
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                    'Content-Type': 'application/json'
                })
            }
        );
    }
}

/**
 * Estrategia Cache First - Para archivos del App Shell
 * Busca en caché primero, fallback a red
 *
 * Ideal para assets estáticos que no cambian frecuentemente
 * Permite que la app cargue instantáneamente offline
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheFirstStrategy(request) {
    // Buscar en caché primero
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        console.log(`[SW] ⚡ Cache hit: ${request.url}`);

        // Retornar de caché y actualizar en segundo plano (stale-while-revalidate)
        updateCacheInBackground(request);

        return cachedResponse;
    }

    console.log(`[SW] 🌐 Cache miss, fetching: ${request.url}`);

    try {
        // Si no está en caché, obtener de la red
        const networkResponse = await fetch(request);

        // Cachear para futuras solicitudes (solo respuestas exitosas)
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error(`[SW] ❌ Error obteniendo recurso: ${request.url}`, error);

        // Retornar página offline si es un documento HTML
        if (request.destination === 'document') {
            const offlineResponse = await caches.match('/index.html');
            if (offlineResponse) {
                return offlineResponse;
            }
        }

        // Retornar error 503
        return new Response('Offline - Recurso no disponible en caché', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

/**
 * Actualiza el caché en segundo plano sin bloquear la respuesta
 * Implementa patrón Stale-While-Revalidate
 *
 * @param {Request} request
 */
function updateCacheInBackground(request) {
    fetch(request)
        .then((response) => {
            if (response && response.status === 200) {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, response);
                    console.log(`[SW] 🔄 Cache actualizado en segundo plano: ${request.url}`);
                });
            }
        })
        .catch((error) => {
            // Silenciosamente fallar, no es crítico
            console.log(`[SW] ℹ️ No se pudo actualizar caché en segundo plano: ${request.url}`);
        });
}

/**
 * =====================================================
 * BACKGROUND SYNC - Para solicitudes POST offline
 * =====================================================
 */

/**
 * Evento sync - Se dispara cuando el navegador detecta conexión
 * Procesa las solicitudes pendientes guardadas en IndexedDB
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] 🔄 Evento sync disparado:', event.tag);

    if (event.tag === 'sync-visits') {
        event.waitUntil(syncPendingVisits());
    }
});

/**
 * Sincroniza todas las visitas pendientes
 * @returns {Promise<void>}
 */
async function syncPendingVisits() {
    console.log('[SW] 🔄 Iniciando sincronización de visitas pendientes...');

    try {
        const pendingRequests = await getPendingRequests();
        console.log('[SW] 📋 Solicitudes pendientes encontradas:', pendingRequests.length);

        if (pendingRequests.length === 0) {
            console.log('[SW] ✅ No hay solicitudes pendientes');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const pendingRequest of pendingRequests) {
            try {
                console.log('[SW] 📤 Enviando solicitud pendiente:', pendingRequest.id, pendingRequest.url);

                // Reconstruir el FormData desde los datos guardados
                const formData = new FormData();

                // Agregar campos de texto
                if (pendingRequest.formFields) {
                    for (const [key, value] of Object.entries(pendingRequest.formFields)) {
                        formData.append(key, value);
                    }
                }

                // Agregar foto si existe (convertir de base64 a Blob)
                if (pendingRequest.photoData) {
                    const photoBlob = await base64ToBlob(pendingRequest.photoData.data, pendingRequest.photoData.type);
                    formData.append('photo', photoBlob, pendingRequest.photoData.name);
                }

                const response = await fetch(pendingRequest.url, {
                    method: 'POST',
                    headers: {
                        'Authorization': pendingRequest.authorization
                    },
                    body: formData
                });

                if (response.ok) {
                    console.log('[SW] ✅ Solicitud enviada exitosamente:', pendingRequest.id);
                    await deletePendingRequest(pendingRequest.id);
                    successCount++;
                } else {
                    console.error('[SW] ❌ Error en respuesta del servidor:', response.status);
                    failCount++;
                }
            } catch (error) {
                console.error('[SW] ❌ Error enviando solicitud pendiente:', pendingRequest.id, error);
                failCount++;
            }
        }

        // Notificar a los clientes sobre el resultado
        await notifyClients({
            type: 'SYNC_COMPLETE',
            successCount,
            failCount,
            message: `Sincronización completada: ${successCount} exitosas, ${failCount} fallidas`
        });

        console.log(`[SW] ✅ Sincronización completada: ${successCount} exitosas, ${failCount} fallidas`);
    } catch (error) {
        console.error('[SW] ❌ Error en sincronización:', error);
        throw error;
    }
}

/**
 * Convierte base64 a Blob
 * @param {string} base64Data - Datos en base64
 * @param {string} contentType - Tipo MIME
 * @returns {Promise<Blob>}
 */
async function base64ToBlob(base64Data, contentType) {
    const response = await fetch(`data:${contentType};base64,${base64Data}`);
    return response.blob();
}

/**
 * Manejo de mensajes desde los clientes
 */
self.addEventListener('message', (event) => {
    console.log('[SW] 📨 Mensaje recibido del cliente:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_CLEAR') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('[SW] 🗑️ Todos los cachés limpiados');
                if (event.ports[0]) {
                    event.ports[0].postMessage({ success: true });
                }
            })
        );
    }

    // Guardar solicitud pendiente para sincronización offline
    if (event.data && event.data.type === 'SAVE_PENDING_REQUEST') {
        event.waitUntil(
            savePendingRequest(event.data.payload)
                .then((id) => {
                    console.log('[SW] ✅ Solicitud guardada para sync offline:', id);
                    if (event.ports[0]) {
                        event.ports[0].postMessage({ success: true, id });
                    }
                })
                .catch((error) => {
                    console.error('[SW] ❌ Error guardando solicitud:', error);
                    if (event.ports[0]) {
                        event.ports[0].postMessage({ success: false, error: error.message });
                    }
                })
        );
    }

    // Forzar sincronización manual
    if (event.data && event.data.type === 'FORCE_SYNC') {
        event.waitUntil(
            syncPendingVisits()
                .then(() => {
                    if (event.ports[0]) {
                        event.ports[0].postMessage({ success: true });
                    }
                })
                .catch((error) => {
                    if (event.ports[0]) {
                        event.ports[0].postMessage({ success: false, error: error.message });
                    }
                })
        );
    }
});

/**
 * Push notification handler (para futuras implementaciones)
 */
self.addEventListener('push', (event) => {
    console.log('[SW] 📬 Push notification recibida:', event);

    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación',
        icon: '/assets/images/icon-192x192.png',
        badge: '/assets/images/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Abarrotes PWA', options)
    );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 🔔 Notificación clickeada:', event);

    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('[SW] 🚀 Service Worker cargado y listo');

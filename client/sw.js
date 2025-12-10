/**
 * Service Worker para PWA Abarrotes - Hybrid Sync Version
 *
 * APP SHELL STRATEGY:
 * - Cache-first para assets estáticos del App Shell (HTML, CSS, JS)
 * - Hybrid Sync Service maneja sincronización Backend-first + PouchDB cache
 * - Auto-sync cuando se recupera conexión
 *
 * NOTA: Este Service Worker solo cachea archivos estáticos.
 * Los datos (productos, tiendas) son manejados por el Hybrid Sync Service.
 */

const CACHE_NAME = 'abarrotes-hybrid-v2'; // Fix: Excluir auth del SW
const DATA_CACHE_NAME = 'abarrotes-data-hybrid-v2';

/**
 * APP SHELL - Assets críticos que deben cachearse en install
 * Estos archivos permiten que la app funcione completamente offline
 */
const APP_SHELL = [
    // Páginas HTML principales
    '/',
    '/index.html',

    // Vistas principales del CRUD (CRÍTICAS)
    '/pages/products/products.html',
    '/pages/stores/stores.html',

    // Dashboards
    '/pages/admin/dashboard.html',
    '/pages/delivery_man/dashboard.html',
    '/pages/drivers/drivers.html',
    '/pages/routes/routes.html',

    // JavaScript - Servicios PWA (CRÍTICOS para offline con Hybrid Sync)
    '/services/sync-pouchdb-service.js',
    '/components/network-status.js',
    '/components/admin-navbar.js',
    '/pwa-init.js',

    // JavaScript - Páginas
    '/pages/products/products.js',
    '/pages/stores/store.js',
    '/pages/admin/dashboard.js',
    '/pages/delivery_man/dashboard.js',
    '/pages/drivers/drivers.js',
    '/pages/routes/routes.js',
    '/pages/login/login.js',

    // CSS - Archivos de estilo
    '/assets/bootstrap/css/bootstrap.css',
    '/components/admin-navbar.css',
    '/pages/login/login.css',
    '/pages/delivery_man/dashboard.css',

    // JavaScript - Bootstrap y configuración
    '/assets/bootstrap/js/bootstrap.js',
    '/properties.js',
    '/env-config.js',

    // PWA Manifest
    '/manifest.json'
];

/**
 * Evento de instalación del Service Worker
 * Cachea todos los archivos del App Shell de forma crítica
 */
self.addEventListener('install', (event) => {
    console.log('[SW] 📦 Instalando Service Worker v2...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] 💾 Cacheando App Shell...');

                // Cachear cada archivo individualmente para mejor logging
                return Promise.all(
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
            })
            .then(() => {
                console.log('[SW] ✅ App Shell cacheado completamente');
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
 * NOTA: Background Sync eliminado
 * PouchDB maneja la sincronización de datos internamente.
 * No es necesario un evento de sync en el Service Worker.
 */

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

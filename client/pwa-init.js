/**
 * PWA Initialization
 * Registra el service worker e inicializa funcionalidades PWA
 */

import networkStatus from './components/network-status.js';

// Variable para el prompt de instalación
let deferredPrompt;
let swRegistration;

/**
 * Registra el Service Worker
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Workers no soportados en este navegador');
        return null;
    }

    try {
        console.log('[PWA] Registrando Service Worker...');

        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        swRegistration = registration;

        console.log('[PWA] ✅ Service Worker registrado:', registration.scope);

        // Manejar actualizaciones del SW
        handleServiceWorkerUpdates(registration);

        // Verificar si hay una actualización disponible inmediatamente
        registration.update();

        return registration;
    } catch (error) {
        console.error('[PWA] ❌ Error registrando Service Worker:', error);
        return null;
    }
}

/**
 * Maneja las actualizaciones del Service Worker
 * @param {ServiceWorkerRegistration} registration
 */
function handleServiceWorkerUpdates(registration) {
    // Detectar cuando hay un nuevo SW instalándose
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[PWA] Nueva versión del SW detectada, instalando...');

        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Hay un nuevo SW disponible
                console.log('[PWA] Nueva versión instalada, esperando activación');
                showUpdateNotification();
            }
        });
    });

    // Detectar cuando el SW ha sido actualizado
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('[PWA] Service Worker actualizado, recargando página...');
        window.location.reload();
    });
}

/**
 * Muestra una notificación de actualización disponible
 */
function showUpdateNotification() {
    // Crear un banner de actualización
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px;
        text-align: center;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease-out;
    `;

    banner.innerHTML = `
        <style>
            @keyframes slideDown {
                from { transform: translateY(-100%); }
                to { transform: translateY(0); }
            }
        </style>
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap;">
            <span>
                <i class="bi bi-arrow-clockwise me-2"></i>
                Nueva versión disponible
            </span>
            <div style="display: flex; gap: 8px;">
                <button id="btn-update" class="btn btn-sm btn-light">
                    <i class="bi bi-check-lg me-1"></i>
                    Actualizar Ahora
                </button>
                <button id="btn-dismiss" class="btn btn-sm btn-outline-light">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // Botón de actualizar
    document.getElementById('btn-update').addEventListener('click', () => {
        if (swRegistration && swRegistration.waiting) {
            // Decirle al SW en espera que tome control
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    });

    // Botón de descartar
    document.getElementById('btn-dismiss').addEventListener('click', () => {
        banner.remove();
    });
}

/**
 * Maneja el prompt de instalación de PWA
 */
function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('[PWA] Prompt de instalación disponible');
        e.preventDefault();
        deferredPrompt = e;

        // Mostrar botón de instalación (si existe)
        const installButton = document.getElementById('btn-install-pwa');
        if (installButton) {
            installButton.style.display = 'block';
            installButton.addEventListener('click', showInstallPrompt);
        }
    });

    // Detectar cuando la app fue instalada
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] ✅ App instalada exitosamente');
        deferredPrompt = null;

        // Ocultar botón de instalación
        const installButton = document.getElementById('btn-install-pwa');
        if (installButton) {
            installButton.style.display = 'none';
        }

        // Mostrar notificación
        showToast('¡App instalada exitosamente!', 'success');
    });
}

/**
 * Muestra el prompt de instalación
 */
async function showInstallPrompt() {
    if (!deferredPrompt) {
        console.log('[PWA] No hay prompt de instalación disponible');
        return;
    }

    // Mostrar el prompt
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);

    // Limpiar el prompt
    deferredPrompt = null;
}

/**
 * Inicializa características de sincronización
 */
function initSyncFeatures() {
    // Verificar soporte de Background Sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        console.log('[PWA] ✅ Background Sync soportado');
    } else {
        console.warn('[PWA] ⚠️ Background Sync no soportado, usando fallback');
    }

    // Verificar soporte de Notificaciones
    if ('Notification' in window) {
        console.log('[PWA] ✅ Push Notifications soportadas');

        if (Notification.permission === 'default') {
            console.log('[PWA] Permisos de notificación no solicitados');
        } else if (Notification.permission === 'granted') {
            console.log('[PWA] ✅ Permisos de notificación concedidos');
        } else {
            console.log('[PWA] ❌ Permisos de notificación denegados');
        }
    }

    // Escuchar mensajes del Service Worker (ej: sincronización completada)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Escuchar cambios de conectividad para disparar sync
    window.addEventListener('online', handleOnlineEvent);
}

/**
 * Maneja mensajes recibidos del Service Worker
 * @param {MessageEvent} event
 */
function handleServiceWorkerMessage(event) {
    console.log('[PWA] 📨 Mensaje del Service Worker:', event.data);

    if (event.data && event.data.type === 'SYNC_COMPLETE') {
        const { successCount, failCount, message } = event.data;

        if (successCount > 0) {
            showToast(`✅ ${successCount} visita(s) sincronizada(s) correctamente`, 'success');
        }

        if (failCount > 0) {
            showToast(`⚠️ ${failCount} visita(s) pendiente(s) de sincronizar`, 'error');
        }

        console.log('[PWA] 📊 Resultado de sincronización:', message);
    }
}

/**
 * Maneja el evento de reconexión a internet
 * Intenta sincronizar solicitudes pendientes
 */
async function handleOnlineEvent() {
    console.log('[PWA] 🌐 Conexión restaurada, verificando pendientes...');

    try {
        // Verificar si hay soporte de Background Sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-visits');
            console.log('[PWA] 🔄 Background Sync registrado tras reconexión');
        } else {
            // Fallback: forzar sincronización manual
            await forceSyncManually();
        }
    } catch (error) {
        console.error('[PWA] ❌ Error al registrar sync tras reconexión:', error);
        // Intentar sync manual como fallback
        await forceSyncManually();
    }
}

/**
 * Fuerza la sincronización manual enviando mensaje al Service Worker
 * Usado como fallback cuando Background Sync no está disponible
 */
async function forceSyncManually() {
    if (!navigator.serviceWorker.controller) {
        console.warn('[PWA] ⚠️ No hay Service Worker activo para sync manual');
        return;
    }

    try {
        const messageChannel = new MessageChannel();

        const response = await new Promise((resolve, reject) => {
            messageChannel.port1.onmessage = (event) => {
                if (event.data.success) {
                    resolve(event.data);
                } else {
                    reject(new Error(event.data.error || 'Error en sync manual'));
                }
            };

            navigator.serviceWorker.controller.postMessage(
                { type: 'FORCE_SYNC' },
                [messageChannel.port2]
            );

            // Timeout de 30 segundos
            setTimeout(() => reject(new Error('Timeout en sync manual')), 30000);
        });

        console.log('[PWA] ✅ Sync manual completado');
    } catch (error) {
        console.error('[PWA] ❌ Error en sync manual:', error);
    }
}

/**
 * Solicita permisos de notificación
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('[PWA] Notificaciones no soportadas');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('[PWA] Permisos de notificación denegados por el usuario');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('[PWA] ✅ Permisos de notificación concedidos');
            return true;
        } else {
            console.log('[PWA] Permisos de notificación no concedidos');
            return false;
        }
    } catch (error) {
        console.error('[PWA] Error solicitando permisos de notificación:', error);
        return false;
    }
}

/**
 * Muestra un toast de notificación
 */
function showToast(message, type = 'info') {
    // Buscar o crear contenedor
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1100';
        document.body.appendChild(container);
    }

    const bgClass = type === 'success' ? 'bg-success' :
                    type === 'error' ? 'bg-danger' : 'bg-info';

    const toastId = 'toast-' + Date.now();
    container.insertAdjacentHTML('beforeend', `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);

    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/**
 * Verifica el estado de conectividad inicial
 */
function checkInitialConnectivity() {
    if (!navigator.onLine) {
        console.log('[PWA] ⚠️ Iniciando en modo offline');
        showToast('Modo offline activado', 'info');
    } else {
        console.log('[PWA] 🟢 Conectado a internet');
    }
}

/**
 * Inicializa la PWA
 */
async function initPWA() {
    console.log('[PWA] 🚀 Inicializando PWA...');

    try {
        // 1. Registrar Service Worker
        await registerServiceWorker();

        // 2. Configurar prompt de instalación
        setupInstallPrompt();

        // 3. Inicializar Network Status Component
        if (document.getElementById('network-status')) {
            networkStatus.init();
            console.log('[PWA] ✅ Network Status Component inicializado');
        }

        // 4. Inicializar características de sync
        initSyncFeatures();

        // 5. Verificar conectividad inicial
        checkInitialConnectivity();

        console.log('[PWA] ✅ PWA inicializada correctamente');
    } catch (error) {
        console.error('[PWA] ❌ Error inicializando PWA:', error);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWA);
} else {
    initPWA();
}

// Exportar funciones útiles
export {
    registerServiceWorker,
    showInstallPrompt,
    requestNotificationPermission,
    showToast,
    forceSyncManually
};

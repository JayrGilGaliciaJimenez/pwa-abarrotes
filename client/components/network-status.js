/**
 * Network Status Component - Indicador visual de estado de conexión
 *
 * Características:
 * - Muestra estado: Online/Offline/Sincronizando
 * - Badge con contador de cambios pendientes
 * - Modal con lista detallada de operaciones pendientes
 * - Botón para reintentar sincronización
 * - Auto-actualización en tiempo real
 *
 * Uso:
 * 1. Agregar <div id="network-status"></div> en tu HTML
 * 2. Importar: import NetworkStatus from './components/network-status.js'
 * 3. Inicializar: NetworkStatus.init()
 */

import { onConnectivityChange, getIsOnline, getSyncStats } from '../services/api-service.js';
import { getSyncStatus, syncPendingOperations, retrySyncFailedOperations, getPendingOperationsSummary, initSyncService } from '../services/sync-service.js';

class NetworkStatusComponent {
    constructor() {
        this.container = null;
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.pendingCount = 0;
        this.initialized = false;
    }

    /**
     * Inicializa el componente
     * @param {string} containerId - ID del contenedor (default: 'network-status')
     */
    init(containerId = 'network-status') {
        if (this.initialized) {
            console.warn('[NetworkStatus] Ya está inicializado');
            return;
        }

        this.container = document.getElementById(containerId);

        if (!this.container) {
            console.error(`[NetworkStatus] Contenedor #${containerId} no encontrado`);
            return;
        }

        console.log('[NetworkStatus] Inicializando componente...');

        // Renderizar UI inicial
        this.render();

        // Configurar listeners
        this.setupListeners();

        // Inicializar servicio de sincronización
        initSyncService();

        // Actualizar estado inicial
        this.updateStatus();

        this.initialized = true;
        console.log('[NetworkStatus] ✅ Componente inicializado');
    }

    /**
     * Configura todos los event listeners
     */
    setupListeners() {
        // Listener de cambios de conectividad
        onConnectivityChange((online) => {
            this.isOnline = online;
            this.updateStatus();
        });

        // Listener de sincronización iniciada
        window.addEventListener('sync-start', () => {
            this.isSyncing = true;
            this.updateStatus();
        });

        // Listener de sincronización completada
        window.addEventListener('sync-complete', (event) => {
            this.isSyncing = false;
            this.updateStatus();

            const { detail } = event;
            if (detail && detail.synced > 0) {
                this.showNotification('success', `✅ ${detail.synced} cambio(s) sincronizado(s) exitosamente`);
            }

            if (detail && detail.failed > 0) {
                this.showNotification('warning', `⚠️ ${detail.failed} cambio(s) fallaron al sincronizar`);
            }
        });

        // Listener de sincronización con error
        window.addEventListener('sync-error', (event) => {
            this.isSyncing = false;
            this.updateStatus();
            this.showNotification('danger', '❌ Error durante la sincronización');
        });

        // Listener de operaciones pendientes
        window.addEventListener('sync-pending', () => {
            this.updateStatus();
        });

        // Listener de mensajes del Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                const { type, data } = event.data;

                if (type === 'SYNC_REQUESTED') {
                    console.log('[NetworkStatus] Sincronización solicitada por SW');
                    this.handleSyncRequest();
                }

                if (type === 'sync-success') {
                    this.showNotification('success', data.message || 'Sincronización exitosa');
                }

                if (type === 'sync-error') {
                    this.showNotification('danger', data.message || 'Error en sincronización');
                }
            });
        }
    }

    /**
     * Maneja solicitud de sincronización desde el Service Worker
     */
    async handleSyncRequest() {
        try {
            const result = await syncPendingOperations();

            // Notificar al SW que completamos
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SYNC_COMPLETE',
                    result
                });
            }
        } catch (error) {
            console.error('[NetworkStatus] Error procesando sync request:', error);
        }
    }

    /**
     * Actualiza el estado del componente
     */
    async updateStatus() {
        try {
            const syncStatus = await getSyncStatus();
            this.pendingCount = syncStatus.pendingCount;
            this.isOnline = syncStatus.isOnline;
            this.isSyncing = syncStatus.isSyncing;

            this.render();
        } catch (error) {
            console.error('[NetworkStatus] Error actualizando estado:', error);
        }
    }

    /**
     * Renderiza el componente
     */
    render() {
        if (!this.container) return;

        const statusClass = this.getStatusClass();
        const statusText = this.getStatusText();
        const statusIcon = this.getStatusIcon();

        this.container.innerHTML = `
            <div class="network-status-widget">
                <button
                    class="btn btn-sm ${statusClass} position-relative"
                    id="network-status-btn"
                    title="Estado de conexión"
                >
                    <i class="${statusIcon} me-1"></i>
                    ${statusText}
                    ${this.pendingCount > 0 ? `
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            ${this.pendingCount}
                            <span class="visually-hidden">cambios pendientes</span>
                        </span>
                    ` : ''}
                </button>
            </div>

            <!-- Modal de operaciones pendientes -->
            <div class="modal fade" id="networkStatusModal" tabindex="-1" aria-labelledby="networkStatusModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="networkStatusModalLabel">
                                <i class="bi bi-cloud-arrow-up me-2"></i>
                                Estado de Sincronización
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" id="networkStatusModalBody">
                            <div class="text-center">
                                <div class="spinner-border" role="status">
                                    <span class="visually-hidden">Cargando...</span>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            ${this.pendingCount > 0 && this.isOnline ? `
                                <button type="button" class="btn btn-primary" id="retrySyncBtn">
                                    <i class="bi bi-arrow-clockwise me-1"></i>
                                    Sincronizar Ahora
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Toast de notificaciones -->
            <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
                <div id="networkStatusToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <strong class="me-auto">Sincronización</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body" id="networkStatusToastBody">
                        <!-- Mensaje dinámico -->
                    </div>
                </div>
            </div>
        `;

        // Agregar estilos
        this.injectStyles();

        // Agregar event listeners
        this.attachEventListeners();
    }

    /**
     * Adjunta event listeners a los elementos del DOM
     */
    attachEventListeners() {
        const btn = document.getElementById('network-status-btn');
        if (btn) {
            btn.addEventListener('click', () => this.showModal());
        }

        const retryBtn = document.getElementById('retrySyncBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.handleRetrySync());
        }
    }

    /**
     * Muestra el modal con detalles de sincronización
     */
    async showModal() {
        const modal = new bootstrap.Modal(document.getElementById('networkStatusModal'));
        const modalBody = document.getElementById('networkStatusModalBody');

        modal.show();

        try {
            const summary = await getPendingOperationsSummary();
            const syncStatus = await getSyncStatus();

            modalBody.innerHTML = this.renderModalContent(summary, syncStatus);
        } catch (error) {
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error cargando detalles: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Renderiza el contenido del modal
     */
    renderModalContent(summary, syncStatus) {
        if (summary.total === 0) {
            return `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle me-2"></i>
                    ¡Todo sincronizado! No hay cambios pendientes.
                </div>
            `;
        }

        return `
            <div class="row mb-3">
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">${summary.total}</h5>
                            <p class="card-text text-muted">Total Pendientes</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">${summary.byStatus.pending}</h5>
                            <p class="card-text text-muted">En Cola</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title">${summary.byStatus.failed}</h5>
                            <p class="card-text text-muted">Fallidas</p>
                        </div>
                    </div>
                </div>
            </div>

            <h6 class="mb-3">Operaciones por Entidad</h6>
            <ul class="list-group mb-3">
                ${summary.byEntity.product > 0 ? `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-box me-2"></i>Productos</span>
                        <span class="badge bg-primary rounded-pill">${summary.byEntity.product}</span>
                    </li>
                ` : ''}
                ${summary.byEntity.store > 0 ? `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-shop me-2"></i>Tiendas</span>
                        <span class="badge bg-primary rounded-pill">${summary.byEntity.store}</span>
                    </li>
                ` : ''}
            </ul>

            <h6 class="mb-3">Operaciones por Tipo</h6>
            <ul class="list-group">
                ${summary.byType.create > 0 ? `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-plus-circle me-2 text-success"></i>Crear</span>
                        <span class="badge bg-success rounded-pill">${summary.byType.create}</span>
                    </li>
                ` : ''}
                ${summary.byType.update > 0 ? `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-pencil me-2 text-warning"></i>Actualizar</span>
                        <span class="badge bg-warning rounded-pill">${summary.byType.update}</span>
                    </li>
                ` : ''}
                ${summary.byType.delete > 0 ? `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-trash me-2 text-danger"></i>Eliminar</span>
                        <span class="badge bg-danger rounded-pill">${summary.byType.delete}</span>
                    </li>
                ` : ''}
            </ul>

            ${!syncStatus.isOnline ? `
                <div class="alert alert-warning mt-3">
                    <i class="bi bi-wifi-off me-2"></i>
                    Sin conexión. Los cambios se sincronizarán automáticamente cuando vuelva la conexión.
                </div>
            ` : ''}
        `;
    }

    /**
     * Maneja el reintentar sincronización
     */
    async handleRetrySync() {
        const retryBtn = document.getElementById('retrySyncBtn');
        if (retryBtn) {
            retryBtn.disabled = true;
            retryBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sincronizando...';
        }

        try {
            await retrySyncFailedOperations();
            // El modal se actualizará automáticamente con los eventos
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('networkStatusModal')).hide();
            }, 1000);
        } catch (error) {
            console.error('[NetworkStatus] Error reintentando sincronización:', error);
            this.showNotification('danger', 'Error al reintentar sincronización');
        } finally {
            if (retryBtn) {
                retryBtn.disabled = false;
                retryBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Sincronizar Ahora';
            }
        }
    }

    /**
     * Obtiene la clase CSS según el estado
     */
    getStatusClass() {
        if (this.isSyncing) return 'btn-warning';
        if (!this.isOnline) return 'btn-danger';
        if (this.pendingCount > 0) return 'btn-info';
        return 'btn-success';
    }

    /**
     * Obtiene el texto según el estado
     */
    getStatusText() {
        if (this.isSyncing) return 'Sincronizando...';
        if (!this.isOnline) return 'Offline';
        if (this.pendingCount > 0) return `${this.pendingCount} Pendiente${this.pendingCount > 1 ? 's' : ''}`;
        return 'Online';
    }

    /**
     * Obtiene el icono según el estado
     */
    getStatusIcon() {
        if (this.isSyncing) return 'bi bi-arrow-repeat spinner-border spinner-border-sm';
        if (!this.isOnline) return 'bi bi-wifi-off';
        if (this.pendingCount > 0) return 'bi bi-cloud-arrow-up';
        return 'bi bi-wifi';
    }

    /**
     * Muestra una notificación toast
     */
    showNotification(type, message) {
        const toastEl = document.getElementById('networkStatusToast');
        const toastBody = document.getElementById('networkStatusToastBody');

        if (!toastEl || !toastBody) return;

        // Configurar estilo según tipo
        toastEl.className = 'toast';
        toastBody.className = `toast-body bg-${type} text-white`;
        toastBody.textContent = message;

        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }

    /**
     * Inyecta estilos CSS
     */
    injectStyles() {
        if (document.getElementById('network-status-styles')) return;

        const style = document.createElement('style');
        style.id = 'network-status-styles';
        style.textContent = `
            .network-status-widget {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }

            @media (max-width: 768px) {
                .network-status-widget {
                    top: 10px;
                    right: 10px;
                }
            }

            #network-status-btn {
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                transition: all 0.3s ease;
            }

            #network-status-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .spinner-border.spinner-border-sm {
                animation: spinner-border 0.75s linear infinite;
            }

            @keyframes spinner-border {
                to { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Destruye el componente y limpia recursos
     */
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.initialized = false;
    }
}

// Crear instancia singleton
const networkStatus = new NetworkStatusComponent();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('network-status')) {
            networkStatus.init();
        }
    });
} else {
    if (document.getElementById('network-status')) {
        networkStatus.init();
    }
}

export default networkStatus;

/**
 * Stores Page JavaScript - SIMPLIFICADO
 * SOLO GET y POST de tiendas
 */

// Variables globales
let stores = [];
let currentStoreId = null;
let storeModal = null;
let deleteModal = null;
let syncService = null;

// Inicialización cuando carga la página
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[Stores] 🚀 Inicializando página de tiendas...');

    // Inicializar servicio
    await initializeService();

    // Inicializar modales de Bootstrap
    storeModal = new bootstrap.Modal(document.getElementById('storeModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Cargar tiendas (GET)
    await loadStoresTable();

    // Event Listeners
    document.getElementById('btnSaveStore').addEventListener('click', saveStore);

    // Limpiar formulario cuando se cierra el modal
    document.getElementById('storeModal').addEventListener('hidden.bs.modal', function() {
        resetForm();
    });

    console.log('[Stores] ✅ Página inicializada correctamente');
});

/**
 * Inicializar servicio de sincronización
 */
async function initializeService() {
    try {
        console.log('[Stores] Inicializando Hybrid Sync Service...');

        if (!window.hybridSyncService) {
            throw new Error('Hybrid Sync Service no está disponible');
        }

        syncService = window.hybridSyncService;
        await syncService.initialize();

        // Callback cuando se complete auto-sync
        syncService.onSyncComplete = () => {
            console.log('[Stores] Auto-sync completado');
            showToast('Tiendas sincronizadas con el servidor', 'success');
            loadStoresTable(); // Recargar tabla
        };

        console.log('[Stores] ✅ Servicio inicializado');
    } catch (error) {
        console.error('[Stores] ❌ Error al inicializar servicio:', error);
        showToast('Error al inicializar el sistema', 'error');
    }
}

/**
 * Cargar tabla de tiendas
 * - Con internet: GET al backend + cachea en PouchDB
 * - Sin internet: Lee de PouchDB
 */
async function loadStoresTable() {
    const tableBody = document.getElementById('storesTableBody');

    // Mostrar estado de carga
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <i class="bi bi-arrow-repeat" style="font-size: 3rem;"></i>
                <p class="mt-2">Cargando tiendas...</p>
            </td>
        </tr>
    `;

    try {
        console.log('[Stores] 🏪 Cargando tiendas...');

        // GET tiendas (desde backend si hay internet, o desde caché)
        stores = await syncService.getAllStores();

        console.log(`[Stores] ✅ ${stores.length} tiendas obtenidas`);
        renderStoresTable();

    } catch (error) {
        console.error('[Stores] ❌ Error al cargar tiendas:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
                    <p class="mt-2">Error al cargar tiendas</p>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-outline-secondary mt-2" onclick="loadStoresTable()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Renderizar tabla de tiendas
 */
function renderStoresTable() {
    const tableBody = document.getElementById('storesTableBody');

    if (stores.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="bi bi-shop" style="font-size: 3rem;"></i>
                    <p class="mt-2">No hay tiendas registradas</p>
                    <p class="text-muted">Haz clic en "Agregar Tienda" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    stores.forEach(store => {
        const storeId = store._id;
        const displayName = store.name || 'Sin nombre';

        // Indicador si está pendiente de sincronización
        const isPending = store.syncPending === true;
        const syncBadge = isPending
            ? '<span class="badge bg-warning text-dark ms-1" title="Pendiente de sincronización">⏳</span>'
            : '';

        html += `
            <tr ${isPending ? 'style="opacity: 0.7;"' : ''}>
                <td>${escapeHtml(displayName)}${syncBadge}</td>
                <td>${escapeHtml(store.address)}</td>
                <td>${store.latitude}</td>
                <td>${store.longitude}</td>
                <td class="text-center">
                    <button class="btn btn-action btn-edit" onclick="editStore('${storeId}')" title="Editar" disabled>
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="deleteStore('${storeId}')" title="Eliminar" disabled>
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Guardar tienda (SOLO POST - crear nueva)
 */
async function saveStore() {
    const btnSave = document.getElementById('btnSaveStore');

    // Obtener datos del formulario
    const storeData = {
        name: document.getElementById('storeName').value.trim(),
        address: document.getElementById('storeAddress').value.trim(),
        latitude: parseFloat(document.getElementById('storeLat').value),
        longitude: parseFloat(document.getElementById('storeLng').value)
    };

    // Validaciones
    if (!storeData.name || !storeData.address) {
        showToast('Por favor completa todos los campos', 'error');
        return;
    }

    if (isNaN(storeData.latitude) || isNaN(storeData.longitude)) {
        showToast('Las coordenadas deben ser números válidos', 'error');
        return;
    }

    // Deshabilitar botón mientras se procesa
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Guardando...';

    try {
        console.log('[Stores] ➕ Guardando tienda:', storeData);

        // POST al backend (o guardar offline si no hay conexión)
        const result = await syncService.createStore(storeData);

        if (result.success) {
            if (result.offline) {
                showToast('⚠️ Tienda guardada localmente (se sincronizará cuando haya conexión)', 'warning');
            } else {
                showToast('✅ Tienda guardada exitosamente', 'success');
            }

            // Recargar tabla
            await loadStoresTable();

            // Cerrar modal
            storeModal.hide();
        } else {
            throw new Error('Error al guardar tienda');
        }

    } catch (error) {
        console.error('[Stores] ❌ Error al guardar tienda:', error);
        showToast('Error al guardar tienda: ' + error.message, 'error');
    } finally {
        // Rehabilitar botón
        btnSave.disabled = false;
        btnSave.innerHTML = 'Guardar';
    }
}

/**
 * Resetear formulario
 */
function resetForm() {
    const storeForm = document.getElementById('storeForm');
    if (storeForm) {
        storeForm.reset();
    }

    const storeUuid = document.getElementById('storeUuid');
    if (storeUuid) {
        storeUuid.value = '';
    }

    const storeModalLabel = document.getElementById('storeModalLabel');
    if (storeModalLabel) {
        storeModalLabel.innerText = 'Agregar Tienda';
    }

    currentStoreId = null;
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Mostrar mensaje toast
 */
function showToast(message, type = 'info') {
    // Crear contenedor si no existe
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        document.body.appendChild(toastContainer);
    }

    // Determinar color
    const bgClass = type === 'success' ? 'bg-success' :
                    type === 'error' ? 'bg-danger' :
                    type === 'warning' ? 'bg-warning text-dark' : 'bg-info';

    // Crear toast
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
    toast.show();

    // Eliminar después de ocultar
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Funciones placeholders para editar/eliminar (NO IMPLEMENTADAS AÚN)
function editStore(id) {
    showToast('Editar tienda aún no implementado', 'info');
}

function deleteStore(id) {
    showToast('Eliminar tienda aún no implementado', 'info');
}

// Hacer funciones accesibles globalmente
window.loadStoresTable = loadStoresTable;
window.editStore = editStore;
window.deleteStore = deleteStore;

console.log('[Stores] 🏪 Módulo de tiendas cargado (SIMPLIFICADO - Solo GET y POST)');

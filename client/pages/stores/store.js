/**
 * Stores Page JavaScript
 * Operaciones: GET, POST, PUT, DELETE (CREATE, READ, UPDATE, DELETE)
 * Soporte completo offline/online con Hybrid Sync Service
 */

// Variables globales
let stores = [];
let currentStoreId = null;
let storeModal = null;
let deleteModal = null;
let assignModal = null;
let assignProductsModal = null;
let storeDetailsModal = null;
let syncService = null;
let cachedProducts = [];
let selectedProductUuids = new Set();
let currentQrObjectUrl = null;

// Inicialización cuando carga la página
document.addEventListener('DOMContentLoaded', async function () {
    console.log('[Stores] 🚀 Inicializando página de tiendas...');

    // Inicializar servicio
    await initializeService();

    // Inicializar modales de Bootstrap
    storeModal = new bootstrap.Modal(document.getElementById('storeModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    assignModal = new bootstrap.Modal(document.getElementById('assignModal'));
    assignProductsModal = new bootstrap.Modal(document.getElementById('assignProductsModal'));
    storeDetailsModal = new bootstrap.Modal(document.getElementById('storeDetailsModal'));

    // Cargar tiendas (GET)
    await loadStoresTable();

    // Event Listeners
    document.getElementById('btnSaveStore').addEventListener('click', saveStore);
    document.getElementById('btnSaveAssignment').addEventListener('click', saveAssignment);
    document.getElementById('btnSaveProductAssignment').addEventListener('click', saveProductAssignment);

    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);

    // Limpiar formulario cuando se cierra el modal
    document.getElementById('storeModal').addEventListener('hidden.bs.modal', function () {
        resetForm();
    });
    document.getElementById('assignProductsModal').addEventListener('hidden.bs.modal', resetProductAssignmentModal);
    document.getElementById('storeDetailsModal').addEventListener('hidden.bs.modal', () => {
        if (currentQrObjectUrl) {
            URL.revokeObjectURL(currentQrObjectUrl);
            currentQrObjectUrl = null;
        }
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
        window.stores = stores; // Actualizar referencia global

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

        // El ID puede ser uuid (del backend) o _id (de PouchDB)
        const storeId = store.uuid || store._id;

        const displayName = store.name || 'Sin nombre';

        // Indicador si está pendiente de sincronización
        const isPending = store.syncPending === true;
        const syncBadge = isPending
            ? '<span class="badge bg-warning text-dark ms-1" title="Pendiente de sincronización">Pendiente</span>'
            : '';

        html += `
            <tr ${isPending ? 'style="opacity: 0.7;"' : ''}>
                <td>${escapeHtml(displayName)}${syncBadge}</td>
                <td>${escapeHtml(store.address)}</td>
                <td>${store.latitude}</td>
                <td>${store.longitude}</td>
                <td class="text-center">
                    <button class="btn btn-action btn-edit" onclick="editStore('${storeId}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="deleteStore('${storeId}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                    <button class="btn btn-action btn-primary" onclick='showStoreDetails("${storeId}")' title="Ver detalles y QR">
                        <i class="bi bi-qr-code"></i>
                    </button>
                    <button class="btn btn-action btn-secondary" onclick='assignProductsToStore("${storeId}")' title="Asignar Productos">
                        <i class="bi bi-boxes"></i>
                    </button>
                    <button class="btn btn-action btn-info" onclick='assignDriver("${storeId}")' title="Asignar Repartidor">
                        <i class="bi bi-person-plus"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Guardar tienda (POST para crear, PUT para editar)
 */
async function saveStore() {
    const btnSave = document.getElementById('btnSaveStore');
    const isEditing = currentStoreId !== null;

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
        let result;

        if (isEditing) {
            // PUT - Actualizar tienda existente
            console.log('[Stores] ✏️ Actualizando tienda:', currentStoreId, storeData);
            result = await updateStore(currentStoreId, storeData);
        } else {
            // POST - Crear nueva tienda
            console.log('[Stores] ➕ Creando tienda:', storeData);
            result = await syncService.createStore(storeData);
        }

        if (result.success) {
            // Mostrar mensaje apropiado según si fue online u offline
            if (result.offline) {
                // showToast(
                //     isEditing
                //         ? '⚠️ Tienda actualizada localmente (se sincronizará cuando haya conexión)'
                //         : '⚠️ Tienda creada localmente (se sincronizará cuando haya conexión)',
                //     'warning'
                // );
            } else {
                showToast(
                    isEditing ? 'Tienda actualizada exitosamente' : 'Tienda creada exitosamente',
                    'success'
                );
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

async function assignDriver(storeId) {
    // Imprimir en consola
    console.log(`[Stores] Asignar repartidor a tienda ID: ${storeId}`);

    currentStoreId = storeId;
    const select = document.getElementById('driverSelect');

    // Mostrar estado de carga
    select.innerHTML = '<option value="">Cargando repartidores...</option>';
    select.disabled = true;

    assignModal.show();

    try {
        // Obtener usuarios desde el servicio
        const users = await syncService.getAllUsers();

        // Filtrar solo usuarios con rol 'USER' (repartidores)
        // const drivers = users.filter(user => user.role === 'USER');

        // Poblar select
        select.innerHTML = '<option value="">Seleccione un repartidor...</option>';

        if (users.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay repartidores disponibles</option>';
        } else {
            users.forEach(driver => {
                // Usar uuid como valor
                select.innerHTML += `<option value="${driver.uuid}">${driver.name} ${driver.lastname || ''}</option>`;
            });
        }
    } catch (error) {
        console.error('[Stores] Error al cargar repartidores:', error);
        select.innerHTML = '<option value="">Error al cargar</option>';
        showToast('Error al cargar lista de repartidores', 'error');
    } finally {
        select.disabled = false;
    }
}

async function saveAssignment() {
    const driverId = document.getElementById('driverSelect').value;
    const btnSave = document.getElementById('btnSaveAssignment');

    if (!driverId) {
        showToast('Por favor seleccione un repartidor', 'error');
        return;
    }

    // Obtener nombre del repartidor seleccionado para el mensaje
    const select = document.getElementById('driverSelect');
    const driverName = select.options[select.selectedIndex].text;

    // Deshabilitar botón
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Asignando...';

    try {
        console.log(`[Stores] Asignando repartidor ${driverName} (${driverId}) a tienda ${currentStoreId}`);

        // Llamada al servicio de sincronización
        const result = await syncService.assignDriver(driverId, currentStoreId);

        if (result.success) {
            if (result.offline) {
                showToast('⚠️ Asignación guardada localmente (se sincronizará cuando haya conexión)', 'warning');
            } else {
                showToast(`✅ Repartidor ${driverName} asignado correctamente`, 'success');
            }
            assignModal.hide();
        } else {
            throw new Error('Error al asignar repartidor');
        }
    } catch (error) {
        console.error('[Stores] ❌ Error al asignar:', error);
        showToast('Error al asignar repartidor: ' + error.message, 'error');
    } finally {
        // Rehabilitar botón
        btnSave.disabled = false;
        btnSave.innerHTML = 'Asignar';
    }
}

async function assignProductsToStore(storeId) {
    console.log(`[Stores] 📦 Asignar productos a tienda ID: ${storeId}`);
    currentStoreId = storeId;
    selectedProductUuids.clear();
    updateProductSelectionCount();

    const listContainer = document.getElementById('productAssignmentList');
    listContainer.innerHTML = `
        <div class="text-center text-muted py-3">
            <i class="bi bi-arrow-repeat me-2"></i>Cargando productos...
        </div>
    `;

    assignProductsModal.show();

    try {
        cachedProducts = await syncService.getAllProducts();
        const usableProducts = (cachedProducts || []).filter(p => p && p.uuid);
        renderProductChecklist(usableProducts);
    } catch (error) {
        console.error('[Stores] ❌ Error al cargar productos:', error);
        listContainer.innerHTML = `
            <div class="alert alert-danger mb-0">
                Error al cargar productos. Intenta nuevamente.
            </div>
        `;
        showToast('Error al cargar productos', 'error');
    }
}

function renderProductChecklist(products) {
    const listContainer = document.getElementById('productAssignmentList');

    if (!products || products.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                No hay productos disponibles para asignar.
            </div>
        `;
        return;
    }

    const sortedProducts = [...products].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    listContainer.innerHTML = sortedProducts.map(product => {
        const productUuid = product.uuid;
        const description = product.description
            ? `<small class="text-muted d-block">${escapeHtml(product.description)}</small>`
            : '';
        return `
            <div class="form-check product-item">
                <input class="form-check-input product-checkbox" type="checkbox" value="${productUuid}" id="product-${productUuid}">
                <label class="form-check-label" for="product-${productUuid}">
                    ${escapeHtml(product.name || 'Producto sin nombre')}
                    ${description}
                </label>
            </div>
        `;
    }).join('');

    listContainer.querySelectorAll('.product-checkbox').forEach(input => {
        input.addEventListener('change', handleProductCheckboxChange);
    });
}

function handleProductCheckboxChange(event) {
    const { value, checked } = event.target;
    if (!value) return;

    if (checked) {
        selectedProductUuids.add(value);
    } else {
        selectedProductUuids.delete(value);
    }

    updateProductSelectionCount();
}

function updateProductSelectionCount() {
    const label = document.getElementById('productSelectionCount');
    if (!label) return;
    const count = selectedProductUuids.size;
    const suffix = count === 1 ? '' : 's';
    label.textContent = `${count} producto${suffix} seleccionado${suffix}`;
}

function resetProductAssignmentModal() {
    selectedProductUuids.clear();
    updateProductSelectionCount();
    const listContainer = document.getElementById('productAssignmentList');
    if (listContainer) {
        listContainer.innerHTML = `
            <div class="text-center text-muted">
                Selecciona una tienda para cargar productos.
            </div>
        `;
    }
}

async function saveProductAssignment() {
    const btnSave = document.getElementById('btnSaveProductAssignment');

    if (!currentStoreId) {
        showToast('Selecciona una tienda válida', 'error');
        return;
    }

    const selectedProducts = Array.from(selectedProductUuids);
    if (selectedProducts.length === 0) {
        showToast('Selecciona al menos un producto', 'error');
        return;
    }

    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Asignando...';

    try {
        console.log(
            `[Stores] 📦 Asignando ${selectedProducts.length} productos a tienda ${currentStoreId}`,
        );

        const result = await syncService.assignProductsToStore(currentStoreId, selectedProducts);

        if (result.success) {
            if (result.offline) {
                showToast('Asignación guardada localmente (se sincronizará al volver la conexión)', 'warning');
            } else {
                showToast('Productos asignados correctamente', 'success');
            }
            assignProductsModal.hide();
        } else {
            throw new Error('Error al asignar productos');
        }
    } catch (error) {
        console.error('[Stores] ❌ Error al asignar productos:', error);
        showToast('Error al asignar productos: ' + error.message, 'error');
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = 'Asignar';
    }
}

async function showStoreDetails(storeId) {
    const store = stores.find(s => s.uuid === storeId || s._id === storeId);

    if (!store) {
        showToast('Tienda no encontrada', 'error');
        return;
    }

    document.getElementById('detailStoreName').textContent = store.name || 'Sin nombre';
    document.getElementById('detailStoreAddress').textContent = store.address || 'Sin dirección';
    document.getElementById('detailStoreCoords').textContent =
        `${store.latitude ?? '-'}, ${store.longitude ?? '-'}`;

    const qrImg = document.getElementById('storeQrImage');
    const qrPlaceholder = document.getElementById('storeQrPlaceholder');
    qrImg.classList.add('d-none');
    qrPlaceholder.classList.remove('d-none');

    if (currentQrObjectUrl) {
        URL.revokeObjectURL(currentQrObjectUrl);
        currentQrObjectUrl = null;
    }

    const qrUrl = resolveQrUrl(store.qrCode);

    if (qrUrl && navigator.onLine) {
        try {
            const securedQrUrl = await fetchQrImageWithAuth(qrUrl);
            if (securedQrUrl) {
                qrImg.src = securedQrUrl;
                qrImg.alt = `QR de ${store.name || 'tienda'}`;
                qrImg.classList.remove('d-none');
                qrPlaceholder.classList.add('d-none');
                currentQrObjectUrl = securedQrUrl;
            }
        } catch (error) {
            console.error('[Stores] ❌ Error al cargar el QR:', error);
            qrImg.classList.add('d-none');
            qrPlaceholder.classList.remove('d-none');
        }
    }

    const productList = document.getElementById('storeProductsList');
    const products = Array.isArray(store.products) ? store.products : [];

    if (products.length === 0) {
        productList.innerHTML = '<li class="list-group-item text-muted">Sin productos asignados</li>';
    } else {
        productList.innerHTML = products
            .map(product => `
                <li class="list-group-item">
                    <strong>${escapeHtml(product.name || 'Producto')}</strong>
                    ${product.description ? `<br><small class="text-muted">${escapeHtml(product.description)}</small>` : ''}
                </li>
            `)
            .join('');
    }

    storeDetailsModal.show();
}

function resolveQrUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    const base = window.API_BASE_URL || window.location.origin;
    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}

async function fetchQrImageWithAuth(url) {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(url, {
        headers,
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}


/**
 * Actualizar tienda existente (PUT)
 * - Con internet: PUT al backend + cachea en PouchDB
 * - Sin internet: Actualiza en PouchDB con flag pendiente
 */
async function updateStore(uuid, storeData) {
    try {
        console.log('[Stores] ✏️ Actualizando tienda:', uuid, storeData);

        // Usar Hybrid Sync Service para manejar online/offline
        const result = await syncService.updateStore(uuid, storeData);

        if (result.success) {
            console.log('[Stores] ✅ Tienda actualizada exitosamente');
            return result;
        } else {
            throw new Error('Error al actualizar tienda');
        }

    } catch (error) {
        console.error('[Stores] ❌ Error al actualizar tienda:', error);
        throw error;
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
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}

/**
 * Abrir modal para editar tienda
 * Carga los datos actuales de la tienda en el formulario
 */
function editStore(id) {
    console.log('[Stores] ✏️ Editando tienda:', id);

    // Buscar la tienda por uuid o _id
    const store = stores.find(s => (s.uuid === id || s._id === id));

    if (!store) {
        showToast('Tienda no encontrada', 'error');
        return;
    }

    // Guardar el ID para saber que estamos editando
    currentStoreId = id;

    // Cambiar el título del modal
    document.getElementById('storeModalLabel').textContent = 'Editar Tienda';

    // Cargar datos en el formulario
    document.getElementById('storeUuid').value = id;
    document.getElementById('storeName').value = store.name || '';
    document.getElementById('storeAddress').value = store.address || '';
    document.getElementById('storeLat').value = store.latitude || '';
    document.getElementById('storeLng').value = store.longitude || '';

    // Mostrar el modal
    storeModal.show();
}

/**
 * Abrir modal de confirmación para eliminar tienda
 */
function deleteStore(storeId) {
    console.log('[Stores] 🗑️ Preparando eliminación de tienda:', storeId);

    // Buscar la tienda por uuid o _id
    const store = stores.find(s => (s.uuid === storeId || s._id === storeId));

    if (!store) {
        showToast('Tienda no encontrada', 'error');
        return;
    }

    // Guardar el ID de la tienda a eliminar
    currentStoreId = storeId;

    // Mostrar el nombre de la tienda en el modal
    document.getElementById('deleteStoreName').textContent = store.name;

    // Mostrar modal de confirmación
    deleteModal.show();
}

/**
 * Confirmar y ejecutar eliminación de tienda
 */
async function confirmDelete() {
    if (!currentStoreId) {
        showToast('No hay tienda seleccionada', 'error');
        return;
    }

    const btnDelete = document.getElementById('btnConfirmDelete');

    // Deshabilitar botón mientras se procesa
    btnDelete.disabled = true;
    btnDelete.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Eliminando...';

    try {
        console.log('[Stores] 🗑️ Eliminando tienda:', currentStoreId);

        // DELETE (online o marcar para eliminar offline)
        const result = await syncService.deleteStore(currentStoreId);

        if (result.success) {
            if (result.offline) {
                //showToast('⚠️ Tienda marcada para eliminar (se sincronizará cuando haya conexión)', 'warning');
            } else {
                showToast('Tienda eliminada exitosamente', 'success');
            }

            // Recargar tabla
            await loadStoresTable();

            // Cerrar modal
            deleteModal.hide();
        } else {
            throw new Error('Error al eliminar tienda');
        }

    } catch (error) {
        console.error('[Stores] ❌ Error al eliminar tienda:', error);
        showToast('Error al eliminar tienda: ' + error.message, 'error');
    } finally {
        // Rehabilitar botón
        btnDelete.disabled = false;
        btnDelete.innerHTML = 'Eliminar';
        currentStoreId = null;
    }
}

// Hacer funciones y variables accesibles globalmente
window.loadStoresTable = loadStoresTable;
window.editStore = editStore;
window.deleteStore = deleteStore;
window.assignDriver = assignDriver;
window.assignProductsToStore = assignProductsToStore;
window.showStoreDetails = showStoreDetails;
window.stores = stores; // Para debugging

console.log('[Stores] 🏪 Módulo de tiendas cargado (GET, POST, PUT, DELETE) con soporte offline/online');

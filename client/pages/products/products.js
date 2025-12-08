/**
 * Products Page JavaScript - SIMPLIFICADO
 * SOLO GET y POST de productos
 */

// Variables globales
let products = [];
let currentProductId = null;
let productModal = null;
let deleteModal = null;
let syncService = null;

// Inicialización cuando carga la página
document.addEventListener('DOMContentLoaded', async function() {
    console.log('[Products] 🚀 Inicializando página de productos...');

    // Inicializar servicio
    await initializeService();

    // Inicializar modales de Bootstrap
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Cargar productos (GET)
    await loadProductsTable();

    // Event Listeners
    document.getElementById('btnAddProduct').addEventListener('click', openAddProductModal);
    document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);

    // Limpiar formulario cuando se cierra el modal
    document.getElementById('productModal').addEventListener('hidden.bs.modal', function() {
        resetForm();
    });

    console.log('[Products] ✅ Página inicializada correctamente');
});

/**
 * Inicializar servicio de sincronización
 */
async function initializeService() {
    try {
        console.log('[Products] Inicializando Hybrid Sync Service...');

        if (!window.hybridSyncService) {
            throw new Error('Hybrid Sync Service no está disponible');
        }

        syncService = window.hybridSyncService;
        await syncService.initialize();

        // Callback cuando se complete auto-sync
        syncService.onSyncComplete = (count) => {
            console.log('[Products] Auto-sync completado');
            showToast('Productos sincronizados con el servidor', 'success');
            loadProductsTable(); // Recargar tabla
        };

        console.log('[Products] ✅ Servicio inicializado');
    } catch (error) {
        console.error('[Products] ❌ Error al inicializar servicio:', error);
        showToast('Error al inicializar el sistema', 'error');
    }
}

/**
 * Cargar tabla de productos
 * - Con internet: GET al backend + cachea en PouchDB
 * - Sin internet: Lee de PouchDB
 */
async function loadProductsTable() {
    const tableBody = document.getElementById('productsTableBody');

    // Mostrar estado de carga
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-state">
                <i class="bi bi-arrow-repeat" style="font-size: 3rem;"></i>
                <p class="mt-2">Cargando productos...</p>
            </td>
        </tr>
    `;

    try {
        console.log('[Products] 📦 Cargando productos...');

        // GET productos (desde backend si hay internet, o desde caché)
        products = await syncService.getAllProducts();

        console.log(`[Products] ✅ ${products.length} productos obtenidos`);
        renderProductsTable();

    } catch (error) {
        console.error('[Products] ❌ Error al cargar productos:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
                    <p class="mt-2">Error al cargar productos</p>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-outline-secondary mt-2" onclick="loadProductsTable()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Renderizar tabla de productos
 */
function renderProductsTable() {
    const tableBody = document.getElementById('productsTableBody');

    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="bi bi-box-seam" style="font-size: 3rem;"></i>
                    <p class="mt-2">No hay productos registrados</p>
                    <p class="text-muted">Haz clic en "Agregar Producto" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    products.forEach(product => {
        const productId = product._id;
        const displayId = product.uuid || productId;
        const shortId = displayId.substring(0, 8);

        // Indicador si está pendiente de sincronización
        const isPending = product.syncPending === true;
        const syncBadge = isPending
            ? '<span class="badge bg-warning text-dark ms-1" title="Pendiente de sincronización">⏳</span>'
            : '';

        html += `
            <tr ${isPending ? 'style="opacity: 0.7;"' : ''}>
                <td title="${displayId}">${escapeHtml(shortId)}...${syncBadge}</td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.description)}</td>
                <td>$${parseFloat(product.basePrice).toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-action btn-edit" onclick="editProduct('${productId}')" title="Editar" disabled>
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="deleteProduct('${productId}')" title="Eliminar" disabled>
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Abrir modal para agregar producto
 */
function openAddProductModal() {
    currentProductId = null;
    document.getElementById('productModalLabel').textContent = 'Agregar Producto';
    resetForm();
    productModal.show();
}

/**
 * Guardar producto (SOLO POST - crear nuevo)
 */
async function saveProduct() {
    const form = document.getElementById('productForm');
    const btnSave = document.getElementById('btnSaveProduct');

    // Validar formulario
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Obtener datos del formulario
    const productData = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        basePrice: parseFloat(document.getElementById('productPrice').value)
    };

    // Validar precio
    if (isNaN(productData.basePrice) || productData.basePrice < 0) {
        showToast('El precio debe ser un número válido', 'error');
        return;
    }

    // Deshabilitar botón mientras se procesa
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Guardando...';

    try {
        console.log('[Products] ➕ Guardando producto:', productData);

        // POST al backend (o guardar offline si no hay conexión)
        const result = await syncService.createProduct(productData);

        if (result.success) {
            if (result.offline) {
                showToast('⚠️ Producto guardado localmente (se sincronizará cuando haya conexión)', 'warning');
            } else {
                showToast('✅ Producto guardado exitosamente', 'success');
            }

            // Recargar tabla
            await loadProductsTable();

            // Cerrar modal
            productModal.hide();
        } else {
            throw new Error('Error al guardar producto');
        }

    } catch (error) {
        console.error('[Products] ❌ Error al guardar producto:', error);
        showToast('Error al guardar producto: ' + error.message, 'error');
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
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    currentProductId = null;
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
function editProduct(id) {
    showToast('Editar producto aún no implementado', 'info');
}

function deleteProduct(id) {
    showToast('Eliminar producto aún no implementado', 'info');
}

// Hacer funciones accesibles globalmente
window.loadProductsTable = loadProductsTable;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

console.log('[Products] 📦 Módulo de productos cargado (SIMPLIFICADO - Solo GET y POST)');

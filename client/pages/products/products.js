/**
 * Products Page JavaScript
 * Operaciones: GET, POST, PUT, DELETE (CREATE, UPDATE, DELETE)
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
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);

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
        window.products = products; // Actualizar referencia global

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
        // El ID puede ser uuid (del backend) o _id (de PouchDB)
        const productId = product.uuid || product._id;
        const displayId = productId;
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
                    <button class="btn btn-action btn-edit" onclick="editProduct('${productId}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="deleteProduct('${productId}')" title="Eliminar">
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
 * Editar producto existente
 */
async function editProduct(productId) {
    console.log('[Products] ✏️ Editando producto:', productId);
    console.log('[Products] 📊 Total productos en array:', products.length);

    // Buscar el producto por uuid o _id
    const product = products.find(p => (p.uuid === productId || p._id === productId));

    if (!product) {
        console.error('[Products] ❌ Producto no encontrado. Buscando:', productId);
        console.error('[Products] 📦 Productos disponibles:', products);
        showToast('Producto no encontrado', 'error');
        return;
    }

    console.log('[Products] ✅ Producto encontrado:', product);

    // Cargar datos en el formulario
    currentProductId = productId;
    document.getElementById('productModalLabel').textContent = 'Editar Producto';
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.basePrice || '';

    // Mostrar modal
    productModal.show();
}

/**
 * Guardar producto (CREATE o UPDATE)
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
        let result;

        if (currentProductId) {
            // EDITAR producto existente (PUT)
            console.log('[Products] ✏️ Actualizando producto:', currentProductId, productData);

            // currentProductId ya es el uuid del producto
            result = await syncService.updateProduct(currentProductId, productData);

            if (result.success) {
                if (result.offline) {
                    showToast('⚠️ Producto actualizado localmente (se sincronizará cuando haya conexión)', 'warning');
                } else {
                    showToast('✅ Producto actualizado exitosamente', 'success');
                }
            }

        } else {
            // CREAR nuevo producto (POST)
            console.log('[Products] ➕ Creando producto:', productData);

            result = await syncService.createProduct(productData);

            if (result.success) {
                if (result.offline) {
                    showToast('⚠️ Producto guardado localmente (se sincronizará cuando haya conexión)', 'warning');
                } else {
                    showToast('✅ Producto guardado exitosamente', 'success');
                }
            }
        }

        if (result.success) {
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

/**
 * Abrir modal de confirmación para eliminar producto
 */
function deleteProduct(productId) {
    console.log('[Products] 🗑️ Preparando eliminación de producto:', productId);

    // Buscar el producto por uuid o _id
    const product = products.find(p => (p.uuid === productId || p._id === productId));

    if (!product) {
        showToast('Producto no encontrado', 'error');
        return;
    }

    // Guardar el ID del producto a eliminar
    currentProductId = productId;

    // Mostrar el nombre del producto en el modal
    document.getElementById('deleteProductName').textContent = product.name;

    // Mostrar modal de confirmación
    deleteModal.show();
}

/**
 * Confirmar y ejecutar eliminación de producto
 */
async function confirmDelete() {
    if (!currentProductId) {
        showToast('No hay producto seleccionado', 'error');
        return;
    }

    const btnDelete = document.getElementById('btnConfirmDelete');

    // Deshabilitar botón mientras se procesa
    btnDelete.disabled = true;
    btnDelete.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Eliminando...';

    try {
        console.log('[Products] 🗑️ Eliminando producto:', currentProductId);

        // DELETE (online o marcar para eliminar offline)
        const result = await syncService.deleteProduct(currentProductId);

        if (result.success) {
            if (result.offline) {
                showToast('⚠️ Producto marcado para eliminar (se sincronizará cuando haya conexión)', 'warning');
            } else {
                showToast('✅ Producto eliminado exitosamente', 'success');
            }

            // Recargar tabla
            await loadProductsTable();

            // Cerrar modal
            deleteModal.hide();
        } else {
            throw new Error('Error al eliminar producto');
        }

    } catch (error) {
        console.error('[Products] ❌ Error al eliminar producto:', error);
        showToast('Error al eliminar producto: ' + error.message, 'error');
    } finally {
        // Rehabilitar botón
        btnDelete.disabled = false;
        btnDelete.innerHTML = 'Eliminar';
        currentProductId = null;
    }
}

// Hacer funciones y variables accesibles globalmente
window.loadProductsTable = loadProductsTable;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.products = products; // Para debugging

console.log('[Products] 📦 Módulo de productos cargado (GET, POST, PUT, DELETE - CRUD completo)');

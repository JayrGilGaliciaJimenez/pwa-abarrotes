/**
 * Products Page JavaScript
 * Maneja el CRUD de productos conectado al backend
 */

// URL base de la API
const API_BASE_URL = 'http://localhost:82/api/v1/products';

/**
 * Obtiene los headers con el token de autenticación
 * @returns {Object} Headers para las peticiones
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Variables globales
let products = [];
let currentProductUuid = null;
let productModal = null;
let deleteModal = null;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar modales de Bootstrap
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Cargar la tabla de productos desde el servidor
    loadProductsTable();

    // Event Listeners
    document.getElementById('btnAddProduct').addEventListener('click', openAddProductModal);
    document.getElementById('btnSaveProduct').addEventListener('click', saveProduct);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);

    // Limpiar el formulario cuando se cierra el modal
    document.getElementById('productModal').addEventListener('hidden.bs.modal', function() {
        resetForm();
    });
});

/**
 * Carga la tabla de productos desde el servidor
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
        const response = await fetch(API_BASE_URL, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        products = data.data || data || [];

        renderProductsTable();
    } catch (error) {
        console.error('Error al cargar productos:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
                    <p class="mt-2">Error al cargar los productos</p>
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
 * Renderiza la tabla de productos
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
        html += `
            <tr>
                <td title="${product.uuid}">${product.uuid.substring(0, 8)}...</td>
                <td>${escapeHtml(product.name)}</td>
                <td>${escapeHtml(product.description)}</td>
                <td>$${product.basePrice.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-action btn-edit" onclick="openEditProductModal('${product.uuid}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="openDeleteModal('${product.uuid}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Abre el modal para agregar un nuevo producto
 */
function openAddProductModal() {
    currentProductUuid = null;
    document.getElementById('productModalLabel').textContent = 'Agregar Producto';
    resetForm();
}

/**
 * Abre el modal para editar un producto existente
 * @param {string} uuid - UUID del producto a editar
 */
function openEditProductModal(uuid) {
    currentProductUuid = uuid;
    const product = products.find(p => p.uuid === uuid);

    if (!product) {
        showToast('Producto no encontrado', 'error');
        return;
    }

    // Cambiar el título del modal
    document.getElementById('productModalLabel').textContent = 'Editar Producto';

    // Llenar el formulario con los datos del producto
    document.getElementById('productId').value = product.uuid;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.basePrice;

    // Abrir el modal
    productModal.show();
}

/**
 * Guarda el producto (crear o editar)
 */
async function saveProduct() {
    const form = document.getElementById('productForm');
    const btnSave = document.getElementById('btnSaveProduct');

    // Validar el formulario
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Obtener los valores del formulario
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const basePrice = parseFloat(document.getElementById('productPrice').value);

    // Deshabilitar botón mientras se procesa
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Guardando...';

    try {
        let response;
        const productData = { name, description, basePrice };

        if (currentProductUuid === null) {
            // Crear nuevo producto
            response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(productData)
            });
        } else {
            // Editar producto existente
            response = await fetch(`${API_BASE_URL}/${currentProductUuid}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(productData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        // Recargar la tabla
        await loadProductsTable();

        // Cerrar el modal
        productModal.hide();

        // Mostrar mensaje de éxito
        showToast(currentProductUuid === null ? 'Producto agregado exitosamente' : 'Producto actualizado exitosamente', 'success');
    } catch (error) {
        console.error('Error al guardar producto:', error);
        showToast(`Error al guardar: ${error.message}`, 'error');
    } finally {
        // Rehabilitar botón
        btnSave.disabled = false;
        btnSave.innerHTML = 'Guardar';
    }
}

/**
 * Abre el modal de confirmación para eliminar un producto
 * @param {string} uuid - UUID del producto a eliminar
 */
function openDeleteModal(uuid) {
    const product = products.find(p => p.uuid === uuid);

    if (!product) {
        showToast('Producto no encontrado', 'error');
        return;
    }

    currentProductUuid = uuid;
    document.getElementById('deleteProductName').textContent = product.name;
    deleteModal.show();
}

/**
 * Confirma y ejecuta la eliminación del producto
 */
async function confirmDelete() {
    if (!currentProductUuid) return;

    const btnDelete = document.getElementById('btnConfirmDelete');

    // Deshabilitar botón mientras se procesa
    btnDelete.disabled = true;
    btnDelete.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Eliminando...';

    try {
        const response = await fetch(`${API_BASE_URL}/${currentProductUuid}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        }

        // Recargar la tabla
        await loadProductsTable();

        // Cerrar el modal
        deleteModal.hide();

        // Mostrar mensaje de éxito
        showToast('Producto eliminado exitosamente', 'success');
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        showToast(`Error al eliminar: ${error.message}`, 'error');
    } finally {
        // Rehabilitar botón
        btnDelete.disabled = false;
        btnDelete.innerHTML = 'Eliminar';
        currentProductUuid = null;
    }
}

/**
 * Resetea el formulario del producto
 */
function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    currentProductUuid = null;
}

/**
 * Muestra un mensaje toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje ('success', 'error', 'info')
 */
function showToast(message, type = 'info') {
    // Crear contenedor de toasts si no existe
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        document.body.appendChild(toastContainer);
    }

    // Determinar color según el tipo
    const bgClass = type === 'success' ? 'bg-success' :
                    type === 'error' ? 'bg-danger' : 'bg-info';

    // Crear el toast
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    // Eliminar el elemento después de que se oculte
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

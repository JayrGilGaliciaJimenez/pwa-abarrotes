/**
 * Products Page JavaScript
 * Maneja el CRUD de productos con datos simulados
 */

// Datos simulados de productos
let products = [
    {
        id: 1,
        name: "Arroz 1kg",
        description: "Arroz blanco grano largo de primera calidad",
        price: 25.50
    },
    {
        id: 2,
        name: "Frijol Negro 1kg",
        description: "Frijol negro seleccionado, rico en proteínas",
        price: 32.00
    },
    {
        id: 3,
        name: "Aceite Vegetal 1L",
        description: "Aceite vegetal 100% puro para cocinar",
        price: 45.00
    },
    {
        id: 4,
        name: "Azúcar 1kg",
        description: "Azúcar refinada de caña",
        price: 22.50
    },
    {
        id: 5,
        name: "Sal de Mesa 1kg",
        description: "Sal refinada yodada para uso doméstico",
        price: 12.00
    },
    {
        id: 6,
        name: "Pasta Espagueti 500g",
        description: "Pasta de trigo durum de alta calidad",
        price: 18.50
    },
    {
        id: 7,
        name: "Harina de Trigo 1kg",
        description: "Harina de trigo refinada para todo uso",
        price: 28.00
    },
    {
        id: 8,
        name: "Leche Entera 1L",
        description: "Leche entera pasteurizada y homogeneizada",
        price: 24.50
    }
];

// Variables globales
let currentProductId = null;
let productModal = null;
let deleteModal = null;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar modales de Bootstrap
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Cargar la tabla de productos
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
 * Carga la tabla de productos dinámicamente
 */
function loadProductsTable() {
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
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.description}</td>
                <td>$${product.price.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-action btn-edit" onclick="openEditProductModal(${product.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="openDeleteModal(${product.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Abre el modal para agregar un nuevo producto
 */
function openAddProductModal() {
    currentProductId = null;
    document.getElementById('productModalLabel').textContent = 'Agregar Producto';
    resetForm();
}

/**
 * Abre el modal para editar un producto existente
 * @param {number} productId - ID del producto a editar
 */
function openEditProductModal(productId) {
    currentProductId = productId;
    const product = products.find(p => p.id === productId);

    if (!product) {
        alert('Producto no encontrado');
        return;
    }

    // Cambiar el título del modal
    document.getElementById('productModalLabel').textContent = 'Editar Producto';

    // Llenar el formulario con los datos del producto
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;

    // Abrir el modal
    productModal.show();
}

/**
 * Guarda el producto (crear o editar)
 */
function saveProduct() {
    const form = document.getElementById('productForm');

    // Validar el formulario
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Obtener los valores del formulario
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);

    if (currentProductId === null) {
        // Crear nuevo producto
        const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            name: name,
            description: description,
            price: price
        };
        products.push(newProduct);
        console.log('Producto creado:', newProduct);
    } else {
        // Editar producto existente
        const productIndex = products.findIndex(p => p.id === currentProductId);
        if (productIndex !== -1) {
            products[productIndex] = {
                ...products[productIndex],
                name: name,
                description: description,
                price: price
            };
            console.log('Producto actualizado:', products[productIndex]);
        }
    }

    // Recargar la tabla
    loadProductsTable();

    // Cerrar el modal
    productModal.hide();

    // Mostrar mensaje de éxito (opcional)
    showToast(currentProductId === null ? 'Producto agregado exitosamente' : 'Producto actualizado exitosamente');
}

/**
 * Abre el modal de confirmación para eliminar un producto
 * @param {number} productId - ID del producto a eliminar
 */
function openDeleteModal(productId) {
    const product = products.find(p => p.id === productId);

    if (!product) {
        alert('Producto no encontrado');
        return;
    }

    currentProductId = productId;
    document.getElementById('deleteProductName').textContent = product.name;
    deleteModal.show();
}

/**
 * Confirma y ejecuta la eliminación del producto
 */
function confirmDelete() {
    const productIndex = products.findIndex(p => p.id === currentProductId);

    if (productIndex !== -1) {
        const deletedProduct = products.splice(productIndex, 1)[0];
        console.log('Producto eliminado:', deletedProduct);

        // Recargar la tabla
        loadProductsTable();

        // Cerrar el modal
        deleteModal.hide();

        // Mostrar mensaje de éxito
        showToast('Producto eliminado exitosamente');
    }

    currentProductId = null;
}

/**
 * Resetea el formulario del producto
 */
function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    currentProductId = null;
}

/**
 * Muestra un mensaje toast (simulado con console.log)
 * @param {string} message - Mensaje a mostrar
 */
function showToast(message) {
    console.log('Toast:', message);
    // En producción, aquí se podría usar Bootstrap Toast o una librería de notificaciones
}

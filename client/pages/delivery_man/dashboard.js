/**
 * Dashboard del Repartidor
 * Muestra la información del repartidor y su ruta del día
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    const storesListContainer = document.getElementById('storesListContainer');
    const deliveryManNameElement = document.getElementById('deliveryManName');
    const logoutBtn = document.getElementById('logoutBtn');
    const messageArea = document.getElementById('messageArea');

    // Simulación de datos del repartidor (en producción vendrá de localStorage o API)
    const deliveryMan = {
        id: 1,
        name: 'Juan Pérez'
    };

    // Simulación de tiendas a visitar en la ruta del día
    const storesToVisit = [
        {
            id: 1,
            name: 'Abarrotes Don José',
            status: 'Pendiente',
            address: 'Calle Principal #123'
        },
        {
            id: 2,
            name: 'Tienda La Esquina',
            status: 'Pendiente',
            address: 'Av. Reforma #456'
        },
        {
            id: 3,
            name: 'Minisuper El Ahorro',
            status: 'Visitado',
            address: 'Col. Centro #789'
        },
        {
            id: 4,
            name: 'Abarrotes San Miguel',
            status: 'Pendiente',
            address: 'Calle Hidalgo #321'
        }
    ];

    /**
     * Inicializa el dashboard
     */
    function initDashboard() {
        // Mostrar nombre del repartidor
        deliveryManNameElement.textContent = deliveryMan.name;

        // Cargar lista de tiendas
        loadStoresList();
    }

    /**
     * Carga dinámicamente la lista de tiendas a visitar
     */
    function loadStoresList() {
        // Limpiar el contenedor
        storesListContainer.innerHTML = '';

        // Verificar si hay tiendas
        if (storesToVisit.length === 0) {
            storesListContainer.innerHTML = `
                <div class="list-group-item empty-state">
                    <p class="empty-state-text mb-0">No hay tiendas asignadas para hoy</p>
                </div>
            `;
            return;
        }

        // Crear elementos de la lista para cada tienda
        storesToVisit.forEach(function(store) {
            const listItem = createStoreListItem(store);
            storesListContainer.appendChild(listItem);
        });
    }

    /**
     * Crea un elemento de lista para una tienda
     * @param {object} store - Objeto con datos de la tienda
     * @returns {HTMLElement} - Elemento de lista creado
     */
    function createStoreListItem(store) {
        // Crear el contenedor del item
        const listItem = document.createElement('div');
        listItem.className = 'list-group-item';

        // Determinar el color del badge según el estado
        const badgeClass = store.status === 'Visitado' ? 'badge-completed' : 'badge-pending';
        const buttonDisabled = store.status === 'Visitado' ? 'disabled' : '';

        // Crear el contenido HTML
        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row">
                <div class="flex-grow-1 mb-3 mb-md-0">
                    <h6 class="store-name">${store.name}</h6>
                    <p class="store-address">${store.address}</p>
                    <span class="badge ${badgeClass}">${store.status}</span>
                </div>
                <div class="store-actions">
                    <button
                        class="btn btn-visit visit-btn"
                        data-store-id="${store.id}"
                        data-store-name="${store.name}"
                        ${buttonDisabled}
                    >
                        ${store.status === 'Visitado' ? 'Completado' : 'Iniciar Visita'}
                    </button>
                </div>
            </div>
        `;

        // Agregar evento al botón si no está visitado
        if (store.status !== 'Visitado') {
            const visitBtn = listItem.querySelector('.visit-btn');
            visitBtn.addEventListener('click', function() {
                handleVisitStore(store.id, store.name);
            });
        }

        return listItem;
    }

    /**
     * Maneja el evento de iniciar visita a una tienda
     * @param {number} storeId - ID de la tienda
     * @param {string} storeName - Nombre de la tienda
     */
    function handleVisitStore(storeId, storeName) {
        console.log(`Iniciando visita a tienda ID: ${storeId}, Nombre: ${storeName}`);

        // Aquí se redirigirá a la página de escaneo QR o captura de pedido
        showMessage(`Iniciando visita a: ${storeName}`, 'info');

        // TODO: Implementar redirección a página de QR Scanner o captura de pedido
        // window.location.href = `../qr-scanner/qr-scanner.html?storeId=${storeId}`;

        // Por ahora solo mostramos un mensaje
        setTimeout(function() {
            showMessage('Funcionalidad de QR/Pedido próximamente...', 'warning');
        }, 1500);
    }

    /**
     * Maneja el cierre de sesión
     */
    logoutBtn.addEventListener('click', function() {
        // Limpiar datos de sesión
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Mostrar mensaje y redirigir
        showMessage('Cerrando sesión...', 'info');

        setTimeout(function() {
            window.location.href = '../../index.html';
        }, 1000);
    });

    /**
     * Muestra un mensaje en el área de mensajes
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de alerta de Bootstrap (success, danger, warning, info)
     */
    function showMessage(message, type) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        messageArea.innerHTML = alertHTML;

        // Auto-ocultar después de 5 segundos
        setTimeout(function() {
            const alert = messageArea.querySelector('.alert');
            if (alert) {
                alert.classList.remove('show');
                setTimeout(function() {
                    messageArea.innerHTML = '';
                }, 150);
            }
        }, 5000);
    }

    // Inicializar el dashboard
    initDashboard();
});

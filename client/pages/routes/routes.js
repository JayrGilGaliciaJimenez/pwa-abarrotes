/**
 * Routes Page JavaScript
 * Maneja el CRUD de asignación de rutas con datos simulados
 */

// Datos simulados de repartidores
const drivers = [
    { id: 1, name: "Juan Pérez García" },
    { id: 2, name: "María López Hernández" },
    { id: 3, name: "Carlos Rodríguez Martínez" },
    { id: 4, name: "Ana González Ruiz" },
    { id: 5, name: "Pedro Sánchez Torres" }
];

// Datos simulados de tiendas
const stores = [
    { id: 1, name: "Abarrotes Don Pepe" },
    { id: 2, name: "Mini Super El Sol" },
    { id: 3, name: "Tienda La Esquina" },
    { id: 4, name: "Abarrotes Lupita" },
    { id: 5, name: "Super Express 24hrs" }
];

// Datos simulados de rutas
let routes = [
    {
        id: 1,
        driverId: 1,
        storeId: 1,
        date: "2024-12-04",
        time: "09:00",
        status: "pending"
    },
    {
        id: 2,
        driverId: 2,
        storeId: 3,
        date: "2024-12-04",
        time: "10:30",
        status: "in-progress"
    },
    {
        id: 3,
        driverId: 1,
        storeId: 2,
        date: "2024-12-04",
        time: "14:00",
        status: "completed"
    },
    {
        id: 4,
        driverId: 3,
        storeId: 5,
        date: "2024-12-05",
        time: "08:00",
        status: "pending"
    },
    {
        id: 5,
        driverId: 4,
        storeId: 4,
        date: "2024-12-03",
        time: "16:00",
        status: "cancelled"
    }
];

// Variables globales
let currentRouteId = null;
let routeModal = null;
let deleteModal = null;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar modales de Bootstrap
    routeModal = new bootstrap.Modal(document.getElementById('routeModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Cargar opciones de selects
    loadDriversSelect();
    loadStoresSelect();

    // Cargar la tabla de rutas
    loadRoutesTable();

    // Event Listeners
    document.getElementById('btnAddRoute').addEventListener('click', openAddRouteModal);
    document.getElementById('btnSaveRoute').addEventListener('click', saveRoute);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);

    // Limpiar el formulario cuando se cierra el modal
    document.getElementById('routeModal').addEventListener('hidden.bs.modal', function() {
        resetForm();
    });
});

/**
 * Carga las opciones del select de repartidores
 */
function loadDriversSelect() {
    const select = document.getElementById('routeDriver');
    drivers.forEach(driver => {
        const option = document.createElement('option');
        option.value = driver.id;
        option.textContent = driver.name;
        select.appendChild(option);
    });
}

/**
 * Carga las opciones del select de tiendas
 */
function loadStoresSelect() {
    const select = document.getElementById('routeStore');
    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = store.name;
        select.appendChild(option);
    });
}

/**
 * Obtiene el nombre del repartidor por ID
 */
function getDriverName(driverId) {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Desconocido';
}

/**
 * Obtiene el nombre de la tienda por ID
 */
function getStoreName(storeId) {
    const store = stores.find(s => s.id === storeId);
    return store ? store.name : 'Desconocida';
}

/**
 * Formatea la fecha para mostrar
 */
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Obtiene la clase CSS y texto del estado
 */
function getStatusInfo(status) {
    const statusMap = {
        'pending': { class: 'status-pending', text: 'Pendiente' },
        'in-progress': { class: 'status-in-progress', text: 'En Progreso' },
        'completed': { class: 'status-completed', text: 'Completada' },
        'cancelled': { class: 'status-cancelled', text: 'Cancelada' }
    };
    return statusMap[status] || { class: 'status-pending', text: 'Desconocido' };
}

/**
 * Carga la tabla de rutas dinámicamente
 */
function loadRoutesTable() {
    const tableBody = document.getElementById('routesTableBody');

    if (routes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="bi bi-geo-alt" style="font-size: 3rem;"></i>
                    <p class="mt-2">No hay rutas registradas</p>
                    <p class="text-muted">Haz clic en "Agregar Ruta" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    routes.forEach(route => {
        const statusInfo = getStatusInfo(route.status);

        html += `
            <tr>
                <td>${route.id}</td>
                <td>${getDriverName(route.driverId)}</td>
                <td>${getStoreName(route.storeId)}</td>
                <td>${formatDate(route.date)}</td>
                <td>${route.time}</td>
                <td><span class="status-badge ${statusInfo.class}">${statusInfo.text}</span></td>
                <td class="text-center">
                    <button class="btn btn-action btn-edit" onclick="openEditRouteModal(${route.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="openDeleteModal(${route.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Abre el modal para agregar una nueva ruta
 */
function openAddRouteModal() {
    currentRouteId = null;
    document.getElementById('routeModalLabel').textContent = 'Agregar Ruta';
    resetForm();
}

/**
 * Abre el modal para editar una ruta existente
 * @param {number} routeId - ID de la ruta a editar
 */
function openEditRouteModal(routeId) {
    currentRouteId = routeId;
    const route = routes.find(r => r.id === routeId);

    if (!route) {
        alert('Ruta no encontrada');
        return;
    }

    // Cambiar el título del modal
    document.getElementById('routeModalLabel').textContent = 'Editar Ruta';

    // Llenar el formulario con los datos de la ruta
    document.getElementById('routeId').value = route.id;
    document.getElementById('routeDriver').value = route.driverId;
    document.getElementById('routeStore').value = route.storeId;
    document.getElementById('routeDate').value = route.date;
    document.getElementById('routeTime').value = route.time;
    document.getElementById('routeStatus').value = route.status;

    // Abrir el modal
    routeModal.show();
}

/**
 * Guarda la ruta (crear o editar)
 */
function saveRoute() {
    const form = document.getElementById('routeForm');

    // Validar el formulario
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Obtener los valores del formulario
    const driverId = parseInt(document.getElementById('routeDriver').value);
    const storeId = parseInt(document.getElementById('routeStore').value);
    const date = document.getElementById('routeDate').value;
    const time = document.getElementById('routeTime').value;
    const status = document.getElementById('routeStatus').value;

    if (currentRouteId === null) {
        // Crear nueva ruta
        const newRoute = {
            id: routes.length > 0 ? Math.max(...routes.map(r => r.id)) + 1 : 1,
            driverId: driverId,
            storeId: storeId,
            date: date,
            time: time,
            status: status
        };
        routes.push(newRoute);
        console.log('Ruta creada:', newRoute);
    } else {
        // Editar ruta existente
        const routeIndex = routes.findIndex(r => r.id === currentRouteId);
        if (routeIndex !== -1) {
            routes[routeIndex] = {
                ...routes[routeIndex],
                driverId: driverId,
                storeId: storeId,
                date: date,
                time: time,
                status: status
            };
            console.log('Ruta actualizada:', routes[routeIndex]);
        }
    }

    // Recargar la tabla
    loadRoutesTable();

    // Cerrar el modal
    routeModal.hide();

    // Mostrar mensaje de éxito
    showToast(currentRouteId === null ? 'Ruta agregada exitosamente' : 'Ruta actualizada exitosamente');
}

/**
 * Abre el modal de confirmación para eliminar una ruta
 * @param {number} routeId - ID de la ruta a eliminar
 */
function openDeleteModal(routeId) {
    const route = routes.find(r => r.id === routeId);

    if (!route) {
        alert('Ruta no encontrada');
        return;
    }

    currentRouteId = routeId;
    const routeInfo = `#${route.id} - ${getDriverName(route.driverId)} → ${getStoreName(route.storeId)}`;
    document.getElementById('deleteRouteName').textContent = routeInfo;
    deleteModal.show();
}

/**
 * Confirma y ejecuta la eliminación de la ruta
 */
function confirmDelete() {
    const routeIndex = routes.findIndex(r => r.id === currentRouteId);

    if (routeIndex !== -1) {
        const deletedRoute = routes.splice(routeIndex, 1)[0];
        console.log('Ruta eliminada:', deletedRoute);

        // Recargar la tabla
        loadRoutesTable();

        // Cerrar el modal
        deleteModal.hide();

        // Mostrar mensaje de éxito
        showToast('Ruta eliminada exitosamente');
    }

    currentRouteId = null;
}

/**
 * Resetea el formulario de la ruta
 */
function resetForm() {
    document.getElementById('routeForm').reset();
    document.getElementById('routeId').value = '';
    document.getElementById('routeStatus').value = 'pending';
    currentRouteId = null;
}

/**
 * Muestra un mensaje toast (simulado con console.log)
 * @param {string} message - Mensaje a mostrar
 */
function showToast(message) {
    console.log('Toast:', message);
    // En producción, aquí se podría usar Bootstrap Toast o una librería de notificaciones
}

/**
 * Drivers Page JavaScript
 * Maneja el CRUD de repartidores con datos simulados
 */

// Datos simulados de repartidores
let drivers = [
    {
        id: 1,
        name: "Juan Pérez García",
        phone: "55 1234 5678",
        license: "LIC-001-2024",
        status: "active"
    },
    {
        id: 2,
        name: "María López Hernández",
        phone: "55 2345 6789",
        license: "LIC-002-2024",
        status: "active"
    },
    {
        id: 3,
        name: "Carlos Rodríguez Martínez",
        phone: "55 3456 7890",
        license: "LIC-003-2024",
        status: "inactive"
    },
    {
        id: 4,
        name: "Ana González Ruiz",
        phone: "55 4567 8901",
        license: "LIC-004-2024",
        status: "active"
    },
    {
        id: 5,
        name: "Pedro Sánchez Torres",
        phone: "55 5678 9012",
        license: "LIC-005-2024",
        status: "active"
    }
];

// Variables globales
let currentDriverId = null;
let driverModal = null;
let deleteModal = null;

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar modales de Bootstrap
    driverModal = new bootstrap.Modal(document.getElementById('driverModal'));
    deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

    // Cargar la tabla de repartidores
    loadDriversTable();

    // Event Listeners
    document.getElementById('btnAddDriver').addEventListener('click', openAddDriverModal);
    document.getElementById('btnSaveDriver').addEventListener('click', saveDriver);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);

    // Limpiar el formulario cuando se cierra el modal
    document.getElementById('driverModal').addEventListener('hidden.bs.modal', function() {
        resetForm();
    });
});

/**
 * Carga la tabla de repartidores dinámicamente
 */
function loadDriversTable() {
    const tableBody = document.getElementById('driversTableBody');

    if (drivers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="bi bi-truck" style="font-size: 3rem;"></i>
                    <p class="mt-2">No hay repartidores registrados</p>
                    <p class="text-muted">Haz clic en "Agregar Repartidor" para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    drivers.forEach(driver => {
        const statusClass = driver.status === 'active' ? 'status-active' : 'status-inactive';
        const statusText = driver.status === 'active' ? 'Activo' : 'Inactivo';

        html += `
            <tr>
                <td>${driver.id}</td>
                <td>${driver.name}</td>
                <td>${driver.phone}</td>
                <td>${driver.license}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="text-center">
                    <button class="btn btn-action btn-edit" onclick="openEditDriverModal(${driver.id})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="openDeleteModal(${driver.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

/**
 * Abre el modal para agregar un nuevo repartidor
 */
function openAddDriverModal() {
    currentDriverId = null;
    document.getElementById('driverModalLabel').textContent = 'Agregar Repartidor';
    resetForm();
}

/**
 * Abre el modal para editar un repartidor existente
 * @param {number} driverId - ID del repartidor a editar
 */
function openEditDriverModal(driverId) {
    currentDriverId = driverId;
    const driver = drivers.find(d => d.id === driverId);

    if (!driver) {
        alert('Repartidor no encontrado');
        return;
    }

    // Cambiar el título del modal
    document.getElementById('driverModalLabel').textContent = 'Editar Repartidor';

    // Llenar el formulario con los datos del repartidor
    document.getElementById('driverId').value = driver.id;
    document.getElementById('driverName').value = driver.name;
    document.getElementById('driverPhone').value = driver.phone;
    document.getElementById('driverLicense').value = driver.license;
    document.getElementById('driverStatus').value = driver.status;

    // Abrir el modal
    driverModal.show();
}

/**
 * Guarda el repartidor (crear o editar)
 */
function saveDriver() {
    const form = document.getElementById('driverForm');

    // Validar el formulario
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Obtener los valores del formulario
    const name = document.getElementById('driverName').value.trim();
    const phone = document.getElementById('driverPhone').value.trim();
    const license = document.getElementById('driverLicense').value.trim();
    const status = document.getElementById('driverStatus').value;

    if (currentDriverId === null) {
        // Crear nuevo repartidor
        const newDriver = {
            id: drivers.length > 0 ? Math.max(...drivers.map(d => d.id)) + 1 : 1,
            name: name,
            phone: phone,
            license: license,
            status: status
        };
        drivers.push(newDriver);
        console.log('Repartidor creado:', newDriver);
    } else {
        // Editar repartidor existente
        const driverIndex = drivers.findIndex(d => d.id === currentDriverId);
        if (driverIndex !== -1) {
            drivers[driverIndex] = {
                ...drivers[driverIndex],
                name: name,
                phone: phone,
                license: license,
                status: status
            };
            console.log('Repartidor actualizado:', drivers[driverIndex]);
        }
    }

    // Recargar la tabla
    loadDriversTable();

    // Cerrar el modal
    driverModal.hide();

    // Mostrar mensaje de éxito
    showToast(currentDriverId === null ? 'Repartidor agregado exitosamente' : 'Repartidor actualizado exitosamente');
}

/**
 * Abre el modal de confirmación para eliminar un repartidor
 * @param {number} driverId - ID del repartidor a eliminar
 */
function openDeleteModal(driverId) {
    const driver = drivers.find(d => d.id === driverId);

    if (!driver) {
        alert('Repartidor no encontrado');
        return;
    }

    currentDriverId = driverId;
    document.getElementById('deleteDriverName').textContent = driver.name;
    deleteModal.show();
}

/**
 * Confirma y ejecuta la eliminación del repartidor
 */
function confirmDelete() {
    const driverIndex = drivers.findIndex(d => d.id === currentDriverId);

    if (driverIndex !== -1) {
        const deletedDriver = drivers.splice(driverIndex, 1)[0];
        console.log('Repartidor eliminado:', deletedDriver);

        // Recargar la tabla
        loadDriversTable();

        // Cerrar el modal
        deleteModal.hide();

        // Mostrar mensaje de éxito
        showToast('Repartidor eliminado exitosamente');
    }

    currentDriverId = null;
}

/**
 * Resetea el formulario del repartidor
 */
function resetForm() {
    document.getElementById('driverForm').reset();
    document.getElementById('driverId').value = '';
    document.getElementById('driverStatus').value = 'active';
    currentDriverId = null;
}

/**
 * Muestra un mensaje toast (simulado con console.log)
 * @param {string} message - Mensaje a mostrar
 */
function showToast(message) {
    console.log('Toast:', message);
    // En producción, aquí se podría usar Bootstrap Toast o una librería de notificaciones
}

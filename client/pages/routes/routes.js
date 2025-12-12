/**
 * Routes Page JavaScript
 * Muestra el historial de visitas usando HybridSyncService
 */

// Variables globales
let visitDetailsModal = null;
let currentVisits = [];

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', async function() {
    // Inicializar modal
    visitDetailsModal = new bootstrap.Modal(document.getElementById('visitDetailsModal'));

    // Inicializar servicio de sincronización si no está listo
    if (window.hybridSyncService && !window.hybridSyncService.isInitialized) {
        await window.hybridSyncService.initialize();
    }

    // Cargar la tabla de rutas
    await loadRoutesTable();
});

/**
 * Formatea la fecha para mostrar
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Manejar fechas que ya vienen solo como YYYY-MM-DD
    if (dateStr.length === 10 && dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Formatea moneda
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

/**
 * Carga la tabla de rutas dinámicamente
 */
async function loadRoutesTable() {
    const tableBody = document.getElementById('routesTableBody');
    
    // Mostrar loading
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Cargando historial de visitas...</p>
            </td>
        </tr>
    `;

    try {
        const visits = await window.hybridSyncService.getAllVisits();
        currentVisits = visits; // Guardar referencia para el modal

        if (visits.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="bi bi-geo-alt" style="font-size: 3rem;"></i>
                        <p class="mt-2">No hay visitas registradas</p>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        visits.forEach((visit, index) => {
            const driverName = visit.userName || 'Desconocido';
            const storeName = visit.storeName || 'Desconocida';
            const visitDate = visit.visitDate;
            const isValidated = visit.validation === true;
            const validationBadge = isValidated 
                ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Sí</span>' 
                : '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>No</span>';

            html += `
                <tr>
                    <td>${visit.uuid ? visit.uuid.substring(0, 8) : '-'}</td>
                    <td>${driverName}</td>
                    <td>${storeName}</td>
                    <td>${formatDate(visitDate)}</td>
                    <td>${validationBadge}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" onclick="openVisitDetails(${index})">
                            <i class="bi bi-eye me-1"></i>Ver Detalles
                        </button>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar visitas:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state text-danger">
                    <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                    <p class="mt-2">Error al cargar las visitas</p>
                    <p class="small">${error.message}</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Abre el modal con los detalles de la visita
 * @param {number} index - Índice de la visita en el array currentVisits
 */
window.openVisitDetails = function(index) {
    const visit = currentVisits[index];
    if (!visit) return;

    // Llenar información general
    document.getElementById('detailDriver').textContent = visit.userName || '-';
    document.getElementById('detailStore').textContent = visit.storeName || '-';
    document.getElementById('detailDate').textContent = formatDate(visit.visitDate);
    
    const validationSpan = document.getElementById('detailValidation');
    if (visit.validation) {
        validationSpan.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Validada</span>';
    } else {
        validationSpan.innerHTML = '<span class="text-warning"><i class="bi bi-clock-fill"></i> Pendiente</span>';
    }

    // Llenar tabla de órdenes
    const ordersBody = document.getElementById('detailOrdersBody');
    const ordersFooter = document.getElementById('detailOrdersFooter');
    ordersBody.innerHTML = '';
    ordersFooter.innerHTML = '';

    if (visit.orders && visit.orders.length > 0) {
        let grandTotal = 0;

        visit.orders.forEach(order => {
            const total = order.total || (order.quantity * order.unitPrice);
            grandTotal += total;

            ordersBody.innerHTML += `
                <tr>
                    <td>${order.productName}</td>
                    <td class="text-center">${order.quantity}</td>
                    <td class="text-end">${formatCurrency(order.unitPrice)}</td>
                    <td class="text-end">${formatCurrency(total)}</td>
                </tr>
            `;
        });

        // Agregar total general
        ordersFooter.innerHTML = `
            <tr class="table-active fw-bold">
                <td colspan="3" class="text-end">Total General:</td>
                <td class="text-end">${formatCurrency(grandTotal)}</td>
            </tr>
        `;
    } else {
        ordersBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted py-3">
                    No hay productos registrados en esta visita
                </td>
            </tr>
        `;
    }

    setupPhotoViewer(visit);

    // Mostrar modal
    visitDetailsModal.show();
};

function setupPhotoViewer(visit) {
    const container = document.getElementById('detailPhotoContainer');
    const viewButton = document.getElementById('btnViewPhoto');
    const photoPath = visit.photo;

    if (!container || !viewButton) {
        return;
    }

    if (!photoPath) {
        container.classList.add('d-none');
        viewButton.replaceWith(viewButton.cloneNode(true));
        return;
    }

    container.classList.remove('d-none');

    const clone = viewButton.cloneNode(true);
    viewButton.parentNode.replaceChild(clone, viewButton);

    clone.addEventListener('click', async () => {
        const fullUrl = resolvePhotoUrl(photoPath);

        if (!fullUrl) {
            Swal.fire({
                icon: 'warning',
                title: 'Foto no disponible',
                text: 'No se pudo construir la URL de la foto.',
                confirmButtonColor: '#0d6efd'
            });
            return;
        }

        const loadingAlert = Swal.fire({
            title: 'Cargando foto...',
            didOpen: () => {
                Swal.showLoading();
            },
            allowOutsideClick: false,
            allowEscapeKey: false
        });

        try {
            const photoUrl = await fetchPhotoWithAuth(fullUrl);
            loadingAlert.close();

            Swal.fire({
                title: 'Foto de la visita',
                imageUrl: photoUrl,
                imageAlt: 'Foto de la visita',
                showCloseButton: true,
                confirmButtonColor: '#0d6efd'
            }).then(() => {
                URL.revokeObjectURL(photoUrl);
            });
        } catch (error) {
            loadingAlert.close();
            console.error('[Routes] Error al cargar foto:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al cargar foto',
                text: 'No se pudo mostrar la evidencia. Intenta nuevamente.',
                confirmButtonColor: '#dc3545'
            });
        }
    });
}

function resolvePhotoUrl(path) {
    if (!path) {
        return null;
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const base = window.API_BASE_URL || window.location.origin;
    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
}

async function fetchPhotoWithAuth(url) {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(url, {
        headers,
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

/**
 * Dashboard Admin JavaScript
 * Inicialización básica del panel de administración
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Mensaje de bienvenida en consola
    console.log('Dashboard de Administración cargado correctamente');
    console.log('Sistema de Abarrotes - Panel de Control');

    // Inicializar información del administrador (simulado)
    initializeDashboard();

    // Prevenir navegación en tarjetas deshabilitadas
    preventDisabledNavigation();
});

/**
 * Inicializa el dashboard con información básica
 */
function initializeDashboard() {
    // Información simulada del administrador
    const adminInfo = {
        name: 'Administrador',
        role: 'Admin',
        loginTime: new Date().toLocaleString('es-MX')
    };

    console.log('Usuario:', adminInfo.name);
    console.log('Rol:', adminInfo.role);
    console.log('Sesión iniciada:', adminInfo.loginTime);

    // Aquí se podría cargar información adicional del servidor
    // como estadísticas, notificaciones, etc.
}

/**
 * Previene la navegación en tarjetas deshabilitadas
 * y muestra un mensaje informativo
 */
function preventDisabledNavigation() {
    const disabledCards = document.querySelectorAll('.module-card.disabled');

    disabledCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Módulo no disponible aún. Próximamente.');

            // Opcional: mostrar una notificación visual
            showNotification('Este módulo estará disponible próximamente');
        });
    });
}

/**
 * Muestra una notificación temporal (simulada con console.log)
 * @param {string} message - Mensaje a mostrar
 */
function showNotification(message) {
    console.log('Notificación:', message);
    // En producción, aquí se podría implementar un toast o alert de Bootstrap
}

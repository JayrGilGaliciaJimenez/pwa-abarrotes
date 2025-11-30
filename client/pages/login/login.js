/**
 * Login Page JavaScript
 * Maneja la autenticación de Administradores y Repartidores
 */

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageArea = document.getElementById('messageArea');

    // Manejar el evento submit del formulario
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevenir el envío tradicional del formulario

        // Obtener los valores del formulario
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // Limpiar mensajes previos
        messageArea.innerHTML = '';

        // Validación simple
        if (!email || !password) {
            showMessage('Por favor, completa todos los campos.', 'warning');
            return;
        }

        // Validar el formato del email
        if (!isValidEmail(email)) {
            showMessage('Por favor, ingresa un email válido.', 'warning');
            return;
        }

        // Simular autenticación
        authenticateUser(email, password);
    });

    /**
     * Simula la autenticación del usuario
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña del usuario
     */
    function authenticateUser(email, password) {
        // Mostrar mensaje de carga
        showMessage('Verificando credenciales...', 'info');

        // Simular delay de autenticación
        setTimeout(function() {
            // Validación simple: si el email es 'admin@ejemplo.com' se considera válido
            if (email === 'admin@ejemplo.com') {
                showMessage('¡Credenciales válidas! Redirigiendo a Dashboard...', 'success');

                // Aquí podrías redirigir al dashboard después de un breve delay
                setTimeout(function() {
                    // window.location.href = '/dashboard.html';
                    console.log('Redirección al dashboard (comentado para desarrollo)');
                }, 1500);
            } else {
                showMessage('Credenciales inválidas. Por favor, intenta de nuevo.', 'danger');
            }
        }, 1000); // Simular 1 segundo de procesamiento
    }

    /**
     * Valida el formato de un email
     * @param {string} email - Email a validar
     * @returns {boolean} - True si el email es válido
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

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
    }
});

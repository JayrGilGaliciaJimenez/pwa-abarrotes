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
     * Autentica al usuario consumiendo el endpoint del backend
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña del usuario
     */
    async function authenticateUser(email, password) {
        // Mostrar mensaje de carga
        showMessage('Verificando credenciales...', 'info');

        try {
            // Realizar la petición al endpoint de autenticación
            const response = await fetch(`${BASE_URL}/auth/authenticate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            // Verificar si la respuesta fue exitosa
            if (response.ok) {
                const data = await response.json();

                // Verificar que exista el token en la respuesta
                if (!data.token) {
                    showMessage('Error: No se recibió token de autenticación.', 'danger');
                    return;
                }

                // Decodificar el JWT para obtener el rol
                const payload = decodeJWT(data.token);

                if (!payload || !payload.role) {
                    showMessage('Error: No se pudo obtener el rol del usuario.', 'danger');
                    return;
                }

                // Verificar el rol del usuario
                const isAdmin = payload.role.some(r => r.authority === 'ADMIN');
                const isUser = payload.role.some(r => r.authority === 'USER');

                if (isAdmin || isUser) {
                    showMessage('¡Credenciales válidas! Redirigiendo a Dashboard...', 'success');

                    // Guardar el token y datos del usuario
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(payload));
                    localStorage.setItem('uuid', payload.uuid);

                    // Determinar la ruta según el rol
                    let dashboardUrl = '';
                    if (isAdmin) {
                        dashboardUrl = './pages/admin/dashboard.html';
                    } else if (isUser) {
                        dashboardUrl = './pages/delivery_man/dashboard.html';
                    }

                    // Redirigir al dashboard después de un breve delay
                    setTimeout(function() {
                        window.location.href = dashboardUrl;
                    }, 1500);
                } else {
                    showMessage('Acceso denegado. No tienes permisos para acceder al sistema.', 'warning');
                }
            } else {
                // Manejar errores HTTP (401, 403, etc.)
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || 'Credenciales inválidas. Por favor, intenta de nuevo.';
                showMessage(errorMessage, 'danger');
            }
        } catch (error) {
            // Manejar errores de red o del servidor
            console.error('Error de autenticación:', error);
            showMessage('Error al conectar con el servidor. Por favor, intenta más tarde.', 'danger');
        }
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
     * Decodifica un JWT y retorna el payload
     * @param {string} token - Token JWT a decodificar
     * @returns {object|null} - Payload decodificado o null si hay error
     */
    function decodeJWT(token) {
        try {
            // Un JWT tiene 3 partes separadas por puntos: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('Token JWT inválido');
                return null;
            }

            // Decodificar la parte del payload (segunda parte)
            const payload = parts[1];

            // Decodificar de Base64URL a string
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error al decodificar JWT:', error);
            return null;
        }
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

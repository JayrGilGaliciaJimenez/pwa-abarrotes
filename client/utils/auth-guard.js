/**
 * Auth Guard - Protección de rutas autenticadas
 *
 * Este script verifica que el usuario esté autenticado antes de permitir
 * el acceso a páginas protegidas. Si no hay autenticación válida,
 * redirige automáticamente al login.
 *
 * Uso:
 * Importar este script en cualquier página que requiera autenticación
 * <script type="module" src="../../utils/auth-guard.js"></script>
 */

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} - true si está autenticado, false si no
 */
function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    // Redirige si falta alguno de los dos
    if (!token || !user) {
        console.warn('[AuthGuard] No hay token o usuario, redirigiendo al login...');
        redirigirAlLogin();
        return false;
    }

    // Validación adicional: verificar que no estén vacíos
    if (token.trim() === '' || user.trim() === '') {
        console.warn('[AuthGuard] Token o usuario vacíos, limpiando y redirigiendo...');
        localStorage.clear(); // Limpia datos corruptos
        redirigirAlLogin();
        return false;
    }

    // Validación adicional: verificar si el token expiró
    if (isTokenExpired(token)) {
        console.warn('[AuthGuard] Token expirado, redirigiendo al login...');
        localStorage.clear();
        redirigirAlLogin();
        return false;
    }

    console.log('[AuthGuard] ✅ Usuario autenticado correctamente');
    lockBackNavigation();
    return true;
}

/**
 * Verifica si el token JWT ha expirado
 * @param {string} token - Token JWT a verificar
 * @returns {boolean} - true si expiró, false si aún es válido
 */
function isTokenExpired(token) {
    try {
        // Decodificar el JWT
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('[AuthGuard] Token JWT inválido');
            return true;
        }

        // Decodificar el payload
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        // Verificar si tiene fecha de expiración
        if (!payload.exp) {
            // Si no tiene exp, considerar como válido
            return false;
        }

        // Comparar con tiempo actual (exp está en segundos, Date.now() en milisegundos)
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (error) {
        console.error('[AuthGuard] Error verificando expiración del token:', error);
        return true; // En caso de error, considerar como expirado por seguridad
    }
}

/**
 * Redirige al usuario a la página de login
 */
function redirigirAlLogin() {
    // Determinar la ruta al login según la ubicación actual
    const path = window.location.pathname;

    let loginUrl = '../../index.html';

    // Ajustar ruta según la profundidad
    if (path.includes('/pages/admin/')) {
        loginUrl = '../../index.html';
    } else if (path.includes('/pages/delivery_man/')) {
        loginUrl = '../../index.html';
    } else if (path.includes('/pages/products/') ||
               path.includes('/pages/stores/') ||
               path.includes('/pages/drivers/') ||
               path.includes('/pages/routes/')) {
        loginUrl = '../../index.html';
    }

    // Redirigir después de un breve delay para permitir que se muestre el log
    setTimeout(() => {
        window.location.href = loginUrl;
    }, 0);
}

/**
 * Obtiene los datos del usuario autenticado
 * @returns {object|null} - Datos del usuario o null si no está autenticado
 */
export function getAuthenticatedUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('[AuthGuard] Error parseando datos del usuario:', error);
        return null;
    }
}

/**
 * Obtiene el token de autenticación
 * @returns {string|null} - Token o null si no está autenticado
 */
export function getAuthToken() {
    return localStorage.getItem('token');
}

/**
 * Cierra la sesión del usuario
 */
export function logout() {
    console.log('[AuthGuard] Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.__PWA_BACK_GUARD = false;
    redirigirAlLogin();
}

function lockBackNavigation() {
    if (window.__PWA_BACK_GUARD) {
        return;
    }

    window.__PWA_BACK_GUARD = true;

    try {
        history.replaceState({ locked: true }, document.title, window.location.href);
        history.pushState({ locked: true }, document.title, window.location.href);

        window.addEventListener('popstate', () => {
            const token = localStorage.getItem('token');
            if (!token) {
                window.__PWA_BACK_GUARD = false;
                return;
            }

            history.pushState({ locked: true }, document.title, window.location.href);
        });
    } catch (error) {
        console.warn('[AuthGuard] No se pudo bloquear el botón atrás:', error);
    }
}

// Ejecutar verificación inmediatamente al cargar el script
verificarAutenticacion();

// Exportar función para uso en otros módulos
export { verificarAutenticacion };

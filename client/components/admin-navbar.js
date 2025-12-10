/**
 * Admin Navbar Component
 * Componente de navegación para el panel de administración
 */

class AdminNavbar {
    constructor() {
        // Verificar si estamos en una página admin válida
        if (!this.shouldLoadNavbar()) {
            console.log('Admin navbar no se carga en esta página');
            return;
        }

        this.currentPage = this.getCurrentPage();
        this.isOnline = navigator.onLine;
        this.init();
    }

    shouldLoadNavbar() {
        const path = window.location.pathname;

        // No cargar en página de login o index
        if (path === '/' || path.includes('index.html') || path.includes('login.html')) {
            return false;
        }

        // Solo cargar en páginas admin
        return path.includes('/admin/') ||
               path.includes('/products/') ||
               path.includes('/stores/') ||
               path.includes('/drivers/') ||
               path.includes('/routes/');
    }

    getCurrentPage() {
        const path = window.location.pathname;

        if (path.includes('dashboard.html')) return 'dashboard';
        if (path.includes('products.html')) return 'products';
        if (path.includes('stores.html')) return 'stores';
        if (path.includes('drivers.html')) return 'drivers';
        if (path.includes('routes.html')) return 'routes';

        return '';
    }

    getNavHTML() {
        return `
            <nav class="admin-navbar">
                <div class="navbar-container">
                    <!-- Logo/Brand -->
                    <div class="navbar-brand">
                        <i class="bi bi-shop"></i>
                        <span class="brand-text">Sistema de Abarrotes</span>
                    </div>

                    <!-- Navigation Links (Desktop) -->
                    <div class="navbar-links" id="navbarLinks">
                        <a href="../admin/dashboard.html" class="nav-link ${this.currentPage === 'dashboard' ? 'active' : ''}">
                            <i class="bi bi-house-door"></i>
                            <span>Dashboard</span>
                        </a>
                        <a href="../stores/stores.html" class="nav-link ${this.currentPage === 'stores' ? 'active' : ''}">
                            <i class="bi bi-shop"></i>
                            <span>Tiendas</span>
                        </a>
                        <a href="../products/products.html" class="nav-link ${this.currentPage === 'products' ? 'active' : ''}">
                            <i class="bi bi-box-seam"></i>
                            <span>Productos</span>
                        </a>
                        <a href="../drivers/drivers.html" class="nav-link ${this.currentPage === 'drivers' ? 'active' : ''}">
                            <i class="bi bi-person-badge"></i>
                            <span>Repartidores</span>
                        </a>
                        <a href="../routes/routes.html" class="nav-link ${this.currentPage === 'routes' ? 'active' : ''}">
                            <i class="bi bi-map"></i>
                            <span>Rutas</span>
                        </a>
                    </div>

                    <!-- Right Actions -->
                    <div class="navbar-actions">
                        <!-- Network Status -->
                        <div class="network-status" id="networkStatus">
                            <i class="bi ${this.isOnline ? 'bi-wifi' : 'bi-wifi-off'}"></i>
                            <span class="status-text">${this.isOnline ? 'Online' : 'Offline'}</span>
                        </div>

                        <!-- Logout Button -->
                        <button class="btn-logout" id="logoutBtn">
                            <i class="bi bi-box-arrow-right"></i>
                            <span>Cerrar Sesión</span>
                        </button>

                        <!-- Mobile Menu Toggle -->
                        <button class="mobile-menu-toggle" id="mobileMenuToggle">
                            <i class="bi bi-list"></i>
                        </button>
                    </div>
                </div>

                <!-- Mobile Menu -->
                <div class="mobile-menu" id="mobileMenu">
                    <a href="../admin/dashboard.html" class="mobile-nav-link ${this.currentPage === 'dashboard' ? 'active' : ''}">
                        <i class="bi bi-house-door"></i>
                        <span>Dashboard</span>
                    </a>
                    <a href="../stores/stores.html" class="mobile-nav-link ${this.currentPage === 'stores' ? 'active' : ''}">
                        <i class="bi bi-shop"></i>
                        <span>Tiendas</span>
                    </a>
                    <a href="../products/products.html" class="mobile-nav-link ${this.currentPage === 'products' ? 'active' : ''}">
                        <i class="bi bi-box-seam"></i>
                        <span>Productos</span>
                    </a>
                    <a href="../drivers/drivers.html" class="mobile-nav-link ${this.currentPage === 'drivers' ? 'active' : ''}">
                        <i class="bi bi-person-badge"></i>
                        <span>Repartidores</span>
                    </a>
                    <a href="../routes/routes.html" class="mobile-nav-link ${this.currentPage === 'routes' ? 'active' : ''}">
                        <i class="bi bi-map"></i>
                        <span>Rutas</span>
                    </a>
                </div>
            </nav>
        `;
    }

    init() {
        // Insertar navbar al inicio del body
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.injectNavbar();
            });
        } else {
            // DOM ya está listo
            this.injectNavbar();
        }
    }

    injectNavbar() {
        try {
            const navbarHTML = this.getNavHTML();
            document.body.insertAdjacentHTML('afterbegin', navbarHTML);

            // Agregar clase al body para ajustar contenido
            document.body.classList.add('has-admin-navbar');

            // Inicializar event listeners
            this.initEventListeners();
        } catch (error) {
            console.error('Error al inyectar navbar:', error);
        }
    }

    initEventListeners() {
        try {
            // Logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }

            // Mobile menu toggle
            const mobileToggle = document.getElementById('mobileMenuToggle');
            const mobileMenu = document.getElementById('mobileMenu');

            if (mobileToggle && mobileMenu) {
                mobileToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    mobileMenu.classList.toggle('show');

                    // Cambiar icono
                    const icon = mobileToggle.querySelector('i');
                    if (icon) {
                        if (mobileMenu.classList.contains('show')) {
                            icon.classList.remove('bi-list');
                            icon.classList.add('bi-x-lg');
                        } else {
                            icon.classList.remove('bi-x-lg');
                            icon.classList.add('bi-list');
                        }
                    }
                });

                // Cerrar menú al hacer click en un link
                const mobileLinks = mobileMenu.querySelectorAll('.mobile-nav-link');
                mobileLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        mobileMenu.classList.remove('show');
                        const icon = mobileToggle.querySelector('i');
                        if (icon) {
                            icon.classList.remove('bi-x-lg');
                            icon.classList.add('bi-list');
                        }
                    });
                });
            }

            // Network status monitoring
            this.initNetworkMonitoring();
        } catch (error) {
            console.error('Error al inicializar event listeners:', error);
        }
    }

    initNetworkMonitoring() {
        const networkStatus = document.getElementById('networkStatus');

        if (networkStatus) {
            window.addEventListener('online', () => {
                this.isOnline = true;
                this.updateNetworkStatus();
            });

            window.addEventListener('offline', () => {
                this.isOnline = false;
                this.updateNetworkStatus();
            });
        }
    }

    updateNetworkStatus() {
        const networkStatus = document.getElementById('networkStatus');
        if (networkStatus) {
            const icon = networkStatus.querySelector('i');
            const statusText = networkStatus.querySelector('.status-text');

            if (this.isOnline) {
                icon.classList.remove('bi-wifi-off');
                icon.classList.add('bi-wifi');
                statusText.textContent = 'Online';
                networkStatus.classList.remove('offline');
                networkStatus.classList.add('online');
            } else {
                icon.classList.remove('bi-wifi');
                icon.classList.add('bi-wifi-off');
                statusText.textContent = 'Offline';
                networkStatus.classList.remove('online');
                networkStatus.classList.add('offline');
            }
        }
    }

    handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            // Limpiar localStorage
            localStorage.removeItem('userSession');
            localStorage.removeItem('userRole');

            // Redireccionar al login
            window.location.href = '../login/login.html';
        }
    }
}

// Inicializar navbar automáticamente
new AdminNavbar();

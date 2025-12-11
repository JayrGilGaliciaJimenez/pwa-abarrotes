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
    const scanQrBtn = document.getElementById('scanQrBtn');
    const qrScannerModal = document.getElementById('qrScannerModal');

    let html5QrCode = null;
    let storesToVisit = []; // Se cargará desde el API

    /**
     * Obtiene el UUID del usuario desde el token JWT en localStorage
     * @returns {string|null} - UUID del usuario o null si no se encuentra
     */
    function getUserUuidFromToken() {
        const token = localStorage.getItem('token');
        if (!token) return null;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.uuid || payload.sub || payload.userId || null;
        } catch (e) {
            console.error('Error al decodificar token:', e);
            return null;
        }
    }

    /**
     * Obtiene el nombre del usuario desde localStorage
     * @returns {string} - Nombre del usuario o 'Repartidor'
     */
    function getUserName() {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user?.name || user?.nombre || 'Repartidor';
        } catch (e) {
            return 'Repartidor';
        }
    }

    /**
     * Inicia el escáner de código QR
     */
    function startQrScanner() {
        const qrReaderElement = document.getElementById('qr-reader');
        const qrResultsElement = document.getElementById('qr-reader-results');

        // Limpiar resultados anteriores
        qrResultsElement.innerHTML = '';

        html5QrCode = new Html5Qrcode('qr-reader');

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        html5QrCode.start(
            { facingMode: 'environment' }, // Cámara trasera
            config,
            onQrCodeSuccess,
            onQrCodeError
        ).catch(function(err) {
            console.error('Error al iniciar el escáner:', err);
            qrResultsElement.innerHTML = `
                <div class="alert alert-danger">
                    Error al acceder a la cámara. Asegúrate de dar permisos.
                </div>
            `;
        });
    }

    /**
     * Detiene el escáner de código QR
     */
    function stopQrScanner() {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(function() {
                console.log('Escáner detenido');
            }).catch(function(err) {
                console.error('Error al detener el escáner:', err);
            });
        }
    }

    /**
     * Callback cuando se escanea un código QR exitosamente
     * @param {string} decodedText - Texto decodificado del QR
     * @param {object} decodedResult - Resultado completo del escaneo
     */
    function onQrCodeSuccess(decodedText, decodedResult) {
        const qrResultsElement = document.getElementById('qr-reader-results');

        // Detener el escáner después de leer
        stopQrScanner();

        // Mostrar el resultado
        qrResultsElement.innerHTML = `
            <div class="alert alert-success">
                <strong>Código escaneado:</strong><br>
                ${decodedText}
            </div>
        `;

        // Aquí puedes procesar el código QR según tu lógica de negocio
        console.log('QR Code escaneado:', decodedText);

        // Ejemplo: Si el QR contiene un ID de tienda, podrías procesarlo
        handleQrResult(decodedText);
    }

    /**
     * Callback para errores de escaneo (se llama constantemente mientras no detecta QR)
     * @param {string} errorMessage - Mensaje de error
     */
    function onQrCodeError(errorMessage) {
        // No mostrar errores continuos, solo loguear si es necesario
        // console.log('Error de escaneo:', errorMessage);
    }

    /**
     * Procesa el resultado del código QR escaneado
     * @param {string} qrData - Datos del código QR (URL del endpoint de la tienda)
     */
    async function handleQrResult(qrData) {
        const qrResultsElement = document.getElementById('qr-reader-results');

        // Validar que sea una URL válida de tienda
        if (!qrData.includes('/api/v1/stores/')) {
            qrResultsElement.innerHTML = `
                <div class="alert alert-warning">
                    Código QR no válido. Escanea el QR de una tienda.
                </div>
            `;
            return;
        }

        // Mostrar estado de carga
        qrResultsElement.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2">Buscando tienda...</p>
            </div>
        `;

        try {
            const token = localStorage.getItem('token'); // <-- obtiene el token
            
            const response = await fetch(qrData, {
                headers: {
                    'Authorization': `Bearer ${token}`, // <-- agrega token
                    'Content-Type': 'application/json'
                }
            });
            const result = await response.json();

            if (response.ok && result.data) {
                // Guardar datos de la tienda en sessionStorage para la siguiente página
                sessionStorage.setItem('currentStore', JSON.stringify(result.data));

                qrResultsElement.innerHTML = `
                    <div class="alert alert-success">
                        <strong>Tienda encontrada:</strong> ${result.data.name}<br>
                        Redirigiendo...
                    </div>
                `;

                // Cerrar modal y redirigir
                setTimeout(function() {
                    const modal = bootstrap.Modal.getInstance(qrScannerModal);
                    if (modal) {
                        modal.hide();
                    }
                    window.location.href = './store-visit.html';
                }, 1500);
            } else {
                qrResultsElement.innerHTML = `
                    <div class="alert alert-danger">
                        No se encontró la tienda. Intenta de nuevo.
                    </div>
                `;
            }
        } catch (error) {
    console.error('Error al buscar tienda:', error);

    qrResultsElement.innerHTML = `
        <div class="alert alert-danger">
            <p>Error de conexión. Verifica tu internet e intenta de nuevo.</p>
            <pre>${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}</pre>
        </div>
    `;
}

    }

    // Evento para abrir el modal y comenzar a escanear
    scanQrBtn.addEventListener('click', function() {
        const modal = new bootstrap.Modal(qrScannerModal);
        modal.show();
    });

    // Iniciar escáner cuando el modal se abre completamente
    qrScannerModal.addEventListener('shown.bs.modal', function() {
        startQrScanner();
    });

    // Detener escáner cuando el modal se cierra
    qrScannerModal.addEventListener('hidden.bs.modal', function() {
        stopQrScanner();
    });

    /**
     * Inicializa el dashboard
     */
    async function initDashboard() {
        // Mostrar nombre del repartidor desde localStorage
        deliveryManNameElement.textContent = getUserName();

        // Cargar lista de tiendas desde el API
        await fetchStoresFromApi();
    }

    /**
     * Obtiene las tiendas asignadas al repartidor desde el API
     */
    async function fetchStoresFromApi() {
        const userUuid = getUserUuidFromToken();

        if (!userUuid) {
            showMessage('No se pudo obtener el usuario. Por favor, inicia sesión nuevamente.', 'danger');
            setTimeout(function() {
                window.location.href = '../../index.html';
            }, 2000);
            return;
        }

        // Mostrar estado de carga
        storesListContainer.innerHTML = `
            <div class="list-group-item text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 mb-0 text-muted">Cargando tiendas...</p>
            </div>
        `;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BASE_URL}/stores/delivery-man/${userUuid}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener las tiendas');
            }

            const result = await response.json();
            storesToVisit = result.data || [];

            // Cargar lista de tiendas en el DOM
            loadStoresList();

        } catch (error) {
            console.error('Error al cargar tiendas:', error);
            storesListContainer.innerHTML = `
                <div class="list-group-item text-center py-4">
                    <div class="text-danger mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
                        </svg>
                    </div>
                    <p class="text-muted mb-2">Error al cargar las tiendas</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="location.reload()">
                        Reintentar
                    </button>
                </div>
            `;
        }
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

        // Contar productos de la tienda
        const productsCount = store.products ? store.products.length : 0;

        // Crear el contenido HTML
        listItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row">
                <div class="flex-grow-1 mb-3 mb-md-0">
                    <h6 class="store-name">${store.name || 'Sin nombre'}</h6>
                    <p class="store-address">${store.address || 'Sin dirección'}</p>
                    <span class="badge bg-secondary">${productsCount} producto(s)</span>
                </div>
                <div class="store-actions">
                    <button
                        class="btn btn-visit visit-btn"
                        data-store-uuid="${store.uuid}"
                        data-store-name="${store.name}"
                    >
                        Iniciar Visita
                    </button>
                </div>
            </div>
        `;

        // Agregar evento al botón
        const visitBtn = listItem.querySelector('.visit-btn');
        visitBtn.addEventListener('click', function() {
            handleVisitStore(store);
        });

        return listItem;
    }

    /**
     * Maneja el evento de iniciar visita a una tienda
     * @param {object} store - Objeto completo de la tienda
     */
    function handleVisitStore(store) {
        console.log(`Iniciando visita a tienda: ${store.name}`);

        // Guardar datos de la tienda en sessionStorage para la página de visita
        sessionStorage.setItem('currentStore', JSON.stringify(store));

        // Redirigir a la página de visita
        window.location.href = './store-visit.html';
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

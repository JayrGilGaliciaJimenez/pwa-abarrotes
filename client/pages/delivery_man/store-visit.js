/**
 * Store Visit - Página de visita a tienda
 * Muestra los datos de la tienda escaneada por QR
 */

document.addEventListener('DOMContentLoaded', function() {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const storeContent = document.getElementById('storeContent');

    const storeName = document.getElementById('storeName');
    const storeAddress = document.getElementById('storeAddress');
    const storeLatitude = document.getElementById('storeLatitude');
    const storeLongitude = document.getElementById('storeLongitude');
    const productsCount = document.getElementById('productsCount');
    const productsList = document.getElementById('productsList');
    const openMapBtn = document.getElementById('openMapBtn');
    const registerVisitBtn = document.getElementById('registerVisitBtn');

    let storeData = null;

    const MAX_DISTANCE_METERS = 50; // Distancia máxima permitida en metros

    /**
     * Calcula la distancia entre dos puntos usando la fórmula de Haversine
     * @param {number} lat1 - Latitud del punto 1
     * @param {number} lon1 - Longitud del punto 1
     * @param {number} lat2 - Latitud del punto 2
     * @param {number} lon2 - Longitud del punto 2
     * @returns {number} - Distancia en metros
     */
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Radio de la Tierra en metros
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convierte grados a radianes
     * @param {number} degrees - Grados
     * @returns {number} - Radianes
     */
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Obtiene la ubicación actual del usuario
     * @returns {Promise<GeolocationPosition>}
     */
    function getCurrentPosition() {
        return new Promise(function(resolve, reject) {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada en este dispositivo'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }

    /**
     * Inicializa la página
     */
    function init() {
        // Obtener datos de la tienda desde sessionStorage
        const storedData = sessionStorage.getItem('currentStore');
        console.log(storedData);
        

        if (!storedData) {
            showError();
            return;
        }

        try {
            storeData = JSON.parse(storedData);
            displayStoreData(storeData);
        } catch (error) {
            console.error('Error al parsear datos de tienda:', error);
            showError();
        }
    }

    /**
     * Muestra el estado de error
     */
    function showError() {
        loadingState.classList.add('d-none');
        errorState.classList.remove('d-none');
        storeContent.classList.add('d-none');
    }

    /**
     * Muestra los datos de la tienda en la página
     * @param {object} store - Datos de la tienda
     */
    function displayStoreData(store) {
        // Ocultar loading y mostrar contenido
        loadingState.classList.add('d-none');
        errorState.classList.add('d-none');
        storeContent.classList.remove('d-none');

        // Llenar información básica
        storeName.textContent = store.name || 'Sin nombre';
        storeAddress.textContent = store.address || 'Sin dirección';
        storeLatitude.textContent = store.latitude || '-';
        storeLongitude.textContent = store.longitude || '-';

        // Mostrar productos
        displayProducts(store.products || []);
    }

    /**
     * Muestra la lista de productos
     * @param {array} products - Lista de productos
     */
    function displayProducts(products) {
        productsCount.textContent = products.length;

        if (products.length === 0) {
            productsList.innerHTML = `
                <div class="list-group-item text-center text-muted py-4">
                    No hay productos registrados
                </div>
            `;
            return;
        }

        productsList.innerHTML = products.map(function(product) {
            return `
                <div class="list-group-item product-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="product-name mb-1">${product.name || 'Producto'}</h6>
                            <small class="text-muted">${product.description || ''}</small>
                        </div>
                        <span class="product-price">$${(product.price || 0).toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Abre la ubicación en Google Maps
     */
    openMapBtn.addEventListener('click', function() {
        if (storeData && storeData.latitude && storeData.longitude) {
            const url = `https://www.google.com/maps?q=${storeData.latitude},${storeData.longitude}`;
            window.open(url, '_blank');
        } else {
            alert('No hay coordenadas disponibles para esta tienda');
        }
    });

    /**
     * Registra la visita a la tienda (con validación de ubicación)
     */
    registerVisitBtn.addEventListener('click', async function() {
        if (!storeData) return;

        // Validar que la tienda tenga coordenadas
        if (!storeData.latitude || !storeData.longitude) {
            alert('Esta tienda no tiene coordenadas registradas. No se puede validar la ubicación.');
            return;
        }

        // Deshabilitar botón mientras procesa
        registerVisitBtn.disabled = true;
        registerVisitBtn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            Verificando ubicación...
        `;

        try {
            // Obtener ubicación actual del usuario
            const position = await getCurrentPosition();
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

            // Calcular distancia entre el usuario y la tienda
            const distance = calculateDistance(
                userLat,
                userLon,
                storeData.latitude,
                storeData.longitude
            );

            console.log(`Distancia a la tienda: ${distance.toFixed(2)} metros`);

            // Validar si está dentro del rango permitido
            if (distance > MAX_DISTANCE_METERS) {
                registerVisitBtn.disabled = false;
                registerVisitBtn.innerHTML = 'Registrar Visita';

                alert(`No estás lo suficientemente cerca de la tienda.\n\nDistancia actual: ${distance.toFixed(0)} metros.\nDistancia máxima permitida: ${MAX_DISTANCE_METERS} metros.\n\nAcércate más para registrar la visita.`);
                return;
            }

            // Usuario está dentro del rango - proceder con el registro
            registerVisitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Registrando...
            `;

            // Simular registro exitoso (aquí irá la llamada al servidor)
            setTimeout(function() {
                // Limpiar datos de sessionStorage
                sessionStorage.removeItem('currentStore');

                // Mostrar mensaje de éxito
                registerVisitBtn.classList.remove('btn-primary');
                registerVisitBtn.classList.add('btn-success');
                registerVisitBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="me-2" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                    Visita Registrada (${distance.toFixed(0)}m)
                `;

                // Redirigir al dashboard después de un momento
                
            }, 1000);

        } catch (error) {
            console.error('Error al obtener ubicación:', error);
            registerVisitBtn.disabled = false;
            registerVisitBtn.innerHTML = 'Registrar Visita';

            let errorMessage = 'No se pudo obtener tu ubicación.';

            if (error.code === 1) {
                errorMessage = 'Permiso de ubicación denegado. Por favor, habilita el acceso a la ubicación en la configuración de tu navegador.';
            } else if (error.code === 2) {
                errorMessage = 'No se pudo determinar tu ubicación. Verifica que el GPS esté activado.';
            } else if (error.code === 3) {
                errorMessage = 'Tiempo de espera agotado al obtener la ubicación. Intenta de nuevo.';
            }

            alert(errorMessage);
        }
    });

    // Inicializar la página
    init();
});

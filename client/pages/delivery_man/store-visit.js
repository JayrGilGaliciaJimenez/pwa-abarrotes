/**
 * Store Visit - Página de visita a tienda
 * Muestra los datos de la tienda escaneada por QR
 */

document.addEventListener("DOMContentLoaded", async function () {
  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const storeContent = document.getElementById("storeContent");

  const storeName = document.getElementById("storeName");
  const storeAddress = document.getElementById("storeAddress");
  const storeMapIframe = document.getElementById("storeMapIframe");
  const productsCount = document.getElementById("productsCount");
  const productsList = document.getElementById("productsList");
  const registerVisitBtn = document.getElementById("registerVisitBtn");

  // Elementos del modal de productos
  const productsModal = document.getElementById("productsModal");
  const modalLoading = document.getElementById("modalLoading");
  const modalError = document.getElementById("modalError");
  const availableProductsList = document.getElementById(
    "availableProductsList"
  );
  const retryLoadProducts = document.getElementById("retryLoadProducts");
  const confirmAddProducts = document.getElementById("confirmAddProducts");

  let storeData = null;
  let availableProducts = []; // Productos disponibles desde el servidor
  let selectedProducts = []; // Productos seleccionados en el modal

  const MAX_DISTANCE_METERS = 50; // Distancia máxima permitida en metros

  // Variables para la cámara
  let cameraStream = null;
  let capturedPhotoData = null; // Almacena la foto capturada en base64

  // Inicializar QROfflineService
  console.log("[StoreVisit] Inicializando QROfflineService...");
  try {
    await qrOfflineService.initialize();
    console.log("[StoreVisit] QROfflineService inicializado correctamente");
  } catch (error) {
    console.error("[StoreVisit] Error al inicializar QROfflineService:", error);
  }

  // Elementos del modal de cámara
  const cameraModal = document.getElementById("cameraModal");
  const cameraView = document.getElementById("cameraView");
  const previewView = document.getElementById("previewView");
  const cameraError = document.getElementById("cameraError");
  const cameraVideo = document.getElementById("cameraVideo");
  const photoCanvas = document.getElementById("photoCanvas");
  const capturedPhoto = document.getElementById("capturedPhoto");
  const capturePhotoBtn = document.getElementById("capturePhotoBtn");
  const retakePhotoBtn = document.getElementById("retakePhotoBtn");
  const confirmPhotoBtn = document.getElementById("confirmPhotoBtn");
  const retryCameraBtn = document.getElementById("retryCameraBtn");

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
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
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
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada en este dispositivo"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }
  const storedData = sessionStorage.getItem("currentStore");

  if (storedData) {
    var storeObj = JSON.parse(storedData);
    console.log("tienda actual", storeObj);
    console.log("uuid tienda actual", storeObj.uuid);
  }
  /**
   * Inicializa la página
   */
  function init() {
    // Obtener datos de la tienda desde sessionStorage

    if (!storedData) {
      showError();
      return;
    }

    try {
      storeData = JSON.parse(storedData);
      displayStoreData(storeData);
    } catch (error) {
      console.error("Error al parsear datos de tienda:", error);
      showError();
    }
  }

  /**
   * Muestra el estado de error
   */
  function showError() {
    loadingState.classList.add("d-none");
    errorState.classList.remove("d-none");
    storeContent.classList.add("d-none");
  }

  /**
   * Muestra los datos de la tienda en la página
   * @param {object} store - Datos de la tienda
   */
  function displayStoreData(store) {
    // Ocultar loading y mostrar contenido
    loadingState.classList.add("d-none");
    errorState.classList.add("d-none");
    storeContent.classList.remove("d-none");

    // Llenar información básica
    storeName.textContent = store.name || "Sin nombre";
    storeAddress.textContent = store.address || "Sin dirección";

    // Configurar el mapa con las coordenadas de la tienda
    if (store.latitude && store.longitude) {
      const mapSrc = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d500!2d${store.longitude}!3d${store.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM!5e0!3m2!1ses!2smx!4v1`;
      storeMapIframe.src = mapSrc;
    } else {
      // Si no hay coordenadas, ocultar el iframe o mostrar mensaje
      storeMapIframe.parentElement.innerHTML =
        '<div class="text-center text-muted py-4">No hay ubicación disponible</div>';
    }

    // Mostrar productos
    displayProducts(store.products || []);
  }

  /**
   * Muestra la lista de productos
   * @param {array} products - Lista de productos
   */
  function displayProducts(products) {
    productsCount.textContent = products.length;
    const productsTotal = document.getElementById("productsTotal");

    if (products.length === 0) {
      productsList.innerHTML = `
                <div class="list-group-item text-center text-muted py-4">
                    No hay productos registrados
                </div>
            `;
      productsTotal.textContent = "$0.00";
      return;
    }

    productsList.innerHTML = products
      .map(function (product, index) {
        const productId = product.id || product._id;
        const quantity = product.quantity || 1;
        const price = product.basePrice || 0;
        const subtotal = price * quantity;

        return `
                <div class="list-group-item product-item" data-product-index="${index}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h6 class="product-name mb-1">${
                              product.name || "Producto"
                            }</h6>
                            <small class="text-muted">${
                              product.description || ""
                            }</small>
                            <div class="text-muted small">$${price.toFixed(
                              2
                            )} c/u</div>
                        </div>
                        <div class="text-end">
                            <div class="product-subtotal fw-bold mb-2">$${subtotal.toFixed(
                              2
                            )}</div>
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-danger btn-quantity-decrease" data-index="${index}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
                                    </svg>
                                </button>
                                <span class="btn btn-outline-secondary disabled quantity-display">${quantity}</span>
                                <button type="button" class="btn btn-outline-success btn-quantity-increase" data-index="${index}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      })
      .join("");

    // Agregar event listeners a los botones de cantidad
    document.querySelectorAll(".btn-quantity-decrease").forEach(function (btn) {
      btn.addEventListener("click", handleQuantityDecrease);
    });
    document.querySelectorAll(".btn-quantity-increase").forEach(function (btn) {
      btn.addEventListener("click", handleQuantityIncrease);
    });

    // Actualizar total
    updateTotal();
  }

  /**
   * Actualiza el total de productos
   */
  function updateTotal() {
    const productsTotal = document.getElementById("productsTotal");
    const products = storeData.products || [];

    const total = products.reduce(function (sum, product) {
      const price = product.basePrice || 0;
      const quantity = product.quantity || 1;
      return sum + price * quantity;
    }, 0);

    productsTotal.textContent = "$" + total.toFixed(2);
  }

  /**
   * Maneja la disminución de cantidad
   */
  function handleQuantityDecrease(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    const product = storeData.products[index];

    if (!product) return;

    const currentQuantity = product.quantity || 1;
    const newQuantity = currentQuantity - 1;

    if (newQuantity <= 0) {
      // Eliminar producto de la lista
      storeData.products.splice(index, 1);
    } else {
      // Actualizar cantidad
      storeData.products[index].quantity = newQuantity;
    }

    // Actualizar sessionStorage
    sessionStorage.setItem("currentStore", JSON.stringify(storeData));

    // Actualizar la vista
    displayProducts(storeData.products);
  }

  /**
   * Maneja el aumento de cantidad
   */
  function handleQuantityIncrease(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    const product = storeData.products[index];

    if (!product) return;

    const currentQuantity = product.quantity || 1;
    storeData.products[index].quantity = currentQuantity + 1;

    // Actualizar sessionStorage
    sessionStorage.setItem("currentStore", JSON.stringify(storeData));

    // Actualizar la vista
    displayProducts(storeData.products);
  }

  /**
   * Abre el modal de cámara para tomar foto (primer paso del nuevo flujo)
   */
  registerVisitBtn.addEventListener("click", function () {
    if (!storeData) return;

    // Validar que la tienda tenga coordenadas
    if (!storeData.latitude || !storeData.longitude) {
      Swal.fire({
        icon: "error",
        title: "Sin ubicación",
        text: "Esta tienda no tiene coordenadas registradas. No se puede validar la ubicación.",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#0d6efd",
      });
      return;
    }

    // Limpiar foto anterior si existe
    capturedPhotoData = null;

    // Abrir modal de cámara
    const modal = new bootstrap.Modal(cameraModal);
    modal.show();
  });

  /**
   * Inicia la cámara cuando se abre el modal
   */
  async function startCamera() {
    // Resetear vistas
    cameraView.classList.remove("d-none");
    previewView.classList.add("d-none");
    cameraError.classList.add("d-none");

    try {
      // Solicitar acceso a la cámara (preferir cámara trasera en móviles)
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      cameraVideo.srcObject = cameraStream;
      await cameraVideo.play();
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
      showCameraError();
    }
  }

  /**
   * Detiene la cámara y libera recursos
   */
  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (track) {
        track.stop();
      });
      cameraStream = null;
    }
    cameraVideo.srcObject = null;
  }

  /**
   * Muestra el error de cámara
   */
  function showCameraError() {
    cameraView.classList.add("d-none");
    previewView.classList.add("d-none");
    cameraError.classList.remove("d-none");
  }

  /**
   * Captura una foto del video
   */
  function capturePhoto() {
    const context = photoCanvas.getContext("2d");

    // Configurar el canvas con las dimensiones del video
    photoCanvas.width = cameraVideo.videoWidth;
    photoCanvas.height = cameraVideo.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(cameraVideo, 0, 0, photoCanvas.width, photoCanvas.height);

    // Convertir a base64
    capturedPhotoData = photoCanvas.toDataURL("image/jpeg", 0.8);

    // Mostrar preview
    capturedPhoto.src = capturedPhotoData;

    // Cambiar a vista de preview
    cameraView.classList.add("d-none");
    previewView.classList.remove("d-none");
  }

  /**
   * Vuelve a mostrar la cámara para tomar otra foto
   */
  function retakePhoto() {
    capturedPhotoData = null;
    capturedPhoto.src = "";

    // Volver a vista de cámara
    previewView.classList.add("d-none");
    cameraView.classList.remove("d-none");
  }

  /**
   * Confirma la foto y procede a validar ubicación
   */
  async function confirmPhoto() {
    if (!capturedPhotoData) {
      Swal.fire({
        icon: "info",
        title: "Foto requerida",
        text: "Por favor, toma una foto primero.",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#0d6efd",
      });
      return;
    }

    // Cerrar modal de cámara
    const modal = bootstrap.Modal.getInstance(cameraModal);
    modal.hide();

    // Ahora validar ubicación y registrar visita
    await validateLocationAndRegister();
  }

  /**
   * Convierte una imagen base64 a un objeto File
   * @param {string} base64Data - Datos en base64 (con prefijo data:image/...)
   * @param {string} filename - Nombre del archivo
   * @returns {File}
   */
  function base64ToFile(base64Data, filename) {
    const arr = base64Data.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  /**
   * Valida la ubicación y registra la visita (después de confirmar foto)
   * Con soporte offline usando PouchDB y QROfflineService
   */
  async function validateLocationAndRegister() {
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

      // Validar si está dentro del rango permitido
      if (distance > MAX_DISTANCE_METERS) {
        registerVisitBtn.disabled = false;
        registerVisitBtn.innerHTML = "Registrar Visita";

        // Limpiar foto capturada ya que falló la validación
        capturedPhotoData = null;

        Swal.fire({
          icon: "warning",
          title: "Ubicación muy lejana",
          html: `
                        <div class="text-center">
                            <p class="mb-2">No estás lo suficientemente cerca de la tienda.</p>
                            <div class="d-flex justify-content-center gap-4 my-3">
                                <div>
                                    <div class="fs-4 fw-bold text-danger">${distance.toFixed(
                                      0
                                    )}m</div>
                                    <small class="text-muted">Distancia actual</small>
                                </div>
                                <div>
                                    <div class="fs-4 fw-bold text-success">${MAX_DISTANCE_METERS}m</div>
                                    <small class="text-muted">Máximo permitido</small>
                                </div>
                            </div>
                            <p class="text-muted small mb-0">Acércate más a la tienda para registrar la visita.</p>
                        </div>
                    `,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#0d6efd",
        });
        return;
      }

      // Proceder con el registro
      registerVisitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Registrando...
            `;

      // Obtener el userUuid del token (decodificar JWT)
      const token = localStorage.getItem("token");
      let userUuid = null;

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userUuid = payload.uuid || payload.sub || payload.userId;
        } catch (e) {
          console.error("Error al decodificar token:", e);
        }
      }

      if (!userUuid) {
        throw new Error(
          "No se pudo obtener el usuario. Por favor, inicia sesión nuevamente."
        );
      }

      // Preparar los productos para el pedido
      const ordersJson = (storeData.products || []).map(function (product) {
        return {
          productUuid: product.uuid || product._id || product.id,
          quantity: product.quantity || 1,
        };
      });

      const storeUuid = storeData.uuid || storeData._id || storeData.id;

      console.log("[StoreVisit] Preparando visita:", {
        userUuid: userUuid,
        storeUuid: storeUuid,
        ordersCount: ordersJson.length,
        hasPhoto: !!capturedPhotoData,
        isOnline: navigator.onLine,
      });

      // VERIFICAR CONEXIÓN PRIMERO
      if (navigator.onLine) {
        // FLUJO ONLINE: Intentar enviar al servidor
        console.log("[StoreVisit] Online - Enviando al servidor...");
        try {
          await registerVisitOnline(userUuid, storeUuid, ordersJson, token);
        } catch (error) {
          // Si falla el envío online, intentar guardar offline como fallback
          console.warn("[StoreVisit] Error en envío online, intentando guardar offline...", error);
          await registerVisitOffline(userUuid, storeUuid, ordersJson, userLat, userLon);
        }
      } else {
        // FLUJO OFFLINE: Guardar en PouchDB
        console.log("[StoreVisit] Offline - Guardando en PouchDB...");
        await registerVisitOffline(userUuid, storeUuid, ordersJson, userLat, userLon);
      }
    } catch (error) {
      console.error("[StoreVisit] Error al registrar visita:", error);
      registerVisitBtn.disabled = false;
      registerVisitBtn.innerHTML = "Registrar Visita";

      // Limpiar foto capturada
      capturedPhotoData = null;

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.message || "Error al registrar la visita. Intenta de nuevo.",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#0d6efd",
      });
    }
  }

  /**
   * Registra la visita cuando hay conexión (envío inmediato)
   */
  async function registerVisitOnline(userUuid, storeUuid, ordersJson, token) {
    try {
      const requestUrl = `${BASE_URL}/visits`;

      // Crear FormData para enviar al servidor
      const formData = new FormData();
      formData.append("userUuid", userUuid);
      formData.append("storeUuid", storeUuid);
      formData.append("validation", true);
      formData.append("ordersJson", JSON.stringify(ordersJson));

      // Agregar la foto si existe
      if (capturedPhotoData) {
        const photoFile = base64ToFile(
          capturedPhotoData,
          "visit-photo-" + Date.now() + ".jpg"
        );
        formData.append("photo", photoFile);
      }

      console.log("[StoreVisit] Enviando POST a:", requestUrl);

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Error al registrar la visita`);
      }

      const result = await response.json();
      console.log("[StoreVisit] Visita registrada exitosamente:", result);

      // Limpiar datos
      sessionStorage.removeItem("currentStore");
      capturedPhotoData = null;

      // Mostrar mensaje de éxito
      showVisitSuccess();
    } catch (error) {
      console.error("[StoreVisit] Error en registro online:", error);
      throw error;
    }
  }

  /**
   * Registra la visita cuando NO hay conexión (guardado offline)
   */
  async function registerVisitOffline(userUuid, storeUuid, ordersJson, latitude, longitude) {
    try {
      // Preparar datos para guardar en PouchDB
      const visitData = {
        userUuid: userUuid,
        storeUuid: storeUuid,
        orders: ordersJson,
        photoBase64: capturedPhotoData, // Ya está en formato base64
        latitude: latitude,
        longitude: longitude,
      };

      console.log("[StoreVisit] Guardando visita offline en PouchDB...");

      // Guardar usando QROfflineService
      const result = await qrOfflineService.savePendingVisit(visitData);

      if (result.success) {
        console.log("[StoreVisit] Visita guardada offline exitosamente:", result.visitId);

        // Limpiar datos
        sessionStorage.removeItem("currentStore");
        capturedPhotoData = null;

        // Mostrar mensaje de guardado offline
        showVisitPendingSuccess();
      } else {
        throw new Error("No se pudo guardar la visita offline");
      }
    } catch (error) {
      console.error("[StoreVisit] Error en registro offline:", error);
      throw new Error("No hay conexión y no se pudo guardar la visita localmente: " + error.message);
    }
  }


  /**
   * Muestra mensaje de éxito cuando la visita se registra online
   */
  function showVisitSuccess() {
    // Limpiar datos de sessionStorage
    sessionStorage.removeItem("currentStore");

    // Limpiar foto capturada
    capturedPhotoData = null;

    Swal.fire({
      icon: "success",
      title: "¡Visita registrada!",
      text: "La visita se ha registrado correctamente.",
      confirmButtonText: "Ir al Dashboard",
      confirmButtonColor: "#198754",
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 2500);
  }

  /**
   * Muestra mensaje de éxito cuando la visita se guarda para sync offline
   */
  function showVisitPendingSuccess() {
    // Mostrar SweetAlert de pendiente
    Swal.fire({
      icon: "info",
      title: "Visita guardada localmente",
      html: `
                <p>Sin conexión a internet.</p>
                <p class="text-muted small">La visita se enviará automáticamente cuando recuperes la conexión.</p>
            `,
      confirmButtonText: "Ir al Dashboard",
      confirmButtonColor: "#0d6efd",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then(function () {
      window.location.href = "./dashboard.html";
    });
  }

  // Event listeners para el modal de cámara
  cameraModal.addEventListener("shown.bs.modal", function () {
    startCamera();
  });

  cameraModal.addEventListener("hidden.bs.modal", function () {
    stopCamera();
    // Resetear vistas
    cameraView.classList.remove("d-none");
    previewView.classList.add("d-none");
    cameraError.classList.add("d-none");
  });

  // Event listener para capturar foto
  capturePhotoBtn.addEventListener("click", capturePhoto);

  // Event listener para tomar otra foto
  retakePhotoBtn.addEventListener("click", retakePhoto);

  // Event listener para confirmar foto
  confirmPhotoBtn.addEventListener("click", confirmPhoto);

  // Event listener para reintentar acceso a cámara
  retryCameraBtn.addEventListener("click", startCamera);

  /**
   * Carga los productos desde el servidor
   */
  async function loadAvailableProducts() {
    // Resetear estado del modal
    modalLoading.classList.remove("d-none");
    modalError.classList.add("d-none");
    availableProductsList.classList.add("d-none");
    availableProductsList.innerHTML = "";

    // Limpiar arrays
    availableProducts = [];
    selectedProducts = [];

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BASE_URL}/products/findByStore/${storeObj.uuid}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener productos");
      }

      const data = await response.json();
      console.log("Productos obtenidos:", data);

      // Obtener todos los productos del servidor
      let allProducts = data.data || data || [];

      // Asegurar que sea un array
      if (!Array.isArray(allProducts)) {
        console.warn("Los productos no son un array:", allProducts);
        allProducts = [];
      }

      // Verificar si la tienda no tiene productos
      if (allProducts.length === 0) {
        modalLoading.classList.add("d-none");
        modalError.classList.add("d-none");
        availableProductsList.classList.remove("d-none");
        availableProductsList.innerHTML = `
                    <div class="text-center py-5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="#6c757d" class="mb-3" viewBox="0 0 16 16">
                            <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
                        </svg>
                        <h5 class="text-muted mb-2">Esta tienda no tiene productos</h5>
                        <p class="text-muted small mb-0">No hay productos registrados para esta tienda.</p>
                        <p class="text-muted small">Contacta al administrador para agregar productos.</p>
                    </div>
                `;
        confirmAddProducts.disabled = true;
        confirmAddProducts.classList.add("btn-secondary");
        confirmAddProducts.classList.remove("btn-primary");
        return;
      }

      // Filtrar productos que ya están en la tienda
      availableProducts = filterAvailableProducts(allProducts);

      // Mostrar info de productos ya agregados
      updateCurrentProductsInfo(allProducts.length, availableProducts.length);

      displayAvailableProducts();
    } catch (error) {
      console.error("Error al cargar productos:", error);
      modalLoading.classList.add("d-none");
      modalError.classList.remove("d-none");
    }
  }

  /**
   * Actualiza la información de productos ya agregados en el modal
   */
  function updateCurrentProductsInfo(totalProducts, availableCount) {
    const currentProductsInfo = document.getElementById("currentProductsInfo");
    const currentProductsCount = document.getElementById(
      "currentProductsCount"
    );
    const alreadyAddedCount = totalProducts - availableCount;

    if (alreadyAddedCount > 0) {
      currentProductsInfo.classList.remove("d-none");
      currentProductsCount.textContent = alreadyAddedCount;
    } else {
      currentProductsInfo.classList.add("d-none");
    }
  }

  /**
   * Filtra productos que ya están agregados a la lista de la tienda
   */
  function filterAvailableProducts(allProducts) {
    if (!storeData || !storeData.products || storeData.products.length === 0) {
      return allProducts;
    }

    // Obtener IDs de productos ya agregados (con manejo de diferentes formatos)
    const existingProductIds = storeData.products
      .map(function (product) {
        // Manejar diferentes formatos de ID
        return product.uuid || product._id || product.productId;
      })
      .filter(function (id) {
        return id !== undefined && id !== null;
      })
      .map(function (id) {
        return id.toString();
      }); // Convertir todos a string para comparación

    console.log("IDs de productos ya agregados:", existingProductIds);

    // Filtrar productos que NO están en la lista de agregados
    return allProducts.filter(function (product) {
      const rawId = product.uuid || product._id;
      // Si el producto no tiene ID, incluirlo igual
      if (rawId === undefined || rawId === null) {
        console.warn("Producto sin ID encontrado:", product.name);
        return true;
      }
      const productId = rawId.toString();
      const isAlreadyAdded = existingProductIds.includes(productId);
      if (isAlreadyAdded) {
        console.log(
          "Producto filtrado (ya agregado):",
          product.name,
          productId
        );
      }
      return !isAlreadyAdded;
    });
  }

  /**
   * Muestra los productos disponibles en el modal
   */
  function displayAvailableProducts() {
    modalLoading.classList.add("d-none");
    modalError.classList.add("d-none");

    // Actualizar contador de seleccionados
    updateSelectedCount();

    if (availableProducts.length === 0) {
      availableProductsList.classList.remove("d-none");
      availableProductsList.innerHTML = `
                <div class="text-center py-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="#6c757d" class="mb-3" viewBox="0 0 16 16">
                        <path d="M11 7.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                    <h6 class="text-muted">Todos los productos ya están agregados</h6>
                    <p class="text-muted small">No hay más productos disponibles para agregar</p>
                </div>
            `;
      confirmAddProducts.disabled = true;
      confirmAddProducts.classList.add("btn-secondary");
      confirmAddProducts.classList.remove("btn-primary");
      return;
    }

    availableProductsList.classList.remove("d-none");

    availableProductsList.innerHTML = availableProducts
      .map(function (product) {
        const productId = product.id || product._id;
        const productName = product.name || "Producto sin nombre";
        const productPrice = product.basePrice || product.price || 0;
        const productDescription = product.description || "";

        return `
                <div class="product-item-modal p-3 border-bottom">
                    <div class="form-check">
                        <input class="form-check-input product-checkbox"
                               type="checkbox"
                               value="${productId}"
                               id="product-${productId}"
                               data-product='${JSON.stringify(product).replace(
                                 /'/g,
                                 "&apos;"
                               )}'>
                        <label class="form-check-label w-100" for="product-${productId}">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1 me-3">
                                    <h6 class="mb-1 product-name">${productName}</h6>
                                    ${
                                      productDescription
                                        ? `<small class="text-muted d-block">${productDescription}</small>`
                                        : ""
                                    }
                                </div>
                                <div class="text-end">
                                    <div class="fw-bold text-primary">$${productPrice.toFixed(
                                      2
                                    )}</div>
                                    <small class="text-muted">c/u</small>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            `;
      })
      .join("");

    // Agregar event listeners a los checkboxes
    document.querySelectorAll(".product-checkbox").forEach(function (checkbox) {
      checkbox.addEventListener("change", handleProductSelection);
    });
  }

  /**
   * Maneja la selección/deselección de productos
   */
  function handleProductSelection(event) {
    const checkbox = event.target;
    const product = JSON.parse(checkbox.dataset.product);

    if (checkbox.checked) {
      selectedProducts.push(product);
    } else {
      const productId = product.id || product._id;
      selectedProducts = selectedProducts.filter(function (p) {
        return (p.id || p._id) !== productId;
      });
    }

    // Actualizar contador y estado del botón
    updateSelectedCount();
  }

  /**
   * Actualiza el contador de productos seleccionados y el estado del botón
   */
  function updateSelectedCount() {
    const selectedCount = document.getElementById("selectedCount");
    selectedCount.textContent = selectedProducts.length;

    // Actualizar estado del botón de confirmación
    confirmAddProducts.disabled = selectedProducts.length === 0;
    if (selectedProducts.length === 0) {
      confirmAddProducts.classList.add("btn-secondary");
      confirmAddProducts.classList.remove("btn-primary");
    } else {
      confirmAddProducts.classList.remove("btn-secondary");
      confirmAddProducts.classList.add("btn-primary");
    }
  }

  /**
   * Confirma la adición de productos seleccionados
   */
  function confirmProductsSelection() {
    if (selectedProducts.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Selección requerida",
        text: "Por favor, selecciona al menos un producto.",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#0d6efd",
      });
      return;
    }

    if (!storeData.products) {
      storeData.products = [];
    }

    // Agregar cantidad inicial a cada producto
    const productsWithQuantity = selectedProducts.map(function (product) {
      return {
        ...product,
        quantity: 1,
        // Asegurar que el ID esté disponible
        id: product.id || product._id,
        basePrice: product.basePrice || product.price || 0,
      };
    });

    // Agregar productos a la lista
    storeData.products = [...storeData.products, ...productsWithQuantity];

    // Actualizar sessionStorage
    sessionStorage.setItem("currentStore", JSON.stringify(storeData));

    // Actualizar la vista de productos
    displayProducts(storeData.products);

    // Limpiar y cerrar modal
    selectedProducts = [];
    availableProducts = [];
    const modal = bootstrap.Modal.getInstance(productsModal);
    modal.hide();

    // Mostrar mensaje de éxito
    showToast(
      `${productsWithQuantity.length} producto(s) agregado(s) correctamente`
    );
  }

  /**
   * Muestra un mensaje toast
   */
  function showToast(message) {
    // Crear elemento toast si no existe
    let toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toastContainer";
      toastContainer.className =
        "toast-container position-fixed bottom-0 end-0 p-3";
      document.body.appendChild(toastContainer);
    }

    const toastId = "toast-" + Date.now();
    const toast = document.createElement("div");
    toast.id = toastId;
    toast.className = "toast align-items-center text-bg-success border-0";
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");

    toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

    toastContainer.appendChild(toast);

    // Mostrar toast
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();

    // Remover del DOM después de ocultarse
    toast.addEventListener("hidden.bs.toast", function () {
      toast.remove();
    });
  }

  // Event listener para abrir el modal
  productsModal.addEventListener("show.bs.modal", function () {
    // Limpiar selección previa cada vez que se abre
    selectedProducts = [];
    availableProducts = [];
    confirmAddProducts.disabled = true;
    confirmAddProducts.classList.add("btn-secondary");
    confirmAddProducts.classList.remove("btn-primary");
    loadAvailableProducts();
  });

  // Event listener para reintentar carga
  retryLoadProducts.addEventListener("click", loadAvailableProducts);

  // Event listener para confirmar selección
  confirmAddProducts.addEventListener("click", confirmProductsSelection);

  // Event listener para limpiar al cerrar el modal
  productsModal.addEventListener("hidden.bs.modal", function () {
    // Limpiar selección al cerrar
    selectedProducts = [];
    availableProducts = [];
  });

  // Listener para sincronización cuando regresa la conexión
  window.addEventListener('online', async function () {
    console.log('[StoreVisit] 🟢 Conexión restaurada, verificando visitas pendientes...');

    try {
      // Esperar 2 segundos para que la conexión se estabilice
      setTimeout(async function () {
        if (qrOfflineService && qrOfflineService.isInitialized) {
          const stats = await qrOfflineService.getCacheStats();

          if (stats.pendingVisits > 0) {
            console.log(`[StoreVisit] 📤 ${stats.pendingVisits} visitas pendientes, sincronizando...`);
            const result = await qrOfflineService.syncAllPendingVisits();

            if (result.success && result.synced > 0) {
              console.log(`[StoreVisit] ✅ ${result.synced} visitas sincronizadas exitosamente`);

              // Mostrar notificación al usuario
              if (typeof Swal !== 'undefined') {
                Swal.fire({
                  icon: 'success',
                  title: 'Sincronización completada',
                  text: `${result.synced} visita(s) sincronizada(s) con el servidor`,
                  timer: 3000,
                  showConfirmButton: false,
                  toast: true,
                  position: 'top-end'
                });
              }
            } else if (result.failed > 0) {
              console.warn(`[StoreVisit] ⚠️ ${result.failed} visitas fallaron al sincronizar`);
            }
          } else {
            console.log('[StoreVisit] ✅ No hay visitas pendientes para sincronizar');
          }
        }
      }, 2000);
    } catch (error) {
      console.error('[StoreVisit] Error al sincronizar visitas:', error);
    }
  });

  // Verificar visitas pendientes al cargar la página (si hay conexión)
  if (navigator.onLine && qrOfflineService && qrOfflineService.isInitialized) {
    setTimeout(async function () {
      try {
        const stats = await qrOfflineService.getCacheStats();
        if (stats.pendingVisits > 0) {
          console.log(`[StoreVisit] 📋 ${stats.pendingVisits} visitas pendientes detectadas al cargar`);
          console.log('[StoreVisit] 🔄 Intentando sincronizar automáticamente...');
          await qrOfflineService.syncAllPendingVisits();
        }
      } catch (error) {
        console.error('[StoreVisit] Error al verificar visitas pendientes:', error);
      }
    }, 3000);
  }

  // Inicializar la página
  init();
});

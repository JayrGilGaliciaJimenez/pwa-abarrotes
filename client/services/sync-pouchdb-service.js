/**
 * Hybrid Sync Service
 * Maneja cache/sync de productos, tiendas y usuarios (repartidores)
 */

// Usar BASE_URL de properties.js si está disponible, sino usar fallback
const BACKEND_URL = window.BASE_URL || "http://localhost:82/api/v1";

class HybridSyncService {
  constructor() {
    this.dbProducts = null;
    this.dbStores = null;
    this.dbAssignments = null;
    this.dbUsers = null;
    this.isInitialized = false;

    console.log("[HybridSync] Servicio creado");
  }

  /**
   * Inicializar PouchDB
   */
  async initialize() {
    try {
      console.log("[HybridSync] Inicializando PouchDB...");
      this.dbProducts = new PouchDB("products");
      this.dbStores = new PouchDB("stores");
      this.dbAssignments = new PouchDB("assignments");
      this.dbUsers = new PouchDB("users");
      this.isInitialized = true;

      console.log(
        "[HybridSync] ✅ PouchDB inicializado (productos, tiendas, asignaciones y usuarios)",
      );

      // Setup auto-sync cuando vuelva conexión
      this.setupAutoSync();

      return true;
    } catch (error) {
      console.error("[HybridSync] ❌ Error al inicializar:", error);
      throw error;
    }
  }

  /**
   * Obtener token de autorización
   */
  getAuthToken() {
    return localStorage.getItem("token");
  }

  /**
   * Headers para requests
   */
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    const token = this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  // ==========================================
  // GET PRODUCTS (LISTAR)
  // ==========================================

  /**
   * Obtener todos los productos
   * - Con internet: GET al backend + cachea en PouchDB
   * - Sin internet: Lee de PouchDB
   */
  async getAllProducts() {
    console.log("[HybridSync] 📦 Obteniendo productos...");
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Cargando productos desde BACKEND...");

        // 1. GET al backend
        const response = await fetch(`${BACKEND_URL}/products`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const products = responseData.data; // Los productos están en .data
        console.log(
          `[HybridSync] ✅ ${products.length} productos obtenidos del backend`,
        );

        // 2. Cachear en PouchDB para uso offline
        await this.cacheProductsInPouchDB(products);

        return products;
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al cargar del backend, usando caché:",
          error.message,
        );
        // Si falla, cargar desde caché
        return await this.loadProductsFromCache();
      }
    } else {
      // Sin internet, cargar desde caché
      console.log("[HybridSync] 📴 SIN INTERNET - Cargando desde caché...");
      return await this.loadProductsFromCache();
    }
  }

  /**
   * Cachear productos del backend en PouchDB
   */
  async cacheProductsInPouchDB(products) {
    try {
      console.log("[HybridSync] 💾 Cacheando productos en PouchDB...");

      for (const product of products) {
        try {
          // Intentar obtener el documento existente
          const existingDoc = await this.dbProducts
            .get(product.uuid)
            .catch(() => null);

          if (existingDoc) {
            // Actualizar documento existente
            await this.dbProducts.put({
              _id: product.uuid,
              _rev: existingDoc._rev,
              ...product,
              cachedAt: new Date().toISOString(),
            });
          } else {
            // Crear nuevo documento
            await this.dbProducts.put({
              _id: product.uuid,
              ...product,
              cachedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.warn(
            `[HybridSync] ⚠️ Error cacheando producto ${product.name}:`,
            error.message,
          );
        }
      }

      console.log("[HybridSync] ✅ Productos cacheados correctamente");
    } catch (error) {
      console.error("[HybridSync] ❌ Error al cachear productos:", error);
    }
  }

  /**
   * Cargar productos desde caché local (PouchDB)
   * INCLUYE registros pendientes de sincronización (temp_*)
   */
  async loadProductsFromCache() {
    try {
      console.log(
        "[HybridSync] 📂 Cargando productos desde CACHÉ (PouchDB)...",
      );

      const result = await this.dbProducts.allDocs({
        include_docs: true,
        descending: true,
      });

      // INCLUIR TODOS los registros, incluso los temp_* (pendientes)
      const products = result.rows
        .filter((row) => !row.id.startsWith("_design/"))
        .map((row) => row.doc);

      // Contar cuántos están pendientes
      const pendingCount = products.filter(
        (p) => p.syncPending === true,
      ).length;

      console.log(
        `[HybridSync] ✅ ${products.length} productos cargados desde caché (${pendingCount} pendientes)`,
      );
      return products;
    } catch (error) {
      console.error("[HybridSync] ❌ Error al cargar desde caché:", error);
      return [];
    }
  }

  // ==========================================
  // POST PRODUCTS (CREAR)
  // ==========================================

  /**
   * Crear producto
   * - Con internet: POST al backend inmediatamente
   * - Sin internet: Guardar en PouchDB con flag pendiente
   */
  async createProduct(productData) {
    console.log("[HybridSync] ➕ Creando producto:", productData);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando producto al BACKEND...");

        // 1. POST al backend
        const response = await fetch(`${BACKEND_URL}/products`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const savedProduct = responseData.data; // El producto guardado está en .data
        console.log(
          "[HybridSync] ✅ Producto guardado en backend:",
          savedProduct.uuid,
        );

        // 2. Cachear en PouchDB
        await this.dbProducts.put({
          _id: savedProduct.uuid,
          ...savedProduct,
          cachedAt: new Date().toISOString(),
        });

        console.log("[HybridSync] ✅ Producto cacheado en PouchDB");
        return { success: true, product: savedProduct };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al guardar en backend, guardando localmente:",
          error.message,
        );
        // Si falla, guardar localmente
        return await this.saveProductOffline(productData);
      }
    } else {
      // Sin internet, guardar localmente
      console.log("[HybridSync] 📴 SIN INTERNET - Guardando localmente...");
      return await this.saveProductOffline(productData);
    }
  }

  /**
   * Guardar producto offline (pendiente de sincronización)
   */
  async saveProductOffline(productData) {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const doc = {
        _id: tempId,
        ...productData,
        syncPending: true,
        syncOperation: "create",
        syncTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dbProducts.put(doc);
      console.log(
        "[HybridSync] ✅ Producto guardado OFFLINE (pendiente de sincronización)",
      );

      return { success: true, product: doc, offline: true };
    } catch (error) {
      console.error("[HybridSync] ❌ Error al guardar offline:", error);
      throw error;
    }
  }

  // ==========================================
  // PUT PRODUCTS (ACTUALIZAR)
  // ==========================================

  /**
   * Actualizar producto existente
   * - Con internet: PUT al backend inmediatamente
   * - Sin internet: Actualizar en PouchDB con flag pendiente
   */
  async updateProduct(productUuid, productData) {
    console.log(
      "[HybridSync] ✏️ Actualizando producto:",
      productUuid,
      productData,
    );
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando actualización al BACKEND...");

        // 1. PUT al backend
        const response = await fetch(`${BACKEND_URL}/products/${productUuid}`, {
          method: "PUT",
          headers: this.getHeaders(),
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const updatedProduct = responseData.data;
        console.log(
          "[HybridSync] ✅ Producto actualizado en backend:",
          updatedProduct.uuid,
        );

        // 2. Actualizar en PouchDB con datos del backend
        try {
          const existingDoc = await this.dbProducts.get(productUuid);
          await this.dbProducts.put({
            _id: updatedProduct.uuid,
            _rev: existingDoc._rev,
            ...updatedProduct,
            cachedAt: new Date().toISOString(),
          });
          console.log("[HybridSync] ✅ Producto actualizado en caché");
        } catch (error) {
          console.warn(
            "[HybridSync] ⚠️ No se pudo actualizar en caché:",
            error.message,
          );
        }

        return { success: true, product: updatedProduct };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al actualizar en backend, guardando localmente:",
          error.message,
        );
        // Si falla, actualizar localmente con flag pendiente
        return await this.updateProductOffline(productUuid, productData);
      }
    } else {
      // Sin internet, actualizar localmente
      console.log("[HybridSync] 📴 SIN INTERNET - Actualizando localmente...");
      return await this.updateProductOffline(productUuid, productData);
    }
  }

  /**
   * Actualizar producto offline (pendiente de sincronización)
   */
  async updateProductOffline(productUuid, productData) {
    try {
      // Intentar obtener el documento existente
      let existingDoc;
      try {
        existingDoc = await this.dbProducts.get(productUuid);
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Producto no encontrado en caché, creando nuevo documento",
        );
        existingDoc = { _id: productUuid };
      }

      const doc = {
        _id: productUuid,
        _rev: existingDoc._rev,
        ...productData,
        uuid: productUuid,
        syncPending: true,
        syncOperation: "update",
        productUuid: productUuid, // Para saber qué producto actualizar
        syncTimestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      await this.dbProducts.put(doc);
      console.log(
        "[HybridSync] ✅ Producto actualizado OFFLINE (pendiente de sincronización)",
      );

      return { success: true, product: doc, offline: true };
    } catch (error) {
      console.error("[HybridSync] ❌ Error al actualizar offline:", error);
      throw error;
    }
  }

  // ==========================================
  // DELETE PRODUCTS (ELIMINAR)
  // ==========================================

  /**
   * Eliminar producto existente
   * - Con internet: DELETE al backend inmediatamente
   * - Sin internet: Marcar en PouchDB como pendiente de eliminar
   */
  async deleteProduct(productUuid) {
    console.log("[HybridSync] 🗑️ Eliminando producto:", productUuid);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando DELETE al BACKEND...");

        // 1. DELETE al backend
        const response = await fetch(`${BACKEND_URL}/products/${productUuid}`, {
          method: "DELETE",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(
          "[HybridSync] ✅ Producto eliminado en backend:",
          productUuid,
        );

        // 2. Eliminar de PouchDB
        try {
          const existingDoc = await this.dbProducts.get(productUuid);
          await this.dbProducts.remove(existingDoc);
          console.log("[HybridSync] ✅ Producto eliminado del caché");
        } catch (error) {
          console.warn(
            "[HybridSync] ⚠️ Producto no estaba en caché:",
            error.message,
          );
        }

        return { success: true };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al eliminar en backend, marcando para eliminar:",
          error.message,
        );
        // Si falla, marcar para eliminar offline
        return await this.deleteProductOffline(productUuid);
      }
    } else {
      // Sin internet, marcar para eliminar
      console.log("[HybridSync] 📴 SIN INTERNET - Marcando para eliminar...");
      return await this.deleteProductOffline(productUuid);
    }
  }

  /**
   * Marcar producto para eliminar offline (pendiente de sincronización)
   */
  async deleteProductOffline(productUuid) {
    try {
      // Intentar obtener el documento existente
      let existingDoc;
      try {
        existingDoc = await this.dbProducts.get(productUuid);
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Producto no encontrado en caché:",
          productUuid,
        );
        // Si no existe en caché, creamos un documento temporal solo para marcar el delete
        existingDoc = { _id: productUuid };
      }

      const doc = {
        _id: productUuid,
        _rev: existingDoc._rev,
        uuid: productUuid,
        syncPending: true,
        syncOperation: "delete",
        productUuid: productUuid,
        syncTimestamp: Date.now(),
        deletedAt: new Date().toISOString(),
        // Preservar datos originales por si se necesita revertir
        ...existingDoc,
      };

      await this.dbProducts.put(doc);
      console.log(
        "[HybridSync] ✅ Producto marcado para ELIMINAR (pendiente de sincronización)",
      );

      return { success: true, offline: true };
    } catch (error) {
      console.error(
        "[HybridSync] ❌ Error al marcar para eliminar offline:",
        error,
      );
      throw error;
    }
  }

  // ==========================================
  // STORES (TIENDAS) - CRUD HÍBRIDO
  // ==========================================

  /**
   * Obtener todas las tiendas
   * - Con internet: GET al backend + cachea en PouchDB
   * - Sin internet: Lee de PouchDB
   */
  async getAllStores() {
    console.log("[HybridSync] 🏪 Obteniendo tiendas...");
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Cargando tiendas desde BACKEND...");

        // 1. GET al backend
        const response = await fetch(`${BACKEND_URL}/stores`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const stores = responseData.data; // Las tiendas están en .data
        console.log(
          `[HybridSync] ✅ ${stores.length} tiendas obtenidas del backend`,
        );

        // 2. Cachear en PouchDB para uso offline
        await this.cacheStoresInPouchDB(stores);

        return stores;
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al cargar del backend, usando caché:",
          error.message,
        );
        // Si falla, cargar desde caché
        return await this.loadStoresFromCache();
      }
    } else {
      // Sin internet, cargar desde caché
      console.log("[HybridSync] 📴 SIN INTERNET - Cargando desde caché...");
      return await this.loadStoresFromCache();
    }
  }

  /**
   * Cachear tiendas del backend en PouchDB
   */
  async cacheStoresInPouchDB(stores) {
    try {
      console.log("[HybridSync] 💾 Cacheando tiendas en PouchDB...");

      for (const store of stores) {
        try {
          // Intentar obtener el documento existente
          const existingDoc = await this.dbStores
            .get(store.uuid)
            .catch(() => null);

          if (existingDoc) {
            // Actualizar documento existente
            await this.dbStores.put({
              _id: store.uuid,
              _rev: existingDoc._rev,
              ...store,
              cachedAt: new Date().toISOString(),
            });
          } else {
            // Crear nuevo documento
            await this.dbStores.put({
              _id: store.uuid,
              ...store,
              cachedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.warn(
            `[HybridSync] ⚠️ Error cacheando tienda ${store.name}:`,
            error.message,
          );
        }
      }

      console.log("[HybridSync] ✅ Tiendas cacheadas correctamente");
    } catch (error) {
      console.error("[HybridSync] ❌ Error al cachear tiendas:", error);
    }
  }

  /**
   * Cargar tiendas desde caché local (PouchDB)
   * INCLUYE registros pendientes de sincronización (temp_*)
   */
  async loadStoresFromCache() {
    try {
      console.log("[HybridSync] 📂 Cargando tiendas desde CACHÉ (PouchDB)...");

      const result = await this.dbStores.allDocs({
        include_docs: true,
        descending: true,
      });

      // INCLUIR TODOS los registros, incluso los temp_* (pendientes)
      const stores = result.rows
        .filter((row) => !row.id.startsWith("_design/"))
        .map((row) => row.doc);

      // Contar cuántas están pendientes
      const pendingCount = stores.filter((s) => s.syncPending === true).length;

      console.log(
        `[HybridSync] ✅ ${stores.length} tiendas cargadas desde caché (${pendingCount} pendientes)`,
      );
      return stores;
    } catch (error) {
      console.error("[HybridSync] ❌ Error al cargar desde caché:", error);
      return [];
    }
  }

  /**
   * Crear tienda
   * - Con internet: POST al backend inmediatamente
   * - Sin internet: Guardar en PouchDB con flag pendiente
   */
  async createStore(storeData) {
    console.log("[HybridSync] ➕ Creando tienda:", storeData);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando tienda al BACKEND...");

        // 1. POST al backend
        const response = await fetch(`${BACKEND_URL}/stores`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(storeData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const savedStore = responseData.data; // La tienda guardada está en .data
        console.log(
          "[HybridSync] ✅ Tienda guardada en backend:",
          savedStore.uuid,
        );

        // 2. Cachear en PouchDB
        await this.dbStores.put({
          _id: savedStore.uuid,
          ...savedStore,
          cachedAt: new Date().toISOString(),
        });

        console.log("[HybridSync] ✅ Tienda cacheada en PouchDB");
        return { success: true, store: savedStore };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al guardar en backend, guardando localmente:",
          error.message,
        );
        // Si falla, guardar localmente
        return await this.saveStoreOffline(storeData);
      }
    } else {
      // Sin internet, guardar localmente
      console.log("[HybridSync] 📴 SIN INTERNET - Guardando localmente...");
      return await this.saveStoreOffline(storeData);
    }
  }

  /**
   * Guardar tienda offline (pendiente de sincronización)
   */
  async saveStoreOffline(storeData) {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const doc = {
        _id: tempId,
        ...storeData,
        syncPending: true,
        syncOperation: "create",
        syncTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dbStores.put(doc);
      console.log(
        "[HybridSync] ✅ Tienda guardada OFFLINE (pendiente de sincronización)",
      );

      return { success: true, store: doc, offline: true };
    } catch (error) {
      console.error("[HybridSync] ❌ Error al guardar offline:", error);
      throw error;
    }
  }

  // ==========================================
  // DELETE STORES (ELIMINAR TIENDAS)
  // ==========================================

  /**
   * Eliminar tienda existente
   * - Con internet: DELETE al backend inmediatamente
   * - Sin internet: Marcar en PouchDB como pendiente de eliminar
   */
  async deleteStore(storeUuid) {
    console.log("[HybridSync] 🗑️ Eliminando tienda:", storeUuid);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando DELETE al BACKEND...");

        // 1. DELETE al backend
        const response = await fetch(`${BACKEND_URL}/stores/${storeUuid}`, {
          method: "DELETE",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log("[HybridSync] ✅ Tienda eliminada en backend:", storeUuid);

        // 2. Eliminar de PouchDB
        try {
          const existingDoc = await this.dbStores.get(storeUuid);
          await this.dbStores.remove(existingDoc);
          console.log("[HybridSync] ✅ Tienda eliminada del caché");
        } catch (error) {
          console.warn(
            "[HybridSync] ⚠️ Tienda no estaba en caché:",
            error.message,
          );
        }

        return { success: true };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al eliminar en backend, marcando para eliminar:",
          error.message,
        );
        // Si falla, marcar para eliminar offline
        return await this.deleteStoreOffline(storeUuid);
      }
    } else {
      // Sin internet, marcar para eliminar
      console.log("[HybridSync] 📴 SIN INTERNET - Marcando para eliminar...");
      return await this.deleteStoreOffline(storeUuid);
    }
  }

  /**
   * Marcar tienda para eliminar offline (pendiente de sincronización)
   */
  async deleteStoreOffline(storeUuid) {
    try {
      // Intentar obtener el documento existente
      let existingDoc;
      try {
        existingDoc = await this.dbStores.get(storeUuid);
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Tienda no encontrada en caché:",
          storeUuid,
        );
        // Si no existe en caché, creamos un documento temporal solo para marcar el delete
        existingDoc = { _id: storeUuid };
      }

      const doc = {
        _id: storeUuid,
        _rev: existingDoc._rev,
        uuid: storeUuid,
        syncPending: true,
        syncOperation: "delete",
        storeUuid: storeUuid,
        syncTimestamp: Date.now(),
        deletedAt: new Date().toISOString(),
        // Preservar datos originales por si se necesita revertir
        ...existingDoc,
      };

      await this.dbStores.put(doc);
      console.log(
        "[HybridSync] ✅ Tienda marcada para ELIMINAR (pendiente de sincronización)",
      );

      return { success: true, offline: true };
    } catch (error) {
      console.error(
        "[HybridSync] ❌ Error al marcar para eliminar offline:",
        error,
      );
      throw error;
    }
  }

  // ==========================================
  // USERS (USUARIOS) - GENERAL
  // ==========================================

  /**
   * Obtener todos los usuarios
   * - Con internet: GET al backend + cachea en PouchDB
   * - Sin internet: Lee de PouchDB
   */
  async getAllUsers() {
    console.log("[HybridSync] 👥 Obteniendo usuarios...");
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Cargando usuarios desde BACKEND...");

        // 1. GET al backend
        const response = await fetch(`${BACKEND_URL}/users`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const users = responseData.data; // Los usuarios están en .data
        console.log(
          `[HybridSync] ✅ ${users.length} usuarios obtenidos del backend`,
        );

        // 2. Cachear en PouchDB para uso offline
        await this.cacheUsersInPouchDB(users);

        return users;
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al cargar del backend, usando caché:",
          error.message,
        );
        // Si falla, cargar desde caché
        return await this.loadUsersFromCache();
      }
    } else {
      // Sin internet, cargar desde caché
      console.log("[HybridSync] 📴 SIN INTERNET - Cargando desde caché...");
      return await this.loadUsersFromCache();
    }
  }

  // ==========================================
  // USERS (REPARTIDORES) - CRUD HÍBRIDO
  // ==========================================

  /**
   * Obtener todos los repartidores (rol USER)
   */
  async getDeliveryDrivers() {
    console.log("[HybridSync] 👥 Obteniendo repartidores...");
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Cargando repartidores desde BACKEND...");

        const response = await fetch(`${BACKEND_URL}/users/delivery`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        const drivers = responseData.data || [];
        console.log(
          `[HybridSync] ✅ ${drivers.length} repartidores obtenidos del backend`,
        );

        await this.cacheUsersInPouchDB(drivers);
        return drivers;
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al cargar repartidores del backend, usando caché:",
          error.message,
        );
        return await this.loadUsersFromCache();
      }
    } else {
      console.log(
        "[HybridSync] 📴 SIN INTERNET - Cargando repartidores desde caché...",
      );
      return await this.loadUsersFromCache();
    }
  }

  /**
   * Cachear usuarios en PouchDB
   */
  async cacheUsersInPouchDB(users) {
    try {
      console.log("[HybridSync] 💾 Cacheando repartidores en PouchDB...");

      for (const user of users) {
        try {
          const existingDoc = await this.dbUsers
            .get(user.uuid)
            .catch(() => null);
          const docBase = {
            _id: user.uuid,
            uuid: user.uuid,
            name: user.name,
            email: user.email,
            role: user.role || "USER",
            stores: user.stores || [],
            cachedAt: new Date().toISOString(),
          };

          if (existingDoc) {
            await this.dbUsers.put({
              ...docBase,
              _rev: existingDoc._rev,
            });
          } else {
            await this.dbUsers.put(docBase);
          }
        } catch (error) {
          console.warn(
            `[HybridSync] ⚠️ Error cacheando repartidor ${user.name}:`,
            error.message,
          );
        }
      }

      console.log("[HybridSync] ✅ Repartidores cacheados correctamente");
    } catch (error) {
      console.error("[HybridSync] ❌ Error al cachear repartidores:", error);
    }
  }

  /**
   * Cargar repartidores desde caché local
   */
  async loadUsersFromCache() {
    try {
      console.log(
        "[HybridSync] 📂 Cargando repartidores desde CACHÉ (PouchDB)...",
      );

      const result = await this.dbUsers.allDocs({
        include_docs: true,
        descending: true,
      });

      const users = result.rows
        .filter((row) => !row.id.startsWith("_design/"))
        .map((row) => row.doc)
        .filter((doc) => doc.syncOperation !== "delete");

      const pendingCount = users.filter((u) => u.syncPending === true).length;
      console.log(
        `[HybridSync] ✅ ${users.length} repartidores cargados (${pendingCount} pendientes)`,
      );

      return users;
    } catch (error) {
      console.error(
        "[HybridSync] ❌ Error al cargar repartidores desde caché:",
        error,
      );
      return [];
    }
  }

  /**
   * Crear repartidor
   */
  async createDriver(driverData) {
    console.log("[HybridSync] ➕ Creando repartidor:", driverData);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando repartidor al BACKEND...");
        const response = await fetch(`${BACKEND_URL}/users`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(driverData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log("[HybridSync] ✅ Repartidor guardado en backend");
        return { success: true };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al guardar repartidor en backend, guardando localmente:",
          error.message,
        );
        return await this.saveDriverOffline(driverData);
      }
    } else {
      console.log(
        "[HybridSync] 📴 SIN INTERNET - Guardando repartidor localmente...",
      );
      return await this.saveDriverOffline(driverData);
    }
  }

  /**
   * Guardar repartidor offline
   */
  async saveDriverOffline(driverData) {
    try {
      const tempId = `temp_driver_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const doc = {
        _id: tempId,
        ...driverData,
        role: driverData.role || "USER",
        syncPending: true,
        syncOperation: "create",
        syncTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stores: [],
      };

      await this.dbUsers.put(doc);
      console.log(
        "[HybridSync] ✅ Repartidor guardado OFFLINE (pendiente de sincronización)",
      );
      return { success: true, driver: doc, offline: true };
    } catch (error) {
      console.error(
        "[HybridSync] ❌ Error al guardar repartidor offline:",
        error,
      );
      throw error;
    }
  }

  /**
   * Actualizar repartidor
   */
  async updateDriver(driverUuid, driverData) {
    console.log("[HybridSync] ✏️ Actualizando repartidor:", driverUuid);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando actualización al BACKEND...");
        const response = await fetch(`${BACKEND_URL}/users/${driverUuid}`, {
          method: "PUT",
          headers: this.getHeaders(),
          body: JSON.stringify(driverData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        await response.json();
        console.log("[HybridSync] ✅ Repartidor actualizado en backend");

        let existingDoc = null;
        try {
          existingDoc = await this.dbUsers.get(driverUuid);
        } catch (error) {
          console.warn(
            "[HybridSync] ℹ️ Repartidor no estaba cacheado, creando registro local",
          );
        }

        const updatedDoc = {
          ...(existingDoc || {}),
          ...driverData,
          _id: existingDoc?._id || driverUuid,
          _rev: existingDoc?._rev,
          uuid: existingDoc?.uuid || driverUuid,
          role: driverData.role || existingDoc?.role || "USER",
          cachedAt: new Date().toISOString(),
          syncPending: false,
          syncOperation: null,
        };

        await this.dbUsers.put(updatedDoc);

        return { success: true };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al actualizar repartidor en backend, guardando localmente:",
          error.message,
        );
        return await this.saveDriverUpdateOffline(driverUuid, driverData);
      }
    } else {
      console.log(
        "[HybridSync] 📴 SIN INTERNET - Guardando actualización localmente...",
      );
      return await this.saveDriverUpdateOffline(driverUuid, driverData);
    }
  }

  /**
   * Guardar actualización offline
   */
  async saveDriverUpdateOffline(driverUuid, driverData) {
    try {
      let existingDoc;
      try {
        existingDoc = await this.dbUsers.get(driverUuid);
      } catch {
        existingDoc = {
          _id: driverUuid,
          uuid: driverUuid,
          role: "USER",
          stores: [],
        };
      }

      const doc = {
        ...existingDoc,
        ...driverData,
        _id: existingDoc._id || driverUuid,
        _rev: existingDoc._rev,
        uuid: existingDoc.uuid || driverUuid,
        syncPending: true,
        syncOperation:
          existingDoc.syncOperation === "create" ? "create" : "update",
        syncTimestamp: Date.now(),
        updatedAt: new Date().toISOString(),
      };

      await this.dbUsers.put(doc);
      console.log(
        "[HybridSync] ✅ Repartidor actualizado OFFLINE (pendiente de sincronización)",
      );
      return { success: true, driver: doc, offline: true };
    } catch (error) {
      console.error(
        "[HybridSync] ❌ Error al guardar actualización offline:",
        error,
      );
      throw error;
    }
  }

  /**
   * Eliminar repartidor
   */
  async deleteDriver(driverUuid) {
    console.log("[HybridSync] 🗑️ Eliminando repartidor:", driverUuid);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando DELETE al BACKEND...");
        const response = await fetch(`${BACKEND_URL}/users/${driverUuid}`, {
          method: "DELETE",
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(
          "[HybridSync] ✅ Repartidor eliminado en backend:",
          driverUuid,
        );

        try {
          const existingDoc = await this.dbUsers.get(driverUuid);
          await this.dbUsers.remove(existingDoc);
          console.log("[HybridSync] ✅ Repartidor eliminado del caché");
        } catch (error) {
          console.warn(
            "[HybridSync] ⚠️ Repartidor no estaba en caché:",
            error.message,
          );
        }

        return { success: true };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al eliminar repartidor en backend, marcando localmente:",
          error.message,
        );
        return await this.deleteDriverOffline(driverUuid);
      }
    } else {
      console.log(
        "[HybridSync] 📴 SIN INTERNET - Marcando repartidor para eliminar...",
      );
      return await this.deleteDriverOffline(driverUuid);
    }
  }

  /**
   * Marcar repartidor para eliminar offline
   */
  async deleteDriverOffline(driverUuid) {
    try {
      let existingDoc;
      try {
        existingDoc = await this.dbUsers.get(driverUuid);
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Repartidor no encontrado en caché:",
          driverUuid,
        );
        existingDoc = { _id: driverUuid };
      }

      if (existingDoc && existingDoc.syncOperation === "create") {
        await this.dbUsers.remove(existingDoc);
        console.log(
          "[HybridSync] ✅ Repartidor creado offline eliminado del caché",
        );
        return { success: true, offline: true };
      }

      const doc = {
        _id: driverUuid,
        _rev: existingDoc._rev,
        uuid: driverUuid,
        syncPending: true,
        syncOperation: "delete",
        userUuid: driverUuid,
        syncTimestamp: Date.now(),
        deletedAt: new Date().toISOString(),
        ...existingDoc,
      };

      await this.dbUsers.put(doc);
      console.log(
        "[HybridSync] ✅ Repartidor marcado para ELIMINAR (pendiente de sincronización)",
      );

      return { success: true, offline: true };
    } catch (error) {
      console.error(
        "[HybridSync] ❌ Error al marcar repartidor para eliminar offline:",
        error,
      );
      throw error;
    }
  }

  // ==========================================
  // ASIGNACIONES (ROUTES)
  // ==========================================

  /**
   * Asignar repartidor a tienda
   * - Con internet: POST al backend
   * - Sin internet: Guardar en PouchDB (assignments)
   */
  async assignDriver(userUuid, storeUuid) {
    const assignmentData = { userUuid, storeUuid };
    console.log("[HybridSync] 🔗 Asignando repartidor:", assignmentData);
    console.log(
      "[HybridSync] Estado de conexión:",
      navigator.onLine ? "🟢 Online" : "🔴 Offline",
    );

    if (navigator.onLine) {
      try {
        console.log("[HybridSync] 🌐 Enviando asignación al BACKEND...");
        const response = await fetch(`${BACKEND_URL}/routes/assign`, {
          method: "POST",
          headers: this.getHeaders(),
          body: JSON.stringify(assignmentData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log("[HybridSync] ✅ Asignación exitosa en backend");
        return { success: true, data: responseData };
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al asignar en backend, guardando localmente:",
          error.message,
        );
        return await this.saveAssignmentOffline(assignmentData);
      }
    } else {
      console.log(
        "[HybridSync] 📴 SIN INTERNET - Guardando asignación localmente...",
      );
      return await this.saveAssignmentOffline(assignmentData);
    }
  }

  /**
   * Guardar asignación offline
   */
  async saveAssignmentOffline(data) {
    try {
      const tempId = `assign_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const doc = {
        _id: tempId,
        ...data,
        syncPending: true,
        syncOperation: "assign",
        syncTimestamp: Date.now(),
      };
      await this.dbAssignments.put(doc);
      console.log("[HybridSync] ✅ Asignación guardada OFFLINE");
      return { success: true, offline: true };
    } catch (error) {
      console.error("[HybridSync] ❌ Error al guardar asignación offline:", error);
      throw error;
    }
  }

  // ==========================================
  // AUTO-SYNC
  // ==========================================

  /**
   * Configurar auto-sincronización cuando vuelva la conexión
   */
  setupAutoSync() {
    window.addEventListener("online", async () => {
      console.log(
        "[HybridSync] 🔄 CONEXIÓN RESTAURADA - Iniciando auto-sincronización...",
      );

      try {
        // ====== SINCRONIZAR PRODUCTOS ======
        const productsResult = await this.dbProducts.allDocs({
          include_docs: true,
        });
        const pendingProducts = productsResult.rows
          .map((row) => row.doc)
          .filter((doc) => doc.syncPending === true);

        console.log(
          `[HybridSync] 📦 ${pendingProducts.length} productos pendientes de sincronización`,
        );

        // Separar por operación: create vs update vs delete
        const productsToCreate = pendingProducts.filter(
          (doc) => doc.syncOperation === "create",
        );
        const productsToUpdate = pendingProducts.filter(
          (doc) => doc.syncOperation === "update",
        );
        const productsToDelete = pendingProducts.filter(
          (doc) => doc.syncOperation === "delete",
        );

        console.log(
          `[HybridSync] ➕ ${productsToCreate.length} productos para crear`,
        );
        console.log(
          `[HybridSync] ✏️ ${productsToUpdate.length} productos para actualizar`,
        );
        console.log(
          `[HybridSync] 🗑️ ${productsToDelete.length} productos para eliminar`,
        );

        // Sincronizar CREAR productos (POST)
        for (const doc of productsToCreate) {
          try {
            console.log(`[HybridSync] 🔄 Creando producto: ${doc.name}...`);

            const response = await fetch(`${BACKEND_URL}/products`, {
              method: "POST",
              headers: this.getHeaders(),
              body: JSON.stringify({
                name: doc.name,
                description: doc.description,
                basePrice: doc.basePrice,
              }),
            });

            if (response.ok) {
              const responseData = await response.json();
              const savedProduct = responseData.data;
              console.log(
                `[HybridSync] ✅ Producto creado: ${doc.name} → ${savedProduct.uuid}`,
              );

              await this.dbProducts.remove(doc);
              await this.dbProducts.put({
                _id: savedProduct.uuid,
                ...savedProduct,
                cachedAt: new Date().toISOString(),
              });
            } else {
              console.error(
                `[HybridSync] ❌ Error creando producto ${doc.name}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error creando producto ${doc.name}:`,
              error.message,
            );
          }
        }

        // Sincronizar ACTUALIZAR productos (PUT)
        for (const doc of productsToUpdate) {
          try {
            const productUuid = doc.productUuid || doc.uuid || doc._id;
            console.log(
              `[HybridSync] 🔄 Actualizando producto: ${doc.name} (${productUuid})...`,
            );

            const response = await fetch(
              `${BACKEND_URL}/products/${productUuid}`,
              {
                method: "PUT",
                headers: this.getHeaders(),
                body: JSON.stringify({
                  name: doc.name,
                  description: doc.description,
                  basePrice: doc.basePrice,
                }),
              },
            );

            if (response.ok) {
              const responseData = await response.json();
              const updatedProduct = responseData.data;
              console.log(
                `[HybridSync] ✅ Producto actualizado: ${doc.name} → ${updatedProduct.uuid}`,
              );

              // Actualizar en PouchDB quitando flags de sincronización
              await this.dbProducts.put({
                _id: updatedProduct.uuid,
                _rev: doc._rev,
                ...updatedProduct,
                cachedAt: new Date().toISOString(),
              });
            } else {
              console.error(
                `[HybridSync] ❌ Error actualizando producto ${doc.name}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error actualizando producto ${doc.name}:`,
              error.message,
            );
          }
        }

        // Sincronizar ELIMINAR productos (DELETE)
        for (const doc of productsToDelete) {
          try {
            const productUuid = doc.productUuid || doc.uuid || doc._id;
            console.log(
              `[HybridSync] 🔄 Eliminando producto: ${doc.name || productUuid}...`,
            );

            const response = await fetch(
              `${BACKEND_URL}/products/${productUuid}`,
              {
                method: "DELETE",
                headers: this.getHeaders(),
              },
            );

            if (response.ok) {
              console.log(`[HybridSync] ✅ Producto eliminado: ${productUuid}`);

              // Eliminar de PouchDB
              await this.dbProducts.remove(doc);
            } else {
              console.error(
                `[HybridSync] ❌ Error eliminando producto ${productUuid}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error eliminando producto:`,
              error.message,
            );
          }
        }

        // ====== SINCRONIZAR TIENDAS ======
        const storesResult = await this.dbStores.allDocs({
          include_docs: true,
        });
        const pendingStores = storesResult.rows
          .map((row) => row.doc)
          .filter((doc) => doc.syncPending === true);

        console.log(
          `[HybridSync] 🏪 ${pendingStores.length} tiendas pendientes de sincronización`,
        );

        // Separar por operación: create vs update vs delete
        const storesToCreate = pendingStores.filter(
          (doc) => doc.syncOperation === "create",
        );
        const storesToUpdate = pendingStores.filter(
          (doc) => doc.syncOperation === "update",
        );
        const storesToDelete = pendingStores.filter(
          (doc) => doc.syncOperation === "delete",
        );

        console.log(
          `[HybridSync] ➕ ${storesToCreate.length} tiendas para crear`,
        );
        console.log(
          `[HybridSync] ✏️ ${storesToUpdate.length} tiendas para actualizar`,
        );
        console.log(
          `[HybridSync] 🗑️ ${storesToDelete.length} tiendas para eliminar`,
        );

        // Sincronizar CREAR tiendas (POST)
        for (const doc of storesToCreate) {
          try {
            console.log(`[HybridSync] 🔄 Creando tienda: ${doc.name}...`);

            const response = await fetch(`${BACKEND_URL}/stores`, {
              method: "POST",
              headers: this.getHeaders(),
              body: JSON.stringify({
                name: doc.name,
                address: doc.address,
                latitude: doc.latitude,
                longitude: doc.longitude,
              }),
            });

            if (response.ok) {
              const responseData = await response.json();
              const savedStore = responseData.data;
              console.log(
                `[HybridSync] ✅ Tienda creada: ${doc.name} → ${savedStore.uuid}`,
              );

              await this.dbStores.remove(doc);
              await this.dbStores.put({
                _id: savedStore.uuid,
                ...savedStore,
                cachedAt: new Date().toISOString(),
              });
            } else {
              console.error(
                `[HybridSync] ❌ Error creando tienda ${doc.name}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error creando tienda ${doc.name}:`,
              error.message,
            );
          }
        }

        // Sincronizar ACTUALIZAR tiendas (PUT)
        for (const doc of storesToUpdate) {
          try {
            const storeUuid = doc.storeUuid || doc.uuid || doc._id;
            console.log(
              `[HybridSync] 🔄 Actualizando tienda: ${doc.name} (${storeUuid})...`,
            );

            const response = await fetch(`${BACKEND_URL}/stores/${storeUuid}`, {
              method: "PUT",
              headers: this.getHeaders(),
              body: JSON.stringify({
                name: doc.name,
                address: doc.address,
                latitude: doc.latitude,
                longitude: doc.longitude,
              }),
            });

            if (response.ok) {
              const responseData = await response.json();
              const updatedStore = responseData.data;
              console.log(
                `[HybridSync] ✅ Tienda actualizada: ${doc.name} → ${updatedStore.uuid}`,
              );

              // Actualizar en PouchDB quitando flags de sincronización
              await this.dbStores.put({
                _id: updatedStore.uuid,
                _rev: doc._rev,
                ...updatedStore,
                cachedAt: new Date().toISOString(),
              });
            } else {
              console.error(
                `[HybridSync] ❌ Error actualizando tienda ${doc.name}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error actualizando tienda ${doc.name}:`,
              error.message,
            );
          }
        }

        // Sincronizar ELIMINAR tiendas (DELETE)
        for (const doc of storesToDelete) {
          try {
            const storeUuid = doc.storeUuid || doc.uuid || doc._id;
            console.log(
              `[HybridSync] 🔄 Eliminando tienda: ${doc.name || storeUuid}...`,
            );

            const response = await fetch(`${BACKEND_URL}/stores/${storeUuid}`, {
              method: "DELETE",
              headers: this.getHeaders(),
            });

            if (response.ok) {
              console.log(`[HybridSync] ✅ Tienda eliminada: ${storeUuid}`);

              // Eliminar de PouchDB
              await this.dbStores.remove(doc);
            } else {
              console.error(
                `[HybridSync] ❌ Error eliminando tienda ${storeUuid}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error eliminando tienda:`,
              error.message,
            );
          }
        }

        // ====== SINCRONIZAR REPARTIDORES ======
        const usersResult = await this.dbUsers.allDocs({
          include_docs: true,
        });
        const pendingUsers = usersResult.rows
          .map((row) => row.doc)
          .filter((doc) => doc.syncPending === true);

        console.log(
          `[HybridSync] 👥 ${pendingUsers.length} repartidores pendientes de sincronización`,
        );

        const usersToCreate = pendingUsers.filter(
          (doc) => doc.syncOperation === "create",
        );
        const usersToUpdate = pendingUsers.filter(
          (doc) => doc.syncOperation === "update",
        );
        const usersToDelete = pendingUsers.filter(
          (doc) => doc.syncOperation === "delete",
        );

        console.log(
          `[HybridSync] ➕ ${usersToCreate.length} repartidores para crear`,
        );
        console.log(
          `[HybridSync] ✏️ ${usersToUpdate.length} repartidores para actualizar`,
        );
        console.log(
          `[HybridSync] 🗑️ ${usersToDelete.length} repartidores para eliminar`,
        );

        for (const doc of usersToCreate) {
          try {
            console.log(`[HybridSync] 🔄 Creando repartidor: ${doc.name}...`);

            const response = await fetch(`${BACKEND_URL}/users`, {
              method: "POST",
              headers: this.getHeaders(),
              body: JSON.stringify({
                name: doc.name,
                email: doc.email,
                password: doc.password,
                role: doc.role || "USER",
              }),
            });

            if (response.ok) {
              await response.json().catch(() => null);
              console.log(
                `[HybridSync] ✅ Repartidor creado en backend: ${doc.name}`,
              );

              await this.dbUsers.remove(doc);
            } else {
              console.error(
                `[HybridSync] ❌ Error creando repartidor ${doc.name}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error creando repartidor ${doc.name}:`,
              error.message,
            );
          }
        }

        for (const doc of usersToUpdate) {
          try {
            const userUuid = doc.userUuid || doc.uuid || doc._id;
            console.log(
              `[HybridSync] 🔄 Actualizando repartidor: ${doc.name} (${userUuid})...`,
            );

            const response = await fetch(`${BACKEND_URL}/users/${userUuid}`, {
              method: "PUT",
              headers: this.getHeaders(),
              body: JSON.stringify({
                name: doc.name,
                role: doc.role || "USER",
              }),
            });

            if (response.ok) {
              await response.json().catch(() => null);
              console.log(
                `[HybridSync] ✅ Repartidor actualizado en backend: ${doc.name}`,
              );

              await this.dbUsers.put({
                ...doc,
                _id: doc._id,
                _rev: doc._rev,
                uuid: userUuid,
                syncPending: false,
                syncOperation: null,
                cachedAt: new Date().toISOString(),
              });
            } else {
              console.error(
                `[HybridSync] ❌ Error actualizando repartidor ${doc.name}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error actualizando repartidor ${doc.name}:`,
              error.message,
            );
          }
        }

        for (const doc of usersToDelete) {
          try {
            const userUuid = doc.userUuid || doc.uuid || doc._id;
            console.log(
              `[HybridSync] 🔄 Eliminando repartidor: ${doc.name || userUuid}...`,
            );

            const response = await fetch(`${BACKEND_URL}/users/${userUuid}`, {
              method: "DELETE",
              headers: this.getHeaders(),
            });

            if (response.ok) {
              console.log(`[HybridSync] ✅ Repartidor eliminado: ${userUuid}`);
              await this.dbUsers.remove(doc);
            } else {
              console.error(
                `[HybridSync] ❌ Error eliminando repartidor ${userUuid}: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error eliminando repartidor:`,
              error.message,
            );
          }
        }

        // ====== SINCRONIZAR ASIGNACIONES ======
        const assignmentsResult = await this.dbAssignments.allDocs({
          include_docs: true,
        });
        const pendingAssignments = assignmentsResult.rows
          .map((row) => row.doc)
          .filter((doc) => doc.syncPending === true);

        console.log(
          `[HybridSync] 🔗 ${pendingAssignments.length} asignaciones pendientes`,
        );

        for (const doc of pendingAssignments) {
          try {
            console.log(`[HybridSync] 🔄 Sincronizando asignación...`);
            const response = await fetch(`${BACKEND_URL}/routes/assign`, {
              method: "POST",
              headers: this.getHeaders(),
              body: JSON.stringify({
                userUuid: doc.userUuid,
                storeUuid: doc.storeUuid,
              }),
            });

            if (response.ok) {
              console.log(`[HybridSync] ✅ Asignación sincronizada`);
              await this.dbAssignments.remove(doc);
            } else {
              console.error(
                `[HybridSync] ❌ Error sincronizando asignación: HTTP ${response.status}`,
              );
            }
          } catch (error) {
            console.error(
              `[HybridSync] ❌ Error sincronizando asignación:`,
              error.message,
            );
          }
        }

        console.log("[HybridSync] ✅ Auto-sincronización completada");

        // LIMPIAR Y REFRESCAR CACHÉ desde el backend
        console.log(
          "[HybridSync] 🧹 Limpiando caché y refrescando desde backend...",
        );
        await this.refreshCacheFromBackend();

        // Notificar a la UI si hay callback
        if (this.onSyncComplete) {
          this.onSyncComplete(0);
        }
      } catch (error) {
        console.error("[HybridSync] ❌ Error en auto-sincronización:", error);
      }
    });

    window.addEventListener("offline", () => {
      console.log("[HybridSync] 🔴 CONEXIÓN PERDIDA - Modo offline activado");
    });
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  /**
   * Refrescar caché desde el backend
   * Limpia PouchDB completamente y recarga datos del servidor
   */
  async refreshCacheFromBackend() {
    try {
      console.log("[HybridSync] 🧹 Iniciando limpieza y refresco del caché...");

      // 1. DESTRUIR bases de datos actuales
      console.log("[HybridSync] 🗑️ Eliminando caché antiguo...");
      await this.dbProducts.destroy();
      await this.dbStores.destroy();
      await this.dbUsers.destroy();

      // 2. REINICIALIZAR bases de datos limpias
      console.log("[HybridSync] 📦 Reinicializando bases de datos...");
      this.dbProducts = new PouchDB("products");
      this.dbStores = new PouchDB("stores");
      this.dbUsers = new PouchDB("users");

      // 3. OBTENER datos frescos del backend
      console.log("[HybridSync] 🌐 Obteniendo datos frescos del backend...");

      // GET Productos
      try {
        const productsResponse = await fetch(`${BACKEND_URL}/products`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          const products = productsData.data;
          console.log(
            `[HybridSync] ✅ ${products.length} productos obtenidos del backend`,
          );

          // Cachear productos
          await this.cacheProductsInPouchDB(products);
        }
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al obtener productos:",
          error.message,
        );
      }

      // GET Repartidores
      try {
        const usersResponse = await fetch(`${BACKEND_URL}/users/delivery`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const drivers = usersData.data || [];
          console.log(
            `[HybridSync] ✅ ${drivers.length} repartidores obtenidos del backend`,
          );

          await this.cacheUsersInPouchDB(drivers);
        }
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al obtener repartidores:",
          error.message,
        );
      }

      // GET Tiendas
      try {
        const storesResponse = await fetch(`${BACKEND_URL}/stores`, {
          method: "GET",
          headers: this.getHeaders(),
        });

        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          const stores = storesData.data;
          console.log(
            `[HybridSync] ✅ ${stores.length} tiendas obtenidas del backend`,
          );

          // Cachear tiendas
          await this.cacheStoresInPouchDB(stores);
        }
      } catch (error) {
        console.warn(
          "[HybridSync] ⚠️ Error al obtener tiendas:",
          error.message,
        );
      }

      console.log(
        "[HybridSync] ✨ Caché refrescado exitosamente desde el backend",
      );
    } catch (error) {
      console.error("[HybridSync] ❌ Error al refrescar caché:", error);
      // Reintentar inicializar aunque falle
      try {
        this.dbProducts = new PouchDB("products");
        this.dbStores = new PouchDB("stores");
        this.dbUsers = new PouchDB("users");
      } catch (e) {
        console.error("[HybridSync] ❌ Error crítico al reinicializar:", e);
      }
    }
  }

  /**
   * Limpiar toda la base de datos (para testing)
   */
  async clearAllData() {
    try {
      await this.dbProducts.destroy();
      await this.dbStores.destroy();
      await this.dbAssignments.destroy();
      await this.dbUsers.destroy();
      console.log(
        "[HybridSync] 🗑️ Bases de datos limpiadas (productos, tiendas, asignaciones y usuarios)",
      );
      // Reinicializar
      await this.initialize();
    } catch (error) {
      console.error("[HybridSync] ❌ Error al limpiar:", error);
    }
  }

  // Callbacks para UI
  onSyncComplete = null;
  onConnectivityChange = null;
}

// Crear instancia global
const hybridSyncService = new HybridSyncService();
window.hybridSyncService = hybridSyncService;

console.log(
  "[HybridSync] 📦 Servicio híbrido cargado (productos, tiendas y repartidores con soporte offline)",
);

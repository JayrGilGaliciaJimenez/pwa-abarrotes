# Quick Fix - Verificación de Stores

## ✅ Correcciones Aplicadas:

1. ✅ Agregado `properties.js` a `products.html` (para cargar BASE_URL)
2. ✅ Agregado `properties.js` a `stores.html` (para cargar BASE_URL)
3. ✅ Actualizado `sync-pouchdb-service.js` para usar `window.BASE_URL`

---

## 🧪 Verificación Rápida:

### 1. Verifica que BASE_URL se carga correctamente

Abre la consola del navegador y ejecuta:

```javascript
console.log('BASE_URL:', window.BASE_URL);
// Debe mostrar: BASE_URL: http://localhost:82/api/v1
```

### 2. Prueba GET Stores

1. Ve a: `http://localhost:8000/pages/stores/stores.html`
2. Abre DevTools → Console
3. Deberías ver:
```
[HybridSync] 🏪 Obteniendo tiendas...
[HybridSync] Estado de conexión: 🟢 Online
[HybridSync] 🌐 Cargando tiendas desde BACKEND...
[HybridSync] ✅ X tiendas obtenidas del backend
```

4. Abre DevTools → Network
5. Deberías ver un request:
   - **URL:** `http://localhost:82/api/v1/stores`
   - **Method:** GET
   - **Status:** 200
   - **Headers:** Authorization: Bearer {token}

### 3. Verifica la respuesta

En Network tab, click en el request de stores y ve a "Response":

```json
{
    "date": "2025-12-08T00:26:42.746+00:00",
    "data": [
        {
            "uuid": "...",
            "name": "tienda 1",
            "address": "Direccion 1",
            "latitude": -99.20194786171606,
            "longitude": 18.850151387975483,
            "qrCode": "qr/store_...",
            "products": []
        }
    ],
    "message": "Stores retrieved successfully",
    "status": 200
}
```

### 4. Prueba POST Store

1. Click en "Agregar Tienda"
2. Llena:
   - Nombre: "Tienda Test"
   - Dirección: "Calle Test 123"
   - Latitud: -99.20194786171606
   - Longitud: 18.850151387975483
3. Click en "Guardar"
4. Verifica en Network:
   - **URL:** `http://localhost:82/api/v1/stores`
   - **Method:** POST
   - **Status:** 201
   - **Request Body:**
   ```json
   {
       "name": "Tienda Test",
       "address": "Calle Test 123",
       "latitude": -99.20194786171606,
       "longitude": 18.850151387975483
   }
   ```

---

## ⚠️ Si aún no funciona:

### Verifica el orden de carga de scripts:

En `stores.html` debe aparecer en este orden:

```html
<!-- 1. Bootstrap -->
<script src="bootstrap.bundle.min.js"></script>

<!-- 2. PouchDB -->
<script src="pouchdb.min.js"></script>
<script src="pouchdb.find.min.js"></script>

<!-- 3. Properties (BASE_URL) - DEBE CARGARSE ANTES DEL SERVICIO -->
<script src="../../properties.js"></script>

<!-- 4. Hybrid Sync Service -->
<script src="../../services/sync-pouchdb-service.js"></script>

<!-- 5. PWA Init -->
<script type="module" src="../../pwa-init.js"></script>

<!-- 6. Store JS -->
<script type="module" src="store.js"></script>
```

### Verifica en consola:

```javascript
// Debe mostrar la URL correcta
console.log('BACKEND_URL en servicio:', window.hybridSyncService);

// Verifica token
console.log('Token:', localStorage.getItem('token'));
```

### Hard Reload:

1. Cmd+Shift+R (Mac) o Ctrl+Shift+F5 (Windows)
2. O en DevTools: Right-click en Reload → "Empty Cache and Hard Reload"

---

## 🎯 Checklist:

- [ ] `window.BASE_URL` está definido en consola
- [ ] Request GET a `/stores` aparece en Network tab
- [ ] Request tiene header `Authorization: Bearer ...`
- [ ] Response tiene estructura `{ date, data, message, status }`
- [ ] Las tiendas aparecen en la tabla
- [ ] POST funciona y crea tienda en el backend

---

**Fecha:** 2025-12-06
**Fix:** Cargar properties.js antes del servicio

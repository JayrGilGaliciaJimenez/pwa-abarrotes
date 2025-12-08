# Guía de Actualización de Productos (UPDATE)

## ✅ Implementación Completada

Se implementó UPDATE de productos siguiendo la misma estrategia híbrida que CREATE:
- **Online-first** cuando hay conexión
- **Local con flag pendiente** cuando no hay
- **Sincronización automática** al recuperar internet

---

## 🔧 Endpoint del Backend

```
Método: PUT
URL: http://localhost:82/api/v1/products/{uuid}
Headers: Authorization: Bearer {token}

Body:
{
    "name": "Producto Actualizado",
    "description": "Nueva descripción",
    "basePrice": 99.99
}

Response (200):
{
    "date": "2025-12-07T...",
    "data": {
        "uuid": "...",
        "name": "Producto Actualizado",
        "description": "Nueva descripción",
        "basePrice": 99.99
    },
    "message": "Product updated successfully",
    "status": 200
}
```

---

## 🔄 Estrategia Implementada

### ONLINE (Con Internet)

```javascript
1. Usuario hace click en botón "Editar" (✏️)
2. Modal se abre con datos del producto pre-cargados
3. Usuario modifica datos y da click en "Guardar"
4. PUT al backend: /products/{uuid}
5. Si exitoso:
   - Actualizar en PouchDB con datos del backend
   - Toast verde: "✅ Producto actualizado exitosamente"
   - Recargar tabla
6. Si falla:
   - Guardar en PouchDB con syncPending: true
   - Toast amarillo: "⚠️ Producto actualizado localmente..."
```

### OFFLINE (Sin Internet)

```javascript
1. Usuario hace click en botón "Editar" (✏️)
2. Modal se abre con datos del producto pre-cargados
3. Usuario modifica datos y da click en "Guardar"
4. Actualizar en PouchDB con:
   {
       _id: productUuid,
       _rev: existingDoc._rev,
       name: "...",
       description: "...",
       basePrice: 99.99,
       uuid: productUuid,
       syncPending: true,
       syncOperation: 'update',
       productUuid: productUuid,
       syncTimestamp: Date.now(),
       updatedAt: new Date().toISOString()
   }
5. Toast amarillo: "⚠️ Producto actualizado localmente..."
6. Producto aparece con badge ⏳ en la tabla
```

### AUTO-SYNC (Al Volver Online)

```javascript
1. Evento 'online' detectado
2. Buscar docs con syncPending: true
3. Separar por operación:
   - syncOperation: 'create' → POST /products
   - syncOperation: 'update' → PUT /products/{uuid}

4. Para cada UPDATE pendiente:
   - PUT /products/{productUuid} con los datos
   - Si exitoso:
     * Actualizar en PouchDB quitando flags
     * Console log: "✅ Producto actualizado: {name} → {uuid}"

5. Limpieza automática del caché:
   - Destruir PouchDB
   - Reinicializar limpio
   - GET /products desde backend
   - Cachear respuesta

6. Actualizar UI (recargar tabla)
7. Productos sin badge, opacidad normal
```

---

## 📁 Archivos Modificados

### 1. `/services/sync-pouchdb-service.js`

**Métodos Agregados:**

```javascript
/**
 * Actualizar producto existente
 * - Con internet: PUT al backend inmediatamente
 * - Sin internet: Actualizar en PouchDB con flag pendiente
 */
async updateProduct(productUuid, productData) {
    // Líneas 271-320
}

/**
 * Actualizar producto offline (pendiente de sincronización)
 */
async updateProductOffline(productUuid, productData) {
    // Líneas 325-357
}
```

**setupAutoSync() Modificado:**

```javascript
// Separar por operación: create vs update
const productsToCreate = pendingProducts.filter(doc => doc.syncOperation === 'create');
const productsToUpdate = pendingProducts.filter(doc => doc.syncOperation === 'update');

// Sincronizar CREAR productos (POST)
for (const doc of productsToCreate) {
    // ... POST /products
}

// Sincronizar ACTUALIZAR productos (PUT)
for (const doc of productsToUpdate) {
    const productUuid = doc.productUuid || doc.uuid || doc._id;
    // ... PUT /products/{productUuid}
}
```

### 2. `/pages/products/products.js`

**Función Agregada:**

```javascript
/**
 * Editar producto existente
 */
async function editProduct(productId) {
    // Líneas 176-196

    // Buscar el producto en la lista
    const product = products.find(p => p._id === productId);

    // Cargar datos en el formulario
    currentProductId = productId;
    document.getElementById('productModalLabel').textContent = 'Editar Producto';
    document.getElementById('productName').value = product.name || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.basePrice || '';

    // Mostrar modal
    productModal.show();
}
```

**saveProduct() Modificado:**

```javascript
async function saveProduct() {
    // ...

    if (currentProductId) {
        // EDITAR producto existente (PUT)
        const product = products.find(p => p._id === currentProductId);
        const productUuid = product.uuid || currentProductId;
        result = await syncService.updateProduct(productUuid, productData);
    } else {
        // CREAR nuevo producto (POST)
        result = await syncService.createProduct(productData);
    }
}
```

**Botón Editar Habilitado:**

```html
<!-- Antes -->
<button class="btn btn-action btn-edit" onclick="editProduct('${productId}')" title="Editar" disabled>
    <i class="bi bi-pencil"></i>
</button>

<!-- Ahora -->
<button class="btn btn-action btn-edit" onclick="editProduct('${productId}')" title="Editar">
    <i class="bi bi-pencil"></i>
</button>
```

---

## 🧪 Prueba del Flujo Completo

### TEST 1: Actualizar Online

**Pasos:**
1. Ve a: `http://localhost:8000/pages/products/products.html`
2. Asegúrate de tener productos en la tabla
3. Click en botón "Editar" (✏️) de un producto
4. Verifica que el modal se abre con datos pre-cargados:
   - Título: "Editar Producto"
   - Campos con valores actuales del producto
5. Modifica los datos:
   - Nombre: "Producto Actualizado Online"
   - Descripción: "Descripción actualizada"
   - Precio: 199.99
6. Click en "Guardar"

**Resultado Esperado:**

✅ **Consola muestra:**
```
[Products] ✏️ Actualizando producto: {uuid} {name: "...", description: "...", basePrice: 199.99}
[HybridSync] ✏️ Actualizando producto: {uuid} {...}
[HybridSync] Estado de conexión: 🟢 Online
[HybridSync] 🌐 Enviando actualización al BACKEND...
[HybridSync] ✅ Producto actualizado en backend: {uuid}
[HybridSync] ✅ Producto actualizado en caché
```

✅ **Network tab muestra:**
- Request: `PUT http://localhost:82/api/v1/products/{uuid}`
- Method: PUT
- Status: 200
- Headers: Authorization: Bearer {token}
- Body: `{name, description, basePrice}`

✅ **Toast verde:**
```
✅ Producto actualizado exitosamente
```

✅ **Tabla actualizada:**
- Producto muestra nuevos valores
- Sin badge ⏳
- Opacidad normal

---

### TEST 2: Actualizar Offline

**Pasos:**
1. Abre DevTools → Network tab
2. Activa modo **"Offline"**
3. Click en botón "Editar" (✏️) de un producto
4. Modifica los datos:
   - Nombre: "Producto Actualizado Offline"
   - Descripción: "Modificado sin internet"
   - Precio: 299.99
5. Click en "Guardar"

**Resultado Esperado:**

✅ **Consola muestra:**
```
[Products] ✏️ Actualizando producto: {uuid} {...}
[HybridSync] ✏️ Actualizando producto: {uuid} {...}
[HybridSync] Estado de conexión: 🔴 Offline
[HybridSync] 📴 SIN INTERNET - Actualizando localmente...
[HybridSync] ✅ Producto actualizado OFFLINE (pendiente de sincronización)
```

✅ **Toast amarillo:**
```
⚠️ Producto actualizado localmente (se sincronizará cuando haya conexión)
```

✅ **Tabla actualizada:**
- Producto muestra nuevos valores
- Con badge ⏳ "Pendiente de sincronización"
- Opacidad reducida (0.7)

✅ **Verificar en PouchDB:**
```javascript
const db = new PouchDB('products');
const product = await db.get('{uuid}');
console.log(product);

// Debe tener:
// - syncPending: true
// - syncOperation: 'update'
// - productUuid: '{uuid}'
// - name, description, basePrice actualizados
```

---

### TEST 3: Auto-Sync de UPDATE

**Pasos:**
1. Con producto pendiente de UPDATE (del TEST 2)
2. Desactiva modo "Offline" en DevTools
3. Espera unos segundos

**Resultado Esperado:**

✅ **Consola muestra:**
```
[HybridSync] 🔄 CONEXIÓN RESTAURADA - Iniciando auto-sincronización...
[HybridSync] 📦 1 productos pendientes de sincronización
[HybridSync] ➕ 0 productos para crear
[HybridSync] ✏️ 1 productos para actualizar
[HybridSync] 🔄 Actualizando producto: Producto Actualizado Offline ({uuid})...
[HybridSync] ✅ Producto actualizado: Producto Actualizado Offline → {uuid}
[HybridSync] ✅ Auto-sincronización completada
[HybridSync] 🧹 Limpiando caché y refrescando desde backend...
[HybridSync] 🧹 Iniciando limpieza y refresco del caché...
[HybridSync] 🗑️ Eliminando caché antiguo...
[HybridSync] 📦 Reinicializando bases de datos...
[HybridSync] 🌐 Obteniendo datos frescos del backend...
[HybridSync] ✅ X productos obtenidos del backend
[HybridSync] ✅ Productos cacheados correctamente
[HybridSync] ✨ Caché refrescado exitosamente desde el backend
```

✅ **Network tab muestra:**
1. `PUT /products/{uuid}` - Sincronización del update
2. `GET /products` - Refresco del caché

✅ **Tabla actualizada:**
- Badge ⏳ desaparece
- Opacidad vuelve a normal
- Producto actualizado correctamente

✅ **Verificar en Backend:**
```sql
SELECT * FROM products WHERE uuid = '{uuid}';
-- Debe tener los valores actualizados
```

---

### TEST 4: UPDATE con CREATE pendiente

**Escenario:** Mezclar operaciones pendientes

**Pasos:**
1. Activa modo "Offline"
2. Crea 2 productos nuevos (CREATE) → quedan pendientes
3. Edita 1 producto existente (UPDATE) → queda pendiente
4. Desactiva modo "Offline"

**Resultado Esperado:**

✅ **Consola muestra:**
```
[HybridSync] 📦 3 productos pendientes de sincronización
[HybridSync] ➕ 2 productos para crear
[HybridSync] ✏️ 1 productos para actualizar

[HybridSync] 🔄 Creando producto: Producto Nuevo 1...
[HybridSync] ✅ Producto creado: Producto Nuevo 1 → {uuid-1}

[HybridSync] 🔄 Creando producto: Producto Nuevo 2...
[HybridSync] ✅ Producto creado: Producto Nuevo 2 → {uuid-2}

[HybridSync] 🔄 Actualizando producto: Producto Editado ({uuid})...
[HybridSync] ✅ Producto actualizado: Producto Editado → {uuid}

[HybridSync] ✅ Auto-sincronización completada
[HybridSync] 🧹 Limpiando caché...
```

✅ **Network tab muestra:**
- 2x POST /products (para CREATE)
- 1x PUT /products/{uuid} (para UPDATE)
- 1x GET /products (refresco)

---

## 📋 Comandos de Verificación

### Ver productos pendientes por operación

```javascript
const db = new PouchDB('products');
const all = await db.allDocs({include_docs: true});

const pending = all.rows
    .map(r => r.doc)
    .filter(doc => doc.syncPending === true);

const toCreate = pending.filter(doc => doc.syncOperation === 'create');
const toUpdate = pending.filter(doc => doc.syncOperation === 'update');

console.log('Para crear:', toCreate.length);
console.log('Para actualizar:', toUpdate.length);
console.table(pending.map(p => ({
    name: p.name,
    operation: p.syncOperation,
    uuid: p.uuid || p._id
})));
```

### Forzar sincronización manual

```javascript
// Simular evento 'online'
window.dispatchEvent(new Event('online'));
```

### Limpiar cache y empezar de cero

```javascript
await window.hybridSyncService.clearAllData();
location.reload();
```

---

## 🎯 Checklist Final

- [ ] Botón editar habilitado en tabla de productos
- [ ] Click en editar abre modal con datos pre-cargados
- [ ] Título del modal cambia a "Editar Producto"
- [ ] UPDATE online funciona (PUT al backend)
- [ ] UPDATE offline guarda con syncPending: true
- [ ] Badge ⏳ aparece en productos con UPDATE pendiente
- [ ] Auto-sync diferencia entre CREATE y UPDATE
- [ ] Auto-sync hace POST para CREATE
- [ ] Auto-sync hace PUT para UPDATE
- [ ] Limpieza de caché funciona después de sync
- [ ] Consola muestra logs claros para debugging

---

## 🔍 Troubleshooting

### Problema: Botón editar no hace nada

**Solución:**
```javascript
// Verificar que la función existe
console.log(typeof editProduct);
// Debe mostrar: "function"

// Verificar que products está cargado
console.log(products);
```

### Problema: Modal no se abre con datos

**Solución:**
```javascript
// Verificar currentProductId
console.log('currentProductId:', currentProductId);

// Verificar que encuentra el producto
const product = products.find(p => p._id === currentProductId);
console.log('Producto encontrado:', product);
```

### Problema: UPDATE no se sincroniza

**Solución:**
```javascript
// Verificar que el doc tiene syncOperation: 'update'
const db = new PouchDB('products');
const doc = await db.get('{uuid}');
console.log('syncOperation:', doc.syncOperation);
// Debe ser: "update"

// Verificar que productUuid está seteado
console.log('productUuid:', doc.productUuid);
```

### Problema: Error en auto-sync

**Verificar en consola:**
```
[HybridSync] ❌ Error actualizando producto: ...
```

**Posibles causas:**
- Token expirado → Volver a iniciar sesión
- Backend caído → Verificar que el servidor esté corriendo
- UUID incorrecto → Verificar que productUuid esté seteado correctamente

---

## ✅ Resumen

**Implementación completa de UPDATE para productos:**

✅ **Backend-first:** PUT al backend cuando hay internet
✅ **Offline-capable:** Guarda localmente con syncPending: true
✅ **Auto-sync:** Sincroniza automáticamente al volver online
✅ **Visual indicators:** Badge ⏳ para updates pendientes
✅ **Cache cleanup:** Limpieza automática post-sync
✅ **Dual operation:** Maneja CREATE y UPDATE simultáneamente

**Operaciones soportadas:**
- ✅ GET (listar)
- ✅ POST (crear)
- ✅ PUT (actualizar)
- ❌ DELETE (pendiente)

---

**Status:** ✅ COMPLETADO
**Fecha:** 2025-12-07
**Beneficio:** CRUD completo (excepto DELETE) con soporte offline total

# Testing - GET y POST de Productos (SIMPLIFICADO)

## ✅ Implementación Completada

- ✅ GET /products (listar productos)
- ✅ POST /products (crear producto)
- ✅ Auto-sync cuando vuelve conexión
- ❌ UPDATE (editar) - NO implementado
- ❌ DELETE (eliminar) - NO implementado

---

## 🧪 Pruebas a Realizar

### ANTES DE EMPEZAR: Limpiar PouchDB

Ejecuta esto en la consola del navegador para empezar limpio:

```javascript
// Limpiar PouchDB y empezar de cero
const db = new PouchDB('products');
await db.destroy();
location.reload();
```

---

### TEST 1: GET con Internet ✅

**Objetivo:** Verificar que al cargar la página se hace GET al backend

**Pasos:**
1. Abre DevTools → Network tab
2. Recarga la página: http://localhost:8000/pages/products/products.html
3. Verifica en Network:
   - ✅ Request: `GET http://localhost:82/api/v1/products`
   - ✅ Status: 200
   - ✅ Headers: `Authorization: Bearer {token}`

**Resultado esperado:**
- Console muestra: `[HybridSync] 🌐 Cargando productos desde BACKEND...`
- Console muestra: `[HybridSync] ✅ X productos obtenidos del backend`
- Console muestra: `[HybridSync] 💾 Cacheando productos en PouchDB...`
- Los productos aparecen en la tabla

---

### TEST 2: POST con Internet ✅

**Objetivo:** Verificar que al crear un producto se hace POST al backend

**Pasos:**
1. Click en "Agregar Producto"
2. Llena el formulario:
   - Nombre: "Producto Test"
   - Descripción: "Descripción de prueba"
   - Precio: 99.99
3. Click en "Guardar"
4. Verifica en Network:
   - ✅ Request: `POST http://localhost:82/api/v1/products`
   - ✅ Status: 201
   - ✅ Body: `{"name":"Producto Test","description":"Descripción de prueba","basePrice":99.99}`
   - ✅ Headers: `Authorization: Bearer {token}`

**Resultado esperado:**
- Console muestra: `[HybridSync] 🌐 Enviando producto al BACKEND...`
- Console muestra: `[HybridSync] ✅ Producto guardado en backend: {uuid}`
- Toast verde: "✅ Producto guardado exitosamente"
- El producto aparece en la tabla inmediatamente
- El producto tiene ID del backend (no empieza con "temp_")

**Verificar en Base de Datos:**
- Abre pgAdmin o DBeaver
- Ejecuta: `SELECT * FROM products ORDER BY created_at DESC LIMIT 1;`
- ✅ Debe aparecer "Producto Test"

---

### TEST 3: GET sin Internet (Caché) ✅

**Objetivo:** Verificar que sin internet se cargan productos del caché

**Pasos:**
1. Abre DevTools → Network tab
2. Click en "Offline" (para simular sin conexión)
3. Recarga la página
4. Verifica en Network:
   - ✅ No hay request al backend (está offline)

**Resultado esperado:**
- Console muestra: `[HybridSync] 🔴 Offline`
- Console muestra: `[HybridSync] 📴 SIN INTERNET - Cargando desde caché...`
- Console muestra: `[HybridSync] 📂 Cargando productos desde CACHÉ (PouchDB)...`
- Los productos aparecen en la tabla (cargados desde PouchDB)

**Verificar en PouchDB:**
```javascript
const db = new PouchDB('products');
const all = await db.allDocs({include_docs: true});
console.log('Productos en caché:', all.rows.map(r => r.doc));
```

---

### TEST 4: POST sin Internet (Guardar Offline) ✅

**Objetivo:** Verificar que sin internet se guarda en PouchDB con flag pendiente

**Pasos:**
1. Mantén el modo "Offline" activado en DevTools
2. Click en "Agregar Producto"
3. Llena el formulario:
   - Nombre: "Producto Offline"
   - Descripción: "Guardado sin conexión"
   - Precio: 50.00
4. Click en "Guardar"
5. Verifica en Network:
   - ✅ No hay request al backend (está offline)

**Resultado esperado:**
- Console muestra: `[HybridSync] 📴 SIN INTERNET - Guardando localmente...`
- Console muestra: `[HybridSync] ✅ Producto guardado OFFLINE (pendiente de sincronización)`
- Toast amarillo: "⚠️ Producto guardado localmente (se sincronizará cuando haya conexión)"
- El producto aparece en la tabla con:
  - ⏳ Badge amarillo (pendiente)
  - Opacidad reducida (0.7)
  - ID empieza con "temp_"

**Verificar en PouchDB:**
```javascript
const db = new PouchDB('products');
const pending = await db.allDocs({include_docs: true});
const offline = pending.rows.filter(r => r.doc.syncPending === true);
console.log('Productos pendientes:', offline);
```

**Verificar en Base de Datos:**
- Ejecuta: `SELECT * FROM products WHERE name = 'Producto Offline';`
- ✅ NO debe aparecer (solo está en PouchDB local)

---

### TEST 5: Auto-Sync al Volver Online ✅

**Objetivo:** Verificar que al recuperar conexión se sincronizan productos pendientes

**Pasos:**
1. Asegúrate de tener al menos 1 producto pendiente (del TEST 4)
2. Abre DevTools → Network tab
3. Desactiva el modo "Offline" (vuelve a Online)
4. Espera unos segundos
5. Verifica en Network:
   - ✅ Request: `POST http://localhost:82/api/v1/products`
   - ✅ Body: datos del producto pendiente
   - ✅ Status: 201

**Resultado esperado:**
- Console muestra: `[HybridSync] 🔄 CONEXIÓN RESTAURADA - Iniciando auto-sincronización...`
- Console muestra: `[HybridSync] 📋 X productos pendientes de sincronización`
- Console muestra: `[HybridSync] 🔄 Sincronizando: Producto Offline...`
- Console muestra: `[HybridSync] ✅ Producto sincronizado: Producto Offline → {uuid}`
- Console muestra: `[HybridSync] ✅ Auto-sincronización completada`
- Toast verde: "Productos sincronizados con el servidor"
- El producto ya NO tiene ⏳ badge
- El producto ya NO tiene opacidad reducida
- El ID cambió de "temp_xxx" a un UUID real

**Verificar en PouchDB:**
```javascript
const db = new PouchDB('products');
const all = await db.allDocs({include_docs: true});
const pending = all.rows.filter(r => r.doc.syncPending === true);
console.log('Productos pendientes después de sync:', pending); // Debe ser []
```

**Verificar en Base de Datos:**
- Ejecuta: `SELECT * FROM products WHERE name = 'Producto Offline';`
- ✅ Ahora SÍ debe aparecer

---

## 🐛 Troubleshooting

### Error: "401 Unauthorized"

**Causa:** Token inválido o expirado

**Solución:**
1. Cierra sesión
2. Inicia sesión de nuevo
3. Verifica: `localStorage.getItem('token')`

---

### Error: No se ven productos en la tabla

**Causa:** PouchDB corrupto o vacío

**Solución:**
```javascript
// Limpiar PouchDB
const db = new PouchDB('products');
await db.destroy();
location.reload();
```

---

### Error: Auto-sync no funciona

**Causa:** Listener de 'online' no se registró

**Solución:**
1. Recarga la página
2. Verifica que aparezca: `[HybridSync] 📦 Servicio híbrido cargado`

---

## ✅ Checklist Final

- [ ] TEST 1: GET con internet funciona
- [ ] TEST 2: POST con internet funciona
- [ ] TEST 3: GET sin internet usa caché
- [ ] TEST 4: POST sin internet guarda offline
- [ ] TEST 5: Auto-sync al volver online funciona
- [ ] Los productos del backend aparecen en la tabla
- [ ] Los productos nuevos se guardan en el backend
- [ ] Los indicadores ⏳ funcionan correctamente
- [ ] Los console.logs muestran el flujo correcto

---

## 📋 Comandos Útiles

```javascript
// Ver productos en PouchDB
const db = new PouchDB('products');
const all = await db.allDocs({include_docs: true});
console.table(all.rows.map(r => r.doc));

// Ver productos pendientes
const pending = all.rows.filter(r => r.doc.syncPending === true);
console.table(pending.map(r => r.doc));

// Limpiar PouchDB
await db.destroy();
location.reload();

// Forzar sincronización manual
window.dispatchEvent(new Event('online'));
```

---

**Última actualización:** 2025-12-06
**Status:** ✅ Implementación completa de GET y POST

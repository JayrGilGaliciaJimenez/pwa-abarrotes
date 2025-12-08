# Testing - GET y POST de Tiendas

## ✅ Implementación Completada

- ✅ GET /stores (listar tiendas)
- ✅ POST /stores (crear tienda)
- ✅ Auto-sync cuando vuelve conexión (productos Y tiendas)
- ❌ UPDATE (editar) - NO implementado
- ❌ DELETE (eliminar) - NO implementado

---

## 🧪 Pruebas Rápidas para Tiendas

### TEST 1: GET Tiendas con Internet ✅

**Pasos:**
1. Abre DevTools → Network tab
2. Ve a: http://localhost:8000/pages/stores/stores.html
3. Verifica en Network:
   - ✅ Request: `GET http://localhost:82/api/v1/stores`
   - ✅ Status: 200

**Resultado esperado en consola:**
```
[HybridSync] 🏪 Obteniendo tiendas...
[HybridSync] Estado de conexión: 🟢 Online
[HybridSync] 🌐 Cargando tiendas desde BACKEND...
[HybridSync] ✅ X tiendas obtenidas del backend
[HybridSync] 💾 Cacheando tiendas en PouchDB...
```

---

### TEST 2: POST Tienda con Internet ✅

**Pasos:**
1. Click en "Agregar Tienda"
2. Llena el formulario:
   - Nombre: "Tienda Test"
   - Dirección: "Calle Falsa 123"
   - Latitud: 19.4326
   - Longitud: -99.1332
3. Click en "Guardar"
4. Verifica en Network:
   - ✅ Request: `POST http://localhost:82/api/v1/stores`
   - ✅ Status: 201

**Resultado esperado en consola:**
```
[HybridSync] 🌐 Enviando tienda al BACKEND...
[HybridSync] ✅ Tienda guardada en backend: {uuid}
[HybridSync] ✅ Tienda cacheada en PouchDB
```

**Toast verde:** "✅ Tienda guardada exitosamente"

---

### TEST 3: POST Tienda Sin Internet ✅

**Pasos:**
1. En DevTools → Network, activa "Offline"
2. Crea una tienda nueva
3. Verifica:
   - ❌ NO hay request al backend
   - ✅ La tienda aparece con badge ⏳
   - ✅ Toast amarillo

**Resultado esperado en consola:**
```
[HybridSync] 📴 SIN INTERNET - Guardando localmente...
[HybridSync] ✅ Tienda guardada OFFLINE (pendiente de sincronización)
```

---

### TEST 4: Auto-Sync al Volver Online ✅

**Pasos:**
1. Asegúrate de tener al menos 1 tienda pendiente (del TEST 3)
2. Desactiva modo "Offline" (vuelve a Online)
3. Verifica en Network:
   - ✅ Request: `POST http://localhost:82/api/v1/stores`
   - ✅ Status: 201

**Resultado esperado en consola:**
```
[HybridSync] 🔄 CONEXIÓN RESTAURADA - Iniciando auto-sincronización...
[HybridSync] 🏪 1 tiendas pendientes de sincronización
[HybridSync] 🔄 Sincronizando tienda: Tienda Test...
[HybridSync] ✅ Tienda sincronizada: Tienda Test → {uuid}
[HybridSync] ✅ Auto-sincronización completada
```

---

## 🔍 Verificar en Base de Datos

```sql
-- Ver todas las tiendas
SELECT uuid, name, address, latitude, longitude, created_at
FROM stores
ORDER BY created_at DESC;
```

---

## 📋 Comandos Útiles

```javascript
// Ver tiendas en PouchDB
const dbStores = new PouchDB('stores');
const all = await dbStores.allDocs({include_docs: true});
console.table(all.rows.map(r => r.doc));

// Ver tiendas pendientes
const pending = all.rows.filter(r => r.doc.syncPending === true);
console.log('Tiendas pendientes:', pending);

// Limpiar PouchDB de tiendas
await dbStores.destroy();
location.reload();

// Limpiar TODO (productos y tiendas)
await window.hybridSyncService.clearAllData();
location.reload();
```

---

## ✅ Checklist Stores

- [ ] GET tiendas con internet funciona
- [ ] POST tienda con internet funciona
- [ ] POST tienda sin internet guarda offline
- [ ] Auto-sync de tiendas funciona
- [ ] Los indicadores ⏳ funcionan
- [ ] Los console.logs son claros

---

**Status:** ✅ GET y POST para Stores implementado
**Fecha:** 2025-12-06

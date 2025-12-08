# Fix: Mostrar Registros Offline Inmediatamente

## ✅ Problema Solucionado

**ANTES:** Cuando creabas una tienda offline, se guardaba en PouchDB pero NO aparecía en la tabla hasta que volvía la conexión.

**AHORA:** Cuando creas una tienda offline, aparece INMEDIATAMENTE en la tabla con un indicador visual (⏳ badge).

---

## 🔧 Cambios Realizados

### 1. `loadProductsFromCache()` - Incluir Pendientes
**Antes:**
```javascript
const products = result.rows
    .filter(row => !row.id.startsWith('_design/') && !row.id.startsWith('temp_'))
    .map(row => row.doc);
```

**Ahora:**
```javascript
// INCLUIR TODOS los registros, incluso los temp_* (pendientes)
const products = result.rows
    .filter(row => !row.id.startsWith('_design/'))
    .map(row => row.doc);

// Contar cuántos están pendientes
const pendingCount = products.filter(p => p.syncPending === true).length;
console.log(`${products.length} productos cargados (${pendingCount} pendientes)`);
```

### 2. `loadStoresFromCache()` - Incluir Pendientes
**Antes:**
```javascript
const stores = result.rows
    .filter(row => !row.id.startsWith('_design/') && !row.id.startsWith('temp_'))
    .map(row => row.doc);
```

**Ahora:**
```javascript
// INCLUIR TODOS los registros, incluso los temp_* (pendientes)
const stores = result.rows
    .filter(row => !row.id.startsWith('_design/'))
    .map(row => row.doc);

// Contar cuántas están pendientes
const pendingCount = stores.filter(s => s.syncPending === true).length;
console.log(`${stores.length} tiendas cargadas (${pendingCount} pendientes)`);
```

---

## 🧪 Prueba del Fix

### TEST: Crear Tienda Offline

**Pasos:**
1. Abre DevTools → Network tab
2. Activa modo **"Offline"**
3. Ve a: `http://localhost:8000/pages/stores/stores.html`
4. Click en "Agregar Tienda"
5. Llena el formulario:
   - Nombre: "Tienda Offline Test"
   - Dirección: "Calle Test 123"
   - Latitud: -99.20194786171606
   - Longitud: 18.850151387975483
6. Click en "Guardar"

**Resultado Esperado:**

✅ **Toast amarillo:**
```
⚠️ Tienda guardada localmente (se sincronizará cuando haya conexión)
```

✅ **Consola muestra:**
```
[Stores] ➕ Guardando tienda: {...}
[HybridSync] Estado de conexión: 🔴 Offline
[HybridSync] 📴 SIN INTERNET - Guardando localmente...
[HybridSync] ✅ Tienda guardada OFFLINE (pendiente de sincronización)
[Stores] 🏪 Cargando tiendas...
[HybridSync] 📂 Cargando tiendas desde CACHÉ (PouchDB)...
[HybridSync] ✅ 3 tiendas cargadas desde caché (1 pendientes)
[Stores] ✅ 3 tiendas obtenidas
```

✅ **La tienda aparece INMEDIATAMENTE en la tabla con:**
- Badge amarillo ⏳ "Pendiente de sincronización"
- Opacidad reducida (0.7)
- ID que empieza con "temp_"

✅ **Verificar en PouchDB:**
```javascript
const db = new PouchDB('stores');
const all = await db.allDocs({include_docs: true});
const pending = all.rows.filter(r => r.doc.syncPending === true);
console.log('Tiendas pendientes:', pending);
// Debe mostrar la tienda recién creada
```

---

### TEST: Auto-Sync al Volver Online

**Pasos:**
1. Con la tienda pendiente creada en el test anterior
2. Desactiva modo "Offline" en DevTools
3. Espera unos segundos

**Resultado Esperado:**

✅ **Consola muestra:**
```
[HybridSync] 🔄 CONEXIÓN RESTAURADA - Iniciando auto-sincronización...
[HybridSync] 🏪 1 tiendas pendientes de sincronización
[HybridSync] 🔄 Sincronizando tienda: Tienda Offline Test...
[HybridSync] ✅ Tienda sincronizada: Tienda Offline Test → {uuid-real}
[HybridSync] ✅ Auto-sincronización completada
```

✅ **La tabla se actualiza automáticamente:**
- El badge ⏳ desaparece
- La opacidad vuelve a normal
- El ID cambia de "temp_xxx" a un UUID real del backend

✅ **Verificar en Network tab:**
- Request: `POST http://localhost:82/api/v1/stores`
- Status: 201
- Body: `{name, address, latitude, longitude}`

✅ **Verificar en Base de Datos:**
```sql
SELECT * FROM stores WHERE name = 'Tienda Offline Test';
-- Debe aparecer la tienda
```

---

## 🎯 Indicadores Visuales

### Tienda/Producto Sincronizado (Normal)
```html
<tr>
    <td>Tienda 1</td>
    <td>Dirección 1</td>
    <td>-99.201</td>
    <td>18.850</td>
</tr>
```

### Tienda/Producto Pendiente de Sincronización
```html
<tr style="opacity: 0.7;">
    <td>
        Tienda Offline Test
        <span class="badge bg-warning text-dark ms-1" title="Pendiente de sincronización">⏳</span>
    </td>
    <td>Calle Test 123</td>
    <td>-99.201</td>
    <td>18.850</td>
</tr>
```

---

## 📋 Checklist Final

- [ ] Crear tienda offline → aparece inmediatamente en tabla
- [ ] Tienda offline muestra badge ⏳
- [ ] Tienda offline tiene opacidad reducida
- [ ] Console muestra "(X pendientes)"
- [ ] Al volver online, auto-sync funciona
- [ ] Badge desaparece después de sync
- [ ] Tienda aparece en backend después de sync
- [ ] Lo mismo funciona para productos

---

## 🔍 Debug

Si no aparece inmediatamente, verifica:

```javascript
// 1. Ver qué hay en PouchDB
const db = new PouchDB('stores');
const all = await db.allDocs({include_docs: true});
console.log('Todos los docs:', all.rows);

// 2. Ver cuáles tienen syncPending
const pending = all.rows.filter(r => r.doc.syncPending === true);
console.log('Pendientes:', pending);

// 3. Forzar recarga de tabla
await window.loadStoresTable();
```

---

**Status:** ✅ Fix Completo
**Fecha:** 2025-12-06
**Afecta a:** Productos y Tiendas

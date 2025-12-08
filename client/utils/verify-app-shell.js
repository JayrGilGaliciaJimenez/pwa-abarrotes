/**
 * Verificación del App Shell - Herramienta de diagnóstico
 *
 * USO:
 * 1. Abrir DevTools en la página
 * 2. Copiar y pegar este script en la consola
 * 3. Ejecutar: verifyAppShell()
 *
 * O importar como módulo:
 * import { verifyAppShell } from '/utils/verify-app-shell.js';
 * await verifyAppShell();
 */

/**
 * Lista de archivos críticos del App Shell que deben estar cacheados
 */
const CRITICAL_FILES = [
    '../',
    '../index.html',
    '../pages/products/products.html',
    '../pages/stores/stores.html',
    '../services/db-manager.js',
    '../services/api-service.js',
    '../services/sync-service.js',
    '../components/network-status.js',
    '../pwa-init.js',
    '../pages/products/products.js',
    '../pages/stores/store.js',
    '../assets/bootstrap/css/bootstrap.css',
    '../assets/bootstrap/js/bootstrap.js',
    '../manifest.json'
];

/**
 * Verifica el estado completo del App Shell
 * @returns {Promise<Object>} Resultado de la verificación
 */
export async function verifyAppShell() {
    console.log('🔍 Iniciando verificación del App Shell...\n');

    const results = {
        serviceWorker: await checkServiceWorker(),
        cache: await checkCache(),
        indexedDB: await checkIndexedDB(),
        networkStatus: checkNetworkStatus(),
        overall: 'pending'
    };

    // Determinar estado general
    const allPassed =
        results.serviceWorker.installed &&
        results.cache.allCached &&
        results.indexedDB.exists;

    results.overall = allPassed ? 'pass' : 'fail';

    // Mostrar resumen
    displayResults(results);

    return results;
}

/**
 * Verifica el estado del Service Worker
 * @returns {Promise<Object>}
 */
async function checkServiceWorker() {
    console.log('📦 Verificando Service Worker...');

    if (!('serviceWorker' in navigator)) {
        console.error('❌ Service Workers no soportados en este navegador');
        return {
            supported: false,
            installed: false,
            active: false
        };
    }

    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
        console.error('❌ Service Worker no registrado');
        return {
            supported: true,
            installed: false,
            active: false
        };
    }

    const isActive = registration.active !== null;

    console.log(isActive ?
        '✅ Service Worker activo' :
        '⚠️ Service Worker registrado pero no activo'
    );

    return {
        supported: true,
        installed: true,
        active: isActive,
        scope: registration.scope,
        scriptURL: registration.active?.scriptURL
    };
}

/**
 * Verifica el estado del caché
 * @returns {Promise<Object>}
 */
async function checkCache() {
    console.log('\n💾 Verificando caché...');

    if (!('caches' in window)) {
        console.error('❌ Cache API no soportada');
        return {
            supported: false,
            cacheNames: [],
            filesInCache: 0,
            missingFiles: [],
            allCached: false
        };
    }

    const cacheNames = await caches.keys();
    console.log(`📂 Cachés encontrados: ${cacheNames.join(', ')}`);

    const appShellCache = cacheNames.find(name => name.includes('abarrotes'));

    if (!appShellCache) {
        console.error('❌ Caché del App Shell no encontrado');
        return {
            supported: true,
            cacheNames,
            filesInCache: 0,
            missingFiles: CRITICAL_FILES,
            allCached: false
        };
    }

    const cache = await caches.open(appShellCache);
    const cachedRequests = await cache.keys();
    const cachedURLs = cachedRequests.map(req => new URL(req.url).pathname);

    console.log(`📁 Archivos en caché: ${cachedURLs.length}`);

    // Verificar archivos críticos
    const missingFiles = [];
    const foundFiles = [];

    for (const file of CRITICAL_FILES) {
        const isCached = cachedURLs.some(url => url === file || url.endsWith(file));
        if (isCached) {
            foundFiles.push(file);
            console.log(`  ✅ ${file}`);
        } else {
            missingFiles.push(file);
            console.error(`  ❌ ${file} - NO CACHEADO`);
        }
    }

    const allCached = missingFiles.length === 0;

    console.log(allCached ?
        '\n✅ Todos los archivos críticos están cacheados' :
        `\n⚠️ ${missingFiles.length} archivo(s) crítico(s) no cacheado(s)`
    );

    return {
        supported: true,
        cacheNames,
        cacheName: appShellCache,
        filesInCache: cachedURLs.length,
        criticalFiles: CRITICAL_FILES.length,
        foundFiles: foundFiles.length,
        missingFiles,
        allCached
    };
}

/**
 * Verifica el estado de IndexedDB
 * @returns {Promise<Object>}
 */
async function checkIndexedDB() {
    console.log('\n🗄️ Verificando IndexedDB...');

    if (!('indexedDB' in window)) {
        console.error('❌ IndexedDB no soportada');
        return {
            supported: false,
            exists: false,
            stores: {}
        };
    }

    return new Promise((resolve) => {
        const request = indexedDB.open('AbarrotesDB');

        request.onerror = () => {
            console.error('❌ Error abriendo IndexedDB');
            resolve({
                supported: true,
                exists: false,
                stores: {}
            });
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const storeNames = Array.from(db.objectStoreNames);

            console.log(`📊 Object Stores encontrados: ${storeNames.join(', ')}`);

            const stores = {};

            // Contar items en cada store
            const countPromises = storeNames.map(storeName => {
                return new Promise((resolveCount) => {
                    const transaction = db.transaction([storeName], 'readonly');
                    const store = transaction.objectStore(storeName);
                    const countRequest = store.count();

                    countRequest.onsuccess = () => {
                        stores[storeName] = countRequest.result;
                        console.log(`  📦 ${storeName}: ${countRequest.result} items`);
                        resolveCount();
                    };

                    countRequest.onerror = () => {
                        stores[storeName] = -1;
                        resolveCount();
                    };
                });
            });

            Promise.all(countPromises).then(() => {
                const hasRequiredStores =
                    storeNames.includes('products') &&
                    storeNames.includes('stores') &&
                    storeNames.includes('syncQueue');

                console.log(hasRequiredStores ?
                    '✅ Todos los Object Stores requeridos existen' :
                    '⚠️ Faltan Object Stores requeridos'
                );

                db.close();

                resolve({
                    supported: true,
                    exists: true,
                    storeNames,
                    stores,
                    hasRequiredStores
                });
            });
        };

        request.onupgradeneeded = () => {
            console.warn('⚠️ IndexedDB existe pero necesita actualización');
        };
    });
}

/**
 * Verifica el estado de la red
 * @returns {Object}
 */
function checkNetworkStatus() {
    console.log('\n🌐 Verificando estado de red...');

    const isOnline = navigator.onLine;

    console.log(isOnline ?
        '✅ Navegador reporta: ONLINE' :
        '⚠️ Navegador reporta: OFFLINE'
    );

    return {
        online: isOnline
    };
}

/**
 * Muestra resumen visual de los resultados
 * @param {Object} results
 */
function displayResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN DEL APP SHELL');
    console.log('='.repeat(60));

    // Service Worker
    console.log('\n🔧 SERVICE WORKER:');
    console.log(`   Soportado: ${results.serviceWorker.supported ? '✅' : '❌'}`);
    console.log(`   Instalado: ${results.serviceWorker.installed ? '✅' : '❌'}`);
    console.log(`   Activo: ${results.serviceWorker.active ? '✅' : '❌'}`);
    if (results.serviceWorker.scope) {
        console.log(`   Scope: ${results.serviceWorker.scope}`);
    }

    // Caché
    console.log('\n💾 CACHÉ:');
    console.log(`   Cache API soportada: ${results.cache.supported ? '✅' : '❌'}`);
    console.log(`   Caché del App Shell: ${results.cache.cacheName || '❌ No encontrado'}`);
    console.log(`   Archivos en caché: ${results.cache.filesInCache}`);
    console.log(`   Archivos críticos encontrados: ${results.cache.foundFiles}/${results.cache.criticalFiles}`);
    console.log(`   Estado: ${results.cache.allCached ? '✅ Completo' : '⚠️ Incompleto'}`);

    if (results.cache.missingFiles.length > 0) {
        console.log('\n   ⚠️ Archivos faltantes:');
        results.cache.missingFiles.forEach(file => {
            console.log(`      - ${file}`);
        });
    }

    // IndexedDB
    console.log('\n🗄️ INDEXEDDB:');
    console.log(`   Soportada: ${results.indexedDB.supported ? '✅' : '❌'}`);
    console.log(`   Base de datos existe: ${results.indexedDB.exists ? '✅' : '❌'}`);
    if (results.indexedDB.stores) {
        Object.entries(results.indexedDB.stores).forEach(([name, count]) => {
            console.log(`   ${name}: ${count} items`);
        });
    }

    // Estado general
    console.log('\n' + '='.repeat(60));
    const overallIcon = results.overall === 'pass' ? '✅' : '❌';
    const overallText = results.overall === 'pass' ? 'PASS' : 'FAIL';
    console.log(`${overallIcon} ESTADO GENERAL: ${overallText}`);
    console.log('='.repeat(60));

    if (results.overall === 'pass') {
        console.log('\n🎉 ¡El App Shell está configurado correctamente!');
        console.log('   La aplicación funcionará offline.');
    } else {
        console.log('\n⚠️ El App Shell tiene problemas.');
        console.log('   Revisa los errores arriba y consulta la guía de troubleshooting.');
    }

    console.log('\n💡 Comandos útiles:');
    console.log('   - verifyAppShell() : Ejecutar esta verificación');
    console.log('   - testOfflineMode() : Probar modo offline');
    console.log('   - clearAll() : Limpiar todo (SW + caché + IndexedDB)');
}

/**
 * Prueba el modo offline cargando recursos desde caché
 * @returns {Promise<Object>}
 */
export async function testOfflineMode() {
    console.log('🧪 Probando modo offline...\n');

    const testFiles = [
        '../pages/products/products.html',
        '../pages/stores/stores.html',
        '../services/api-service.js'
    ];

    const results = [];

    for (const file of testFiles) {
        try {
            const response = await caches.match(file);
            if (response) {
                console.log(`✅ ${file} - Disponible en caché`);
                results.push({ file, cached: true });
            } else {
                console.error(`❌ ${file} - NO disponible en caché`);
                results.push({ file, cached: false });
            }
        } catch (error) {
            console.error(`❌ ${file} - Error: ${error.message}`);
            results.push({ file, cached: false, error: error.message });
        }
    }

    const allCached = results.every(r => r.cached);

    console.log(allCached ?
        '\n✅ Todos los archivos de prueba están disponibles offline' :
        '\n⚠️ Algunos archivos no están disponibles offline'
    );

    return results;
}

/**
 * Limpia todo: Service Worker, caché, IndexedDB
 * @returns {Promise<void>}
 */
export async function clearAll() {
    console.log('🗑️ Limpiando todo...\n');

    // 1. Desregistrar Service Worker
    console.log('1️⃣ Desregistrando Service Worker...');
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
        await registration.unregister();
        console.log('   ✅ Service Worker desregistrado');
    }

    // 2. Limpiar cachés
    console.log('2️⃣ Limpiando cachés...');
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log(`   ✅ Caché eliminado: ${cacheName}`);
    }

    // 3. Limpiar IndexedDB
    console.log('3️⃣ Limpiando IndexedDB...');
    await new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('AbarrotesDB');
        request.onsuccess = () => {
            console.log('   ✅ IndexedDB eliminado');
            resolve();
        };
        request.onerror = () => {
            console.error('   ❌ Error eliminando IndexedDB');
            resolve();
        };
    });

    console.log('\n✅ Todo limpiado. Recarga la página para empezar de nuevo.');
    console.log('   Ejecuta: location.reload()');
}

/**
 * Obtiene estadísticas detalladas del caché
 * @returns {Promise<Object>}
 */
export async function getCacheStats() {
    const cacheNames = await caches.keys();
    const stats = {};

    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        const urls = requests.map(req => new URL(req.url));
        const sizeEstimate = urls.length * 1000; // Estimación burda

        stats[cacheName] = {
            count: urls.length,
            sizeEstimate: `~${(sizeEstimate / 1024).toFixed(2)} KB`,
            urls: urls.map(u => u.pathname)
        };
    }

    console.table(Object.keys(stats).map(name => ({
        Cache: name,
        Files: stats[name].count,
        'Size (est)': stats[name].sizeEstimate
    })));

    return stats;
}

// Si se ejecuta como script standalone
if (typeof window !== 'undefined') {
    window.verifyAppShell = verifyAppShell;
    window.testOfflineMode = testOfflineMode;
    window.clearAll = clearAll;
    window.getCacheStats = getCacheStats;

    console.log('🔧 Herramientas de verificación cargadas:');
    console.log('   - verifyAppShell() : Verificar App Shell completo');
    console.log('   - testOfflineMode() : Probar modo offline');
    console.log('   - clearAll() : Limpiar todo');
    console.log('   - getCacheStats() : Estadísticas de caché');
}

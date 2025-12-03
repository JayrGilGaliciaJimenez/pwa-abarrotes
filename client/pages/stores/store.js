const API_URL = "http://localhost:82/api/v1/stores";

let currentStoreUuid = null;


function authorizedFetch(url, options = {}) {
    const token = localStorage.getItem("token");

    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadStores();

    document.getElementById("btnSaveStore").addEventListener("click", saveStore);
    document.getElementById("btnConfirmDelete").addEventListener("click", confirmDelete);
});


async function loadStores() {
    const table = document.getElementById("storesTableBody");

    table.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">Cargando tiendas...</td>
        </tr>
    `;

    try {
        const res = await authorizedFetch(API_URL);
        const data = await res.json();

        if (!data.data || data.data.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <p>No hay tiendas registradas</p>
                    </td>
                </tr>
            `;
            return;
        }

        let html = "";
        data.data.forEach(store => {
            html += `
                <tr>
                    <td>${store.name}</td>
                    <td>${store.address}</td>
                    <td>${store.latitude}</td>
                    <td>${store.longitude}</td>
                    <td class="text-center">
                        <button class="btn-action btn-edit" onclick="openEdit('${store.uuid}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action btn-delete" onclick="openDelete('${store.uuid}', '${store.name}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        table.innerHTML = html;

    } catch (error) {
        console.error("Error al cargar tiendas:", error);
        table.innerHTML = "<tr><td colspan='5'>Error al cargar datos</td></tr>";
    }
}


function saveStore() {
    const uuid = document.getElementById("storeUuid").value;

    if (uuid === "") {
        registerStore();
    } else {
        updateStore(uuid);
    }
}


async function registerStore() {
    const body = {
        name: document.getElementById("storeName").value,
        address: document.getElementById("storeAddress").value,
        latitude: parseFloat(document.getElementById("storeLat").value),
        longitude: parseFloat(document.getElementById("storeLng").value),
    };

    try {
        await authorizedFetch(API_URL, {
            method: "POST",
            body: JSON.stringify(body),
        });

        bootstrap.Modal.getInstance(document.getElementById("storeModal")).hide();
        document.getElementById("storeForm").reset();
        loadStores();

    } catch (error) {
        console.error("Error al crear tienda:", error);
    }
}


async function openEdit(uuid) {
    currentStoreUuid = uuid;

    try {
        const res = await authorizedFetch(`${API_URL}/${uuid}`);
        const data = await res.json();
        const store = data.data;

        document.getElementById("storeUuid").value = uuid;
        document.getElementById("storeName").value = store.name;
        document.getElementById("storeAddress").value = store.address;
        document.getElementById("storeLat").value = store.latitude;
        document.getElementById("storeLng").value = store.longitude;

        document.getElementById("storeModalLabel").innerText = "Editar Tienda";

        new bootstrap.Modal(document.getElementById("storeModal")).show();

    } catch (error) {
        console.error("Error al cargar tienda:", error);
    }
}


async function updateStore(uuid) {
    const body = {
        name: document.getElementById("storeName").value,
        address: document.getElementById("storeAddress").value,
        latitude: parseFloat(document.getElementById("storeLat").value),
        longitude: parseFloat(document.getElementById("storeLng").value),
    };

    try {
        await authorizedFetch(`${API_URL}/${uuid}`, {
            method: "PUT",
            body: JSON.stringify(body),
        });

        bootstrap.Modal.getInstance(document.getElementById("storeModal")).hide();
        document.getElementById("storeForm").reset();
        loadStores();

    } catch (error) {
        console.error("Error al actualizar tienda:", error);
    }
}


function openDelete(uuid, name) {
    currentStoreUuid = uuid;
    document.getElementById("deleteStoreName").innerText = name;

    new bootstrap.Modal(document.getElementById("deleteModal")).show();
}


async function confirmDelete() {
    try {
        await authorizedFetch(`${API_URL}/${currentStoreUuid}`, {
            method: "DELETE",
        });

        bootstrap.Modal.getInstance(document.getElementById("deleteModal")).hide();
        loadStores();

    } catch (error) {
        console.error("Error al eliminar tienda:", error);
    }
}

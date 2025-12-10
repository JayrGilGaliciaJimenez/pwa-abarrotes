/**
 * Drivers Page JavaScript
 * Operaciones: GET, POST, PUT, DELETE con soporte offline (HybridSyncService)
 */

let drivers = [];
let currentDriverId = null;
let driverModal = null;
let deleteModal = null;
let syncService = null;

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Drivers] 🚚 Inicializando gestión de repartidores...");

  await initializeService();

  driverModal = new bootstrap.Modal(document.getElementById("driverModal"));
  deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));

  await loadDriversTable();

  document
    .getElementById("btnAddDriver")
    .addEventListener("click", openAddDriverModal);
  document
    .getElementById("btnSaveDriver")
    .addEventListener("click", saveDriver);
  document
    .getElementById("btnConfirmDelete")
    .addEventListener("click", confirmDelete);

  document
    .getElementById("driverModal")
    .addEventListener("hidden.bs.modal", resetForm);

  console.log("[Drivers] ✅ Página lista");
});

async function initializeService() {
  try {
    if (!window.hybridSyncService) {
      throw new Error("Hybrid Sync Service no está disponible");
    }

    syncService = window.hybridSyncService;
    await syncService.initialize();

    syncService.onSyncComplete = () => {
      console.log("[Drivers] 🔄 Auto-sync completado, recargando lista");
      loadDriversTable();
      showToast("Repartidores sincronizados con el servidor", "success");
    };
  } catch (error) {
    console.error("[Drivers] ❌ Error al inicializar servicio:", error);
    showToast("Error al inicializar el sistema", "error");
  }
}

async function loadDriversTable() {
  const tableBody = document.getElementById("driversTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="empty-state">
        <i class="bi bi-arrow-repeat" style="font-size: 3rem;"></i>
        <p class="mt-2">Cargando repartidores...</p>
      </td>
    </tr>
  `;

  try {
    console.log("[Drivers] 👥 Cargando repartidores...");
    drivers = await syncService.getDeliveryDrivers();
    window.drivers = drivers;
    console.log(`[Drivers] ✅ ${drivers.length} repartidores obtenidos`);
    renderDriversTable();
  } catch (error) {
    console.error("[Drivers] ❌ Error al cargar repartidores:", error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
          <p class="mt-2">Error al cargar repartidores</p>
          <p class="text-muted">${escapeHtml(error.message)}</p>
          <button class="btn btn-outline-secondary mt-2" onclick="loadDriversTable()">
            <i class="bi bi-arrow-clockwise me-2"></i>Reintentar
          </button>
        </td>
      </tr>
    `;
  }
}

function renderDriversTable() {
  const tableBody = document.getElementById("driversTableBody");
  if (!tableBody) return;

  if (!drivers || drivers.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <i class="bi bi-truck" style="font-size: 3rem;"></i>
          <p class="mt-2">No hay repartidores registrados</p>
          <p class="text-muted">Haz clic en "Agregar Repartidor" para comenzar</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  drivers.forEach((driver) => {
    const driverId = driver.uuid || driver._id;
    const displayId = driverId || "sin-id";
    const shortId = displayId.substring(0, 8);
    const storeNames = (driver.stores || [])
      .map((store) => store.name)
      .filter(Boolean);
    const storesContent =
      storeNames.length === 0
        ? '<span class="text-muted">Sin asignar</span>'
        : `<div class="store-pills">${storeNames
            .map(
              (name) => `<span class="store-pill">${escapeHtml(name)}</span>`,
            )
            .join("")}</div>`;

    const isPending = driver.syncPending === true;
    const syncBadge = isPending
      ? '<span class="badge bg-warning text-dark ms-1" title="Pendiente de sincronización">Pendiente</span>'
      : "";

    html += `
      <tr ${isPending ? 'style="opacity: 0.75;"' : ""}>
        <td title="${escapeHtml(displayId)}">${escapeHtml(shortId)}...${syncBadge}</td>
        <td>${escapeHtml(driver.name || "Sin nombre")}</td>
        <td>${escapeHtml(driver.email || "Sin correo")}</td>
        <td>${storesContent}</td>
        <td class="text-center">
          <button class="btn btn-action btn-edit" onclick="editDriver('${driverId}')" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-action btn-delete" onclick="deleteDriver('${driverId}')" title="Eliminar">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

function openAddDriverModal() {
  resetForm();
  driverModal.show();
}

function togglePasswordFields(show) {
  const passwordGroup = document.getElementById("passwordGroup");
  const passwordConfirmGroup = document.getElementById("passwordConfirmGroup");
  const passwordInput = document.getElementById("driverPassword");
  const passwordConfirmInput = document.getElementById("driverPasswordConfirm");

  if (!passwordGroup || !passwordConfirmGroup) return;

  if (show) {
    passwordGroup.classList.remove("d-none");
    passwordConfirmGroup.classList.remove("d-none");
    passwordInput.required = true;
    passwordConfirmInput.required = true;
  } else {
    passwordGroup.classList.add("d-none");
    passwordConfirmGroup.classList.add("d-none");
    passwordInput.required = false;
    passwordConfirmInput.required = false;
    passwordInput.value = "";
    passwordConfirmInput.value = "";
  }
}

function getDriverById(driverId) {
  return drivers.find(
    (driver) => driver.uuid === driverId || driver._id === driverId,
  );
}

function editDriver(driverId) {
  const driver = getDriverById(driverId);
  if (!driver) {
    showToast("Repartidor no encontrado", "error");
    return;
  }

  currentDriverId = driverId;
  document.getElementById("driverModalLabel").textContent = "Editar Repartidor";
  document.getElementById("driverName").value = driver.name || "";
  const emailInput = document.getElementById("driverEmail");
  emailInput.value = driver.email || "";
  emailInput.disabled = true;

  togglePasswordFields(false);
  driverModal.show();
}

async function saveDriver() {
  const form = document.getElementById("driverForm");
  const btnSave = document.getElementById("btnSaveDriver");

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const isEdit = Boolean(currentDriverId);
  const name = document.getElementById("driverName").value.trim();
  const email = document.getElementById("driverEmail").value.trim();
  const password = document.getElementById("driverPassword").value;
  const passwordConfirm = document.getElementById(
    "driverPasswordConfirm",
  ).value;

  if (!isEdit && password !== passwordConfirm) {
    showToast("Las contraseñas no coinciden", "error");
    return;
  }

  const payload = isEdit
    ? { name, role: "USER" }
    : { name, email, password, role: "USER" };

  btnSave.disabled = true;
  btnSave.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Guardando...';

  try {
    let result;
    if (isEdit) {
      console.log("[Drivers] ✏️ Actualizando repartidor:", currentDriverId);
      result = await syncService.updateDriver(currentDriverId, payload);
    } else {
      console.log("[Drivers] ➕ Creando repartidor:", payload);
      result = await syncService.createDriver(payload);
    }

    if (result.success) {
      if (result.offline) {
        showToast(
          isEdit
            ? "⚠️ Cambios guardados localmente, se sincronizarán al reconectar"
            : "⚠️ Repartidor guardado localmente, se sincronizará al reconectar",
          "warning",
        );
      } else {
        showToast(
          isEdit
            ? "Repartidor actualizado correctamente"
            : "Repartidor guardado correctamente",
          "success",
        );
      }

      await loadDriversTable();
      driverModal.hide();
    } else {
      throw new Error("Error al guardar repartidor");
    }
  } catch (error) {
    console.error("[Drivers] ❌ Error al guardar repartidor:", error);
    showToast(`Error al guardar repartidor: ${error.message}`, "error");
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = "Guardar";
  }
}

function deleteDriver(driverId) {
  const driver = getDriverById(driverId);
  if (!driver) {
    showToast("Repartidor no encontrado", "error");
    return;
  }

  currentDriverId = driverId;
  document.getElementById("deleteDriverName").textContent =
    driver.name || driver.email || driverId;
  deleteModal.show();
}

async function confirmDelete() {
  if (!currentDriverId) {
    showToast("No hay repartidor seleccionado", "error");
    return;
  }

  const btnDelete = document.getElementById("btnConfirmDelete");
  btnDelete.disabled = true;
  btnDelete.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i>Eliminando...';

  try {
    console.log("[Drivers] 🗑️ Eliminando repartidor:", currentDriverId);
    const result = await syncService.deleteDriver(currentDriverId);

    if (result.success) {
      if (result.offline) {
        showToast(
          "⚠️ Repartidor marcado para eliminar, se sincronizará al reconectar",
          "warning",
        );
      } else {
        showToast("Repartidor eliminado correctamente", "success");
      }

      await loadDriversTable();
      deleteModal.hide();
    } else {
      throw new Error("Error al eliminar repartidor");
    }
  } catch (error) {
    console.error("[Drivers] ❌ Error al eliminar repartidor:", error);
    showToast(`Error al eliminar repartidor: ${error.message}`, "error");
  } finally {
    btnDelete.disabled = false;
    btnDelete.innerHTML = "Eliminar";
    currentDriverId = null;
  }
}

function resetForm() {
  const form = document.getElementById("driverForm");
  if (form) {
    form.reset();
  }
  const hiddenId = document.getElementById("driverId");
  if (hiddenId) {
    hiddenId.value = "";
  }
  const emailInput = document.getElementById("driverEmail");
  if (emailInput) {
    emailInput.disabled = false;
  }
  togglePasswordFields(true);
  currentDriverId = null;
  document.getElementById("driverModalLabel").textContent =
    "Agregar Repartidor";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = "info") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className =
      "toast-container position-fixed bottom-0 end-0 p-3";
    toastContainer.style.zIndex = "1100";
    document.body.appendChild(toastContainer);
  }

  const bgClass =
    type === "success"
      ? "bg-success"
      : type === "error"
        ? "bg-danger"
        : type === "warning"
          ? "bg-warning text-dark"
          : "bg-info";

  const toastId = `toast-${Date.now()}`;
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">
          ${escapeHtml(message)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML("beforeend", toastHtml);

  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 4000 });
  toast.show();

  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

window.loadDriversTable = loadDriversTable;
window.editDriver = editDriver;
window.deleteDriver = deleteDriver;
window.drivers = drivers;

console.log("[Drivers] 📋 Módulo cargado (GET, POST, PUT, DELETE)");

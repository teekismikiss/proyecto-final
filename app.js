const STORAGE_KEYS = {
    comics: "mi_coleccion_bd",
    stores: "tiendas_bd",
    comicSearch: "busqueda_bd",
    storeSiteFilter: "filtro_sitio_tienda"
};

const API_COLECCION_URL = "crud/api_coleccion.php";
const LOCAL_COLECCION_JSON_URL = "data/bdColeccion.json";

const ciudadesPorPais = {
    asturies: ["Xixón", "Uviéu", "Avilés", "Mieres", "Llangréu"],
    francia: ["París", "Nantes", "Angoulême", "Marsella", "Biarritz", "Burdeos"],
    belxica: ["Bruselas"],
    espana: ["Madrid", "Barcelona", "Bilbao", "Valencia"],
    suiza: ["Ginebra"],
    uk: ["Manchester"]
};

const ESTADO_LABELS = {
    "nuevu": "Nuevu",
    "como-nuevu": "Como nuevu",
    "bon-estau": "Bon estáu",
    "gastau": "Gastáu",
    "": "Por revisar"
};

const estadoLegacyMap = {
    bonu: "bon-estau",
    "bon estau": "bon-estau",
    "bon estáu": "bon-estau",
    "como nuevu": "como-nuevu",
    "gastau": "gastau",
    "gastáu": "gastau",
    nuevu: "nuevu"
};

const tusbd = {
    lesbd: [
        { nombre: "Natacha", serie: "Natacha", url: "#natacha" },
        { nombre: "Yoko Tsuno", serie: "Yoko Tsuno", url: "#yoko-tsuno" },
        { nombre: "Blake & Mortimer", serie: "Blake & Mortimer", url: "#blake-mortimer" },
        { nombre: "Superlópez", serie: "Superlópez", url: "#superlopez" }
    ]
};

let coleccion = [];
let tiendas = [];
let consultaActiva = false;
let serverMeta = null;
let serverDisponible = null;
let tiendaEditandoId = null;
let renderServidorSeq = 0;

const $ = (selector) => document.querySelector(selector);
const existe = (selector) => Boolean($(selector));
const usaServidorColeccion = () =>
    (window.location.protocol === "http:" || window.location.protocol === "https:") &&
    (document.body?.dataset?.source === "mysql" || Boolean(document.querySelector("#coleccion[data-source='mysql']")));

document.addEventListener("DOMContentLoaded", async () => {
    await inicializarDatos();
    enlazarEventos();
    poblarPaises();
    poblarFiltros();
    precargarMetaServidor();
    renderizarAccesosSeries();
    renderizarTodo();
    registrarServiceWorker();
});

async function cargarColeccionDesdeJsonLocal() {
    try {
        const response = await fetch(LOCAL_COLECCION_JSON_URL, {
            headers: { Accept: "application/json" }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.warn("No se pudo cargar el JSON local de respaldo.", error);
        return [];
    }
}

async function inicializarDatos() {
    let bdInicial = Array.isArray(window.bdColeccion) ? window.bdColeccion : [];
    if (!bdInicial.length) {
        bdInicial = await cargarColeccionDesdeJsonLocal();
    }

    const guardados = leerStorage(STORAGE_KEYS.comics, bdInicial);
    coleccion = guardados.map(normalizarComic);

    if (!localStorage.getItem(STORAGE_KEYS.comics)) {
        guardarColeccion();
    }

    tiendas = leerStorage(STORAGE_KEYS.stores, []).map(normalizarTienda);
}

function enlazarEventos() {
    if (existe("#form-comic")) {
        $("#form-comic").addEventListener("submit", guardarBD);
    }

    if (existe("#form-tienda")) {
        $("#form-tienda").addEventListener("submit", guardarTienda);
    }

    if (existe("#tipo-tienda")) {
        $("#tipo-tienda").addEventListener("change", sincronizarCamposTipoTienda);
        sincronizarCamposTipoTienda();
    }

    if (existe("#buscador-bd")) {
        $("#buscador-bd").addEventListener("input", activarConsultaYRenderizar);
    }

    if (existe("#filtro-serie")) {
        $("#filtro-serie").addEventListener("change", activarConsultaYRenderizar);
    }

    if (existe("#filtro-estado")) {
        $("#filtro-estado").addEventListener("change", activarConsultaYRenderizar);
    }

    if (existe("#filtro-propiedad")) {
        $("#filtro-propiedad").addEventListener("change", activarConsultaYRenderizar);
    }

    document.querySelectorAll("[data-action='guardar-busqueda']").forEach((button) => {
        button.addEventListener("click", guardarBusquedaActiva);
    });

    if (existe("#selector-pais")) {
        $("#selector-pais").addEventListener("change", () => {
            cargarCiudades();
            sincronizarFiltroCiudades();
        });
    }

    if (existe("#filtro-pais")) {
        $("#filtro-pais").addEventListener("change", () => {
            sincronizarFiltroCiudades();
            renderizarTiendas();
        });
    }

    if (existe("#filtro-ciudad")) {
        $("#filtro-ciudad").addEventListener("change", renderizarTiendas);
    }

    if (existe("#btn-mostrar-tiendas")) {
        $("#btn-mostrar-tiendas").addEventListener("click", (event) => {
            const filtro = existe("#filtro-sitio") ? $("#filtro-sitio").value : "";
            if (!filtro) {
                event.preventDefault();
                alert("Escueye si quies ver tiendes online o físiques.");
                return;
            }
            guardarFiltroSitioTiendas(filtro);
        });
    }

    if (existe("#filtro-sitio")) {
        const guardado = leerFiltroSitioTiendas();
        if (guardado) {
            $("#filtro-sitio").value = guardado;
        }
        $("#filtro-sitio").addEventListener("change", () => {
            const filtro = $("#filtro-sitio").value;
            if (filtro) {
                guardarFiltroSitioTiendas(filtro);
            }
        });
    }
}

async function precargarMetaServidor() {
    if (!usaServidorColeccion() || serverDisponible === false) {
        return;
    }

    try {
        const response = await fetch(`${API_COLECCION_URL}?meta=1`, { headers: { Accept: "application/json" } });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (!payload || payload.ok !== true) {
            throw new Error(payload?.error || "Respuesta inválida del servidor");
        }

        serverMeta = payload;
        serverDisponible = !payload.fallback;
        poblarFiltros();
    } catch (error) {
        console.warn("No se pudo cargar meta desde servidor, usando modo local.", error);
        serverDisponible = false;
    }
}

function obtenerConfigTablaColeccion() {
    const tabla = document.querySelector("table");
    const thCount = tabla?.querySelectorAll("thead th")?.length || 0;
    const readonly = document.body?.dataset?.readonly === "1" || document.body?.dataset?.readonly === "true";
    const showActions = !readonly && thCount >= 4;
    const colspan = showActions ? 4 : Math.max(3, thCount || 3);
    return { readonly, showActions, colspan };
}

function estadoPorDefecto(estadoSlug) {
    return (estadoSlug || "").trim() || "nuevu";
}

function estadoNombreASlug(nombre) {
    const normal = String(nombre || "").trim().toLowerCase();
    return estadoLegacyMap[normal] || normal.replaceAll(" ", "-");
}

function opcionesEstadoHtml(estadoActual) {
    return ["nuevu", "como-nuevu", "bon-estau", "gastau"]
        .map((slug) => {
            const selected = slug === estadoPorDefecto(estadoActual) ? " selected" : "";
            return `<option value="${escapeHtml(slug)}"${selected}>${escapeHtml(ESTADO_LABELS[slug])}</option>`;
        })
        .join("");
}

function textoAccionTieneslu(tieneslu) {
    return tieneslu ? "Nun lo tengo" : "Téngolu";
}

async function actualizarEstadoServidor(id, estadoSlug) {
    const response = await fetch(API_COLECCION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({ action: "update_estado", id, estado: estadoSlug || "" })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload;
}

async function actualizarTienesluServidor(id, tieneslu) {
    const response = await fetch(API_COLECCION_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({ action: "update_tieneslu", id, tieneslu: Boolean(tieneslu) })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
    }
    return payload;
}

function normalizarComic(comic = {}) {
    return {
        id: Number(comic.id) || Date.now() + Math.floor(Math.random() * 1000),
        serie: String(comic.serie || "").trim(),
        titulo: String(comic.titulo || comic.titulu || "").trim(),
        autor: String(comic.autor || comic.autores || "").trim(),
        editorial: String(comic.editorial || "").trim(),
        estado: estadoPorDefecto(estadoNombreASlug(comic.estado)),
        tieneslu: Boolean(comic.tieneslu)
    };
}

function normalizarTipoTienda(tipo) {
    const normal = String(tipo || "").trim().toLowerCase();
    return normal === "online" || normal === "fisica" ? normal : "";
}

function normalizarTienda(tienda = {}) {
    const leer = (...claves) => {
        for (const clave of claves) {
            if (tienda?.[clave] != null) {
                return String(tienda[clave]).trim();
            }
        }
        return "";
    };

    const direccion = leer("direccion");
    const pais = leer("pais");
    const ciudad = leer("ciudad");

    return {
        id: Number(tienda.id) || Date.now(),
        nombre: leer("nombre"),
        tipo: normalizarTipoTienda(tienda.tipo) || (direccion || pais || ciudad ? "fisica" : "online"),
        web: leer("web", "www", "url", "sitio"),
        direccion,
        pais,
        ciudad,
        fechaRegistro: leer("fechaRegistro")
    };
}

function leerStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.error(`Error leyendo ${key}`, error);
        return fallback;
    }
}

function guardarColeccion() {
    localStorage.setItem(STORAGE_KEYS.comics, JSON.stringify(coleccion));
}

function guardarTiendasStorage() {
    localStorage.setItem(STORAGE_KEYS.stores, JSON.stringify(tiendas));
}

function guardarFiltroSitioTiendas(tipo) {
    const normal = normalizarTipoTienda(tipo);
    if (normal) {
        localStorage.setItem(STORAGE_KEYS.storeSiteFilter, normal);
    }
}

function leerFiltroSitioTiendas() {
    return normalizarTipoTienda(localStorage.getItem(STORAGE_KEYS.storeSiteFilter) || "");
}

function guardarBD(event) {
    event.preventDefault();

    const nuevoComic = normalizarComic({
        id: Date.now(),
        serie: $("#serie")?.value,
        titulo: $("#titulu")?.value,
        autor: $("#autor")?.value,
        editorial: $("#editorial")?.value,
        estado: $("#estau")?.value || "nuevu",
        tieneslu: $("#tieneslu")?.checked
    });

    if (!nuevoComic.serie || !nuevoComic.titulo || !nuevoComic.autor) {
        alert("Completa serie, títulu y autor/a.");
        return;
    }

    coleccion.unshift(nuevoComic);
    guardarColeccion();
    $("#form-comic").reset();
    consultaActiva = true;
    renderizarTodo();
}

function guardarTienda(event) {
    event.preventDefault();

    const nuevaTienda = normalizarTienda({
        id: Date.now(),
        nombre: $("#nombre-tienda")?.value,
        tipo: $("#tipo-tienda")?.value,
        web: $("#web-tienda")?.value,
        direccion: $("#direccion-tienda")?.value,
        pais: $("#selector-pais")?.value,
        ciudad: $("#selector-ciudad")?.value,
        fechaRegistro: new Date().toLocaleDateString("es-ES")
    });

    if (!nuevaTienda.nombre || !nuevaTienda.tipo) {
        alert("Por favor, completa nome y tipu de tienda.");
        return;
    }

    tiendas.unshift(nuevaTienda);
    guardarTiendasStorage();
    $("#form-tienda").reset();
    sincronizarCamposTipoTienda();
    sincronizarFiltroCiudades();
    renderizarTodo();
}

function renderizarAccesosSeries() {
    const contenedor = $("#lesbd");
    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = tusbd.lesbd
        .map((bd) => `<li><a class="bd-link" href="${escapeHtml(bd.url)}" data-serie="${escapeHtml(bd.serie)}">${escapeHtml(bd.nombre)}</a></li>`)
        .join("");

    contenedor.querySelectorAll("[data-serie]").forEach((enlace) => {
        enlace.addEventListener("click", (event) => {
            event.preventDefault();
            if (existe("#filtro-serie")) $("#filtro-serie").value = enlace.dataset.serie || "todas";
            if (existe("#buscador-bd")) $("#buscador-bd").value = "";
            if (existe("#filtro-estado")) $("#filtro-estado").value = "todos";
            if (existe("#filtro-propiedad")) $("#filtro-propiedad").value = "todos";
            consultaActiva = true;
            guardarBusquedaActiva();
            renderizarColeccion();
        });
    });
}

function activarConsultaYRenderizar() {
    consultaActiva = true;
    guardarBusquedaActiva();
    renderizarColeccion();
}

function obtenerFiltrosColeccion() {
    const guardados = leerStorage(STORAGE_KEYS.comicSearch, {
        termino: "",
        serie: "todas",
        estado: "todos",
        propiedad: "todos",
        activa: false
    });

    return {
        termino: existe("#buscador-bd") ? $("#buscador-bd").value.trim().toLowerCase() : String(guardados.termino || "").trim().toLowerCase(),
        serie: existe("#filtro-serie") ? $("#filtro-serie").value : guardados.serie || "todas",
        estado: existe("#filtro-estado") ? $("#filtro-estado").value : guardados.estado || "todos",
        propiedad: existe("#filtro-propiedad") ? $("#filtro-propiedad").value : guardados.propiedad || "todos",
        activa: existe("#buscador-bd") || existe("#filtro-serie") || existe("#filtro-estado") || existe("#filtro-propiedad")
            ? consultaActiva
            : Boolean(guardados.activa)
    };
}

function guardarBusquedaActiva() {
    const filtros = {
        termino: existe("#buscador-bd") ? $("#buscador-bd").value.trim() : "",
        serie: existe("#filtro-serie") ? $("#filtro-serie").value : "todas",
        estado: existe("#filtro-estado") ? $("#filtro-estado").value : "todos",
        propiedad: existe("#filtro-propiedad") ? $("#filtro-propiedad").value : "todos",
        activa: true
    };
    localStorage.setItem(STORAGE_KEYS.comicSearch, JSON.stringify(filtros));
}

function poblarPaises() {
    const paisSelect = $("#selector-pais");
    const filtroPais = $("#filtro-pais");
    const paises = Object.keys(ciudadesPorPais).sort((a, b) => a.localeCompare(b));

    if (paisSelect && paisSelect.options.length <= 1) {
        paises.forEach((pais) => paisSelect.appendChild(crearOpcion(pais, capitalizar(pais))));
    }

    if (filtroPais && filtroPais.options.length <= 1) {
        paises.forEach((pais) => filtroPais.appendChild(crearOpcion(pais, capitalizar(pais))));
    }
}

function crearOpcion(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
}

function cargarCiudades() {
    const selectPais = $("#selector-pais");
    const selectCiudad = $("#selector-ciudad");
    if (!selectPais || !selectCiudad) {
        return;
    }

    const pais = selectPais.value;
    selectCiudad.innerHTML = "";

    if (!pais || !ciudadesPorPais[pais]) {
        selectCiudad.appendChild(crearOpcion("", "-- Primero escueye país --"));
        selectCiudad.disabled = true;
        return;
    }

    selectCiudad.disabled = false;
    selectCiudad.appendChild(crearOpcion("", "-- Escueye una ciudá --"));
    ciudadesPorPais[pais].forEach((ciudad) => {
        selectCiudad.appendChild(crearOpcion(ciudad, ciudad));
    });
}

function sincronizarCamposTipoTienda() {
    const tipo = normalizarTipoTienda($("#tipo-tienda")?.value);
    const direccion = $("#direccion-tienda");
    const pais = $("#selector-pais");
    const ciudad = $("#selector-ciudad");
    if (!direccion || !pais || !ciudad) {
        return;
    }

    const online = tipo === "online";
    direccion.disabled = online;
    pais.disabled = online;
    ciudad.disabled = online || !pais.value;

    if (online) {
        direccion.value = "";
        pais.value = "";
        ciudad.innerHTML = "";
        ciudad.appendChild(crearOpcion("", "-- Primero escueye país --"));
    } else {
        cargarCiudades();
    }
}

function poblarFiltros() {
    const filtroSerie = $("#filtro-serie");
    if (filtroSerie) {
        const series = usaServidorColeccion() && Array.isArray(serverMeta?.series)
            ? [...serverMeta.series]
            : [...new Set(coleccion.map((comic) => comic.serie).filter(Boolean))].sort((a, b) => a.localeCompare(b));

        const actual = filtroSerie.value || "todas";
        filtroSerie.innerHTML = '<option value="todas">Toles series</option>';
        series.forEach((serie) => filtroSerie.appendChild(crearOpcion(serie, serie)));
        filtroSerie.value = series.includes(actual) ? actual : "todas";
    }

    sincronizarFiltroCiudades();
}

function sincronizarFiltroCiudades() {
    const filtroCiudad = $("#filtro-ciudad");
    const filtroPais = $("#filtro-pais");
    if (!filtroCiudad || !filtroPais) {
        return;
    }

    const actual = filtroCiudad.value;
    const pais = filtroPais.value;
    const ciudades = pais !== "todos" && ciudadesPorPais[pais]
        ? ciudadesPorPais[pais]
        : [...new Set(tiendas.map((tienda) => tienda.ciudad).filter(Boolean))].sort((a, b) => a.localeCompare(b));

    filtroCiudad.innerHTML = '<option value="todas">Toles ciudaes</option>';
    ciudades.forEach((ciudad) => filtroCiudad.appendChild(crearOpcion(ciudad, ciudad)));
    filtroCiudad.value = ciudades.includes(actual) ? actual : "todas";
}

function renderizarTodo() {
    poblarFiltros();
    renderizarColeccion();
    renderizarTiendas();
    actualizarResumen();
}

function filtrarColeccionLocal(filtros) {
    return coleccion.filter((comic) => {
        const coincideTexto = !filtros.termino || [comic.serie, comic.titulo, comic.autor, comic.editorial]
            .join(" ")
            .toLowerCase()
            .includes(filtros.termino);
        const coincideSerie = filtros.serie === "todas" || comic.serie === filtros.serie;
        const coincideEstado = filtros.estado === "todos" || comic.estado === filtros.estado;
        const coincidePropiedad =
            filtros.propiedad === "todos" ||
            (filtros.propiedad === "si" && comic.tieneslu) ||
            (filtros.propiedad === "no" && !comic.tieneslu);

        return coincideTexto && coincideSerie && coincideEstado && coincidePropiedad;
    });
}

function pintarTablaColeccion(visibles, accionesServidor = false) {
    const cuerpo = $("#tabla-bd");
    if (!cuerpo) {
        return;
    }

    const configTabla = obtenerConfigTablaColeccion();
    cuerpo.innerHTML = "";

    if (!visibles.length) {
        renderizarResumenColeccion([]);
        cuerpo.innerHTML = `
      <tr>
        <td colspan="${configTabla.colspan}">
          <p class="empty-state">Nun hai BD que coincidan colos filtros actuales.</p>
        </td>
      </tr>
    `;
        return;
    }

    renderizarResumenColeccion(visibles);

    visibles.forEach((comic) => {
        const fila = document.createElement("tr");
        if (comic.tieneslu) {
            fila.style.background = "#c2f434";
        }
        const accionesHtml = configTabla.showActions
            ? `
          <td>
            <div class="row-actions">
              <select class="ghost-btn" data-action="${accionesServidor ? "cambiar-estado" : "cambiar-estado-local"}" data-id="${comic.id}">
                ${opcionesEstadoHtml(comic.estado)}
              </select>
              <button type="button" class="ghost-btn" data-action="${accionesServidor ? "toggle-owned" : "toggle-local"}" data-id="${comic.id}" data-owned="${comic.tieneslu ? "1" : "0"}">
                ${textoAccionTieneslu(comic.tieneslu)}
              </button>
            </div>
          </td>
        `
            : "";

        fila.innerHTML = `
          <td>${escapeHtml(comic.titulo)}</td>
          <td><span class="state-pill">${escapeHtml(ESTADO_LABELS[estadoPorDefecto(comic.estado)] || "Nuevu")}</span></td>
          <td><span class="own-pill" data-owned="${comic.tieneslu}">${comic.tieneslu ? "Sí" : "Non"}</span></td>
          ${accionesHtml}
        `;
        cuerpo.appendChild(fila);
    });

    enlazarAccionesTabla(configTabla.showActions, accionesServidor);
}

function enlazarAccionesTabla(showActions, accionesServidor) {
    if (!showActions) {
        return;
    }

    if (!accionesServidor) {
        document.querySelectorAll("[data-action='toggle-local']").forEach((button) => {
            button.addEventListener("click", () => toggleTieneslu(Number(button.dataset.id)));
        });

        document.querySelectorAll("[data-action='cambiar-estado-local']").forEach((select) => {
            select.dataset.prev = select.value;
            select.addEventListener("focus", () => {
                select.dataset.prev = select.value;
            });
            select.addEventListener("change", () => {
                const id = Number(select.dataset.id);
                const previo = select.dataset.prev ?? "nuevu";
                const nuevo = select.value || "nuevu";
                if (!Number.isFinite(id) || id <= 0 || nuevo === previo) {
                    return;
                }

                coleccion = coleccion.map((comic) => (comic.id === id ? { ...comic, estado: nuevo } : comic));
                guardarColeccion();

                const pill = select.closest("tr")?.querySelector(".state-pill");
                if (pill) {
                    pill.textContent = ESTADO_LABELS[nuevo] || "Nuevu";
                }
                select.dataset.prev = nuevo;
            });
        });
        return;
    }

    document.querySelectorAll("[data-action='toggle-owned']").forEach((button) => {
        button.addEventListener("click", async () => {
            const id = Number(button.dataset.id);
            const ownedActual = button.dataset.owned === "1";
            const nuevoOwned = !ownedActual;
            if (!Number.isFinite(id) || id <= 0) {
                return;
            }

            button.disabled = true;
            try {
                await actualizarTienesluServidor(id, nuevoOwned);
                button.dataset.owned = nuevoOwned ? "1" : "0";
                button.textContent = textoAccionTieneslu(nuevoOwned);
                const row = button.closest("tr");
                if (row) {
                    row.style.background = nuevoOwned ? "#c2f434" : "";
                    const pill = row.querySelector(".own-pill");
                    if (pill) {
                        pill.dataset.owned = String(nuevoOwned);
                        pill.textContent = nuevoOwned ? "Sí" : "Non";
                    }
                }
            } catch (error) {
                console.warn("No se pudo actualizar la propiedad.", error);
                alert("Nun pudo actualizase la propiedá na base de datos.");
            } finally {
                button.disabled = false;
            }
        });
    });

    document.querySelectorAll("[data-action='cambiar-estado']").forEach((select) => {
        select.dataset.prev = select.value;
        select.addEventListener("focus", () => {
            select.dataset.prev = select.value;
        });
        select.addEventListener("change", async () => {
            const id = Number(select.dataset.id);
            const previo = select.dataset.prev ?? "nuevu";
            const nuevo = select.value || "nuevu";
            if (!Number.isFinite(id) || id <= 0 || nuevo === previo) {
                return;
            }

            select.disabled = true;
            try {
                await actualizarEstadoServidor(id, nuevo);
                const pill = select.closest("tr")?.querySelector(".state-pill");
                if (pill) {
                    pill.textContent = ESTADO_LABELS[nuevo] || "Nuevu";
                }
                select.dataset.prev = nuevo;
            } catch (error) {
                console.warn("No se pudo actualizar el estado.", error);
                select.value = previo;
                alert("Nun pudo actualizase l'estáu na base de datos.");
            } finally {
                select.disabled = false;
            }
        });
    });
}

function renderizarColeccion() {
    const cuerpo = $("#tabla-bd");
    if (!cuerpo) {
        return;
    }

    const filtros = obtenerFiltrosColeccion();
    const configTabla = obtenerConfigTablaColeccion();

    if (!filtros.activa) {
        renderizarResumenColeccion([]);
        cuerpo.innerHTML = `
      <tr>
        <td colspan="${configTabla.colspan}">
          <p class="empty-state">Escueye una serie dende los enlaces de arriba o usa los filtros pa consultar la BD.</p>
        </td>
      </tr>
    `;
        return;
    }

    if (usaServidorColeccion()) {
        renderizarColeccionServidor(filtros);
        return;
    }

    renderizarColeccionLocal(filtros);
}

function renderizarColeccionLocal(filtros) {
    pintarTablaColeccion(filtrarColeccionLocal(filtros), false);
}

async function renderizarColeccionServidor(filtros) {
    const cuerpo = $("#tabla-bd");
    if (!cuerpo) {
        return;
    }

    if (serverDisponible === false) {
        renderizarColeccionLocal(filtros);
        return;
    }

    const configTabla = obtenerConfigTablaColeccion();
    const seq = ++renderServidorSeq;
    cuerpo.innerHTML = `
      <tr>
        <td colspan="${configTabla.colspan}">
          <p class="empty-state">Consultando...</p>
        </td>
      </tr>
    `;

    const params = new URLSearchParams();
    if (filtros.termino) params.set("q", filtros.termino);
    if (filtros.serie && filtros.serie !== "todas") params.set("serie", filtros.serie);
    if (filtros.estado && filtros.estado !== "todos") params.set("estado", filtros.estado);
    if (filtros.propiedad && filtros.propiedad !== "todos") params.set("propiedad", filtros.propiedad);

    try {
        const response = await fetch(`${API_COLECCION_URL}?${params.toString()}`, { headers: { Accept: "application/json" } });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!payload || payload.ok !== true || !Array.isArray(payload.data)) {
            throw new Error(payload?.error || "Respuesta inválida del servidor");
        }

        if (seq !== renderServidorSeq) {
            return;
        }

        serverDisponible = !payload.fallback;
        const visibles = payload.data.map((row) => normalizarComic({
            id: row.id,
            serie: row.serie,
            titulo: row.titulo,
            autor: row.autores,
            editorial: row.editorial,
            estado: row.estado,
            tieneslu: Number(row.tieneslu)
        }));

        pintarTablaColeccion(visibles, !payload.fallback);
    } catch (error) {
        console.warn("Fallo consultando servidor, usando modo local.", error);
        serverDisponible = false;
        if (seq !== renderServidorSeq) {
            return;
        }
        renderizarColeccionLocal(filtros);
    }
}

function renderizarResumenColeccion(comics) {
    const resumenSerie = $("#resumen-serie");
    const resumenAutor = $("#resumen-autor");
    const resumenEditorial = $("#resumen-editorial");
    const contenedorResumen = $("#resumen-bd");

    if (!resumenSerie || !resumenAutor || !resumenEditorial) {
        return;
    }

    const seriesPresentes = [...new Set(comics.map((comic) => comic.serie).filter(Boolean))];
    const serieUnica = seriesPresentes.length === 1 ? seriesPresentes[0] : null;

    resumenSerie.textContent = seriesPresentes.join(", ") || "-";
    resumenAutor.textContent = [...new Set(comics.map((comic) => comic.autor).filter(Boolean))].join(", ") || "-";
    resumenEditorial.textContent = [...new Set(comics.map((comic) => comic.editorial || "Ensin editorial"))].join(", ") || "-";

    if (contenedorResumen) {
        const fondos = {
            "Natacha": "img/natacha-bd.png",
            "Yoko Tsuno": "img/yoko-tsuno.png",
            "Blacksad": "img/blacksad-bd.png",
            "Superlópez": "img/superlopez.png",
            "Blake & Mortimer": "img/blakemortimer.png"
        };

        const rutaImagen = fondos[serieUnica];

        if (rutaImagen) {
            contenedorResumen.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${rutaImagen}')`;
            contenedorResumen.style.backgroundSize = "cover";
            contenedorResumen.style.backgroundPosition = "center";
        } else {
            contenedorResumen.style.backgroundImage = "none";
        }
    }
}

function toggleTieneslu(id) {
    coleccion = coleccion.map((comic) => (comic.id === id ? { ...comic, tieneslu: !comic.tieneslu } : comic));
    guardarColeccion();
    renderizarTodo();
}

function renderizarTiendas() {
    if (existe("#lista-tiendas")) {
        renderizarTiendasPagina();
    } else if (existe("#lista-tiendas-guardadas")) {
        renderizarTiendasIndex();
    }
}

function renderizarTiendasIndex() {
    const contenedor = $("#lista-tiendas-guardadas");
    if (!contenedor) {
        return;
    }

    const filtroPais = $("#filtro-pais")?.value || "todos";
    const filtroCiudad = $("#filtro-ciudad")?.value || "todas";
    const visibles = tiendas.filter((tienda) => {
        const coincidePais = filtroPais === "todos" || tienda.pais === filtroPais;
        const coincideCiudad = filtroCiudad === "todas" || tienda.ciudad === filtroCiudad;
        return coincidePais && coincideCiudad;
    });

    contenedor.innerHTML = "";
    if (!visibles.length) {
        contenedor.innerHTML = '<li><p class="empty-state">Nun hai tiendes rexistraes con esi filtru.</p></li>';
        return;
    }

    visibles.forEach((tienda) => {
        const item = document.createElement("li");
        item.className = "store-card";
        const tipoLabel = tienda.tipo === "online" ? "Online" : "Física";
        const lineas = [];

        if (tienda.tipo === "fisica") {
            if (tienda.direccion) lineas.push(escapeHtml(tienda.direccion));
            const zona = [tienda.ciudad, tienda.pais ? capitalizar(tienda.pais) : ""].filter(Boolean).join(", ");
            if (zona) lineas.push(escapeHtml(zona));
            if (tienda.web) lineas.push(escapeHtml(tienda.web));
        } else if (tienda.web) {
            lineas.push(escapeHtml(tienda.web));
        }

        item.innerHTML = `
          <div>
            <h3>${escapeHtml(tienda.nombre)} <small>(${escapeHtml(tipoLabel)})</small></h3>
            ${lineas.length ? `<p class="store-meta">${lineas.join("<br>")}</p>` : ""}
          </div>
        `;
        contenedor.appendChild(item);
    });
}

function renderizarTiendasPagina() {
    const contenedor = $("#lista-tiendas");
    if (!contenedor) {
        return;
    }

    const filtro = leerFiltroSitioTiendas();
    const textoFiltro = $("#tiendas-filtro");
    if (textoFiltro) {
        textoFiltro.textContent = filtro ? `Filtru activu: ${filtro === "online" ? "online" : "física"}` : "Escueye un filtru en Inicio.";
    }

    const visibles = filtro ? tiendas.filter((tienda) => tienda.tipo === filtro) : [];
    contenedor.innerHTML = "";

    if (!filtro) {
        contenedor.innerHTML = '<li><p class="empty-state">Escueye online o física dende Inicio pa ver el llistáu.</p></li>';
        return;
    }

    if (!visibles.length) {
        contenedor.innerHTML = '<li><p class="empty-state">Nun hai tiendes rexistraes pa esti filtru.</p></li>';
        return;
    }

    visibles.forEach((tienda) => {
        const item = document.createElement("li");
        item.className = "store-card";
        item.innerHTML = tiendaEditandoId === tienda.id ? renderizarFormularioEdicionTienda(tienda) : renderizarVistaTienda(tienda);
        contenedor.appendChild(item);
    });

    contenedor.querySelectorAll("[data-action='edit-store']").forEach((button) => {
        button.addEventListener("click", () => {
            tiendaEditandoId = Number(button.dataset.id) || null;
            renderizarTiendasPagina();
        });
    });

    contenedor.querySelectorAll("[data-action='cancel-store']").forEach((button) => {
        button.addEventListener("click", () => {
            tiendaEditandoId = null;
            renderizarTiendasPagina();
        });
    });

    contenedor.querySelectorAll("[data-action='delete-store']").forEach((button) => {
        button.addEventListener("click", () => borrarTienda(Number(button.dataset.id)));
    });

    contenedor.querySelectorAll("[data-action='save-store']").forEach((button) => {
        button.addEventListener("click", () => guardarEdicionTienda(Number(button.dataset.id)));
    });
}

function normalizarWebParaMostrar(web) {
    const value = String(web || "").trim();
    if (!value) return "";
    return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

function renderizarVistaTienda(tienda) {
    const web = normalizarWebParaMostrar(tienda.web);
    const lineas = [];

    if (tienda.tipo === "fisica") {
        if (tienda.direccion) lineas.push(escapeHtml(tienda.direccion));
        const zona = [tienda.ciudad, tienda.pais ? capitalizar(tienda.pais) : ""].filter(Boolean).join(", ");
        if (zona) lineas.push(escapeHtml(zona));
    }
    if (web) {
        lineas.push(`<a href="${escapeHtml(web)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tienda.web)}</a>`);
    }

    return `
      <div>
        <h3>${escapeHtml(tienda.nombre)}</h3>
        ${lineas.length ? `<p class="store-meta">${lineas.join("<br>")}</p>` : ""}
      </div>
      <div class="row-actions">
        <button type="button" class="ghost-btn" data-action="edit-store" data-id="${tienda.id}">Editar</button>
        <button type="button" class="danger-btn" data-action="delete-store" data-id="${tienda.id}">Borrar</button>
      </div>
    `;
}

function renderizarFormularioEdicionTienda(tienda) {
    return `
      <div>
        <h3>Editar tienda</h3>
        <div class="filters-grid compact">
          <label>Nome</label>
          <input type="text" data-field="nombre" data-id="${tienda.id}" value="${escapeHtml(tienda.nombre)}" required>

          <label>Tipu</label>
          <select data-field="tipo" data-id="${tienda.id}" required>
            <option value="online"${tienda.tipo === "online" ? " selected" : ""}>Online</option>
            <option value="fisica"${tienda.tipo === "fisica" ? " selected" : ""}>Física</option>
          </select>

          <label>Web</label>
          <input type="url" data-field="web" data-id="${tienda.id}" value="${escapeHtml(tienda.web)}" placeholder="https://...">

          <label>Direición</label>
          <input type="text" data-field="direccion" data-id="${tienda.id}" value="${escapeHtml(tienda.direccion)}">

          <label>País</label>
          <input type="text" data-field="pais" data-id="${tienda.id}" value="${escapeHtml(tienda.pais)}">

          <label>Ciudá</label>
          <input type="text" data-field="ciudad" data-id="${tienda.id}" value="${escapeHtml(tienda.ciudad)}">
        </div>
      </div>
      <div class="row-actions">
        <button type="button" class="ghost-btn" data-action="save-store" data-id="${tienda.id}">Guardar</button>
        <button type="button" class="danger-btn" data-action="cancel-store" data-id="${tienda.id}">Cancelar</button>
      </div>
    `;
}

function guardarEdicionTienda(id) {
    if (!Number.isFinite(id) || id <= 0) {
        return;
    }

    const getField = (field) => document.querySelector(`[data-field='${field}'][data-id='${id}']`);
    const actualizada = normalizarTienda({
        id,
        nombre: getField("nombre")?.value,
        tipo: getField("tipo")?.value,
        web: getField("web")?.value,
        direccion: getField("direccion")?.value,
        pais: getField("pais")?.value,
        ciudad: getField("ciudad")?.value,
        fechaRegistro: tiendas.find((tienda) => tienda.id === id)?.fechaRegistro || ""
    });

    if (!actualizada.nombre || !actualizada.tipo) {
        alert("Nome y tipu son obligatorios.");
        return;
    }

    tiendas = tiendas.map((tienda) => (tienda.id === id ? { ...tienda, ...actualizada } : tienda));
    guardarTiendasStorage();
    sincronizarFiltroCiudades();
    tiendaEditandoId = null;
    renderizarTodo();
}

function borrarTienda(id) {
    if (!Number.isFinite(id) || id <= 0) {
        return;
    }

    if (!window.confirm("¿Tas seguru de que quies borrar esta tienda?")) {
        return;
    }

    tiendas = tiendas.filter((tienda) => tienda.id !== id);
    guardarTiendasStorage();
    sincronizarFiltroCiudades();
    tiendaEditandoId = null;
    renderizarTodo();
}

function actualizarResumen() {
    if (existe("#stat-total")) $("#stat-total").textContent = String(coleccion.length);
    if (existe("#stat-propios")) $("#stat-propios").textContent = String(coleccion.filter((comic) => comic.tieneslu).length);
    if (existe("#stat-tiendas")) $("#stat-tiendas").textContent = String(tiendas.length);
}

function capitalizar(texto) {
    return String(texto || "")
        .split(" ")
        .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(" ");
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function registrarServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("./sw.js").catch((error) => {
            console.error("Nun se pudo rexistrar el service worker", error);
        });
    }
}

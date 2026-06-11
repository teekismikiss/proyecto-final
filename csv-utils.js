(function (root, factory) {
    const api = factory();
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    root.csvUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function escaparValorCsv(valor) {
        const texto = valor == null ? "" : String(valor);
        if (/[",\n]/.test(texto)) {
            return `"${texto.replace(/"/g, '""')}"`;
        }
        return texto;
    }

    function convertirDatosACsv(rows, headers = []) {
        if (!Array.isArray(rows) || !rows.length) {
            return "";
        }

        const columnas = headers.length ? headers : Object.keys(rows[0] || {});
        const lineaCabecera = columnas.map((columna) => escaparValorCsv(columna)).join(",");
        const lineasCuerpo = rows.map((fila) => columnas.map((columna) => escaparValorCsv(fila[columna] ?? "")).join(","));
        return [lineaCabecera, ...lineasCuerpo].join("\n");
    }

    function descargarCsv(nombreArchivo, contenido) {
        const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        URL.revokeObjectURL(url);
    }

    return {
        convertirDatosACsv,
        descargarCsv,
        escaparValorCsv
    };
});

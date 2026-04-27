<?php

mysqli_report(MYSQLI_REPORT_OFF);

define("FALLBACK_JSON_FILE", dirname(__DIR__) . "/data/bdColeccion.json");

// CDMON


// Infinity


// Local
$conexion = @new mysqli("localhost", "root", "root", "bd_bande_dessinee");

$dbDisponible = $conexion instanceof mysqli && !$conexion->connect_errno;

if ($dbDisponible) {
    $conexion->set_charset("utf8mb4");
}

define("USE_FALLBACK", !$dbDisponible);
define(
    "FALLBACK_MESSAGE",
    USE_FALLBACK
        ? "Base de datos no disponible. Usando datos locales."
        : ""
);

if (USE_FALLBACK) {
    $conexion = null;
}

?>

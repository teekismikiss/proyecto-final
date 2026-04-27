<?php
/**
 * Lóxica pa desaniciar álbumes de la coleición.
 * La rellación en album_autor bórrase automáticamente por el 'ON DELETE CASCADE' de la BD.
 */

include("config.php");

// Comprobamos qu'esista l'ID
if (isset($_GET['id'])) {
    $id = intval($_GET['id']);
    // Executamos el borráu
    $conexion->query("DELETE FROM albumes WHERE id = $id");
}

// Volvemos al llistáu principal
header("Location: index.php");
exit;
?>
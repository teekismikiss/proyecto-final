<?php
/**
 * Lóxica pa guardar o actualizar álbumes na base de datos.
 * Remana tantu la tabla principal 'albumes' como la rellación 'album_autor'.
 */

include("config.php");

// Recoyida de datos del formulariu
$id = isset($_POST['id']) ? intval($_POST['id']) : null;
$titulo = $_POST['titulo'];
$serie_id = $_POST['serie_id'];
$editorial_id = !empty($_POST['editorial_id']) ? $_POST['editorial_id'] : null;
$estado_id = $_POST['estado_id'];
$tieneslu = isset($_POST['tieneslu']) ? 1 : 0;
$autores = isset($_POST['autores']) ? $_POST['autores'] : [];

if ($id) {
    // === CASU UPDATE: L'álbum yá esiste ===
    $sql = "UPDATE albumes SET 
            titulo = ?, 
            serie_id = ?, 
            editorial_id = ?, 
            estado_id = ?, 
            tieneslu = ? 
            WHERE id = ?";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("siiiii", $titulo, $serie_id, $editorial_id, $estado_id, $tieneslu, $id);
    $stmt->execute();
    
    // Llimpiamos autores antiguos pa meter los nuevos
    $conexion->query("DELETE FROM album_autor WHERE album_id = $id");
    $album_id = $id;
} else {
    // === CASU INSERT: Álbum nuevu ===
    $sql = "INSERT INTO albumes (titulo, serie_id, editorial_id, estado_id, tieneslu) 
            VALUES (?, ?, ?, ?, ?)";
    $stmt = $conexion->prepare($sql);
    $stmt->bind_param("siiii", $titulo, $serie_id, $editorial_id, $estado_id, $tieneslu);
    $stmt->execute();
    $album_id = $stmt->insert_id;
}

// === XESTIÓN D'AUTORES (Rellación N:M) ===
if (!empty($autores)) {
    foreach ($autores as $autor_id) {
        $stmt_aut = $conexion->prepare("INSERT INTO album_autor (album_id, autor_id) VALUES (?, ?)");
        $stmt_aut->bind_param("ii", $album_id, $autor_id);
        $stmt_aut->execute();
    }
}

// Volvemos al índiz de la web
header("Location: index.php");
exit;
?>
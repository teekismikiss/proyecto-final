<?php
// Incluyimos la configuración
include("config.php");

// Comprobamos si nos pasen un ID válidu
if (!isset($_GET['id']) || empty($_GET['id'])) {
    header("Location: index.php");
    exit;
}

$id = intval($_GET['id']);

// Trayemos los datos del álbum
$res = $conexion->query("SELECT * FROM albumes WHERE id = $id");
if ($res->num_rows == 0) {
    header("Location: index.php");
    exit;
}
$album = $res->fetch_assoc();

// Trayemos los autores rellacionaos pal checkbox
$autores_album = [];
$res_aut = $conexion->query("SELECT autor_id FROM album_autor WHERE album_id = $id");
while ($r = $res_aut->fetch_assoc()) {
    $autores_album[] = $r['autor_id'];
}

// Amestamos la cabecera del diseńu
include("header.php");
?>

<div class="glass-panel" style="max-width: 600px; margin: 0 auto;">
    <div style="margin-bottom: 2rem;">
        <a href="index.php" style="color: var(--accent); text-decoration: none; font-size: 0.875rem;">← Cancelar y volver</a>
        <h2 style="margin-top: 1rem;">Editar álbum</h2>
    </div>

    <form action="guardar.php" method="POST">
        <!-- ID ocultu pa que guardar.php sepa qu'esto ye un UPDATE -->
        <input type="hidden" name="id" value="<?= $id ?>">

        <!-- Títulu del álbum -->
        <div class="form-group">
            <label for="titulo">Títulu del álbum</label>
            <input type="text" name="titulo" id="titulo" value="<?= htmlspecialchars($album['titulo']) ?>" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <!-- Serie -->
            <div class="form-group">
                <label for="serie_id">Serie</label>
                <select name="serie_id" id="serie_id">
                    <?php
                    $res = $conexion->query("SELECT * FROM series ORDER BY nombre ASC");
                    while ($row = $res->fetch_assoc()) {
                        $selected = ($row['id'] == $album['serie_id']) ? "selected" : "";
                        echo "<option value='{$row['id']}' $selected>{$row['nombre']}</option>";
                    }
                    ?>
                </select>
            </div>

            <!-- Editorial -->
            <div class="form-group">
                <label for="editorial_id">Editorial</label>
                <select name="editorial_id" id="editorial_id">
                    <option value="">-- Ensin especificar --</option>
                    <?php
                    $res = $conexion->query("SELECT * FROM editoriales ORDER BY nombre ASC");
                    while ($row = $res->fetch_assoc()) {
                        $selected = ($row['id'] == $album['editorial_id']) ? "selected" : "";
                        echo "<option value='{$row['id']}' $selected>{$row['nombre']}</option>";
                    }
                    ?>
                </select>
            </div>
        </div>

        <!-- Estáu de calidá -->
        <div class="form-group">
            <label for="estado_id">Estáu del exemplar</label>
            <select name="estado_id" id="estado_id">
                <?php
                $res = $conexion->query("SELECT * FROM estados ORDER BY id ASC");
                while ($row = $res->fetch_assoc()) {
                    $selected = ($row['id'] == $album['estado_id']) ? "selected" : "";
                    echo "<option value='{$row['id']}' $selected>{$row['nombre']}</option>";
                }
                ?>
            </select>
        </div>

        <!-- Autores -->
        <div class="form-group">
            <label>Autores</label>
            <div class="checkbox-group">
            <?php
            $res = $conexion->query("SELECT * FROM autores ORDER BY nombre ASC");
            while ($row = $res->fetch_assoc()) {
                $checked = in_array($row['id'], $autores_album) ? "checked" : "";
                echo "<label class='checkbox-item'>
                        <input type='checkbox' name='autores[]' value='{$row['id']}' $checked>
                        <span>{$row['nombre']}</span>
                      </label>";
            }
            ?>
            </div>
        </div>

        <!-- Checkbox de posesión -->
        <div class="form-group" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 0.5rem; margin-top: 2rem;">
            <label class="checkbox-item" style="color: var(--text-main); margin-bottom: 0;">
                <input type="checkbox" name="tieneslu" value="1" <?= $album['tieneslu'] ? "checked" : "" ?>>
                <span>¿Yá lu tienes na to coleición?</span>
            </label>
        </div>

        <div style="margin-top: 2rem;">
            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 1rem; font-size: 1rem;">
                🔄 Actualizar datos
            </button>
        </div>
    </form>
</div>

<?php 
// Zarramos col footer
include("footer.php"); 
?>
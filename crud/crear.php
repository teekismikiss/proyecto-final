<?php include("config.php"); ?>

<h2>Nuevo álbum</h2>

<form action="guardar.php" method="POST">

Título: <input type="text" name="titulo" required><br><br>

Serie:
<select name="serie_id">
<?php
$res = $conexion->query("SELECT * FROM series");
while ($row = $res->fetch_assoc()) {
    echo "<option value='{$row['id']}'>{$row['nombre']}</option>";
}
?>
</select><br><br>

Estado:
<select name="estado_id">
<?php
$res = $conexion->query("SELECT * FROM estados");
while ($row = $res->fetch_assoc()) {
    echo "<option value='{$row['id']}'>{$row['nombre']}</option>";
}
?>
</select><br><br>

Autores:<br>
<?php
$res = $conexion->query("SELECT * FROM autores");
while ($row = $res->fetch_assoc()) {
    echo "<input type='checkbox' name='autores[]' value='{$row['id']}'> {$row['nombre']}<br>";
}
?>

<br>
Tienes: <input type="checkbox" name="tieneslu"><br><br>

<input type="submit" value="Guardar">

</form>
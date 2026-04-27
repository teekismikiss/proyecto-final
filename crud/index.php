<?php 
// Incluyimos la configuración de la base de datos
include("config.php"); 
// Amestamos la cabecera del diseńu
include("header.php"); 
?>

<div class="glass-panel">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2 style="color:black;">Llistáu d'Álbumes</h2>
        <a href="crear.php" class="btn btn-primary">➕ Amiestu nuevu</a>
    </div>

    <table>
        <thead>
            <tr>
                <th>Títulu</th>
                <th>Serie</th>
                <th>Editorial</th>
                <th>Autores</th>
                <th>Estáu</th>
                <th>¿Tieneslu?</th>
                <th style="text-align: right;">Aiciones</th>
            </tr>
        </thead>
        <tbody>
            <?php
            // Consulta pa trayer los álbumes con tola información rellacionao
            $sql = "
            SELECT 
                a.id,
                a.titulo,
                s.nombre AS serie,
                ed.nombre AS editorial,
                e.nombre AS estado,
                a.tieneslu,
                GROUP_CONCAT(au.nombre SEPARATOR ', ') AS autores
            FROM albumes a
            LEFT JOIN series s ON a.serie_id = s.id
            LEFT JOIN editoriales ed ON a.editorial_id = ed.id
            LEFT JOIN estados e ON a.estado_id = e.id
            LEFT JOIN album_autor aa ON a.id = aa.album_id
            LEFT JOIN autores au ON aa.autor_id = au.id
            GROUP BY a.id
            ";

            $result = $conexion->query($sql);

            if ($result->num_rows > 0) {
                while ($row = $result->fetch_assoc()) {
                    // Definimos el badge pal estáu de posesión
                    $tienesBadge = $row['tieneslu'] 
                        ? "<span class='badge badge-yes'>Sí</span>" 
                        : "<span class='badge badge-no'>Non</span>";
                    
                    echo "<tr>
                        <td style='font-weight: 600;'>{$row['titulo']}</td>
                        <td style='color: var(--text-muted);'>{$row['serie']}</td>
                        <td>" . ($row['editorial'] ?? '<em style="opacity:0.5;">Ensin especificar</em>') . "</td>
                        <td style='font-size: 0.9rem;'>{$row['autores']}</td>
                        <td><span style='color: var(--accent);'>{$row['estado']}</span></td>
                        <td>{$tienesBadge}</td>
                        <td style='text-align: right;'>
                            <a href='editar.php?id={$row['id']}' class='btn-icon' title='Editar'>✏️</a>
                            <a href='eliminar.php?id={$row['id']}' class='btn-icon' title='Desaniciar' onclick='return confirm(\"¿De xuro que quies desaniciar esti álbum?\")'>🗑️</a>
                        </td>
                    </tr>";
                }
            } else {
                echo "<tr><td colspan='7' style='text-align: center; padding: 3rem;'>Nun hai álbumes na coleición inda.</td></tr>";
            }
            ?>
        </tbody>
    </table>
</div>

<?php 
// Zarramos el diseńu col footer
include("footer.php"); 
?> 
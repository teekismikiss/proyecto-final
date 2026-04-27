<?php
require_once __DIR__ . "/config.php";

function conn(): mysqli {
    global $conexion;
    if (USE_FALLBACK || !($conexion instanceof mysqli)) {
        throw new RuntimeException(FALLBACK_MESSAGE ?: "Conexión no inicializada. Revisa crud/config.php.");
    }
    return $conexion;
}

function consulta(string $sql, string $types = "", array $params = []): array {
    $conn = conn();

    $stmt = $types ? $conn->prepare($sql) : null;
    if ($types) {
        if (!$stmt) {
            throw new RuntimeException("Error preparando consulta: " . $conn->error);
        }

        $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $conn->error;
            $stmt->close();
            throw new RuntimeException("Error ejecutando consulta: " . $error);
        }

        $result = $stmt->get_result();
    } else {
        $result = $conn->query($sql);
        if ($result === false) {
            throw new RuntimeException("Error en la consulta: " . $conn->error);
        }
    }

    $data = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
    }

    if (isset($stmt) && $stmt) {
        $stmt->close();
    }
    return $data;
}
?>

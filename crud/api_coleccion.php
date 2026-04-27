<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . "/funciones.php";

function json_response(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function get_string(string $key): string {
    $value = $_GET[$key] ?? "";
    return is_string($value) ? trim($value) : "";
}

function read_json_body(): array {
    $raw = file_get_contents("php://input");
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function get_body_string(array $body, string $key): string {
    $value = $body[$key] ?? "";
    return is_string($value) ? trim($value) : "";
}

function map_estado_slug_to_nombre(string $slug): ?string {
    $slug = strtolower(trim($slug));
    if ($slug === "" || $slug === "todos") {
        return null;
    }

    return match ($slug) {
        "nuevu" => "Nuevu",
        "como-nuevu" => "Como nuevu",
        "bon-estau" => "Bon estáu",
        "gastau" => "Gastáu",
        default => null,
    };
}

function map_estado_nombre_to_slug(?string $nombre): string {
    $normal = strtolower(trim((string) $nombre));
    return match ($normal) {
        "nuevu" => "nuevu",
        "como nuevu" => "como-nuevu",
        "bon estáu", "bon estau", "bonu" => "bon-estau",
        "gastáu", "gastau" => "gastau",
        default => "",
    };
}

function fallback_file_path(): string {
    return FALLBACK_JSON_FILE;
}

function fallback_file_exists(): bool {
    return is_file(fallback_file_path());
}

function fallback_collection(): array {
    static $cache = null;

    if ($cache !== null) {
        return $cache;
    }

    $file = fallback_file_path();
    if (!is_file($file)) {
        throw new RuntimeException("No se encontró el JSON local de respaldo.");
    }

    $raw = file_get_contents($file);
    $data = json_decode((string) $raw, true);
    if (!is_array($data)) {
        throw new RuntimeException("El JSON local de respaldo no es válido.");
    }

    $cache = array_values(array_filter(array_map(function ($item) {
        if (!is_array($item)) {
            return null;
        }

        return [
            "id" => (int) ($item["id"] ?? 0),
            "titulo" => trim((string) ($item["titulo"] ?? $item["titulu"] ?? "")),
            "serie" => trim((string) ($item["serie"] ?? "")),
            "editorial" => trim((string) ($item["editorial"] ?? "")),
            "estado" => trim((string) ($item["estado"] ?? "")),
            "tieneslu" => !empty($item["tieneslu"]) ? 1 : 0,
            "autores" => trim((string) ($item["autor"] ?? $item["autores"] ?? "")),
        ];
    }, $data)));

    return $cache;
}

function fallback_meta(): array {
    $data = fallback_collection();
    $series = [];
    foreach ($data as $row) {
        if (($row["serie"] ?? "") !== "") {
            $series[] = $row["serie"];
        }
    }

    $series = array_values(array_unique($series));
    sort($series, SORT_NATURAL | SORT_FLAG_CASE);

    return [
        "series" => $series,
        "estados" => ["Nuevu", "Como nuevu", "Bon estáu", "Gastáu"],
    ];
}

function fallback_filter(string $termino, string $serie, ?string $estadoNombre, string $propiedad): array {
    $termino = mb_strtolower(trim($termino));

    $rows = array_filter(fallback_collection(), function (array $row) use ($termino, $serie, $estadoNombre, $propiedad): bool {
        $texto = mb_strtolower(implode(" ", [
            $row["titulo"] ?? "",
            $row["serie"] ?? "",
            $row["editorial"] ?? "",
            $row["autores"] ?? "",
        ]));

        if ($termino !== "" && !str_contains($texto, $termino)) {
            return false;
        }

        if ($serie !== "" && $serie !== "todas" && ($row["serie"] ?? "") !== $serie) {
            return false;
        }

        if ($estadoNombre !== null && map_estado_nombre_to_slug($row["estado"] ?? "") !== map_estado_nombre_to_slug($estadoNombre)) {
            return false;
        }

        if ($propiedad === "si" && (int) ($row["tieneslu"] ?? 0) !== 1) {
            return false;
        }

        if ($propiedad === "no" && (int) ($row["tieneslu"] ?? 0) !== 0) {
            return false;
        }

        return true;
    });

    usort($rows, function (array $a, array $b): int {
        $serieCmp = strcasecmp((string) ($a["serie"] ?? ""), (string) ($b["serie"] ?? ""));
        if ($serieCmp !== 0) {
            return $serieCmp;
        }
        return strcasecmp((string) ($a["titulo"] ?? ""), (string) ($b["titulo"] ?? ""));
    });

    return array_values($rows);
}

try {
    if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "POST") {
        $body = read_json_body();
        $action = strtolower(get_body_string($body, "action"));

        if ($action !== "update_estado" && $action !== "update_tieneslu") {
            json_response(400, [
                "ok" => false,
                "error" => "Acción no soportada.",
            ]);
        }

        if (USE_FALLBACK) {
            json_response(503, [
                "ok" => false,
                "error" => "Modo local activo. Los cambios solo están disponibles con conexión a la base de datos.",
            ]);
        }

        $id = (int) get_body_string($body, "id");
        if ($id <= 0) {
            json_response(400, [
                "ok" => false,
                "error" => "ID inválido.",
            ]);
        }

        $conn = conn();

        if ($action === "update_tieneslu") {
            $tieneslu = filter_var($body["tieneslu"] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            $stmt = $conn->prepare("UPDATE albumes SET tieneslu = ? WHERE id = ?");
            if (!$stmt) {
                throw new RuntimeException("Error preparando update: " . $conn->error);
            }
            $stmt->bind_param("ii", $tieneslu, $id);
            if (!$stmt->execute()) {
                $error = $stmt->error ?: $conn->error;
                $stmt->close();
                throw new RuntimeException("Error actualizando propiedad: " . $error);
            }
            $stmt->close();

            json_response(200, [
                "ok" => true,
                "id" => $id,
                "tieneslu" => $tieneslu,
            ]);
        }

        $estadoSlug = get_body_string($body, "estado");
        $estadoNombre = map_estado_slug_to_nombre($estadoSlug);

        if ($estadoNombre === null) {
            $stmt = $conn->prepare("UPDATE albumes SET estado_id = NULL WHERE id = ?");
            if (!$stmt) {
                throw new RuntimeException("Error preparando update: " . $conn->error);
            }
            $stmt->bind_param("i", $id);
            if (!$stmt->execute()) {
                $error = $stmt->error ?: $conn->error;
                $stmt->close();
                throw new RuntimeException("Error actualizando estado: " . $error);
            }
            $stmt->close();

            json_response(200, [
                "ok" => true,
                "id" => $id,
                "estado" => "",
            ]);
        }

        $stmt = $conn->prepare("SELECT id FROM estados WHERE nombre = ? LIMIT 1");
        if (!$stmt) {
            throw new RuntimeException("Error preparando lookup: " . $conn->error);
        }
        $stmt->bind_param("s", $estadoNombre);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $conn->error;
            $stmt->close();
            throw new RuntimeException("Error consultando estados: " . $error);
        }
        $result = $stmt->get_result();
        $row = $result ? $result->fetch_assoc() : null;
        $stmt->close();

        if (!$row || !isset($row["id"])) {
            json_response(400, [
                "ok" => false,
                "error" => "Estado no válido.",
            ]);
        }

        $estadoId = (int) $row["id"];
        $stmt = $conn->prepare("UPDATE albumes SET estado_id = ? WHERE id = ?");
        if (!$stmt) {
            throw new RuntimeException("Error preparando update: " . $conn->error);
        }
        $stmt->bind_param("ii", $estadoId, $id);
        if (!$stmt->execute()) {
            $error = $stmt->error ?: $conn->error;
            $stmt->close();
            throw new RuntimeException("Error actualizando estado: " . $error);
        }
        $stmt->close();

        json_response(200, [
            "ok" => true,
            "id" => $id,
            "estado" => $estadoSlug,
        ]);
    }

    $soloMeta = get_string("meta") === "1";

    if ($soloMeta) {
        if (USE_FALLBACK) {
            json_response(200, [
                "ok" => true,
                ...fallback_meta(),
                "source" => "json",
                "fallback" => true,
            ]);
        }

        $series = consulta("SELECT nombre FROM series ORDER BY nombre ASC");
        $estados = consulta("SELECT nombre FROM estados ORDER BY id ASC");
        json_response(200, [
            "ok" => true,
            "series" => array_map(fn($r) => $r["nombre"], $series),
            "estados" => array_map(fn($r) => $r["nombre"], $estados),
            "source" => "mysql",
            "fallback" => false,
        ]);
    }

    $termino = get_string("q");
    $serie = get_string("serie");
    $estadoNombre = map_estado_slug_to_nombre(get_string("estado"));
    $propiedad = strtolower(get_string("propiedad"));

    if (USE_FALLBACK) {
        json_response(200, [
            "ok" => true,
            "data" => fallback_filter($termino, $serie, $estadoNombre, $propiedad),
            "source" => "json",
            "fallback" => true,
        ]);
    }

    $where = [];
    $types = "";
    $params = [];

    if ($termino !== "") {
        $like = "%" . $termino . "%";
        $where[] = "(a.titulo LIKE ? OR s.nombre LIKE ? OR ed.nombre LIKE ? OR au.nombre LIKE ?)";
        $types .= "ssss";
        array_push($params, $like, $like, $like, $like);
    }

    if ($serie !== "" && $serie !== "todas") {
        $where[] = "s.nombre = ?";
        $types .= "s";
        $params[] = $serie;
    }

    if ($estadoNombre) {
        $where[] = "e.nombre = ?";
        $types .= "s";
        $params[] = $estadoNombre;
    }

    if ($propiedad === "si") {
        $where[] = "a.tieneslu = 1";
    } elseif ($propiedad === "no") {
        $where[] = "a.tieneslu = 0";
    }

    $sql = "
        SELECT
            a.id,
            a.titulo,
            s.nombre AS serie,
            ed.nombre AS editorial,
            e.nombre AS estado,
            a.tieneslu,
            GROUP_CONCAT(DISTINCT au.nombre ORDER BY au.nombre SEPARATOR ', ') AS autores
        FROM albumes a
        LEFT JOIN series s ON a.serie_id = s.id
        LEFT JOIN editoriales ed ON a.editorial_id = ed.id
        LEFT JOIN estados e ON a.estado_id = e.id
        LEFT JOIN album_autor aa ON a.id = aa.album_id
        LEFT JOIN autores au ON aa.autor_id = au.id
    ";

    if ($where) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    $sql .= " GROUP BY a.id ORDER BY s.nombre ASC, a.titulo ASC";

    $data = consulta($sql, $types, $params);

    json_response(200, [
        "ok" => true,
        "data" => $data,
        "source" => "mysql",
        "fallback" => false,
    ]);
} catch (Throwable $e) {
    if (USE_FALLBACK && fallback_file_exists()) {
        json_response(200, [
            "ok" => true,
            "data" => fallback_filter(
                get_string("q"),
                get_string("serie"),
                map_estado_slug_to_nombre(get_string("estado")),
                strtolower(get_string("propiedad"))
            ),
            "source" => "json",
            "fallback" => true,
            "warning" => $e->getMessage(),
        ]);
    }

    json_response(500, [
        "ok" => false,
        "error" => $e->getMessage(),
    ]);
}

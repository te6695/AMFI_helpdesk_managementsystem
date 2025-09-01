<?php
// api/directorates/index.php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function($exception) {
    header('Content-Type: application/json');
    http_response_code(500); 
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $exception->getMessage()
    ]);
    exit();
});

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../middleware/auth.php';

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database connection failed"]);
        exit;
    }

    $user = authenticate($db);

    if (!$user) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized access. Invalid token."]);
        exit();
    }

    // Only admin can manage directorates
    $adminRoles = ["admin", "sub_admin"];
    if (!in_array($user->role, $adminRoles)) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Forbidden: Only admins can manage directorates."]);
        exit;
    }

    $requestMethod = $_SERVER["REQUEST_METHOD"];

    switch ($requestMethod) {
        case 'GET':
            // Get all directorates
            $query = "SELECT id, name, description, created_at FROM directorates ORDER BY name";
            $stmt = $db->prepare($query);
            $stmt->execute();
            
            $directorates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode(["status" => "success", "directorates" => $directorates]);
            break;

        case 'POST':
            // Create a new directorate
            $data = json_decode(file_get_contents("php://input"));
            
            if (empty($data->name)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Directorate name is required."]);
                exit;
            }

            $query = "INSERT INTO directorates (name, description, created_at) VALUES (:name, :description, GETDATE())";
            $stmt = $db->prepare($query);
            
            $name = htmlspecialchars(strip_tags($data->name));
            $description = isset($data->description) ? htmlspecialchars(strip_tags($data->description)) : null;
            
            $stmt->bindParam(':name', $name);
            $stmt->bindParam(':description', $description);
            
            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode(["status" => "success", "message" => "Directorate created successfully."]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to create directorate."]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error: " . $e->getMessage()]);
}
?>
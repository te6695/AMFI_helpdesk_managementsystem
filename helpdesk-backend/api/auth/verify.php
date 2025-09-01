<?php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/User.php';

// Enable CORS for development
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}



$database = new Database();
$db = $database->getConnection();

$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

if ($token) {
    $user = new User($db);
    $user->token = $token;
    
    if ($user->getByToken()) {
        http_response_code(200);
        echo json_encode([
            "message" => "Token is valid",
            "user" => [
                "id" => $user->id,
                "username" => $user->username,
                "role" => $user->role,
                "directorate" => $user->directorate // ADDED: Include directorate
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["message" => "Invalid or expired token"]);
    }
} else {
    http_response_code(401);
    echo json_encode(["message" => "No token provided"]);
}
?>

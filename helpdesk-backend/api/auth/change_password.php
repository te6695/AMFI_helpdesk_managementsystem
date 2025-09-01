<?php
// api/auth/change_password.php

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set headers first to prevent any output before JSON
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST,PUT,OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Include necessary files with correct absolute paths
    require_once 'C:/xampp/htdocs/HDMS/helpdesk-backend/config/database.php';
    require_once 'C:/xampp/htdocs/HDMS/helpdesk-backend/models/User.php';

    // Get database connection
    $database = new Database();
    $db = $database->getConnection();

    // Initialize user object
    $user = new User($db);

    // Get JWT token from header
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

    if (!$token) {
        throw new Exception("Authorization token required", 401);
    }

    // Get user by token
    $user->token = $token;
    
    if (!$user->getByToken()) {
        throw new Exception("Invalid or expired token", 401);
    }

    // Get posted data
    $input = file_get_contents("php://input");
    
    if (empty($input)) {
        throw new Exception("No data received", 400);
    }
    
    $data = json_decode($input);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON data: " . json_last_error_msg(), 400);
    }

    // Validate required fields
    if (!isset($data->currentPassword) || empty($data->currentPassword)) {
        throw new Exception("Current password is required", 400);
    }
    
    if (!isset($data->newPassword) || empty($data->newPassword)) {
        throw new Exception("New password is required", 400);
    }

    // Verify current password
    if (!$user->verifyPassword($data->currentPassword)) {
        throw new Exception("Current password is incorrect", 400);
    }

    // Update password
    $user->password = $data->newPassword;
    
    if ($user->updatePassword()) {
        http_response_code(200);
        echo json_encode(array(
            "status" => "success", 
            "message" => "Password updated successfully"
        ));
    } else {
        throw new Exception("Unable to update password. Database error.", 500);
    }

} catch (Exception $e) {
    // Set appropriate HTTP status code
    $code = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($code);
    
    // Return JSON error response
    echo json_encode(array(
        "status" => "error", 
        "message" => $e->getMessage()
    ));
}
?>
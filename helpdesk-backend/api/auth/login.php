<?php

if (ob_get_level() == 0) ob_start(); // Start if not already started
ob_clean(); // Clear any existing buffer content


// Enable CORS for development
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_flush(); // Flush any buffered output
    exit();
}

// Set error handler to return JSON
set_error_handler(function($severity, $message, $file, $line) {
    ob_clean(); // Clear buffer before outputting error
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function($exception) {
    ob_clean(); // Clear buffer before outputting exception
    http_response_code(500); 
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine()
    ]);
    ob_end_flush(); // Flush any buffered output
    exit();
});

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../models/User.php';

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database connection failed"]);
        ob_end_flush();
        exit;
    }

    $data = json_decode(file_get_contents("php://input"));

    if (empty($data->username) || empty($data->password)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Please provide both username and password."]);
        ob_end_flush();
        exit();
    }

    $user = new User($db);
    $user->username = $data->username; // Pass the raw username, trimming will happen in getByUsername

    error_log("DEBUG: Login attempt for username: " . $user->username);

    if ($user->getByUsername()) { // User found in DB
        error_log("DEBUG: User found in DB: " . $user->username);
        // Trim the input password before verification to ensure no leading/trailing spaces interfere
        if ($user->verifyPassword(trim($data->password))) { 
            error_log("DEBUG: Password verified for user: " . $user->username);
            
            // --- EMBEDDED JWT LOGIC ---
            $key = "7dba16bf1feee45fe042c5b00dc2d500af0bd3171e7d217f13f2f94f210cb278"; 
            $issuer = "http://localhost:5173"; 
            $audience = "http://localhost/HDMS/helpdesk-backend"; 
            $expire_time = 3600; 

            $issuedAt = time();
            $expirationTime = $issuedAt + $expire_time;

            $payload = [
                'iat' => $issuedAt,
                'exp' => $expirationTime,
                'iss' => $issuer,
                'aud' => $audience,
                'data' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'role' => $user->role,
                    'directorate' => $user->directorate // Include directorate in JWT payload
                ]
            ];

            // Basic JWT encoding (no external library)
            $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
            $payload_json = json_encode($payload);

            $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
            $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload_json));

            $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $key, true);
            $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

            $token = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
            // --- END EMBEDDED JWT LOGIC ---

            // Update user's token in the database (for session tracking/revocation if needed)
            $user->token = $token;
            $user->updateToken($token); 

            error_log("DEBUG: Sending 200 OK response with user data for: " . $user->username);
            http_response_code(200);
            echo json_encode([
                "status" => "success",
                "message" => "Login successful.",
                "token" => $token,
                "user" => [
                    "id" => $user->id,
                    "username" => $user->username,
                    "email" => $user->email,
                    "role" => $user->role,
                    "directorate" => $user->directorate
                ]
            ]);
            ob_end_flush(); // Flush any buffered output
            exit();
        } else {
            error_log("DEBUG: Password verification FAILED for user: " . $user->username);
        }
    } else {
        error_log("DEBUG: User NOT found in DB for username: " . $user->username);
    }

    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Invalid username or password"]);
    ob_end_flush(); // Flush any buffered output
    exit();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine()
    ]);
    ob_end_flush(); // Flush any buffered output
    exit();
}

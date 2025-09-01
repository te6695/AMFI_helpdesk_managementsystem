<?php
// middleware/auth.php

require_once __DIR__ . '/../models/User.php'; // Path to your User model

/**
 * Authenticates the user based on the Authorization header and verifies JWT.
 * @param PDO $db The database connection.
 * @return User|false The authenticated User object if successful, false otherwise.
 */
function authenticate($db) {
    // Get authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

    // Check if Authorization header is present and starts with 'Bearer '
    if (!preg_match('/Bearer\\s(\\S+)/', $authHeader, $matches)) {
        error_log("DEBUG: Authentication failed: Bearer token missing or malformed.");
        return false;
    }

    $token = $matches[1];

    // --- EMBEDDED JWT VERIFICATION LOGIC ---
    // IMPORTANT: This key MUST be the EXACT SAME as used in login.php!
    $key = "7dba16bf1feee45fe042c5b00dc2d500af0bd3171e7d217f13f2f94f210cb278"; 
    $issuer = "http://localhost:5173"; // Your frontend URL
    $audience = "http://localhost/HDMS/helpdesk-backend"; // Your backend URL

    // Split the token into its parts
    $tokenParts = explode('.', $token);
    if (count($tokenParts) !== 3) {
        error_log("DEBUG: JWT verification failed: Invalid token format.");
        return false;
    }

    list($headerB64, $payloadB64, $signatureB64) = $tokenParts;

    // Decode header and payload
    $header = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $headerB64)), true);
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payloadB64)), true);

    // Verify signature
    $expectedSignature = hash_hmac('sha256', $headerB64 . "." . $payloadB64, $key, true);
    $actualSignature = base64_decode(str_replace(['-', '_'], ['+', '/'], $signatureB64));

    if (!hash_equals($expectedSignature, $actualSignature)) {
        error_log("DEBUG: JWT verification failed: Signature mismatch. Expected: " . bin2hex($expectedSignature) . " Actual: " . bin2hex($actualSignature));
        return false;
    }

    // Verify expiration time (exp)
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        error_log("DEBUG: JWT verification failed: Token expired.");
        return false;
    }

    // Verify issuer (iss)
    if (isset($payload['iss']) && $payload['iss'] !== $issuer) {
        error_log("DEBUG: JWT verification failed: Invalid issuer.");
        return false;
    }

    // Verify audience (aud)
    if (isset($payload['aud']) && $payload['aud'] !== $audience) {
        error_log("DEBUG: JWT verification failed: Invalid audience.");
        return false;
    }

    // Check if user ID is in the payload
    if (!isset($payload['data']['id'])) {
        error_log("DEBUG: JWT verification failed: User ID missing from payload.");
        return false;
    }
    $userId = $payload['data']['id'];

    // Retrieve user from database using the ID from the token
    $user = new User($db);
    $user->id = $userId;

    if ($user->readSingle()) { 
        
        error_log("DEBUG: User authenticated successfully by JWT: ID=" . $user->id . ", Role=" . $user->role);
       
        return $user;
    } else {
        error_log("DEBUG: Authentication failed: User not found in DB for ID from token: " . $userId);
        return false;
    }
    
}
?>

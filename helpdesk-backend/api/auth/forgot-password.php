<?php
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

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../models/User.php';

$database = new Database();
$db = $database->getConnection();

// Check if database connection is successful
if (!$db) {
    http_response_code(500);
    echo json_encode(["message" => "Database connection error", "status" => "error"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

// Log the request for debugging
error_log("Forgot password request: " . print_r($data, true));

if (!empty($data->email)) {
    $user = new User($db);
    $user->email = trim($data->email);
    
    // Check if user exists with case-insensitive comparison
    $query = "SELECT id, email, username FROM users WHERE LOWER(email) = LOWER(:email)";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':email', $user->email);
    
    if ($stmt->execute()) {
        if ($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $user_id = $row['id'];
            $actual_email = $row['email'];
            $username = $row['username'];
            
            // Generate reset token (valid for 1 hour)
            $resetToken = bin2hex(random_bytes(32));
            $expiry = date("Y-m-d H:i:s", strtotime("+1 hour"));
            
            // Store token and expiry in database
            $query = "UPDATE users SET token = :token, reset_expiry = :expiry WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':token', $resetToken);
            $stmt->bindParam(':expiry', $expiry);
            $stmt->bindParam(':id', $user_id);
            
            if ($stmt->execute()) {
                // Simulate email sending (replace with actual email code in production)
                $emailSent = $this->sendPasswordResetEmail($actual_email, $username, $resetToken);
                
                if ($emailSent) {
                    http_response_code(200);
                    echo json_encode([
                        "message" => "Password reset link has been sent to your email",
                        "status" => "success",
                        "email" => $actual_email
                    ]);
                    
                    error_log("Reset email sent successfully to: $actual_email");
                } else {
                    http_response_code(500);
                    echo json_encode([
                        "message" => "Password reset token generated but failed to send email. Please try again later.",
                        "status" => "warning"
                    ]);
                    
                    error_log("Failed to send reset email to: $actual_email");
                }
            } else {
                error_log("Token update failed: " . print_r($stmt->errorInfo(), true));
                http_response_code(500);
                echo json_encode([
                    "message" => "Unable to process password reset. Please try again.",
                    "status" => "error"
                ]);
            }
        } else {
            // Email not found - try to find similar emails for better error message
            $query = "SELECT email FROM users WHERE email LIKE :partial_email LIMIT 3";
            $stmt = $db->prepare($query);
            $partial_email = '%' . $user->email . '%';
            $stmt->bindParam(':partial_email', $partial_email);
            
            $suggestions = [];
            if ($stmt->execute()) {
                $suggestions = $stmt->fetchAll(PDO::FETCH_COLUMN);
            }
            
            $message = "Email not found in our system";
            if (!empty($suggestions)) {
                $message .= ". Did you mean: " . implode(", ", $suggestions) . "?";
            }
            
            http_response_code(404);
            echo json_encode([
                "message" => $message,
                "status" => "error"
            ]);
        }
    } else {
        error_log("Query execution failed: " . print_r($stmt->errorInfo(), true));
        http_response_code(500);
        echo json_encode([
            "message" => "Database error. Please try again later.",
            "status" => "error"
        ]);
    }
} else {
    http_response_code(400);
    echo json_encode([
        "message" => "Email is required",
        "status" => "error"
    ]);
}

// Email sending function (simulated for development)
function sendPasswordResetEmail($email, $username, $token) {
    // In development, we'll simulate email sending
    // In production, replace with actual email code using PHPMailer, SendGrid, etc.
    
    $resetLink = "http://localhost:5173/reset-password?token=$token";
    
    // Simulate email sending - 90% success rate for demo
    $success = rand(1, 10) > 1; // 90% chance of success
    
    if ($success) {
        error_log("SIMULATED: Password reset email sent to $email");
        error_log("SIMULATED: Reset link: $resetLink");
        return true;
    } else {
        error_log("SIMULATED: Failed to send email to $email");
        return false;
    }
    
    
}
?>
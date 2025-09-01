<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

require_once __DIR__ . '/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Test connection
    echo json_encode(["status" => "success", "message" => "Database connected successfully"]);
    
    // Test ticket insertion
    $query = "INSERT INTO tickets (subject, description, category, priority, status, submitted_by) 
              VALUES ('Test Ticket', 'Test Description', 'Technical', 'medium', 'open', 1)";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Test ticket inserted successfully", "ticket_id" => $db->lastInsertId()]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to insert test ticket"]);
    }
    
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Ticket.php';
require_once __DIR__ . '/../middleware/auth.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Test without authentication first
    $query = "SELECT COUNT(*) as total FROM tickets";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "status" => "success", 
        "message" => "Database connection successful",
        "total_tickets" => $count['total']
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "Error: " . $e->getMessage()
    ]);
}
?>
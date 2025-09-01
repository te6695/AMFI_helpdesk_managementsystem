<?php
// api/tickets/resolution_stats.php

// Enable CORS for development
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Set error handler to return JSON
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function($exception) {
    header('Content-Type: application/json');
    http_response_code(500); 
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine()
    ]);
    exit();
});

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../middleware/auth.php'; 
    require_once __DIR__ . '/../../models/User.php'; // Required for user role check

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database connection failed"]);
        exit;
    }

    $user = authenticate($db); // Authenticate the current user

    // Only the top-level 'admin' can view these statistics
    if (!$user || $user->role !== 'admin') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Forbidden: Only top-level admins can view resolution statistics."]);
        exit();
    }

    // --- Fetch Daily Statistics ---
    // Counts submitted and resolved tickets per day
    $dailyQuery = "
        SELECT
            CAST(created_at AS DATE) AS date_key,
            COUNT(id) AS submitted,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
        FROM tickets
        GROUP BY CAST(created_at AS DATE)
        ORDER BY date_key DESC;
    ";
    $dailyStmt = $db->prepare($dailyQuery);
    $dailyStmt->execute();
    $dailyStats = $dailyStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format daily data
    $formattedDailyStats = array_map(function($row) {
        return [
            'date' => $row['date_key'],
            'submitted' => (int)$row['submitted'],
            'resolved' => (int)$row['resolved']
        ];
    }, $dailyStats);


    // --- Fetch Weekly Statistics ---
    // Counts submitted and resolved tickets per week
    $weeklyQuery = "
        SELECT
            YEAR(created_at) AS year,
            DATEPART(wk, created_at) AS week_number,
            COUNT(id) AS submitted,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
        FROM tickets
        GROUP BY YEAR(created_at), DATEPART(wk, created_at)
        ORDER BY year, week_number DESC;
    ";
    $weeklyStmt = $db->prepare($weeklyQuery);
    $weeklyStmt->execute();
    $weeklyStats = $weeklyStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format weekly data (e.g., 'Week 1, 2024')
    $formattedWeeklyStats = array_map(function($row) {
        return [
            'week' => 'Week ' . $row['week_number'] . ', ' . $row['year'],
            'submitted' => (int)$row['submitted'],
            'resolved' => (int)$row['resolved']
        ];
    }, $weeklyStats);


    // --- Fetch Monthly Statistics ---
    // Counts submitted and resolved tickets per month
    $monthlyQuery = "
        SELECT
            YEAR(created_at) AS year,
            MONTH(created_at) AS month_number,
            DATENAME(month, created_at) AS month_name,
            COUNT(id) AS submitted,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved
        FROM tickets
        GROUP BY YEAR(created_at), MONTH(created_at), DATENAME(month, created_at)
        ORDER BY year, month_number DESC;
    ";
    $monthlyStmt = $db->prepare($monthlyQuery);
    $monthlyStmt->execute();
    $monthlyStats = $monthlyStmt->fetchAll(PDO::FETCH_ASSOC);

    // Format monthly data (e.g., 'January 2024')
    $formattedMonthlyStats = array_map(function($row) {
        return [
            'month' => $row['month_name'] . ' ' . $row['year'],
            'submitted' => (int)$row['submitted'],
            'resolved' => (int)$row['resolved']
        ];
    }, $monthlyStats);


    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "stats" => [
            "daily" => $formattedDailyStats,
            "weekly" => $formattedWeeklyStats,
            "monthly" => $formattedMonthlyStats
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>

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

// Set error handler to return JSON
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(function($exception) {
    http_response_code(500); // Ensure 500 status code
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine()
    ]);
    exit();
});

try {
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../models/Notification.php';
    require_once __DIR__ . '/../../middleware/auth.php';

    $database = new Database();
    $db = $database->getConnection();

    $method = $_SERVER['REQUEST_METHOD'];
    $user = authenticate($db); 

    if (!$user) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized: Please log in."]);
        exit;
    }

    $notification = new Notification($db);

    switch ($method) {
        case 'GET':
            $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';
            $notifications = $notification->getByUser($user->id, $unreadOnly);

            http_response_code(200);
            echo json_encode(["status" => "success", "notifications" => $notifications]);
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"));

            // Handle "mark all as read" POST request
            if (isset($data->userId) && $data->userId == $user->id) { // Expecting userId in POST body
                if ($notification->markAllAsRead($user->id)) {
                    http_response_code(200);
                    echo json_encode(["status" => "success", "message" => "All notifications marked as read"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["status" => "error", "message" => "Unable to mark all notifications as read"]);
                }
            } elseif (!empty($data->message)) {
                // Handle create new notification POST request
                $notification->user_id = $user->id; // Use user_id as per Notification model
                $notification->message = $data->message;

                if ($notification->create()) {
                    http_response_code(201);
                    echo json_encode(["status" => "success", "message" => "Notification created successfully"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["status" => "error", "message" => "Unable to create notification"]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Invalid POST data or missing message for creation"]);
            }
            break;

        case 'PUT':
            $id = isset($_GET['id']) ? $_GET['id'] : null;

            if ($id) {
                if ($notification->checkOwnership($id, $user->id)) { 
                    if ($notification->markAsRead($id)) {
                        http_response_code(200);
                        echo json_encode(["status" => "success", "message" => "Notification marked as read"]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["status" => "error", "message" => "Unable to update notification"]);
                    }
                } else {
                     http_response_code(403);
                     echo json_encode(["status" => "error", "message" => "Forbidden: You do not own this notification"]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Notification ID not provided for PUT action"]);
            }
            break;

        case 'DELETE':
            $id = isset($_GET['id']) ? $_GET['id'] : null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Notification ID not provided"]);
                exit;
            }

            if ($notification->checkOwnership($id, $user->id)) { 
                if ($notification->delete($id)) { 
                    http_response_code(200);
                    echo json_encode(["status" => "success", "message" => "Notification deleted successfully"]);
                } else {
                    http_response_code(500);
                    echo json_encode(["status" => "error", "message" => "Unable to delete notification"]);
                }
            } else {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: You do not own this notification"]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine()
    ]);
}
?>

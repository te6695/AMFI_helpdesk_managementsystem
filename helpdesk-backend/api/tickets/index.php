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
    require_once __DIR__ . '/../../models/Ticket.php';
    require_once __DIR__ . '/../../models/User.php';
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
        echo json_encode(["status" => "error", "message" => "Unauthorized"]);
        exit;
    }

    $ticketModel = new Ticket($db);
    $requestMethod = $_SERVER["REQUEST_METHOD"];

    // Define ADMIN_ROLES in PHP for GET request authorization
    $adminRoles = ["admin", "boardadmin", "ceoadmin", "cooadmin", "ccoadmin", "IRadmin", "ITadmin", "operatonadmin", "marketadmin", "branchadmin", "financeadmin", "planandstrategyadmin", "shareadmin", "lawadmin", "riskadmin", "auditadmin"];

    switch ($requestMethod) {
        case 'GET':
            $tickets = [];
            
            // --- Authorization Logic for GET requests ---
            if ($user->role === 'admin') { // Only top-level admin
                $tickets = $ticketModel->getAllTickets(
                    isset($_GET['user_id']) ? $_GET['user_id'] : null,
                    isset($_GET['status']) ? $_GET['status'] : null,
                    isset($_GET['priority']) ? $_GET['priority'] : null,
                    isset($_GET['category']) ? $_GET['category'] : null,
                    isset($_GET['search']) ? $_GET['search'] : null
                );
            } elseif (in_array($user->role, $adminRoles)) { // All sub-admin roles
                // Check if requesting tickets submitted to this specific sub-admin
                if (isset($_GET['submitted_to']) && (int)$_GET['submitted_to'] === (int)$user->id) {
                    $tickets = $ticketModel->getTicketsSubmittedToUser($user->id);
                } 
                // Check if requesting tickets assigned to this specific sub-admin
                elseif (isset($_GET['assigned_to_id']) && (int)$_GET['assigned_to_id'] === (int)$user->id) {
                    $tickets = $ticketModel->getTicketsAssignedToUser($user->id);
                } else {
                    // Default: show all tickets for sub-admins (with proper filtering in frontend)
                    $tickets = $ticketModel->getAllTickets(
                        isset($_GET['user_id']) ? $_GET['user_id'] : null,
                        isset($_GET['status']) ? $_GET['status'] : null,
                        isset($_GET['priority']) ? $_GET['priority'] : null,
                        isset($_GET['category']) ? $_GET['category'] : null,
                        isset($_GET['search']) ? $_GET['search'] : null
                    );
                }
            } elseif ($user->role === 'resolver') {
                // Resolver-specific endpoints
                if (isset($_GET['assigned']) && $_GET['assigned'] === 'true') {
                    $tickets = $ticketModel->getAssignedTickets($user->id);
                } 
                elseif (isset($_GET['resolved']) && $_GET['resolved'] === 'true') {
                    $tickets = $ticketModel->getResolvedTickets($user->id);
                } 
                elseif (isset($_GET['user_id']) && (int)$_GET['user_id'] === (int)$user->id) {
                    // Tickets submitted by this resolver
                    $tickets = $ticketModel->getUserTickets($user->id);
                }
                elseif (isset($_GET['resolver_overview']) && $_GET['resolver_overview'] === 'true') {
                    // All tickets relevant to this resolver (assigned + submitted)
                    $assigned = $ticketModel->getAssignedTickets($user->id);
                    $submitted = $ticketModel->getUserTickets($user->id);
                    $tickets = array_merge($assigned, $submitted);
                }
                else {
                    // Default: show assigned tickets
                    $tickets = $ticketModel->getAssignedTickets($user->id);
                }
            } elseif ($user->role === 'user') {
                if (isset($_GET['user_id']) && (int)$_GET['user_id'] !== (int)$user->id) {
                    http_response_code(403);
                    echo json_encode(["status" => "error", "message" => "Forbidden: You can only view your own tickets."]);
                    exit;
                }
                $tickets = $ticketModel->getUserTickets($user->id);
            } else {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: Insufficient role to view tickets."]);
                exit;
            }
            
            http_response_code(200);
            echo json_encode(["status" => "success", "tickets" => $tickets]);
            break;

        case 'POST': 
            $data = json_decode(file_get_contents("php://input"));

            $allowedTicketCreationRoles = array_merge(['user', 'resolver'], $adminRoles);
            
            if (!in_array($user->role, $allowedTicketCreationRoles)) { 
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: Your role cannot create tickets."]);
                exit;
            }

            if (!empty($data->subject) && !empty($data->description) && !empty($data->category)) {
                $ticketModel->subject = $data->subject;
                $ticketModel->description = $data->description;
                $ticketModel->category = $data->category;
                $ticketModel->priority = isset($data->priority) ? $data->priority : 'medium';
                $ticketModel->submitted_by = $user->id;
                $ticketModel->status = 'open'; 
                
                // Handle optional submitted_to - convert empty string to null
                $ticketModel->submitted_to = isset($data->submitted_to) && !empty($data->submitted_to) ? $data->submitted_to : null;
                
                // Handle optional assigned_to - convert empty string to null
                $ticketModel->assigned_to = isset($data->assigned_to) && !empty($data->assigned_to) ? $data->assigned_to : null;
                
                if ($ticketModel->create()) {
                    http_response_code(201);
                    echo json_encode([
                        "status" => "success", 
                        "message" => "Ticket created successfully",
                        "ticket_id" => $ticketModel->id
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode(["status" => "error", "message" => "Unable to create ticket"]);
                }
            } else {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Incomplete data for ticket creation"]);
            }
            break;

        case 'PUT':
        case 'PATCH':
            $data = json_decode(file_get_contents("php://input"));
            
            if (empty($_GET['id'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Ticket ID is required for update."]);
                exit;
            }
            $ticketId = $_GET['id'];
            
            // Authorization for PUT requests
            if ($user->role === 'admin' || in_array($user->role, $adminRoles) || $user->role === 'resolver') { 
                $ticketModel->id = $ticketId;
                if (!$ticketModel->readSingle()) {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "Ticket not found."]);
                    exit;
                }
                
                if (isset($data->assigned_to)) {
                    // Only admin or sub-admin can assign tickets
                    if ($user->role !== 'admin' && !in_array($user->role, $adminRoles)) {
                        http_response_code(403);
                        echo json_encode(["status" => "error", "message" => "Forbidden: Only admins can assign tickets."]);
                        exit;
                    }
                    $ticketModel->assigned_to = $data->assigned_to;
                    $ticketModel->status = 'assigned';
                    if ($ticketModel->assign($data->assigned_to)) { 
                        http_response_code(200);
                        echo json_encode(["status" => "success", "message" => "Ticket assigned successfully."]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["status" => "error", "message" => "Failed to assign ticket."]);
                    }
                } elseif (isset($data->solution)) {
                    // Updated authorization check for resolving tickets
                    $isAuthorizedToResolve = false;

                    // Allow resolver to resolve if ticket is assigned to them
                    if ($user->role === 'resolver' && (int)$ticketModel->assigned_to === (int)$user->id) {
                        $isAuthorizedToResolve = true;
                    }
                    // Allow sub-admin to resolve if the ticket was submitted to them or assigned to them
                    if (in_array($user->role, $adminRoles) && ((int)$ticketModel->submitted_to === (int)$user->id || (int)$ticketModel->assigned_to === (int)$user->id)) {
                        $isAuthorizedToResolve = true;
                    }

                    if (!$isAuthorizedToResolve) {
                        http_response_code(403);
                        echo json_encode(["status" => "error", "message" => "Forbidden: You are not authorized to resolve this ticket."]);
                        exit;
                    }
                    
                    $ticketModel->solution = $data->solution;
                    $ticketModel->status = 'resolved';
                    if ($ticketModel->resolve($data->solution)) { 
                        http_response_code(200);
                        echo json_encode(["status" => "success", "message" => "Ticket resolved successfully."]);
                    } else {
                        http_response_code(500);
                        echo json_encode(["status" => "error", "message" => "Failed to resolve ticket."]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Invalid update request or missing solution/assigned_to field."]);
                }
                
            } else {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: Insufficient role for this action."]);
                exit;
            }
            break;

        case 'DELETE':
            if (empty($_GET['id'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Ticket ID is required for deletion."]);
                exit;
            }
            $ticketModel->id = $_GET['id'];
            
            // Read the ticket to check ownership/status
            if (!$ticketModel->readSingle()) {
                http_response_code(404);
                echo json_encode(["status" => "error", "message" => "Ticket not found."]);
                exit;
            }

            // Authorization for DELETE requests
            if ($user->role === 'admin' || in_array($user->role, $adminRoles)) { 
            } elseif ($user->role === 'user' && (int)$ticketModel->submitted_by === (int)$user->id && $ticketModel->status === 'open') {
            } else {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: Insufficient role or unauthorized to delete this ticket."]);
                exit;
            }
            
            if ($ticketModel->delete()) {
                http_response_code(200);
                echo json_encode(["status" => "success", "message" => "Ticket deleted successfully"]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Unable to delete ticket"]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>
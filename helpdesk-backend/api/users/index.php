<?php
// api/users/index.php

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
    require_once __DIR__ . '/../../models/User.php';
    require_once __DIR__ . '/../../middleware/auth.php'; // Path to auth.php

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database connection failed"]);
        exit;
    }

    $user = authenticate($db); // Authenticate the current user

    if (!$user) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized access. Invalid token."]);
        exit();
    }

    $userModel = new User($db);
    $requestMethod = $_SERVER["REQUEST_METHOD"];

    // Define ADMIN_ROLES in PHP for authorization checks (mirroring frontend)
    // FIX: Add "sub_admin" to the admin roles array.
    $adminRoles = ["admin", "boardadmin", "ceoadmin", "cooadmin", "ccoadmin", "IRadmin", "ITadmin", "operatonadmin", "marketadmin", "branchadmin", "financeadmin", "planandstrategyadmin", "shareadmin", "lawadmin", "riskadmin", "auditadmin", "sub_admin"];
    $validRoles = array_merge($adminRoles, ["resolver", "user"]); 

    switch ($requestMethod) {
        case 'GET':
            if (isset($_GET['roles'])) { // Handle fetching users by multiple roles
                $requestedRoles = explode(',', $_GET['roles']);
                $directorateFilter = isset($_GET['directorate']) ? trim($_GET['directorate']) : null;
                $excludeUserId = isset($_GET['exclude_user_id']) ? (int)$_GET['exclude_user_id'] : null;
                
                // Filter requested roles against valid roles
                $filteredRoles = array_filter($requestedRoles, function($role) use ($validRoles) {
                    return in_array(trim($role), $validRoles);
                });

                if (empty($filteredRoles)) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Invalid or empty roles specified."]);
                    exit();
                }

                // Call the flexible getUsersByRole method in the User model
                $users = $userModel->getUsersByRole($filteredRoles, $directorateFilter, $excludeUserId);
                http_response_code(200);
                echo json_encode(["status" => "success", "users" => $users]);
                exit(); 

            } elseif (isset($_GET['id'])) {
                // Fetch single user
                // Authorization: Admins can view any profile, regular users can only view their own.
                if (!in_array($user->role, $adminRoles) && $user->id != $_GET['id']) {
                    http_response_code(403);
                    echo json_encode(["status" => "error", "message" => "Forbidden: You can only view your own profile."]);
                    exit;
                }
                $userModel->id = $_GET['id'];
                if ($userModel->readSingle()) {
                    http_response_code(200);
                    echo json_encode(["status" => "success", "user" => [
                        "id" => $userModel->id,
                        "username" => $userModel->username,
                        "email" => $userModel->email,
                        "role" => $userModel->role,
                        "directorate" => $userModel->directorate, // Include directorate
                        "created_at" => $userModel->created_at
                    ]]);
                } else {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "User not found."]);
                }
                exit();

            // In tickets/index.php - Add this condition to the GET method
                } elseif (isset($_GET['subadmin_directorate']) && (in_array($user->role, $adminRoles) || $user->role === 'admin')) {
                    $directorate = $_GET['subadmin_directorate'];
                    $tickets = $ticketModel->getTicketsByDirectorate($directorate);
                
            } else {
                // Default: get all users (only for authorized roles)
                // Authorization: Only 'admin' or sub-admins can get all users
                if (!in_array($user->role, $adminRoles)) {
                    http_response_code(403);
                    echo json_encode(["status" => "error", "message" => "Forbidden: Only admins can view all users."]);
                    exit;
                }
                $users = $userModel->getAllUsers(); // Call existing getAllUsers method from User.php
                http_response_code(200);
                echo json_encode(["status" => "success", "users" => $users]);
                exit();
            }
            
        case 'POST':
            $data = json_decode(file_get_contents("php://input"));
            
            // Authorization check for creating users: only 'admin' or specified sub-admins can create
            if (!in_array($user->role, $adminRoles)) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: Only admins can add new users."]);
                exit;
            }
            
            if (empty($data->username) || empty($data->password) || empty($data->email) || empty($data->role)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Incomplete user data (username, password, email, role are required)."]);
                exit;
            }
            // Validate role
            if (!in_array($data->role, $validRoles)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Invalid role specified."]);
                exit();
            }

            error_log("DEBUG: POST /users - Incoming data for new user: " . json_encode($data));

            $userModel->username = $data->username;
            // IMPORTANT FIX: Hash password here ONCE, trimming input for consistency
            $userModel->password = password_hash(trim($data->password), PASSWORD_BCRYPT); 
            $userModel->email = $data->email;
            $userModel->role = $data->role;
            $userModel->directorate = isset($data->directorate) ? $data->directorate : null; // Handle optional directorate

            error_log("DEBUG: POST /users - User model properties before create: " . json_encode(['username' => $userModel->username, 'role' => $userModel->role, 'directorate' => $userModel->directorate]));

            if ($userModel->create()) {
                http_response_code(201);
                echo json_encode(["status" => "success", "message" => "User created successfully."]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Unable to create user. This might be due to duplicate username/email."]);
            }
            break;
case 'PUT':
case 'PATCH':
    $data = json_decode(file_get_contents("php://input"));
    
    if (empty($_GET['id'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "User ID is required for update."]);
        exit;
    }
    
    $userIdToUpdate = $_GET['id'];
    
    // Authorization for PUT: Only 'admin' role can update other users
    // A user can update their OWN profile (except role)
    if ($user->id != $userIdToUpdate && $user->role !== 'admin') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Forbidden: You are not authorized to update this user."]);
        exit;
    }

    $userModel->id = $userIdToUpdate;
    if (!$userModel->readSingle()) { // Read existing user data
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "User not found."]);
        exit;
    }

    if (isset($_GET['action']) && $_GET['action'] === 'reset_password') {
        // Handle password reset - only 'admin' or user themselves
        if ($user->role !== 'admin' && $user->id != $userIdToUpdate) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Forbidden: You are not authorized to reset this password."]);
            exit;
        }
        if (empty($data->password)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "New password is required for reset."]);
            exit;
        }
        // The updatePassword method in User.php handles hashing the password
        $userModel->password = $data->password; 
        if ($userModel->updatePassword()) {
            http_response_code(200);
            echo json_encode(["status" => "success", "message" => "User password reset successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to reset user password."]);
        }
        exit; // ADD THIS LINE TO PREVENT FURTHER EXECUTION
    } else {
        // Handle general user info update
        if (isset($data->username)) $userModel->username = $data->username;
        if (isset($data->email)) $userModel->email = $data->email;
        if (isset($data->directorate)) $userModel->directorate = $data->directorate; // Update directorate

        // Role change: Only 'admin' can change other users' roles
        if (isset($data->role)) {
            if ($user->role === 'admin' && $user->id != $userIdToUpdate) { // Admin changing another user's role
                // Validate new role
                if (!in_array($data->role, $validRoles)) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Invalid role specified for update."]);
                    exit();
                }
                $userModel->role = $data->role;
            } elseif ($user->id == $userIdToUpdate && $data->role !== $userModel->role) {
                // User trying to change their own role - Forbidden
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: You cannot change your own role."]);
                exit;
            }
            // If not admin changing other's role, and not self-changing role, then original role persists
        }

        if ($userModel->update()) {
            http_response_code(200);
            echo json_encode(["status" => "success", "message" => "User updated successfully."]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Failed to update user."]);
        }
    }
    break;

        case 'DELETE':
            if (empty($_GET['id'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "User ID is required for deletion."]);
                exit;
            }
            
            $userIdToDelete = $_GET['id'];
            
            // Authorization for DELETE: Only 'admin' role can delete users
            if ($user->role !== 'admin') {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: Only top-level admins can delete users."]);
                exit;
            }

            // Prevent a user from deleting themselves
            if ($user->id == $userIdToDelete) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Forbidden: You cannot delete your own account."]);
                exit;
            }

            $userModel->id = $userIdToDelete;
            if ($userModel->delete()) {
                http_response_code(200);
                echo json_encode(["status" => "success", "message" => "User deleted successfully."]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to delete user."]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(["status" => "error", "message" => "Method not allowed"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error: " . $e->getMessage()]);
}
?>
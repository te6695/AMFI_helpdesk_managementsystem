<?php
class Ticket {
    private $conn;
    public $table = 'tickets';
    
    public $id;
    public $subject;
    public $description;
    public $category;
    public $priority;
    public $status;
    public $createdAt; 
    public $resolved_at; 
    public $solution;
    public $submitted_by; 
    public $assigned_to; 
    public $submitted_to;
    
    public $submitted_by_name;
    public $assigned_to_name;
    public $submitted_to_name;
    
    const ADMIN_ROLES = [
        "admin", "boardadmin", "ceoadmin", "cooadmin", "ccoadmin", "IRadmin", "ITadmin", 
        "operatonadmin", "marketadmin", "branchadmin", "financeadmin", "planandstrategyadmin", 
        "shareadmin", "lawadmin", "riskadmin", "auditadmin"
    ];

    public function __construct($db) {
        $this->conn = $db;
    }
    
    /**
     * Creates a new ticket in the database and handles notifications.
     * @return bool True on success, false on failure.
     */
  // In Ticket.php - Fix the create() method
// In Ticket.php - Fix the notification logic
public function create() {
    $query = "INSERT INTO " . $this->table . " 
              (subject, description, category, priority, status, submitted_by, submitted_to, assigned_to, created_at)
              OUTPUT INSERTED.id
              VALUES (:subject, :description, :category, :priority, 'open', :submitted_by, :submitted_to, :assigned_to, GETDATE())"; 
    
    $stmt = $this->conn->prepare($query);
    
    $this->subject = htmlspecialchars(strip_tags($this->subject));
    $this->description = htmlspecialchars(strip_tags($this->description));
    $this->category = htmlspecialchars(strip_tags($this->category));
    $this->priority = htmlspecialchars(strip_tags($this->priority));
    $this->submitted_by = htmlspecialchars(strip_tags($this->submitted_by));
    
    $submitted_to = ($this->submitted_to === null || $this->submitted_to === '') ? null : (int)htmlspecialchars(strip_tags($this->submitted_to));
    $assigned_to = ($this->assigned_to === null || $this->assigned_to === '') ? null : (int)htmlspecialchars(strip_tags($this->assigned_to));

    $stmt->bindParam(':subject', $this->subject);
    $stmt->bindParam(':description', $this->description);
    $stmt->bindParam(':category', $this->category);
    $stmt->bindParam(':priority', $this->priority);
    $stmt->bindParam(':submitted_by', $this->submitted_by, PDO::PARAM_INT);
    $stmt->bindParam(':submitted_to', $submitted_to, PDO::PARAM_INT);
    $stmt->bindParam(':assigned_to', $assigned_to, PDO::PARAM_INT); 
    
    if ($stmt->execute()) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $this->id = $row['id'];
        
        // Debug logging
        error_log("Ticket #{$this->id} created. submitted_to: " . ($submitted_to ?? 'null') . ", assigned_to: " . ($assigned_to ?? 'null'));
        
        // REMOVED: Don't notify user when they submit ticket
        // $this->createUserNotification($this->submitted_by, "Your ticket (#{$this->id}) '" . $this->subject . "' has been successfully submitted and is currently open.");

        // Send appropriate notifications based on assignment/submission
        if ($assigned_to) {
            error_log("Creating assignment notification for user {$assigned_to}");
            $this->createResolverNotification($assigned_to, "A new ticket (#{$this->id}) has been directly assigned to you: " . $this->subject);
            $this->createAdminNotification("Ticket (#{$this->id}) '" . $this->subject . "' has been directly assigned to a resolver.");
        } 
        
        if ($submitted_to) {
            error_log("Creating submission notification for user {$submitted_to}");
            $this->createResolverNotification($submitted_to, "A new ticket (#{$this->id}) has been submitted to you for review: " . $this->subject);
            $this->createAdminNotification("A new ticket (#{$this->id}) has been submitted to a sub-admin.");
        } 
        
        if (!$assigned_to && !$submitted_to) {
            error_log("Creating admin notification for unassigned ticket");
            $this->createAdminNotification("New unassigned ticket submitted (for general review): " . $this->subject);
        }
        
        return true;
    }
    
    return false;
}

/**
 * Resolves a ticket with a given solution and NOTIFIES THE USER.
 * @param string $solution The solution to the ticket.
 * @return bool True on success, false on failure.
 */
public function resolve($solution) {
    $query = "UPDATE " . $this->table . " SET solution = :solution, status = 'resolved', resolved_at = SYSDATETIME(), updated_at = SYSDATETIME() WHERE id = :id";
    $stmt = $this->conn->prepare($query);

    $this->id = htmlspecialchars(strip_tags($this->id));
    $solution = htmlspecialchars(strip_tags($solution));

    $stmt->bindParam(':solution', $solution);
    $stmt->bindParam(':id', $this->id, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        // NOTIFY THE USER THAT THEIR TICKET HAS BEEN RESOLVED
        $this->createUserNotification($this->submitted_by, "Your ticket (#{$this->id}) '" . $this->subject . "' has been resolved. Solution: " . $solution);
        
        // Also notify the resolver who resolved it (if different from submitter)
        if ($this->assigned_to && $this->assigned_to != $this->submitted_by) {
            $this->createResolverNotification($this->assigned_to, "You resolved ticket #{$this->id}: " . $this->subject);
        }
        
        return true;
    }
    return false;
}

/**
 * Assigns a ticket to a resolver and NOTIFIES THE USER.
 * @param int $assignedTo The ID of the user to assign the ticket to.
 * @return bool True on success, false on failure.
 */
public function assign($assignedTo) {
    $query = "UPDATE " . $this->table . " SET assigned_to = :assigned_to, status = 'assigned', updated_at = SYSDATETIME() WHERE id = :id";
    $stmt = $this->conn->prepare($query);

    $this->id = htmlspecialchars(strip_tags($this->id));
    $assignedTo = htmlspecialchars(strip_tags($assignedTo));

    $stmt->bindParam(':assigned_to', $assignedTo, PDO::PARAM_INT);
    $stmt->bindParam(':id', $this->id, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        $this->createResolverNotification($assignedTo, "You have been assigned to ticket #" . $this->id . ": " . $this->subject);
        
        // NOTIFY THE USER THAT THEIR TICKET HAS BEEN ASSIGNED
        $this->createUserNotification($this->submitted_by, "Your ticket (#{$this->id}) '" . $this->subject . "' has been assigned to a support agent and is now being worked on.");
        
        return true;
    }
    return false;
}
    
    /**
     * Reads a single ticket's data into the model properties based on its ID.
     * @return bool True if the ticket is found, false otherwise.
     */
    public function readSingle() {
        $query = "SELECT TOP 1
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at,
                      t.resolved_at,
                      t.solution,
                      t.submitted_by, 
                      t.assigned_to,
                      t.submitted_to,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name,
                      a.username as assigned_to_name
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      t.id = :id"; 
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id, PDO::PARAM_INT);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $this->id = $row['id'];
            $this->subject = $row['subject'];
            $this->description = $row['description'];
            $this->category = $row['category'];
            $this->priority = $row['priority'];
            $this->status = $row['status'];
            $this->createdAt = $row['created_at']; 
            $this->resolved_at = $row['resolved_at'];
            $this->solution = $row['solution'];
            $this->submitted_by = $row['submitted_by'];
            $this->submitted_to = $row['submitted_to'];
            $this->assigned_to = $row['assigned_to'];
            $this->submitted_by_name = $row['submitted_by_name'];
            $this->submitted_to_name = $row['submitted_to_name'];
            $this->assigned_to_name = $row['assigned_to_name'];
            return true;
        }
        return false;
    }

    /**
     * Updates a ticket's general information.
     * @return bool True on success, false on failure.
     */
    public function update() {
        $query = "UPDATE " . $this->table . " SET updated_at = SYSDATETIME()"; 
        $params = [];

        if ($this->subject !== null) { $query .= ", subject = :subject"; $params[':subject'] = $this->subject; }
        if ($this->description !== null) { $query .= ", description = :description"; $params[':description'] = $this->description; }
        if ($this->category !== null) { $query .= ", category = :category"; $params[':category'] = $this->category; }
        if ($this->priority !== null) { $query .= ", priority = :priority"; $params[':priority'] = $this->priority; }
        if ($this->status !== null) { $query .= ", status = :status"; $params[':status'] = $this->status; }
        if ($this->submitted_to !== null) { $query .= ", submitted_to = :submitted_to"; $params[':submitted_to'] = $this->submitted_to; }
        if ($this->assigned_to !== null) { $query .= ", assigned_to = :assigned_to"; $params[':assigned_to'] = $this->assigned_to; }
        
        $query .= " WHERE id = :id";
        $params[':id'] = $this->id;

        $stmt = $this->conn->prepare($query);
        return $stmt->execute($params);
    }

    /**
     * Retrieves all tickets with submitted by, submitted to, and assigned to user names.
     * @return array An array of all tickets.
     */
    public function getAllTickets($user_id = null, $status = null, $priority = null, $category = null, $search = null) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to, 
                      t.assigned_to,
                      t.submitted_by
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE 1=1";
        $params = [];

        if ($user_id) {
            $query .= " AND t.submitted_by = :user_id";
            $params[':user_id'] = (int)$user_id;
        }
        if ($status) {
            $query .= " AND t.status = :status";
            $params[':status'] = $status;
        }
        if ($priority) {
            $query .= " AND t.priority = :priority";
            $params[':priority'] = $priority;
        }
        if ($category) {
            $query .= " AND t.category = :category";
            $params[':category'] = $category;
        }
        if ($search) {
            $query .= " AND (t.subject LIKE :search OR t.description LIKE :search)";
            $params[':search'] = "%" . $search . "%";
        }

        $query .= " ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Retrieves tickets submitted by a specific user.
     * @param int $userId The ID of the user who submitted the tickets.
     * @return array An array of tickets submitted by the user.
     */
    public function getUserTickets($userId) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id 
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      t.submitted_by = :userId
                    ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieves tickets submitted to a specific user.
     * @param int $userId The ID of the user who the tickets were submitted to.
     * @return array An array of tickets submitted to the user.
     */
    public function getTicketsSubmittedToUser($userId) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id 
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      t.submitted_to = :userId
                    ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Retrieves tickets assigned to a specific resolver.
     * @param int $resolverId The ID of the resolver.
     * @return array An array of tickets assigned to the resolver.
     */
    public function getAssignedTickets($resolverId) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id 
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      t.assigned_to = :resolverId AND t.status = 'assigned'
                    ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':resolverId', $resolverId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieves tickets resolved by a specific resolver.
     * @param int $resolverId The ID of the resolver.
     * @return array An array of tickets resolved by the resolver.
     */
    public function getResolvedTickets($resolverId) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id 
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      t.assigned_to = :resolverId AND t.status = 'resolved'
                    ORDER BY t.resolved_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':resolverId', $resolverId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieves tickets assigned to a specific user (sub-admin).
     * @param int $userId The ID of the sub-admin user.
     * @return array An array of tickets assigned to the sub-admin.
     */
    public function getTicketsAssignedToUser($userId) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id 
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      t.assigned_to = :userId
                    ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieves tickets relevant for a sub-admin's dashboard.
     * Includes tickets submitted by them, submitted to their directorate (via their ID),
     * and tickets directly assigned to them.
     * @param int $subAdminId The ID of the sub-admin.
     * @param string $directorateName The directorate name of the sub-admin.
     * @return array An array of relevant tickets.
     */
    public function getTicketsForSubAdminDashboard($subAdminId, $directorateName) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      t.submitted_by = :subAdminId OR
                      (su.directorate = :directorateName AND t.status != 'resolved') OR
                      t.assigned_to = :subAdminId
                    ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':subAdminId', $subAdminId, PDO::PARAM_INT);
        $stmt->bindParam(':directorateName', $directorateName, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieves tickets by directorate (for sub-admins)
     * @param string $directorate The directorate name
     * @return array An array of tickets for the specified directorate
     */
    public function getTicketsByDirectorate($directorate) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      su.directorate = :directorate AND t.status != 'resolved'
                    ORDER BY t.created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':directorate', $directorate, PDO::PARAM_STR);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Retrieves tickets for a resolver's overview (open, assigned to them, or submitted to their directorate).
     * @param int $resolverId The ID of the resolver.
     * @return array An array of relevant tickets for the resolver's overview.
     */
    public function getResolverOverviewTickets($resolverId) {
        $query = "SELECT 
                      t.id, 
                      t.subject, 
                      t.description, 
                      t.category, 
                      t.priority, 
                      t.status, 
                      t.created_at, 
                      t.resolved_at, 
                      t.solution,
                      s.username as submitted_by_name,
                      su.username as submitted_to_name, 
                      a.username as assigned_to_name,
                      t.submitted_to,
                      t.submitted_by,
                      t.assigned_to
                    FROM 
                      " . $this->table . " t
                      LEFT JOIN users s ON t.submitted_by = s.id
                      LEFT JOIN users su ON t.submitted_to = su.id 
                      LEFT JOIN users a ON t.assigned_to = a.id
                    WHERE
                      (t.assigned_to = :resolverId AND t.status != 'resolved') OR
                      (t.submitted_to = (SELECT directorate FROM users WHERE id = :resolverId) AND t.status = 'open' AND t.assigned_to IS NULL)
                    ORDER BY t.created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':resolverId', $resolverId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Assigns a ticket to a resolver.
     * @param int $assignedTo The ID of the user to assign the ticket to.
     * @return bool True on success, false on failure.
     */


    /**
     * Resolves a ticket with a given solution.
     * @param string $solution The solution to the ticket.
     * @return bool True on success, false on failure.
     *    /**
     * Deletes a ticket from the database.
     * @return bool True on success, false on failure.
     */
    public function delete() {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $this->id = htmlspecialchars(strip_tags($this->id));
        $stmt->bindParam(':id', $this->id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    private function createUserNotification($userId, $message) {
        require_once __DIR__ . '/Notification.php';
        $notification = new Notification($this->conn);
        $notification->user_id = $userId;
        $notification->message = $message;
        return $notification->create();
    }

    private function createResolverNotification($resolverId, $message) {
        require_once __DIR__ . '/Notification.php';
        $notification = new Notification($this->conn);
        $notification->user_id = $resolverId;
        $notification->message = $message;
        return $notification->create();
    }

    private function createAdminNotification($message) {
        require_once __DIR__ . '/Notification.php';
        $notification = new Notification($this->conn);
        
        $userModel = new User($this->conn);
        $adminUsers = $userModel->getUsersByRole(['admin']);
        
        $success = true;
        foreach ($adminUsers as $admin) {
            $notification->user_id = $admin['id'];
            $notification->message = $message;
            if (!$notification->create()) {
                $success = false;
            }
        }
        
        return $success;
    }
}

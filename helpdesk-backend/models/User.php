<?php

class User {
    private $conn;
    public $table = 'users';

    public $id;
    public $username;
    public $password;
    public $email;
    public $role;
    public $token;
    public $created_at; 
    public $updated_at; 
    public $reset_expiry; 
    public $directorate; 

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Reads a single user's data into the model properties based on their ID.
     * @return bool True if the user is found, false otherwise.
     */
    public function readSingle() {
        // Changed LIMIT 0,1 to TOP 1 for SQL Server compatibility
        $query = "SELECT TOP 1 id, username, password, email, role, token, created_at, updated_at, reset_expiry, directorate FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id, PDO::PARAM_INT);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->id = $row['id'];
            $this->username = $row['username'];
            $this->password = $row['password'];
            $this->email = $row['email'];
            $this->role = $row['role'];
            $this->token = $row['token'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            $this->reset_expiry = $row['reset_expiry'];
            $this->directorate = $row['directorate']; 
            return true;
        }
        return false;
    }

   public function verifyPassword($password) {
        error_log("Verifying password for user ID: " . $this->id);
        error_log("Stored hash: " . $this->password);
        error_log("Input password: " . $password);
        
        $result = password_verify($password, $this->password);
        error_log("Password verification result: " . ($result ? "true" : "false"));
        
        return $result;
    }

    public function getByUsername() {
        // Updated to select all columns including new ones and directorate
        $query = "SELECT id, username, password, email, role, token, created_at, updated_at, reset_expiry, directorate FROM " . $this->table . " WHERE username = :username";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':username', $this->username);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->id = $row['id'];
            $this->username = $row['username'];
            $this->password = $row['password'];
            $this->email = $row['email'];
            $this->role = $row['role'];
            $this->token = $row['token'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            $this->reset_expiry = $row['reset_expiry'];
            $this->directorate = $row['directorate']; 
            return true;
        }
        return false;
    }

    public function getByEmail() {
        $query = "SELECT id, username, password, email, role, token, created_at, updated_at, reset_expiry, directorate FROM " . $this->table . " WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $this->email);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->id = $row['id'];
            $this->username = $row['username'];
            $this->password = $row['password'];
            $this->email = $row['email'];
            $this->role = $row['role'];
            $this->token = $row['token'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            $this->reset_expiry = $row['reset_expiry'];
            $this->directorate = $row['directorate']; 
            return true;
        }
        return false;
    }

    public function getByToken() {
        $query = "SELECT id, username, password, email, role, token, created_at, updated_at, reset_expiry, directorate FROM " . $this->table . " WHERE token = :token";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':token', $this->token);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->id = $row['id'];
            $this->username = $row['username'];
            $this->password = $row['password'];
            $this->email = $row['email'];
            $this->role = $row['role'];
            $this->token = $row['token'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            $this->reset_expiry = $row['reset_expiry'];
            $this->directorate = $row['directorate']; 
            return true;
        }
        return false;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  (username, password, email, role, created_at, updated_at, directorate) 
                  VALUES (:username, :password, :email, :role, GETDATE(), GETDATE(), :directorate)";
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize data
        $this->username = htmlspecialchars(strip_tags($this->username));
        // FIX: Removed password_hash here, as it's done in api/users/index.php
        // The password should already be hashed by the time it reaches this method.
        // $this->password = password_hash(htmlspecialchars(strip_tags($this->password)), PASSWORD_BCRYPT); 
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->role = htmlspecialchars(strip_tags($this->role));
        // Ensure directorate is null if empty for users without one
        $this->directorate = ($this->directorate === null || $this->directorate === '') ? null : htmlspecialchars(strip_tags($this->directorate)); 

        $stmt->bindParam(':username', $this->username);
        $stmt->bindParam(':password', $this->password); // Bind the already hashed password
        $stmt->bindParam(':email', $this->email);
        $stmt->bindParam(':role', $this->role);
        $stmt->bindParam(':directorate', $this->directorate); 

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    public function update() {
        $query = "UPDATE " . $this->table . " SET username = :username, email = :email, role = :role, directorate = :directorate, updated_at = GETDATE() WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $this->username = htmlspecialchars(strip_tags($this->username));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->role = htmlspecialchars(strip_tags($this->role));
        $this->directorate = ($this->directorate === null || $this->directorate === '') ? null : htmlspecialchars(strip_tags($this->directorate)); 
        $this->id = htmlspecialchars(strip_tags($this->id));

        $stmt->bindParam(':username', $this->username);
        $stmt->bindParam(':email',  $this->email);
        $stmt->bindParam(':role', $this->role);
        $stmt->bindParam(':directorate', $this->directorate); 
        $stmt->bindParam(':id', $this->id);

        return $stmt->execute();
    }

    public function updateToken($token) {
        $query = "UPDATE " . $this->table . " SET token = :token, updated_at = GETDATE() WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $this->token = htmlspecialchars(strip_tags($token));
        $this->id = htmlspecialchars(strip_tags($this->id));

        $stmt->bindParam(':token', $this->token);
        $stmt->bindParam(':id', $this->id);

        return $stmt->execute();
    }

public function updatePassword() {
    $query = "UPDATE " . $this->table . " SET password = :password, updated_at = GETDATE() WHERE id = :id";
    $stmt = $this->conn->prepare($query);
    
    // Hash the password before updating
    $hashedPassword = password_hash($this->password, PASSWORD_BCRYPT);
    $stmt->bindParam(':password', $hashedPassword);
    $stmt->bindParam(':id', $this->id);
    
    return $stmt->execute();
}


    public function updateResetExpiry($expiryTime) {
        $query = "UPDATE " . $this->table . " SET reset_expiry = :reset_expiry, updated_at = GETDATE() WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(':reset_expiry', $expiryTime);
        $stmt->bindParam(':id', $this->id);

        return $stmt->execute();
    }

    public function clearResetExpiry() {
        $query = "UPDATE " . $this->table . " SET reset_expiry = NULL, updated_at = GETDATE() WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);
        return $stmt->execute();
    }

    public function getAllUsers() {
        $query = "SELECT id, username, email, role, created_at, updated_at, directorate FROM " . $this->table . " ORDER BY created_at DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getUsersByRole($roles = [], $directorate = null, $excludeUserId = null) {
        $query = "SELECT id, username, email, role, directorate FROM " . $this->table . " WHERE 1=1";
        $params = [];

        if (!empty($roles)) {
            $placeholders = implode(',', array_fill(0, count($roles), '?'));
            $query .= " AND role IN ({$placeholders})";
            $params = array_merge($params, $roles);
        }

        if ($directorate) {
            $query .= " AND directorate = ?";
            $params[] = $directorate;
        }

        if ($excludeUserId) { // New condition to exclude a specific user ID
            $query .= " AND id != ?";
            $params[] = $excludeUserId;
        }

        $query .= " ORDER BY username ASC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function delete() {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $this->id = htmlspecialchars(strip_tags($this->id));
        $stmt->bindParam(':id', $this->id);
        return $stmt->execute();
    }

    public function getByResetToken($token) {
        $query = "SELECT id, username, email, role, reset_expiry FROM " . $this->table . " WHERE token = :token AND reset_expiry > GETDATE()";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->id = $row['id'];
            $this->username = $row['username'];
            $this->email = $row['email'];
            $this->role = $row['role'];
            $this->reset_expiry = $row['reset_expiry'];
            return true;
        }
        return false;
    }

    /**
     * Retrieves the role of a user by their ID.
     * @param int $userId The ID of the user.
     * @return string|null The role of the user, or null if user not found.
     */
    public function getUserRoleById($userId) {
        // Using TOP 1 for SQL Server
        $query = "SELECT TOP 1 role FROM " . $this->table . " WHERE id = :userId";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['role'] : null;
    }
}

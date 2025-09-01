<?php

class Notification {
    private $conn;
    private $table = 'notifications';

    public $id;
    public $user_id; 
    public $message;
    public $is_read; 
    public $created_at; 

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table . " 
                  (user_id, message, is_read, created_at) 
                  VALUES (:user_id, :message, 0, GETDATE())"; // Changed NOW() to GETDATE()
        
        $stmt = $this->conn->prepare($query);
        
        // Sanitize data
        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->message = htmlspecialchars(strip_tags($this->message));

        $stmt->bindParam(':user_id', $this->user_id, PDO::PARAM_INT);
        $stmt->bindParam(':message', $this->message);
        
        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId(); 
            return true;
        }
        
        return false;
    }

    public function getByUser($userId, $unreadOnly = false) {
        $query = "SELECT id, user_id, message, is_read, created_at FROM " . $this->table . " 
                  WHERE user_id = :userId" . 
                  ($unreadOnly ? " AND is_read = 0" : "") . "
                  ORDER BY created_at DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function markAsRead($id) {
        $query = "UPDATE " . $this->table . " 
                  SET is_read = 1 
                  WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        return $stmt->execute();
    }

    public function markAllAsRead($userId) {
        $query = "UPDATE " . $this->table . " 
                  SET is_read = 1 
                  WHERE user_id = :userId AND is_read = 0";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
        
        return $stmt->execute();
    }

    public function checkOwnership($notificationId, $userId) {
        $query = "SELECT COUNT(*) FROM " . $this->table . " WHERE id = :notificationId AND user_id = :userId";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':notificationId', $notificationId, PDO::PARAM_INT);
        $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchColumn() > 0;
    }

    public function delete($id) {
        $query = "DELETE FROM " . $this->table . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
}
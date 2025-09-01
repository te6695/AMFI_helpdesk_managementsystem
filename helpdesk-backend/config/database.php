
<?php
class Database {
    private $host = 'localhost';
    private $db_name = 'aqufada_helpdesk';
    private $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            // Using Windows Authentication for SQL Server
            $this->conn = new PDO(
                "sqlsrv:Server=" . $this->host . ";Database=" . $this->db_name,
                null,  // No username for Windows Auth
                null   // No password for Windows Auth
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            echo json_encode([
                "status" => "error",
                "message" => "Database connection failed: " . $exception->getMessage()
            ]);
            exit;
        }

        return $this->conn;
    }
}
?>
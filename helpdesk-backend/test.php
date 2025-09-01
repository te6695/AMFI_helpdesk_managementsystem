<?php
require_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

if ($db) {
    echo "Connected successfully to SQL Server using Windows Authentication";
    
    // Test query
    $query = "SELECT name FROM sys.databases";
    $stmt = $db->query($query);
    
    echo "<h2>Databases on server:</h2>";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo $row['name'] . "<br>";
    }
} else {
    echo "Connection failed";
}
?>
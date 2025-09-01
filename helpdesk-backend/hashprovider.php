<?php
$password = '12345678'; 
$hashed_password = password_hash($password, PASSWORD_DEFAULT);
echo $hashed_password;
echo"<br>";

function generateSecretKey($length = 64) {
    $bytes = random_bytes($length / 2);
    return bin2hex($bytes);
}

// Example usage
$secretKey = generateSecretKey();
echo "Your 64-character secret key is: " . $secretKey; 
echo "--------------------------------------------- <br>";



$plainPassword = '12345678'; 

// Define the hashed password for 'testuser' copied DIRECTLY from your database.
// PASTE THE HASH YOU COPIED FROM YOUR DB HERE, ensuring no extra spaces or characters.
$hashedPasswordFromDB = '$2y$10$ljbaR/O4oCeAobs24baD1OiO.S5sPCCM3weXM/T6REb2YMwYLcRza'; 

// Perform the password verification, trimming the plain password to avoid
// issues with accidental leading/trailing spaces.
if (password_verify(trim($plainPassword), $hashedPasswordFromDB)) {
    echo "Password VERIFIED successfully for '" . $plainPassword . "'!\n";
    echo "This confirms that the plain text password matches the stored hash.\n";
    echo "You should now be able to log in with this password if the username matches.\n";
} else {
    echo "Password VERIFICATION FAILED.\n";
    echo "This indicates a mismatch between the plain text password and the stored hash.\n";
    echo "--- Debugging Information ---\n";
    echo "Plain password (trimmed): '" . trim($plainPassword) . "'\n";
    echo "Hashed password from DB: '" . $hashedPasswordFromDB . "'\n";
    echo "If this still fails, double-check:\n";
    echo "1. The plain password 'MyStrongPassword123!' is typed EXACTLY correctly.\n";
    echo "2. The hashed password from the DB is copied EXACTLY without extra characters.\n";
    echo "3. The password column in your 'users' table is VARCHAR(255) (or larger).\n";
    echo "4. There are no invisible characters (like BOM) in your PHP files or database data.\n";
    echo "   (You can use a text editor that shows invisible characters to check).\n";
}
?>
<?php
/**
 * CORS + دوال الصلاحيات (student | admin | supervisor)
 * ارفع هذا الملف إلى public_html/api/cors.php
 * إن كان لديك cors.php قديم، أضف القسم من auth_helpers.php أو استبدل الملف.
 */

header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if (!function_exists('getCurrentUserId')) {
    function getCurrentUserId(): ?int
    {
        $id = $_COOKIE['userId'] ?? null;
        return $id ? (int)$id : null;
    }

    function getCurrentUserRole(PDO $pdo): ?string
    {
        $userId = getCurrentUserId();
        if (!$userId) {
            return null;
        }
        $stmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $role = $stmt->fetchColumn();
        return $role !== false ? (string)$role : null;
    }

    function isStaffRole(?string $role): bool
    {
        return in_array($role, ['admin', 'supervisor'], true);
    }

    function isSupervisorRole(?string $role): bool
    {
        return $role === 'supervisor';
    }

    function authJsonError(int $code, string $message): void
    {
        http_response_code($code);
        echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
        exit();
    }

    function requireAuthenticatedRole(PDO $pdo): string
    {
        $role = getCurrentUserRole($pdo);
        if (!$role) {
            authJsonError(401, 'غير مصرح');
        }
        return $role;
    }

    function requireStaffRole(PDO $pdo): string
    {
        $role = requireAuthenticatedRole($pdo);
        if (!isStaffRole($role)) {
            authJsonError(403, 'غير مصرح');
        }
        return $role;
    }

    function requireSupervisorRole(PDO $pdo): string
    {
        $role = requireAuthenticatedRole($pdo);
        if (!isSupervisorRole($role)) {
            authJsonError(403, 'يتطلب صلاحية سوبرفايزر');
        }
        return $role;
    }
}

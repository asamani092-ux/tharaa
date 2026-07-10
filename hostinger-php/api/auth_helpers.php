<?php

/** أدوار المنصة: student | admin (مشرف) | supervisor (سوبرفايزر) */

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

function isAdminRole(?string $role): bool
{
    return $role === 'admin';
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

function requireAdminRole(PDO $pdo): string
{
    $role = requireAuthenticatedRole($pdo);
    if (!isAdminRole($role)) {
        authJsonError(403, 'يتطلب صلاحية مشرف');
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

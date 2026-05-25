# إنجاز سابق — دمج تراكمي في `users.php` (معالجة `id=custom_progress`)

الواجهة ترسل:

```json
{
  "completedBooks": [1, 2, 3],
  "newCurrentBookId": 4
}
```

يجب على PHP **دمج** القائمة مع الموجود في قاعدة البيانات:

```php
$incoming = $body['completedBooks'] ?? [];
$existing = json_decode($user['completed_books'] ?: '[]', true) ?: [];
$merged = array_values(array_unique(array_merge(
    array_map('intval', $existing),
    array_map('intval', $incoming)
)));
// UPDATE users SET completed_books = json_encode($merged), current_book_id = ...
```

لا تستخدم `$incoming` وحده كاستبدال كامل.

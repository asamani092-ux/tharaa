# إنجاز سابق — دمج تراكمي في `users.php` (معالجة `id=custom_progress`)

الواجهة ترسل:

```json
{
  "completedBooks": [1, 2, 3],
  "newCurrentBookId": 4
}
```

- `newCurrentBookId` يُرسل **فقط** عندما يكون الكتاب الحالي ضمن الكتب المعتمدة (أو لا يوجد كتاب حالي).
- إن بقي الكتاب الجاري غير مكتمل، لا تُرسل الواجهة `newCurrentBookId`.

يجب على PHP **دمج** القائمة مع الموجود في قاعدة البيانات:

```php
$incoming = $body['completedBooks'] ?? [];
$existing = json_decode($user['completed_books'] ?: '[]', true) ?: [];
$merged = array_values(array_unique(array_merge(
    array_map('intval', $existing),
    array_map('intval', $incoming)
)));
```

## حفظ المؤشر (current / last_page)

| الحالة | التحديث |
|--------|---------|
| الكتاب الحالي موجود وليس ضمن `merged` | حدّث `completed_books` + أصلح `last_page = max(المخزّن, MAX(end_page) من السجلات)` — **لا تغيّر** `current_book_id` / `phase_number` |
| الكتاب الحالي ضمن المكتملين أو غير موجود | اضبط المؤشر إلى `newCurrentBookId` مع `last_page = 0` |

`GET users` يعيد أيضاً `bookProgress` = `{ bookId: maxEndPage }` من `reading_logs` لاستئناف أي كتاب.

رصد `mode=extra` لكتاب غير الحالي: يحدّث `completed_books` فقط ولا يستبدل المؤشر.

لا تستخدم `$incoming` وحده كاستبدال كامل لـ `completed_books`.

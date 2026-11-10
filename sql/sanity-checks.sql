-- Open with SQLTools (connection "SweetList (local)") and run a statement with Ctrl+E Ctrl+E.

SELECT id, username, email, "language", theme, "premiumUntil" FROM users;

SELECT r.title, u.username AS author, r."prepTimeMinutes", r.servings, r."isPublished"
FROM recipes r JOIN users u ON u.id = r."authorId"
ORDER BY r."createdAt" DESC;

SELECT r.title, i.position, i.name, i.quantity, i.unit, i.category
FROM ingredients i JOIN recipes r ON r.id = i."recipeId"
ORDER BY r.title, i.position;

SELECT r.title, s.position, s.title AS step, left(s.instruction, 60) AS instruction
FROM recipe_steps s JOIN recipes r ON r.id = s."recipeId"
ORDER BY r.title, s.position;

SELECT r.title, t.name AS tag
FROM recipe_tags rt JOIN recipes r ON r.id = rt."recipeId" JOIN tags t ON t.id = rt."tagId"
ORDER BY r.title;

SELECT r.title, u.username AS shared_with, s."createdAt"
FROM recipe_shares s JOIN recipes r ON r.id = s."recipeId" JOIN users u ON u.id = s."sharedWithUserId";

SELECT sl.status, u.username, r.title, e.servings
FROM shopping_lists sl
JOIN users u ON u.id = sl."userId"
LEFT JOIN shopping_list_recipes e ON e."shoppingListId" = sl.id
LEFT JOIN recipes r ON r.id = e."recipeId";

SELECT * FROM shopping_items;

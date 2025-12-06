DELIMITER $$

-- Function to get all categories as JSON array for signup form
DROP FUNCTION IF EXISTS fn_get_categories_json$$
CREATE FUNCTION fn_get_categories_json()
RETURNS JSON
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE categories_json JSON;
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT('category_id', category_id, 'category_name', category_name)
    ) INTO categories_json
    FROM categories
    ORDER BY category_name;
    RETURN categories_json;
END$$

DELIMITER ;

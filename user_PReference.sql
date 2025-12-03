USE dku_event_system;

-- 1. Add JSON columns to Users
ALTER TABLE `Users`
    ADD COLUMN `selected_categories` JSON NULL AFTER `password`,
    ADD COLUMN `affiliated_clubs` JSON NULL AFTER `selected_categories`,
    ADD COLUMN `notification_preferences` JSON NULL AFTER `affiliated_clubs`;

-- 2. Stored procedure to materialize preferences
DROP PROCEDURE IF EXISTS sp_process_user_preferences;
DELIMITER $$
CREATE PROCEDURE sp_process_user_preferences (
    IN p_user_id INT
)
BEGIN
    DECLARE v_attendee_id INT;

    DECLARE v_category_json JSON;
    DECLARE v_club_json JSON;
    DECLARE v_notify_json JSON;

    DECLARE v_category_count INT DEFAULT 0;
    DECLARE v_club_count INT DEFAULT 0;
    DECLARE v_notify_count INT DEFAULT 0;

    DECLARE v_index INT DEFAULT 0;
    DECLARE v_notify_index INT DEFAULT 0;

    DECLARE v_category_id INT;
    DECLARE v_club_id INT;
    DECLARE v_notify_club_id INT;
    DECLARE v_organizer_id INT;

    DECLARE v_remind TINYINT(1) DEFAULT 0;
    DECLARE v_error_message VARCHAR(255);

    -- 1. Load the user’s JSON preferences and (if applicable) attendee_id
    SELECT a.attendee_id,
           u.selected_categories,
           u.affiliated_clubs,
           u.notification_preferences
    INTO   v_attendee_id,
           v_category_json,
           v_club_json,
           v_notify_json
    FROM   Users u
    LEFT JOIN Attendees a ON a.user_id = u.user_id
    WHERE  u.user_id = p_user_id;

    -- If this user is not an attendee, do nothing (organizers don’t have these preferences)
    IF v_attendee_id IS NULL THEN
        LEAVE proc_end;
    END IF;

    -- 2. Clean up old materialized preferences for this user
    DELETE FROM User_categories
    WHERE user_id = p_user_id;

    DELETE FROM User_organizers_notification
    WHERE user_id = p_user_id;

    DELETE FROM Club_members
    WHERE attendee_id = v_attendee_id;

    -- 3. Materialize explicit category interests into User_categories
    IF v_category_json IS NOT NULL THEN
        SET v_category_count = JSON_LENGTH(v_category_json);

        SET v_index = 0;
        WHILE v_index < v_category_count DO
            SET v_category_id = CAST(
                JSON_EXTRACT(v_category_json, CONCAT('$[', v_index, ']'))
                AS UNSIGNED
            );

            IF NOT EXISTS (
                SELECT 1
                FROM Categories c
                WHERE c.category_id = v_category_id
            ) THEN
                SET v_error_message = CONCAT(
                    'Invalid category_id ', v_category_id,
                    ' in selected_categories for user ', p_user_id
                );
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = v_error_message;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM User_categories uc
                WHERE uc.user_id = p_user_id
                  AND uc.category_id = v_category_id
            ) THEN
                INSERT INTO User_categories(user_id, category_id)
                VALUES (p_user_id, v_category_id);
            END IF;

            SET v_index = v_index + 1;
        END WHILE;
    END IF;

    -- 4. Pre-compute notification list length (may be empty)
    IF v_notify_json IS NOT NULL THEN
        SET v_notify_count = JSON_LENGTH(v_notify_json);
    ELSE
        SET v_notify_count = 0;
    END IF;

    -- 5. Materialize club affiliations and notification preferences
    IF v_club_json IS NOT NULL THEN
        SET v_club_count = JSON_LENGTH(v_club_json);
        SET v_index = 0;

        WHILE v_index < v_club_count DO
            SET v_club_id = CAST(
                JSON_EXTRACT(v_club_json, CONCAT('$[', v_index, ']'))
                AS UNSIGNED
            );

            IF NOT EXISTS (
                SELECT 1
                FROM Clubs c
                WHERE c.club_id = v_club_id
            ) THEN
                SET v_error_message = CONCAT(
                    'Invalid club_id ', v_club_id,
                    ' in affiliated_clubs for user ', p_user_id
                );
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = v_error_message;
            END IF;

            SET v_remind = 0;
            SET v_notify_index = 0;

            WHILE v_notify_index < v_notify_count DO
                SET v_notify_club_id = CAST(
                    JSON_EXTRACT(v_notify_json, CONCAT('$[', v_notify_index, ']'))
                    AS UNSIGNED
                );

                IF v_notify_club_id = v_club_id THEN
                    SET v_remind = 1;
                END IF;

                SET v_notify_index = v_notify_index + 1;
            END WHILE;

            INSERT INTO Club_members (club_id, attendee_id, remind_required)
            VALUES (v_club_id, v_attendee_id, v_remind);

            SELECT c.organizer_id
            INTO   v_organizer_id
            FROM   Clubs c
            WHERE  c.club_id = v_club_id;

            INSERT INTO User_organizers_notification (user_id, organizer_id, remind_required)
            VALUES (p_user_id, v_organizer_id, v_remind);

            INSERT INTO User_categories (user_id, category_id)
            SELECT p_user_id, cc.category_id
            FROM   Club_categories cc
            WHERE  cc.club_id = v_club_id
              AND NOT EXISTS (
                    SELECT 1
                    FROM User_categories uc
                    WHERE uc.user_id = p_user_id
                      AND uc.category_id = cc.category_id
              );

            SET v_index = v_index + 1;
        END WHILE;
    END IF;

    proc_end: BEGIN END;

END$$
DELIMITER ;

-- 3. Trigger after insert on Users
DROP TRIGGER IF EXISTS trg_after_users_insert_preferences;
DELIMITER $$
CREATE TRIGGER trg_after_users_insert_preferences
AFTER INSERT ON Users
FOR EACH ROW
BEGIN
    IF NEW.user_type = 'attendee' THEN
        CALL sp_process_user_preferences(NEW.user_id);
    END IF;
END$$
DELIMITER ;

-- 4. Trigger after update on Users
DROP TRIGGER IF EXISTS trg_after_users_update_preferences;
DELIMITER $$
CREATE TRIGGER trg_after_users_update_preferences
AFTER UPDATE ON Users
FOR EACH ROW
BEGIN
    IF NEW.user_type = 'attendee' THEN
        CALL sp_process_user_preferences(NEW.user_id);
    END IF;
END$$
DELIMITER ;

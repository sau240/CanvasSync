-- =============================================================================
-- CanvasSync Database Schema & Stored Procedures (MySQL 8.0+)
-- Database: sync_in_realtime
-- =============================================================================

CREATE DATABASE IF NOT EXISTS sync_in_realtime;
USE sync_in_realtime;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    age INT DEFAULT NULL,
    designation VARCHAR(100) DEFAULT 'Member',
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Rooms Table (Vector Workspace)
CREATE TABLE IF NOT EXISTS rooms (
    room_id VARCHAR(36) PRIMARY KEY,
    room_title VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    capacity INT DEFAULT 50,
    active_users INT DEFAULT 0,
    shapes_data LONGTEXT,
    freehand_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Room Permissions Table
CREATE TABLE IF NOT EXISTS rooms_permission (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'editor', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_room (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. User Device Sessions Table
CREATE TABLE IF NOT EXISTS device_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'web',
    last_sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_device (user_id, device_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Sync Change Logs Table
CREATE TABLE IF NOT EXISTS sync_change_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    entity_id INT DEFAULT NULL,
    entity_type VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    source_device_id VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================================
-- STORED PROCEDURES
-- =============================================================================

DELIMITER //

-- Stored Procedure: sp_manage_user
DROP PROCEDURE IF EXISTS sp_manage_user //
CREATE PROCEDURE sp_manage_user(
    IN p_op VARCHAR(30),
    IN p_uid INT,
    IN p_username VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_pwd VARCHAR(255)
)
BEGIN
    IF p_op = 'REGISTER' THEN
        INSERT INTO users (username, email, password_hash, is_active, is_deleted)
        VALUES (p_username, p_email, p_pwd, TRUE, FALSE);
        
        SELECT id, username, email, is_active FROM users WHERE id = LAST_INSERT_ID();

    ELSEIF p_op = 'GET_BY_EMAIL' THEN
        SELECT id, username, email, password_hash, is_active, designation
        FROM users
        WHERE email = p_email AND is_deleted = FALSE
        LIMIT 1;

    ELSEIF p_op = 'GET_BY_ID' THEN
        SELECT id, username, email, is_active, age, designation
        FROM users
        WHERE id = p_uid AND is_deleted = FALSE
        LIMIT 1;
    END IF;
END //

-- Stored Procedure: sp_room_management
DROP PROCEDURE IF EXISTS sp_room_management //
CREATE PROCEDURE sp_room_management(
    IN p_op VARCHAR(30),
    IN p_room_id VARCHAR(36),
    IN p_owner_id INT,
    IN p_room_title VARCHAR(255),
    IN p_capacity INT,
    IN p_limit INT
)
BEGIN
    IF p_op = 'CREATE_ROOM' THEN
        INSERT INTO rooms (room_id, room_title, owner_id, capacity)
        VALUES (p_room_id, p_room_title, p_owner_id, IFNULL(p_capacity, 50));
        
        INSERT INTO rooms_permission (room_id, user_id, role)
        VALUES (p_room_id, p_owner_id, 'owner')
        ON DUPLICATE KEY UPDATE role = 'owner';
        
        SELECT * FROM rooms WHERE room_id = p_room_id;

    ELSEIF p_op = 'GET_ROOM' THEN
        SELECT * FROM rooms WHERE room_id = p_room_id;

    ELSEIF p_op = 'GET_USER_ROOMS' THEN
        SELECT r.*, rp.role as my_role
        FROM rooms r
        INNER JOIN rooms_permission rp ON r.room_id = rp.room_id
        WHERE rp.user_id = p_owner_id
        ORDER BY r.updated_at DESC
        LIMIT 100;

    ELSEIF p_op = 'UPDATE_ROOM' THEN
        UPDATE rooms
        SET room_title = IFNULL(p_room_title, room_title),
            capacity = IFNULL(p_capacity, capacity)
        WHERE room_id = p_room_id;
        
        SELECT * FROM rooms WHERE room_id = p_room_id;

    ELSEIF p_op = 'DELETE_ROOM' THEN
        DELETE FROM rooms WHERE room_id = p_room_id;
        SELECT 1 AS success;
    END IF;
END //

-- Stored Procedure: sp_room_permissions
DROP PROCEDURE IF EXISTS sp_room_permissions //
CREATE PROCEDURE sp_room_permissions(
    IN p_op VARCHAR(30),
    IN p_room_id VARCHAR(36),
    IN p_user_id INT,
    IN p_role VARCHAR(20)
)
BEGIN
    IF p_op = 'GRANT' THEN
        INSERT INTO rooms_permission (room_id, user_id, role)
        VALUES (p_room_id, p_user_id, p_role)
        ON DUPLICATE KEY UPDATE role = p_role;
        
        SELECT * FROM rooms_permission WHERE room_id = p_room_id AND user_id = p_user_id;

    ELSEIF p_op = 'REVOKE' THEN
        DELETE FROM rooms_permission WHERE room_id = p_room_id AND user_id = p_user_id;
        SELECT 1 AS success;

    ELSEIF p_op = 'CHECK' THEN
        SELECT role FROM rooms_permission WHERE room_id = p_room_id AND user_id = p_user_id;

    ELSEIF p_op = 'LIST_ROOM_MEMBERS' THEN
        SELECT rp.*, u.username, u.email, u.designation
        FROM rooms_permission rp
        INNER JOIN users u ON rp.user_id = u.id
        WHERE rp.room_id = p_room_id;
    END IF;
END //

-- Stored Procedure: sp_device_management
DROP PROCEDURE IF EXISTS sp_device_management //
CREATE PROCEDURE sp_device_management(
    IN p_op VARCHAR(30),
    IN p_user_id INT,
    IN p_device_id VARCHAR(100),
    IN p_device_type VARCHAR(50)
)
BEGIN
    IF p_op = 'REGISTER_OR_TOUCH' THEN
        INSERT INTO device_sessions (user_id, device_id, device_type, last_sync_time)
        VALUES (p_user_id, p_device_id, IFNULL(p_device_type, 'web'), NOW())
        ON DUPLICATE KEY UPDATE last_sync_time = NOW(), device_type = IFNULL(p_device_type, device_type);
        
        SELECT * FROM device_sessions WHERE user_id = p_user_id AND device_id = p_device_id;

    ELSEIF p_op = 'GET_USER_DEVICES' THEN
        SELECT * FROM device_sessions WHERE user_id = p_user_id ORDER BY last_sync_time DESC;
    END IF;
END //

-- Stored Procedure: sp_canvas_sync
DROP PROCEDURE IF EXISTS sp_canvas_sync //
CREATE PROCEDURE sp_canvas_sync(
    IN p_op VARCHAR(30),
    IN p_user_id INT,
    IN p_room_id VARCHAR(36),
    IN p_entity_id INT,
    IN p_entity_type VARCHAR(50),
    IN p_action VARCHAR(20),
    IN p_source_device_id VARCHAR(100),
    IN p_last_sync_time DATETIME
)
BEGIN
    IF p_op = 'RECORD_CHANGE' THEN
        INSERT INTO sync_change_logs (room_id, user_id, entity_id, entity_type, action, source_device_id)
        VALUES (p_room_id, p_user_id, p_entity_id, p_entity_type, p_action, p_source_device_id);
        
        SELECT LAST_INSERT_ID() AS log_id;

    ELSEIF p_op = 'GET_CHANGES_SINCE' THEN
        SELECT * FROM sync_change_logs
        WHERE room_id = p_room_id
          AND created_at > IFNULL(p_last_sync_time, '1970-01-01 00:00:00')
        ORDER BY created_at ASC;
    END IF;
END //

DELIMITER ;

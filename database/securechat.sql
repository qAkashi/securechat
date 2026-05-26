-- =============================================================
--  SecureChat — SQL-скрипт создания базы данных (PostgreSQL)
--  Дипломный проект: Защищённый мессенджер с E2E-шифрованием
-- =============================================================

-- Удаление существующих таблиц (порядок важен из-за FK)
DROP TABLE IF EXISTS message_reads      CASCADE;
DROP TABLE IF EXISTS messages           CASCADE;
DROP TABLE IF EXISTS conversation_members CASCADE;
DROP TABLE IF EXISTS conversations      CASCADE;
DROP TABLE IF EXISTS user_keys          CASCADE;
DROP TABLE IF EXISTS sessions           CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- =============================================================
-- 1. ПОЛЬЗОВАТЕЛИ
-- =============================================================
CREATE TABLE users (
    id            SERIAL          PRIMARY KEY,
    username      VARCHAR(20)     NOT NULL UNIQUE,
    email         VARCHAR(255)    UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,          -- Argon2id
    avatar_color  VARCHAR(10)     DEFAULT 'av1',
    is_online     BOOLEAN         DEFAULT FALSE,
    last_seen_at  TIMESTAMPTZ     DEFAULT NOW(),
    created_at    TIMESTAMPTZ     DEFAULT NOW(),
    updated_at    TIMESTAMPTZ     DEFAULT NOW(),
    CONSTRAINT chk_username CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$')
);

-- =============================================================
-- 2. КЛЮЧИ ШИФРОВАНИЯ (X25519)
-- =============================================================
CREATE TABLE user_keys (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key  VARCHAR(128) NOT NULL,               -- X25519 публичный ключ (hex)
    fingerprint VARCHAR(64)  NOT NULL,               -- SHA-256 отпечаток
    is_active   BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT uq_active_key UNIQUE (user_id, is_active)
);

-- =============================================================
-- 3. СЕССИИ (JWT)
-- =============================================================
CREATE TABLE sessions (
    id         SERIAL       PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,         -- хэш JWT-токена
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================================
-- 4. ДИАЛОГИ / БЕСЕДЫ
-- =============================================================
CREATE TABLE conversations (
    id           SERIAL       PRIMARY KEY,
    name         VARCHAR(100),                       -- NULL для личных переписок
    is_group     BOOLEAN      DEFAULT FALSE,
    created_by   INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    default_ttl  INTEGER      DEFAULT 0,             -- TTL в секундах, 0 = выкл
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================================
-- 5. УЧАСТНИКИ ДИАЛОГОВ (M:N)
-- =============================================================
CREATE TABLE conversation_members (
    id              SERIAL      PRIMARY KEY,
    conversation_id INTEGER     NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_conv_member UNIQUE (conversation_id, user_id)
);

-- =============================================================
-- 6. СООБЩЕНИЯ
-- =============================================================
CREATE TABLE messages (
    id              SERIAL       PRIMARY KEY,
    conversation_id INTEGER      NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ciphertext      TEXT         NOT NULL,           -- зашифрованное содержимое
    nonce           VARCHAR(64)  NOT NULL,           -- ChaCha20 nonce (hex)
    ttl_seconds     INTEGER      DEFAULT 0,          -- 0 = не удалять
    delete_at       TIMESTAMPTZ,                     -- вычисляется при вставке
    status          VARCHAR(20)  DEFAULT 'sent'      -- sent / delivered / read
                    CHECK (status IN ('sent','delivered','read')),
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================================
-- 7. ПРОЧТЕНИЯ СООБЩЕНИЙ
-- =============================================================
CREATE TABLE message_reads (
    id         SERIAL      PRIMARY KEY,
    message_id INTEGER     NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_msg_read UNIQUE (message_id, user_id)
);

-- =============================================================
-- ИНДЕКСЫ
-- =============================================================
CREATE INDEX idx_messages_conv    ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_ttl     ON messages(delete_at) WHERE delete_at IS NOT NULL;
CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_conv_members_usr ON conversation_members(user_id);

-- =============================================================
-- ЗАПОЛНЕНИЕ ТЕСТОВЫМИ ДАННЫМИ
-- =============================================================

-- Пользователи (пароли: хэши Argon2id для "password123")
INSERT INTO users (username, email, password_hash, avatar_color, is_online) VALUES
('alice_dev',    'alice@example.com',   '$argon2id$v=19$m=65536,t=3,p=4$abc123$hashvalue1', 'av1', TRUE),
('bob_sec',      'bob@example.com',     '$argon2id$v=19$m=65536,t=3,p=4$def456$hashvalue2', 'av2', TRUE),
('carol_ngo',    'carol@example.com',   '$argon2id$v=19$m=65536,t=3,p=4$ghi789$hashvalue3', 'av6', FALSE),
('dave_infosec', 'dave@example.com',    '$argon2id$v=19$m=65536,t=3,p=4$jkl012$hashvalue4', 'av3', FALSE),
('eve_pentest',  'eve@example.com',     '$argon2id$v=19$m=65536,t=3,p=4$mno345$hashvalue5', 'av5', FALSE);

-- Ключи X25519
INSERT INTO user_keys (user_id, public_key, fingerprint) VALUES
(1, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'deadbeef01020304deadbeef01020304'),
(2, 'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5', 'cafebabe01020304cafebabe01020304'),
(3, '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12', 'feedface01020304feedface01020304'),
(4, 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab', 'beefdead01020304beefdead01020304'),
(5, '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba98', 'c0ffee0001020304c0ffee0001020304');

-- Сессии
INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at) VALUES
(1, 'sha256hashtoken1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '192.168.1.10', 'Mozilla/5.0 Chrome/124', NOW() + INTERVAL '24 hours'),
(2, 'sha256hashtoken2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '10.0.0.5',     'Mozilla/5.0 Firefox/125', NOW() + INTERVAL '24 hours');

-- Диалоги
INSERT INTO conversations (name, is_group, created_by, default_ttl) VALUES
(NULL,           FALSE, 1, 0),      -- alice <-> bob
(NULL,           FALSE, 1, 0),      -- alice <-> carol
(NULL,           FALSE, 3, 300),    -- dave <-> alice (TTL 5 мин)
(NULL,           FALSE, 5, 0),      -- alice <-> eve
('SecTeam',      TRUE,  1, 3600);   -- групповой чат (TTL 1 час)

-- Участники
INSERT INTO conversation_members (conversation_id, user_id) VALUES
(1,1),(1,2),
(2,1),(2,3),
(3,1),(3,4),
(4,1),(4,5),
(5,1),(5,2),(5,4);

-- Сообщения (ciphertext — имитация зашифрованных данных base64)
INSERT INTO messages (conversation_id, sender_id, ciphertext, nonce, ttl_seconds, status, created_at) VALUES
(1, 2, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2UxCg==', 'a1b2c3d4e5f6789012345678', 0,  'read',      NOW() - INTERVAL '2 hours'),
(1, 1, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2UyCg==', 'b2c3d4e5f6789012345679a1', 0,  'read',      NOW() - INTERVAL '2 hours' + INTERVAL '1 minute'),
(1, 2, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2UzCg==', 'c3d4e5f678901234567a1b2b', 10, 'read',      NOW() - INTERVAL '1 hour'),
(1, 2, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2U0Cg==', 'd4e5f678901234567a1b2bc3', 0,  'delivered', NOW() - INTERVAL '30 minutes'),
(2, 3, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2U1Cg==', 'e5f678901234567a1b2bc3d4', 0,  'read',      NOW() - INTERVAL '3 hours'),
(2, 1, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2U2Cg==', 'f678901234567a1b2bc3d4e5', 0,  'read',      NOW() - INTERVAL '3 hours' + INTERVAL '2 minutes'),
(3, 4, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2U3Cg==', '678901234567a1b2bc3d4e5f6', 300,'read',     NOW() - INTERVAL '1 day'),
(3, 1, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2U4Cg==', '78901234567a1b2bc3d4e5f67', 300,'read',     NOW() - INTERVAL '1 day' + INTERVAL '5 minutes'),
(5, 1, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2U5Cg==', '8901234567a1b2bc3d4e5f678', 3600,'sent',    NOW() - INTERVAL '10 minutes'),
(5, 2, 'U2VjdXJlQ2hhdEUyRU1lc3NhZ2UxMAo=', '901234567a1b2bc3d4e5f6789', 3600,'delivered',NOW() - INTERVAL '5 minutes');

-- Обновить delete_at для сообщений с TTL
UPDATE messages SET delete_at = created_at + (ttl_seconds || ' seconds')::INTERVAL
WHERE ttl_seconds > 0;

-- Прочтения
INSERT INTO message_reads (message_id, user_id) VALUES
(1, 1),(2, 2),(3, 1),(3, 2),(5, 1),(6, 3),(7, 1),(8, 4);


-- =============================================================
-- SQL-ЗАПРОСЫ ДЛЯ ОТЧЁТА
-- =============================================================

-- ЗАПРОС 1: SELECT с условием — онлайн-пользователи с активными ключами
SELECT u.id, u.username, u.email, u.avatar_color, uk.fingerprint
FROM users u
JOIN user_keys uk ON uk.user_id = u.id AND uk.is_active = TRUE
WHERE u.is_online = TRUE
ORDER BY u.username;

-- ЗАПРОС 2: INSERT — новое сообщение
INSERT INTO messages (conversation_id, sender_id, ciphertext, nonce, ttl_seconds, status)
VALUES (1, 1, 'TmV3RW5jcnlwdGVkTWVzc2FnZQo=', 'nonce_new_0123456789abcdef', 60, 'sent');

-- ЗАПРОС 3: UPDATE — пометить сообщения как прочитанные в диалоге 1
UPDATE messages
SET status = 'read'
WHERE conversation_id = 1
  AND sender_id = 2
  AND status != 'read';

-- ЗАПРОС 4: DELETE — удалить просроченные TTL-сообщения
DELETE FROM messages
WHERE delete_at IS NOT NULL
  AND delete_at < NOW();

-- ЗАПРОС 5: SELECT с JOIN — история диалога с именами участников
SELECT
    m.id,
    u.username        AS sender,
    m.ciphertext,
    m.status,
    m.ttl_seconds,
    m.created_at
FROM messages m
JOIN users u ON u.id = m.sender_id
WHERE m.conversation_id = 1
ORDER BY m.created_at ASC;

-- БОНУС: SELECT с несколькими JOIN — все диалоги пользователя с количеством сообщений
SELECT
    c.id                      AS conv_id,
    COALESCE(c.name, CONCAT('DM#', c.id)) AS conv_name,
    c.is_group,
    COUNT(m.id)               AS total_messages,
    MAX(m.created_at)         AS last_message_at
FROM conversations c
JOIN conversation_members cm ON cm.conversation_id = c.id
JOIN users u                 ON u.id = cm.user_id AND u.username = 'alice_dev'
LEFT JOIN messages m         ON m.conversation_id = c.id
GROUP BY c.id, c.name, c.is_group
ORDER BY last_message_at DESC NULLS LAST;

-- ============================================
-- 勤怠集計ツール テーブル作成SQL
-- 対象DB: MySQL 5.7以降
-- ============================================

-- ============================================
-- 1. スタッフマスタ
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
    id         INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(50)  NOT NULL COMMENT '氏名',
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='スタッフマスタ';

-- サンプルデータ
INSERT INTO staff (name) VALUES
    ('山田 太郎'),
    ('鈴木 花子'),
    ('田中 一郎');

-- ============================================
-- 2. 打刻ログ
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
    id          INT              NOT NULL AUTO_INCREMENT,
    staff_id    INT              NOT NULL COMMENT 'staffテーブルのID',
    type        ENUM('in','out') NOT NULL COMMENT '出勤:in / 退勤:out',
    stamped_at  DATETIME         NOT NULL COMMENT '打刻日時',
    date        DATE             NOT NULL COMMENT '打刻日（集計用）',
    PRIMARY KEY (id),
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    INDEX idx_staff_date (staff_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打刻ログ';

-- =====================================================================
-- Smart CRM – Mekong Mobile · Luồng L4 · Track SE
-- DDL skeleton (PostgreSQL 15+). Tên bảng khớp 100% với docs/erd.drawio
-- và lớp lưu trữ trong docs/architecture.drawio.
-- Index gắn với NFR: xem chú thích "NFRx" bên dưới từng index.
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- cần cho ràng buộc chống trùng lịch (NFR2)

-- 1. customer: khách hàng sở hữu phiếu bảo hành (dữ liệu có từ L2)
CREATE TABLE customer (
    customer_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name    VARCHAR(100) NOT NULL,
    phone        VARCHAR(15)  NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. technician: kỹ thuật viên. Khối lượng công việc KHÔNG lưu cột riêng
--    (đếm từ ticket) để tránh lệch số liệu – lỗi "lưu giá trị tính được".
CREATE TABLE technician (
    technician_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    technician_code  VARCHAR(10)  NOT NULL UNIQUE,            -- TECH-003
    full_name        VARCHAR(100) NOT NULL,
    service_area     VARCHAR(50)  NOT NULL,                   -- địa bàn
    max_open_tickets SMALLINT     NOT NULL DEFAULT 8
                     CHECK (max_open_tickets BETWEEN 1 AND 50),   -- BR-03
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 3. technician_skill: tay nghề (quan hệ n-n giữa technician và kỹ năng)
CREATE TABLE technician_skill (
    technician_id BIGINT      NOT NULL REFERENCES technician (technician_id),
    skill_code    VARCHAR(30) NOT NULL
                  CHECK (skill_code IN ('SCREEN_REPAIR','BATTERY','MAINBOARD','WATER_DAMAGE')),
    skill_level   SMALLINT    NOT NULL CHECK (skill_level BETWEEN 1 AND 3),
    PRIMARY KEY (technician_id, skill_code)
);

-- 4. ticket: phiếu bảo hành. technician_id = người đang phụ trách (BR-04:
--    một cột => tối đa một kỹ thuật viên tại một thời điểm).
CREATE TABLE ticket (
    ticket_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_code    VARCHAR(20)  NOT NULL UNIQUE,              -- T-2026-0042
    customer_id    BIGINT       NOT NULL REFERENCES customer (customer_id),
    device_model   VARCHAR(100) NOT NULL,
    required_skill VARCHAR(30)  NOT NULL
                   CHECK (required_skill IN ('SCREEN_REPAIR','BATTERY','MAINBOARD','WATER_DAMAGE')),
    service_area   VARCHAR(50)  NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'WAITING_ASSIGNMENT'
                   CHECK (status IN ('WAITING_ASSIGNMENT','ASSIGNED','IN_PROGRESS','DONE')),
    technician_id  BIGINT       REFERENCES technician (technician_id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_ticket_assignee CHECK (
        (status = 'WAITING_ASSIGNMENT' AND technician_id IS NULL) OR
        (status <> 'WAITING_ASSIGNMENT' AND technician_id IS NOT NULL))
);

-- 5. ticket_assignment: LỊCH SỬ phân công / phân công lại (FR2, FR3, NFR5)
CREATE TABLE ticket_assignment (
    assignment_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_code  VARCHAR(20)  NOT NULL UNIQUE,            -- ASG-0001
    ticket_id        BIGINT       NOT NULL REFERENCES ticket (ticket_id),
    technician_id    BIGINT       NOT NULL REFERENCES technician (technician_id),
    action           VARCHAR(10)  NOT NULL CHECK (action IN ('ASSIGN','REASSIGN')),
    reason           VARCHAR(255),
    note             VARCHAR(255),
    assigned_by      VARCHAR(50)  NOT NULL,   -- tên đăng nhập lấy từ token (bảng tài khoản: ngoài phạm vi L4)
    assigned_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_reassign_reason CHECK (action = 'ASSIGN' OR reason IS NOT NULL)   -- FR3: lý do bắt buộc
);

-- 6. appointment: lịch hẹn giao – nhận máy (FR4–FR9)
--    Lưu start_at + end_at (khoảng thời gian); thời lượng được tính ra, không lưu.
CREATE TABLE appointment (
    appointment_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_code  VARCHAR(20) NOT NULL UNIQUE,            -- APT-0015
    ticket_id         BIGINT      NOT NULL REFERENCES ticket (ticket_id),
    technician_id     BIGINT      NOT NULL REFERENCES technician (technician_id),
    appt_type         VARCHAR(10) NOT NULL CHECK (appt_type IN ('DROP_OFF','PICK_UP')),
    start_at          TIMESTAMPTZ NOT NULL,
    end_at            TIMESTAMPTZ NOT NULL,
    status            VARCHAR(25) NOT NULL DEFAULT 'PENDING_CONFIRMATION'
                      CHECK (status IN ('PENDING_CONFIRMATION','CONFIRMED','CANCELLED')),
    created_by        VARCHAR(50) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_appt_duration CHECK (end_at - start_at BETWEEN INTERVAL '15 minutes' AND INTERVAL '2 hours'),  -- BR-06
    -- NFR2: CSDL tự từ chối hai lịch chồng nhau của cùng một kỹ thuật viên (BR-05),
    -- kể cả khi hai quản lý đặt lịch đồng thời.
    CONSTRAINT ex_appt_no_overlap EXCLUDE USING gist (
        technician_id WITH =,
        tstzrange(start_at, end_at) WITH &&
    ) WHERE (status <> 'CANCELLED')
);

-- =====================================================================
-- INDEX (mỗi index gắn với truy vấn cụ thể và NFR)
-- =====================================================================
-- NFR1 (gợi ý ≤ 2 s, p95): đếm phiếu mở của từng kỹ thuật viên
CREATE INDEX idx_ticket_technician_status ON ticket (technician_id, status);
-- NFR1: lọc kỹ thuật viên còn hoạt động theo địa bàn
CREATE INDEX idx_technician_area_active   ON technician (service_area) WHERE is_active;
-- NFR1: lọc theo tay nghề, ưu tiên cấp cao
CREATE INDEX idx_skill_code_level         ON technician_skill (skill_code, skill_level DESC);
-- FR1/FR2: danh sách phiếu chờ phân công theo địa bàn
CREATE INDEX idx_ticket_status_area       ON ticket (status, service_area);
-- FR6/FR7: lịch của một kỹ thuật viên, của một phiếu (sắp theo thời gian)
CREATE INDEX idx_appt_technician_start    ON appointment (technician_id, start_at);
CREATE INDEX idx_appt_ticket              ON appointment (ticket_id);
-- NFR5: tra lịch sử phân công của một phiếu, mới nhất trước
CREATE INDEX idx_assignment_ticket_time   ON ticket_assignment (ticket_id, assigned_at DESC);

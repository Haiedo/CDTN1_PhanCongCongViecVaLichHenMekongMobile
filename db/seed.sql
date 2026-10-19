-- Dữ liệu mẫu cho L4 (giả lập). Chạy lại nhiều lần không lỗi, không nhân đôi (ON CONFLICT DO NOTHING).
INSERT INTO customer (full_name, phone) VALUES
  ('Lê Minh Châu', '0901234567'),
  ('Phạm Quốc Dũng', '0912345678')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO technician (technician_code, full_name, service_area) VALUES
  ('TECH-003', 'Nguyễn Văn An',  'Quận 7'),
  ('TECH-005', 'Lê Hoàng Cường', 'Quận 1'),
  ('TECH-007', 'Trần Thị Bích',  'Quận 7')
ON CONFLICT (technician_code) DO NOTHING;

INSERT INTO technician_skill (technician_id, skill_code, skill_level)
SELECT t.technician_id, v.skill, v.lvl
FROM (VALUES ('TECH-003','SCREEN_REPAIR',3), ('TECH-007','SCREEN_REPAIR',2),
             ('TECH-007','BATTERY',3),       ('TECH-005','MAINBOARD',3)) AS v(code, skill, lvl)
JOIN technician t ON t.technician_code = v.code
ON CONFLICT (technician_id, skill_code) DO NOTHING;

INSERT INTO ticket (ticket_code, customer_id, device_model, required_skill, service_area, status, technician_id)
SELECT v.tcode, c.customer_id, v.device, v.skill, v.area, v.status, t.technician_id
FROM (VALUES
  ('T-2026-0042','0901234567','iPhone 14 Pro','SCREEN_REPAIR','Quận 7','WAITING_ASSIGNMENT', NULL),
  ('T-2026-0043','0912345678','Samsung S23',  'BATTERY',      'Quận 7','WAITING_ASSIGNMENT', NULL),
  ('T-2026-0044','0901234567','iPhone 13',    'SCREEN_REPAIR','Quận 7','ASSIGNED',           'TECH-003')
) AS v(tcode, phone, device, skill, area, status, tech)
JOIN customer c ON c.phone = v.phone
LEFT JOIN technician t ON t.technician_code = v.tech
ON CONFLICT (ticket_code) DO NOTHING;

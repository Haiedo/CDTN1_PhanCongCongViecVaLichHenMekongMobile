// Kiểm tra cấu trúc 3 lớp backend bằng cách đọc mã nguồn (C2 – "tách lớp đúng"):
//   routes (API) → services (nghiệp vụ) → repositories (SQL).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../src');
const files = (dir) => fs.readdirSync(path.join(SRC, dir)).filter((f) => f.endsWith('.js'))
  .map((f) => ({ name: `${dir}/${f}`, text: fs.readFileSync(path.join(SRC, dir, f), 'utf8') }));
// Bỏ chú thích để chỉ xét mã thật
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

test('services: không dùng req/res/express và không chứa mã trạng thái HTTP', () => {
  for (const f of files('services')) {
    const c = code(f.text);
    assert.ok(!/require\(['"]express['"]\)/.test(c), `${f.name} không được nạp express`);
    assert.ok(!/\b(req|res)\b/.test(c), `${f.name} không được dùng req/res`);
    assert.ok(!/\bstatus(Code)?\s*[:=(]\s*[45]\d\d\b|\.status\(/.test(c), `${f.name} không được chứa mã HTTP`);
    assert.ok(!/AppError/.test(c), `${f.name} phải ném DomainError (không biết HTTP), không dùng AppError`);
  }
});
test('services và routes: không có câu SQL (SQL chỉ nằm ở repositories)', () => {
  for (const f of [...files('services'), ...files('routes')]) {
    assert.ok(!/\b(SELECT\s.+\sFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/is.test(code(f.text)), `${f.name} chứa SQL`);
  }
});
test('repositories: không biết gì về HTTP hay quy tắc nghiệp vụ (không nạp errors, express)', () => {
  for (const f of files('repositories')) {
    const c = code(f.text);
    assert.ok(!/require\(['"]\.\.\/errors['"]\)|require\(['"]express['"]\)/.test(c), `${f.name} nạp thứ không thuộc lớp lưu trữ`);
  }
});
test('routes: không truy cập CSDL trực tiếp qua repositories', () => {
  for (const f of files('routes')) {
    assert.ok(!/repositories\//.test(code(f.text)), `${f.name} phải đi qua services`);
  }
});
test('giao diện: thư mục pages/ không gọi fetch (mọi lời gọi mạng nằm trong api/)', () => {
  const dir = path.join(SRC, 'frontend/pages');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    assert.ok(!/\bfetch\(/.test(fs.readFileSync(path.join(dir, f), 'utf8')), `pages/${f} gọi fetch trực tiếp`);
  }
});

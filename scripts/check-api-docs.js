// Kiểm tra tài liệu API khớp với mã (tiêu chí C9 của Buổi 16): mỗi route Express dưới /api/v1 phải có đúng một
// mục "### N. `METHOD /đường-dẫn`" trong docs/api-docs.md và ngược lại. Không cần CSDL đang chạy.
//   npm run check:docs
const fs = require('fs');
const path = require('path');
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://khong-ket-noi@localhost:5432/khong-ket-noi'; // pool tạo lười, không mở kết nối
const app = require('../src/app');

const norm = (p) => p.replace(/:[A-Za-z_]+/g, '{}').replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '');
const mountOf = (layer) => layer.regexp.source
  .replace('\\/?(?=\\/|$)', '').replace(/^\^/, '').replace(/\\\//g, '/');

const inCode = new Set();
for (const layer of app._router.stack) {
  if (layer.name !== 'router') continue;
  const mount = mountOf(layer);
  if (!mount.startsWith('/api/v1')) continue;
  for (const l of layer.handle.stack) {
    if (!l.route) continue;
    for (const method of Object.keys(l.route.methods))
      inCode.add(`${method.toUpperCase()} ${norm(mount + (l.route.path === '/' ? '' : l.route.path))}`);
  }
}

const doc = fs.readFileSync(path.join(__dirname, '../docs/api-docs.md'), 'utf8');
const inDocs = new Set();
for (const m of doc.matchAll(/^### \d+\. `(GET|POST|PATCH|PUT|DELETE) (\/api\/v1\S*)`/gm)) inDocs.add(`${m[1]} ${norm(m[2])}`);

const missing = [...inCode].filter((x) => !inDocs.has(x));
const extra = [...inDocs].filter((x) => !inCode.has(x));
console.log(`Route trong mã (/api/v1): ${inCode.size} · endpoint trong docs/api-docs.md: ${inDocs.size}`);
for (const x of missing) console.log('  THIẾU trong tài liệu:', x);
for (const x of extra) console.log('  THỪA trong tài liệu (mã không có):', x);
if (missing.length || extra.length || inCode.size === 0) { console.log('=> KHÔNG KHỚP'); process.exit(1); }
console.log('=> KHỚP: mọi route trong mã đều có trong tài liệu và ngược lại');
process.exit(0);

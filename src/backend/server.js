// Đọc cấu hình từ file .env ở thư mục gốc dự án
require('dotenv').config({ path: '../../.env' }); 
const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 3000;

// Yêu cầu 1: Endpoint trả về "Hello Smart CRM"
app.get('/', (req, res) => {
    res.send('Hello Smart CRM');
});

// Yêu cầu 2: Kết nối CSDL cục bộ (sẽ ưu tiên lấy từ .env, nếu không có sẽ lấy mặc định localhost)
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcrm';

mongoose.connect(dbUri)
    .then(() => console.log('✅ Đã kết nối CSDL thành công!'))
    .catch((err) => console.error('❌ Lỗi kết nối CSDL:', err));

app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
});
require('dotenv').config();
const awsIot = require('aws-iot-device-sdk');
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 1. Veritabanı ve Sunucu Kurulumu
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // Harita dosyasını buradan sunacağız

// MongoDB Şeması (Verilerin kalıcı kaydedilmesi için)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arac_takip')
  .then(() => console.log('✅ MongoDB Bağlantısı Başarılı!'))
  .catch(err => console.error('❌ MongoDB Hatası:', err));

const logSchema = new mongoose.Schema({
    vehicleId: String,
    timestamp: Date,
    location: Object,
    speed: Number,
    engineTemp: Number,
    alert: String
});
const VehicleLog = mongoose.model('VehicleLog', logSchema);

// 2. AWS IoT Tüketici (Consumer) Bağlantısı
const device = awsIot.device({
    protocol: 'wss',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    host: process.env.AWS_IOT_ENDPOINT,
    clientId: 'sunucu_' + Math.random().toString(16).substr(2, 8)
});

device.on('connect', function() {
    console.log("☁️  Sunucu AWS IoT'ye bağlandı. Dinleniyor...");
    device.subscribe('vehicle/tracking');
});

// 3. Veri Geldiğinde Çalışacak İş Mantığı
device.on('message', async function(topic, payload) {
    const data = JSON.parse(payload.toString());
    
    // Analiz Kural Motoru (Rule Engine)
    let alertMsg = "";
    if (data.speed > 120) {
        alertMsg = "⚠️ AŞIRI HIZ UYARISI!";
    }
    if (data.engineTemp > 110) {
        alertMsg += " 🔥 MOTOR AŞIRI ISINDI!";
    }

    if (alertMsg) {
        console.log(`\n🚨 DİKKAT [${data.vehicleId}]: ${alertMsg}`);
    }

    // Veritabanına Kalıcı Kayıt
    const logEntry = new VehicleLog({ ...data, alert: alertMsg });
    await logEntry.save();
    console.log(`💾 Veri MongoDB'ye işlendi. (Araç Hızı: ${data.speed} km/s)`);

    // Gelen canlı veriyi Frontend (HTML Harita) ekranına yansıt
    io.emit('vehicleData', { ...data, alert: alertMsg });
});

// Sunucuyu Başlat
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`\n-----------------------------------------`);
    console.log(`🌐 Canlı İzleme Haritası (Web): http://localhost:${PORT}`);
    console.log(`-----------------------------------------\n`);
});

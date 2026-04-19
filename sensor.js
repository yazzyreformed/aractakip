require('dotenv').config();
const awsIot = require('aws-iot-device-sdk');

console.log("🛣️  Araç Sensörü Başlatılıyor...");

// AWS IoT'ye sertifikasız güvenli (WebSockets + IAM) bağlantı
const device = awsIot.device({
    protocol: 'wss',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    host: process.env.AWS_IOT_ENDPOINT,
    clientId: 'sensor_' + Math.random().toString(16).substr(2, 8)
});

// Beşiktaş - Sarıyer arası örnek başlangıç koordinatı
let currentLat = 41.0422;
let currentLng = 29.0060;

device
  .on('connect', function() {
    console.log("✅ AWS IoT Cloud'a bağlanıldı! (MQTT over WebSockets)");
    console.log("📡 Canlı araç verisi gönderilmeye başlanıyor...\n");

    setInterval(function() {
        // Rastgele hareket algoritmaları
        currentLat += (Math.random() * 0.0010) - 0.0002;
        currentLng += (Math.random() * 0.0010) - 0.0002;
        
        let speed = Math.floor(Math.random() * (140 - 40 + 1) + 40); // 40 km/h ile 140 km/h arası
        let engineTemp = Math.floor(Math.random() * (120 - 80 + 1) + 80); 

        const sensorData = {
            vehicleId: "34-BULUT-2026",
            timestamp: new Date().toISOString(),
            location: {
                lat: currentLat,
                lng: currentLng
            },
            speed: speed,
            engineTemp: engineTemp
        };

        // Veriyi buluta fırlat
        device.publish('vehicle/tracking', JSON.stringify(sensorData));
        
        console.log(`📤 Veri Gönderildi -> Hız: ${speed} km/s | Sıcaklık: ${engineTemp}°C | Konum: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`);
        
    }, 2000); // Her 2 saniyede bir veri üret
  });

device.on('error', function(err) {
    console.error("❌ AWS Bağlantı Hatası: ", err);
});

const https = require('https');

function getPublicIP() {
    return new Promise((resolve, reject) => {
        https.get('https://ifconfig.me/ip', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data.trim()));
        }).on('error', (err) => reject(err));
    });
}

async function main() {
    console.log('🔍 Sedang mendeteksi IP Publik server...');
    try {
        const ip = await getPublicIP();
        console.log('\n========================================');
        console.log(`✅ IP Publik ditemukan: ${ip}`);
        console.log(`🔗 URL: http://${ip}:3001/health`);
        console.log('========================================\n');
    } catch (err) {
        console.error('❌ Gagal mendeteksi IP:', err.message);
        console.log('Coba jalankan: curl ifconfig.me');
    }
}

main();

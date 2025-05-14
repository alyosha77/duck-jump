/// Canvas elementini ve 2D çizim bağlamını al
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas bağlamı başarıyla alındı mı kontrol et
if (!ctx) {
    console.error('Canvas bağlamı alınamadı. Tarayıcınız Canvas 2D çizimi desteklemiyor olabilir.');
    // Kullanıcıya daha anlaşılır bir mesaj göstermek isterseniz burayı düzenleyebilirsiniz.
    alert('Oyun yüklenemedi. Tarayıcınız güncel değil veya Canvas desteklemiyor.');
}

// Canvas boyutunu başlangıçta ve pencere boyutu değiştiğinde ekran boyutuna ayarla
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Resimleri Yükle ---
// Harici dosya yollarını kullanıyoruz.
// Lütfen aşağıdaki 'path/to/your/duck.png' kısmını kendi resim dosyanızın yolu ile DEĞİŞTİRİN.
// Bu bir göreceli yol olabilir (örn: 'assets/images/duck.png') veya tam bir URL olabilir (örn: 'https://example.com/images/duck.png').
const duckImage = new Image();
duckImage.src = 'duck-2022568.svg'; // <--- BURAYI DEĞİŞTİRİN

// Eğer farklı engel resimleri kullanacaksanız, onlar için de Image objeleri oluşturup yüklemeniz gerekir.
// Şimdilik engeller renkli dikdörtgen olarak çiziliyor.


// --- Oyun Değişkenleri ---
let player = {
    // Başlangıç pozisyonunu canvas boyutlarına göre ayarla
    x: canvas.width / 4, // Ekranın sol çeyreği civarında başla
    y: canvas.height / 2, // Dikeyde ortada başla
    width: 40, // Genişlik (resim boyutuna göre ayarlamanız gerekebilir)
    height: 40, // Yükseklik (resim boyutuna göre ayarlamanız gerekebilir)
    dy: 0, // Dikey hız (yerçekimi için)
    gravity: 0.8, // Yerçekimi kuvveti
    jumpPower: -10 // Zıplama kuvveti (negatif değer yukarı demek)
};

// Oyun durumu değişkenleri
let score = 0;
let obstacles = [];
let gameSpeed = 3; // Engellerin hareket hızı (piksel/saniye değil, ölçekli hız)
let obstacleTimer = 0;
let obstacleInterval = 1500; // Yeni engel oluşturma aralığı (miliseconds)

// Zaman takibi için değişken (oyun hızını ve zamanlamayı kare hızından bağımsız yapmak için)
let lastTime = 0;


// Engel oluşturma fonksiyonu
function createObstacle() {
    const gap = 200; // Üst ve alt engel arasındaki boşluk
    const obstacleWidth = 60; // Engel genişliği
    const minHeight = 80; // Üst engelin minimum yüksekliği
    const maxHeight = canvas.height - gap - minHeight; // Üst engelin maksimum yüksekliği
    // Eğer maxHeight < minHeight olursa hata vermemesi için Math.max kullan
    const topHeight = Math.random() * (Math.max(0, maxHeight - minHeight)) + minHeight; // Rastgele üst engel yüksekliği
    const bottomY = topHeight + gap; // Alt engelin Y başlangıç pozisyonu

    obstacles.push({
        x: canvas.width, // Engeli ekranın en sağında başlat
        width: obstacleWidth,
        topHeight: topHeight, // Üst engelin yüksekliği
        bottomY: bottomY, // Alt engelin Y başlangıç pozisyonu
        passed: false // Oyuncunun bu engeli geçip geçmediğini takip et
        // İsteğe bağlı: Engel resimleri kullanacaksanız buraya image objesi eklenebilir.
    });
}

// Bulut çizim fonksiyonu (görsel iyileştirme için, resim değil çizim)
function drawCloud(x, y) {
    ctx.fillStyle = '#FFFFFF'; // Beyaz renk
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 15, y - 10, 15, 0, Math.PI * 2);
    ctx.arc(x + 15, y + 10, 15, 0, Math.PI * 2);
    ctx.arc(x + 30, y, 20, 0, Math.PI * 2);
    ctx.closePath(); // Yolu kapat
    ctx.fill(); // İçi dolu çiz
}

// --- Çizim Fonksiyonu ---
function draw() {
    // Her karede ekranı temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Arka plan rengini çiz
    ctx.fillStyle = '#87CEEB'; // Açık mavi gökyüzü
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bulutları çiz (Basit bir döngü ile hareketli bulut efekti)
    // Date.now() kullanımı bulutların animasyonunu sağlar
    const cloudSpeed = 0.05;
     for (let i = 0; i < 5; i++) {
         // X pozisyonu için zamanı kullanarak hareket ve ekran döngüsü sağlar
         const x = ((canvas.width / 4) * i + (Date.now() * cloudSpeed) % (canvas.width * 1.5)) % (canvas.width * 1.5);
         // Y pozisyonu için sinüs dalgası kullanarak hafif salınım sağlar
         const y = 50 + Math.sin(Date.now() / 3000 + i * 1000) * 20;
         // drawCloud(x - canvas.width/2 , y); // Bulutları tekrar sağdan başlatma
         // Basit görünüm için sabit bulutlar da çizilebilir: drawCloud((canvas.width / 4) * i, 50);
         drawCloud(x - canvas.width/2, y);
     }


    // Engelleri çiz (şuan için renkli dikdörtgenler)
    ctx.fillStyle = '#F3C623'; // colorhunt engeller
    obstacles.forEach(obstacle => {
        // Üst engel
        ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
        // Alt engel
        ctx.fillRect(obstacle.x, obstacle.bottomY, obstacle.width, canvas.height - obstacle.bottomY);
        // İsteğe bağlı: Engel resimleri kullanacaksanız buraya drawImage çağrısı eklenecek.
    });

    // Oyuncuyu (ördeği) çiz - Resim yüklendiğinden emin olmalıyız
    // drawImage fonksiyonu, resim yüklenene kadar bir hata vermez ancak çizim yapmaz.
    // Ancak biz oyun döngüsünü resim yüklendikten sonra başlattığımız için bu kontrol teorik olarak gereksiz.
    // Yine de güvenli olması açısından kontrol etmek zarar vermez.
    if (duckImage.complete && duckImage.naturalHeight !== 0) { // Resim tamamlandıysa ve geçerli boyutu varsa
         ctx.drawImage(duckImage, player.x, player.y, player.width, player.height);
    } else {
        // Resim yüklenmediyse veya yüklenirken hata olduysa geçici olarak bir kare çiz
        ctx.fillStyle = '#FFD700'; // Altın sarısı renk
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }


    // Skoru göster
    ctx.fillStyle = '#000'; // Siyah renk
    // index.html'de yüklenen 'Press Start 2P' fontunu kullan
    ctx.font = 'bold 24px "Press Start 2P", cursive';
    // Fontun yüklenmesi zaman alabilir, yüklenene kadar varsayılan font kullanılabilir.
    ctx.fillText(`Skor: ${score}`, 20, 40); // Skor yazısını sol üstte göster
}

// --- Güncelleme Fonksiyonu ---
// Bu fonksiyon, geçen zamana (deltaTime) bağlı olarak oyun durumunu günceller
function update(deltaTime) {
    // Geçen zamanı saniye cinsine çevirerek hareketleri daha doğru ölçeklendir
    const deltaTimeSeconds = deltaTime / 1000; // milisaniyeyi saniyeye çevir

    // Yerçekimini uygula (saniyeye göre ölçeklendirilmiş)
    player.dy += player.gravity * deltaTimeSeconds * 60; // Yerçekimini birim zamana (saniye) göre uygula ve hızlandırıcıyla çarp
    player.y += player.dy * deltaTimeSeconds * 60; // Hareketi birim zamana (saniye) göre uygula ve hızlandırıcıyla çarp

    // Oyuncunun dikey ekran sınırlarını kontrol et
    if (player.y < 0) {
        player.y = 0;
        player.dy = 0; // Tavana çarpınca dikey hızı sıfırla
    }
    // canvas.height'ın resize ile değişmiş olabileceğini unutma
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.dy = 0; // Zemine çarpınca dikey hızı sıfırla
        // İsteğe bağlı: Yere düşünce oyun bitsin isterseniz resetGame() çağrılabilir.
    }

    // Engel oluşturma zamanlayıcısını güncelle ve gerekirse yeni engel oluştur
    obstacleTimer += deltaTime;
    if (obstacleTimer > obstacleInterval) {
        createObstacle();
        obstacleTimer = 0; // Zamanlayıcıyı sıfırla
    }

    // Engelleri hareket ettir ve çarpışma kontrolü yap
    // Diziyi tersten dönmek, eleman silerken index sorunlarını önler
    for (let i = obstacles.length - 1; i >= 0; i--) {
        // Engelleri geçen zamana ve oyun hızına göre hareket ettir (saniyeye göre ölçeklendirilmiş)
        obstacles[i].x -= gameSpeed * deltaTimeSeconds * 60; // gameSpeed bir hızlandırma faktörü gibi davranır

        // Engeli geçti mi kontrol et (Oyuncunun sağ kenarı engelin sol kenarını geçtiyse ve henüz işaretlenmediyse)
        if (!obstacles[i].passed && obstacles[i].x + obstacles[i].width < player.x) {
            obstacles[i].passed = true; // Engeli geçildi olarak işaretle
            score += 10; // Skoru artır
            // İsteğe bağlı: Oyun hızını veya engel aralığını skorla birlikte değiştirebilirsiniz.
            // gameSpeed += 0.01; // Hızı hafifçe artır
            // obstacleInterval = Math.max(800, obstacleInterval - 5); // Engel aralığını azalt (min 800ms)
        }

        // Çarpışma kontrolü (Eksen Hizalı Kutular (AABB) çarpışması)
        // Oyuncunun dikdörtgeni ile engelin dikdörtgenleri kesişiyor mu?
        const collision = player.x < obstacles[i].x + obstacles[i].width &&
                          player.x + player.width > obstacles[i].x &&
                          (player.y < obstacles[i].topHeight || // Üst engele çarptı mı?
                           player.y + player.height > obstacles[i].bottomY); // Alt engele çarptı mı?

        // Eğer çarpışma varsa oyunu sıfırla
        if (collision) {
            console.log("Çarpışma! Oyun bitti. Skor:", score);
            resetGame(); // Oyunu sıfırlayan fonksiyonu çağır
            return; // Güncelleme döngüsünü erken bitir
        }

        // Ekrandan tamamen çıkan engelleri diziden sil
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1); // Diziden 1 eleman sil (mevcut index'ten itibaren)
        }
    }
}

// Oyunu sıfırlama fonksiyonu
function resetGame() {
    score = 0; // Skoru sıfırla
    obstacles = []; // Engelleri temizle
    // Oyuncunun pozisyonunu ve hızını başlangıç değerlerine getir
    player.x = canvas.width / 4;
    player.y = canvas.height / 2;
    player.dy = 0;
    gameSpeed = 3; // Oyun hızını başlangıç değerine getir
    obstacleInterval = 1500; // Engel aralığını başlangıç değerine getir
    obstacleTimer = 0; // Engel zamanlayıcısını sıfırla
    lastTime = 0; // Zamanlayıcıyı sıfırla ki ilk deltaTime sıfırlamadan sonra büyük olmasın
    // İsteğe bağlı: Oyunun tekrar başlaması için bir "Başlamak için Tıkla" ekranı gösterebilirsiniz.
}

// --- Oyun Döngüsü ---
// requestAnimationFrame, tarayıcının bir sonraki kareyi çizmek için hazır olduğunda
// belirtilen fonksiyonu çağırır. Daha akıcı animasyonlar sağlar.
function gameLoop(timestamp) {
    // İlk çağrı için lastTime 0 ise, deltaTime büyük olacaktır.
    // Bunu kontrol ederek ilk karede ani hareketleri önleyebiliriz.
    // Ya da lastTime'ı sadece ilk çağrıda başlatabiliriz.
    if (lastTime === 0) {
        lastTime = timestamp;
    }

    // Geçen zamanı hesapla (milisaniye cinsinden)
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp; // lastTime'ı mevcut zamanla güncelle

    // Eğer deltaTime çok büyükse (örn: sekme değiştirdiyse), güncellemeyi atla
    if (deltaTime < 1000) { // 1 saniyeden büyükse atla
      // update fonksiyonunu hesaplanan deltaTime ile çağır
      update(deltaTime);
    } else {
      // Eğer deltaTime çok büyükse, oyun duraklamış gibi kabul et, sadece lastTime'ı güncelle
      console.warn("Çok büyük deltaTime tespit edildi, güncelleme atlandı:", deltaTime);
    }


    // draw fonksiyonunu çağırarak ekranı yeniden çiz (deltaTime'dan bağımsız)
    draw();

    // Tarayıcıdan bir sonraki kareyi çizmesini iste ve gameLoop fonksiyonunu tekrar çağır
    requestAnimationFrame(gameLoop);
}

// --- Olay Dinleyiciler (Etkileşim) ---

// Ekrana dokunulduğunda (mobil) veya fare ile tıklandığında (masaüstü) player zıplar.
canvas.addEventListener('touchstart', jump); // Dokunma olayı
canvas.addEventListener('mousedown', jump); // Fare tıklama olayı

function jump() {
    // Oyuncunun dikey hızını zıplama kuvveti kadar yukarı (negatif yön) ayarla
    player.dy = player.jumpPower;
    // Zıplarken yukarı doğru hızı sınırlayabiliriz, böylece çok hızlı yukarı gitmez.
    // if (player.dy > player.jumpPower) { player.dy = player.jumpPower; }
}

// Pencere boyutu değiştiğinde canvas'ı yeniden boyutlandır
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Not: Resize sırasında oyuncunun pozisyonunu sıfırlamak yerine,
    // sadece canvas boyutunu güncellemek genellikle daha iyidir.
    // Oyuncu sınır dışına çıkarsa, update fonksiyonundaki kontroller onu içeride tutacaktır.
    // Eğer oyunun resize olunca yeniden başlamasını isterseniz resetGame() çağırabilirsiniz.
    // Engellerin pozisyonu resize'dan etkilenmez, bu basit oyun için kabul edilebilir.
});


// --- Oyunu Başlat ---
// Resim yüklendikten sonra oyun döngüsünü başlat
// Bu, resimler çizime hazır olmadan oyunun başlamasını engeller.
duckImage.onload = () => {
    console.log("Ördek resmi yüklendi. Oyun Başlıyor!");
    // Resim yüklendikten sonra ilk engeli oluştur
    createObstacle();
    // Oyun döngüsünü başlat
    // requestAnimationFrame'in ilk çağrısına bir timestamp verilir, bu yüzden 0 göndermeye gerek yok.
    requestAnimationFrame(gameLoop);
};

// Resim yüklenemezse hata mesajı göster
duckImage.onerror = () => {
    console.error('Ördek resmi yüklenemedi. Lütfen "duckImage.src" yolunu kontrol edin.');
    // Kullanıcıya bir hata mesajı gösterebilirsiniz
    alert('Oyun için gerekli resim yüklenemedi. Lütfen konsolu kontrol edin ve resim dosyasının doğru yolda olduğundan emin olun.');
    // Resim yüklenemese bile geçici kare ile oyunun başlamasını isterseniz
    // buraya requestAnimationFrame(gameLoop); satırını ekleyebilirsiniz.
    // Şu anki kodda resim yüklenmezse oyun başlamaz.
};

// Eğer resim önbellekten hemen yüklendiyse onload tetiklenmeyebilir (nadiren).
// Bu durumu ele almak için duckImage.complete kontrol edilebilir, ancak
// onload ile başlatma ve draw içinde resim kontrolü genellikle yeterlidir.
// Daha sağlam bir yükleme yöneticisi kullanmak büyük oyunlar için daha uygundur.
// Basitlik için şimdilik sadece onload yeterli.
// if (duckImage.complete && duckImage.naturalHeight !== 0) {
//      console.log("Resim önbellekten yüklendi.");
//      createObstacle();
//      requestAnimationFrame(gameLoop);
// }
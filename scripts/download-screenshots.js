const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');

// Игры для обработки
const GAMES = [
  {
    name: 'Построй Американские Горки',
    url: 'https://yandex.ru/games/app/postroi-amerikanskie-gorki-simuliator-483579',
    dir: 'images/games/american-coaster'
  },
  {
    name: 'Построить Аквапарк',
    url: 'https://yandex.ru/games/app/postroit-akvapark-490743',
    dir: 'images/games/aquapark'
  },
  {
    name: 'Строить Трек для Картинга',
    url: 'https://yandex.ru/games/app/stroit-trek-dlia-kartinga-542093',
    dir: 'images/games/karting-track'
  },
  {
    name: 'Рыбацкая Бухта',
    url: 'https://yandex.ru/games/app/rybatskaia-bukhta-551119',
    dir: 'images/games/fishing-cove'
  }
];

async function downloadImage(url, filepath) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    await fs.ensureDir(path.dirname(filepath));
    const dest = fs.createWriteStream(filepath);
    
    return new Promise((resolve, reject) => {
      res.body.pipe(dest);
      res.body.on('error', reject);
      dest.on('finish', resolve);
    });
  } catch (err) {
    console.error(`❌ Ошибка скачивания ${url}:`, err.message);
    throw err;
  }
}

async function scrapeGameScreenshots(game, browser) {
  console.log(`\n📷 Обработка: ${game.name}`);
  console.log(`🔗 URL: ${game.url}`);
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Загружаем страницу
    await page.goto(game.url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Ждём загрузки изображений (ленивая загрузка)
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let loadCount = 0;
        const checkLoaded = () => {
          const images = document.querySelectorAll('img');
          if (images.length > 0) {
            setTimeout(resolve, 1000);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    });

    // Прокручиваем страницу для загрузки lazy-loaded изображений
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(1000);

    // Извлекаем все изображения со скриншотами
    const screenshots = await page.$$eval('img', imgs => {
      return imgs
        .map(img => ({
          src: img.src || img.dataset.src,
          alt: img.alt,
          width: img.width,
          height: img.height
        }))
        .filter(img => {
          const src = img.src || '';
          // Фильтруем скриншоты - обычно они содержат "screenshot" в URL или большого размера
          return src.includes('avatars.mds.yandex.net') && 
                 (src.includes('screenshot') || src.includes('games')) &&
                 img.width > 200 && img.height > 150;
        })
        .slice(0, 5); // Берём максимум 5 скриншотов
    });

    console.log(`✅ Найдено скриншотов: ${screenshots.length}`);

    // Скачиваем скриншоты
    for (const [idx, screenshot] of screenshots.entries()) {
      try {
        const ext = path.extname(new URL(screenshot.src).pathname) || '.jpg';
        const filename = `screenshot-${idx + 1}${ext}`;
        const filepath = path.join(game.dir, filename);
        
        console.log(`   ⬇️  ${idx + 1}/${screenshots.length} → ${filepath}`);
        await downloadImage(screenshot.src, filepath);
      } catch (err) {
        console.error(`   ❌ Не удалось скачать скриншот ${idx + 1}`);
      }
    }

    await page.close();
    return screenshots.length;
  } catch (err) {
    console.error(`❌ Ошибка обработки ${game.name}:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('🎮 Запуск парсера скриншотов Yandex Games');
  console.log('═══════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let totalScreenshots = 0;

  for (const game of GAMES) {
    const count = await scrapeGameScreenshots(game, browser);
    totalScreenshots += count;
  }

  await browser.close();

  console.log('\n═══════════════════════════════════════');
  console.log(`✨ Завершено! Скачано ${totalScreenshots} скриншотов`);
  console.log('Скриншоты находятся в папке: images/games/');
}

main().catch(err => {
  console.error('💥 Критическая ошибка:', err);
  process.exit(1);
});

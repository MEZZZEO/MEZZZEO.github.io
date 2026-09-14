/**
 * Game Screenshots Carousel
 * Автоматически загружает скриншоты из папок images/games/
 * и создаёт интерактивные карусели
 */

class GameCarousel {
  constructor(element) {
    this.wrapper = element;
    this.gameId = element.dataset.carousel;
    this.currentIndex = 0;
    this.slides = [];
    this.autoplayInterval = null;
    
    this.track = element.querySelector('.carousel__track');
    this.prevBtn = element.querySelector('.carousel__nav--prev');
    this.nextBtn = element.querySelector('.carousel__nav--next');
    this.dotsContainer = element.querySelector('.carousel__dots');
    
    this.init();
  }

  async init() {
    // Загружаем скриншоты для этой игры
    await this.loadScreenshots();
    
    // Если есть скриншоты - инициализируем карусель
    if (this.slides.length > 0) {
      this.setupCarousel();
      this.setupEventListeners();
      this.startAutoplay();
    }
  }

  async loadScreenshots() {
    try {
      // Список возможных расширений
      const extensions = ['jpg', 'jpeg', 'png', 'webp'];
      const basePath = `images/games/${this.gameId}`;
      
      // Пытаемся загрузить скриншоты (1-10)
      for (let i = 1; i <= 10; i++) {
        for (const ext of extensions) {
          const imagePath = `${basePath}/screenshot-${i}.${ext}`;
          
          // Проверяем, существует ли изображение
          const response = await fetch(imagePath, { method: 'HEAD' });
          
          if (response.ok) {
            this.slides.push({
              src: imagePath,
              alt: `Screenshot ${i} of ${this.gameId}`
            });
            break; // Переходим к следующему номеру
          }
        }
      }
      
      console.log(`📸 ${this.gameId}: загружено ${this.slides.length} скриншотов`);
    } catch (error) {
      console.error(`Ошибка загрузки скриншотов для ${this.gameId}:`, error);
    }
  }

  setupCarousel() {
    // Очищаем трек
    this.track.innerHTML = '';
    
    // Если скриншотов нет - показываем placeholder
    if (this.slides.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'carousel__slide carousel__slide--placeholder';
      placeholder.innerHTML = '<span>Нет скриншотов</span>';
      this.track.appendChild(placeholder);
      return;
    }
    
    // Создаём слайды
    this.slides.forEach((slide, index) => {
      const slideEl = document.createElement('div');
      slideEl.className = 'carousel__slide';
      slideEl.innerHTML = `<img src="${slide.src}" alt="${slide.alt}" loading="lazy">`;
      this.track.appendChild(slideEl);
    });
    
    // Создаём точки навигации
    this.dotsContainer.innerHTML = '';
    this.slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = `carousel__dot ${index === 0 ? 'carousel__dot--active' : ''}`;
      dot.setAttribute('aria-label', `Перейти к слайду ${index + 1}`);
      dot.onclick = () => this.goToSlide(index);
      this.dotsContainer.appendChild(dot);
    });
  }

  setupEventListeners() {
    this.prevBtn.addEventListener('click', () => this.previousSlide());
    this.nextBtn.addEventListener('click', () => this.nextSlide());
    
    // Пауза автоплея при наведении мыши
    this.wrapper.addEventListener('mouseenter', () => this.stopAutoplay());
    this.wrapper.addEventListener('mouseleave', () => this.startAutoplay());
    
    // Поддержка свайпов на мобильных
    this.setupTouchGestures();
  }

  setupTouchGestures() {
    let startX = 0;
    let currentX = 0;
    
    const carousel = this.wrapper.querySelector('.carousel');
    
    carousel.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      this.stopAutoplay();
    });
    
    carousel.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX;
    });
    
    carousel.addEventListener('touchend', () => {
      const diff = startX - currentX;
      const threshold = 50;
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          this.nextSlide();
        } else {
          this.previousSlide();
        }
      }
      
      this.startAutoplay();
    });
  }

  goToSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    
    this.currentIndex = index;
    this.updateCarousel();
    this.stopAutoplay();
    this.startAutoplay();
  }

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    this.updateCarousel();
  }

  previousSlide() {
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.updateCarousel();
  }

  updateCarousel() {
    // Обновляем позицию слайдов
    const offset = -this.currentIndex * 100;
    this.track.style.transform = `translateX(${offset}%)`;
    
    // Обновляем активную точку
    const dots = this.dotsContainer.querySelectorAll('.carousel__dot');
    dots.forEach((dot, index) => {
      dot.classList.toggle('carousel__dot--active', index === this.currentIndex);
    });
  }

  startAutoplay() {
    // Автопрокрутка каждые 6 секунд
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, 6000);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  destroy() {
    this.stopAutoplay();
  }
}

/**
 * Инициализация всех карусалей на странице
 */
document.addEventListener('DOMContentLoaded', () => {
  const carousels = document.querySelectorAll('[data-carousel]');
  
  carousels.forEach(element => {
    new GameCarousel(element);
  });
  
  console.log('🎠 Карусели инициализированы');
});

/**
 * Очистка при выгрузке страницы
 */
window.addEventListener('beforeunload', () => {
  const carousels = document.querySelectorAll('[data-carousel]');
  carousels.forEach(element => {
    const carousel = element._carousel;
    if (carousel) {
      carousel.destroy();
    }
  });
});

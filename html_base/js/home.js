// ============================================================
//  非遗工业技艺数字化平台 —— 页面交互脚本
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ===== HERO CAROUSEL =====
    const slides = document.querySelectorAll('.hero-slide');
    const indicators = document.querySelectorAll('.hero-indicators .indicator');
    let currentSlide = 0;
    const totalSlides = slides.length;
    let slideInterval;

    function goToSlide(index) {
        slides.forEach(s => s.classList.remove('active'));
        indicators.forEach(i => i.classList.remove('active'));
        currentSlide = ((index % totalSlides) + totalSlides) % totalSlides;
        slides[currentSlide].classList.add('active');
        if (indicators[currentSlide]) indicators[currentSlide].classList.add('active');
    }

    function nextSlide() { goToSlide(currentSlide + 1); }

    function startCarousel() {
        if (slideInterval) clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 4000);
    }

    indicators.forEach((ind, i) => {
        ind.addEventListener('click', () => {
            goToSlide(i);
            startCarousel();
        });
    });

    if (totalSlides > 1) startCarousel();

    // ===== SCROLL INDICATOR =====
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
            const positioning = document.getElementById('positioning');
            if (positioning) positioning.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ===== BACK TO TOP =====
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.classList.toggle('show', window.scrollY > 600);
        });
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ===== SIMPLE CHAT BAR =====
    const chatInput = document.querySelector('.simple-chat-input');
    const chatSend = document.querySelector('.simple-chat-bar .btn');

    if (chatSend && chatInput) {
        chatSend.addEventListener('click', () => {
            if (chatInput.value.trim()) {
                window.location.href = 'rag-qa.html';
            }
        });
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.location.href = 'rag-qa.html';
        });
    }

    // ===== SIMPLE FILTER BUTTON =====
    const filterBtn = document.querySelector('.simple-filter .btn-primary');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            window.location.href = 'database.html';
        });
    }

    console.log('非遗工坊首页已就绪');
});

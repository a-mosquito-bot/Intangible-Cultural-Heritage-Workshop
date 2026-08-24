// 非遗工坊 - 全局 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    
    // ===== PRELOADER =====
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                preloader.classList.add('hidden');
            }, 800);
        });
    }
    
    // ===== MOBILE MENU TOGGLE =====
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Toggle body scroll
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // ===== HEADER SCROLL EFFECT =====
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // ===== HERO SLIDER =====
    const heroSlides = document.querySelectorAll('.hero-slide');
    let currentSlide = 0;
    
    if (heroSlides.length > 0) {
        // Auto slide change
        function nextSlide() {
            heroSlides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % heroSlides.length;
            heroSlides[currentSlide].classList.add('active');
        }
        
        // Change slide every 5 seconds
        setInterval(nextSlide, 5000);
    }
    
    // ===== BACK TO TOP BUTTON =====
    const backToTopBtn = document.querySelector('.back-to-top');
    
    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    // ===== SEARCH OVERLAY =====
    const searchToggle = document.querySelector('.search-toggle');
    const closeSearch = document.querySelector('.close-search');
    const searchOverlay = document.querySelector('.search-overlay');
    
    if (searchToggle && searchOverlay) {
        searchToggle.addEventListener('click', function(e) {
            e.preventDefault();
            searchOverlay.classList.add('active');
            document.querySelector('.search-input').focus();
        });
        
        if (closeSearch) {
            closeSearch.addEventListener('click', function() {
                searchOverlay.classList.remove('active');
            });
        }
        
        // Close overlay when clicking outside
        searchOverlay.addEventListener('click', function(e) {
            if (e.target === searchOverlay) {
                searchOverlay.classList.remove('active');
            }
        });
    }
    
    // ===== SET CURRENT YEAR IN FOOTER =====
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // ===== ANIMATE ON SCROLL =====
    function animateOnScroll() {
        const elements = document.querySelectorAll('.section-title, .category-card');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (elementTop < windowHeight - 100) {
                element.classList.add('animated');
            }
        });
    }
    
    window.addEventListener('scroll', animateOnScroll);
    animateOnScroll(); // Initial check
    
    // ===== CONSOLE GREETING =====
    console.log('%c🏮 非遗工坊 · 非遗工业技艺数字化平台 🏮', 'color: #8B0000; font-size: 18px; font-weight: bold;');
    console.log('%c传承千年技艺，激活数字未来', 'color: #2C1810;');
});
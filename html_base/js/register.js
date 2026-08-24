// 新匠培育页脚本
document.addEventListener('DOMContentLoaded', function () {
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => backToTop.classList.toggle('show', window.scrollY > 600));
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    console.log('新匠培育页已就绪');
});

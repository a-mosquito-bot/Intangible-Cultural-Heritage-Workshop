// ============================================================
//  在地非遗文旅体验 —— 研学预约页脚本
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ===== FILTER BUTTON =====
    const filterBtn = document.querySelector('.filter-row .btn');
    const regionSelect = document.querySelector('.filter-row select:nth-child(1)');
    const typeSelect = document.querySelector('.filter-row select:nth-child(2)');

    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            const region = regionSelect ? regionSelect.value : '';
            const type = typeSelect ? typeSelect.value : '';
            // Scroll to first service block
            const individual = document.getElementById('individual');
            if (individual) individual.scrollIntoView({ behavior: 'smooth' });
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

    console.log('研学预约页已就绪');
});

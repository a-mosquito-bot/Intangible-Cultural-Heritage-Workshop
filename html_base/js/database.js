// 非遗基础数据库
document.addEventListener('DOMContentLoaded', function () {

    let allItems = [];
    const tableEl = document.getElementById('data-table');
    const countEl = document.getElementById('item-count');
    const searchInput = document.getElementById('search-input');
    const regionSelect = document.getElementById('region-select');
    const categorySelect = document.getElementById('category-select');
    const filterBtn = document.getElementById('filter-btn');

    fetch('data/ich_full.json')
        .then(r => r.json())
        .then(items => {
            allItems = items;
            render(items);
        })
        .catch(() => {
            tableEl.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--gray-color);">数据加载失败</p>';
        });

    function render(items) {
        updateCount(items.length);
        if (!items.length) {
            tableEl.innerHTML = '<p style="text-align:center;padding:2rem;color:var(--gray-color);">无匹配结果</p>';
            return;
        }
        let html = '<table class="data-table"><thead><tr>';
        html += '<th style="width:60px;">序号</th>';
        html += '<th>非遗名称</th>';
        html += '<th style="width:160px;">地区</th>';
        html += '<th style="width:180px;">分类</th>';
        html += '</tr></thead><tbody>';
        items.forEach((item, i) => {
            html += '<tr>';
            html += '<td>' + (i + 1) + '</td>';
            html += '<td><strong>' + esc(item.title) + '</strong></td>';
            html += '<td>' + esc(item.region || '') + '</td>';
            html += '<td>' + esc(item.category || '') + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';
        tableEl.innerHTML = html;
    }

    function updateCount(n) { if (countEl) countEl.textContent = n; }

    function doFilter() {
        const rv = regionSelect ? regionSelect.value : '';
        const cv = categorySelect ? categorySelect.value : '';
        const sv = (searchInput ? searchInput.value : '').toLowerCase();
        let filtered = allItems.filter(item => {
            if (rv && !(item.region || '').includes(rv)) return false;
            if (cv && !(item.category || '').includes(cv)) return false;
            if (sv && !(item.title || '').toLowerCase().includes(sv)) return false;
            return true;
        });
        render(filtered);
    }

    if (filterBtn) filterBtn.addEventListener('click', doFilter);
    if (searchInput) searchInput.addEventListener('input', doFilter);
    if (regionSelect) regionSelect.addEventListener('change', doFilter);
    if (categorySelect) categorySelect.addEventListener('change', doFilter);

    function esc(s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    const btt = document.querySelector('.back-to-top');
    if (btt) {
        window.addEventListener('scroll', () => btt.classList.toggle('show', window.scrollY > 600));
        btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
});
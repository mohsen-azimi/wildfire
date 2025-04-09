
document.addEventListener('DOMContentLoaded', function () {
    const buttons = document.querySelectorAll('.tab-button');
    const tabs = document.querySelectorAll('.tab-content');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabs.forEach(t => {
                if (t.id === target) {
                    t.style.display = 'block';
                } else {
                    t.style.display = 'none';
                }
            });
        });
    });
});

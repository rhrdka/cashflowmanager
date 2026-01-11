let transactions = [];
let currentType = 'income';
let editingId = null;
let deleteId = null;
let charts = {};

const incomeCategories = ['Gaji', 'Pendapatan lainnya'];
const expenseCategories = ['Makanan/Minuman', 'Ngopi', 'Hiburan', 'Service', 'Lainnya'];

// Set default date to today
document.getElementById('date').valueAsDate = new Date();

// Load from localStorage
function loadData() {
    const saved = localStorage.getItem('cashflowTransactions');
    if (saved) {
        transactions = JSON.parse(saved);
        updateAllUI();
    }
}

// Save to localStorage
function saveData() {
    localStorage.setItem('cashflowTransactions', JSON.stringify(transactions));
}

// Switch between pages
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(pageName).classList.add('active');
    document.querySelector(`.nav-btn[onclick="switchPage('${pageName}')"]`).classList.add('active');
    
    if (pageName === 'charts') {
        setTimeout(updateCharts, 100);
    }
    if (pageName === 'analysis') {
        updateAnalysis();
    }
}

// Update category dropdown based on type
function updateCategories() {
    const categorySelect = document.getElementById('category');
    const categories = currentType === 'income' ? incomeCategories : expenseCategories;
    
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';
    categories.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

// Type selector buttons
document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        currentType = this.dataset.type;
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        updateCategories();
    });
});

// Form submission
document.getElementById('transactionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const categoryValue = document.getElementById('category').value;
    const amountValue = document.getElementById('amount').value;
    const dateValue = document.getElementById('date').value;

    if (!categoryValue || !amountValue || !dateValue) {
        showNotification('Harap isi semua field yang wajib', 'error');
        return;
    }

    const transaction = {
        id: editingId || Date.now(),
        type: currentType,
        description: categoryValue,
        amount: parseFloat(amountValue),
        category: categoryValue,
        date: dateValue,
        notes: document.getElementById('notes').value
    };

    if (editingId) {
        const index = transactions.findIndex(t => t.id === editingId);
        transactions[index] = transaction;
        showNotification('Transaksi berhasil diupdate', 'success');
        editingId = null;
        document.getElementById('submitBtn').textContent = 'Tambah Transaksi';
    } else {
        transactions.unshift(transaction);
        showNotification('Transaksi berhasil ditambahkan', 'success');
    }

    saveData();
    updateAllUI();
    this.reset();
    document.getElementById('date').valueAsDate = new Date();
    updateCategories();
});

// Update all UI components
function updateAllUI() {
    updateDashboard();
    displayTransactions(transactions);
    updateDashboardChart();
}

// Update summary cards
function updateDashboard() {
    const income = transactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalExpense').textContent = formatCurrency(expense);
    document.getElementById('balance').textContent = formatCurrency(balance);
    document.getElementById('totalTransactions').textContent = transactions.length;
}

// Display transaction list
function displayTransactions(data) {
    const list = document.getElementById('transactionList');
    
    if (data.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">○</div>
                <div class="empty-state-text">Tidak ada transaksi ditemukan</div>
            </div>
        `;
        return;
    }

    list.innerHTML = data.map(t => `
        <div class="transaction-item">
            <div class="transaction-icon ${t.type}-icon">
                ${t.type === 'income' ? '↑' : '↓'}
            </div>
            <div class="transaction-info">
                <div class="transaction-description">${t.description}</div>
                <div class="transaction-meta">
                    <span class="transaction-category">${t.category}</span>
                    ${formatDate(t.date)}
                    ${t.notes ? ` • ${t.notes}` : ''}
                </div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
            </div>
            <div class="transaction-actions">
                <button class="action-btn edit-btn" onclick="editTransaction(${t.id})">✎</button>
                <button class="action-btn delete-btn" onclick="openDeleteModal(${t.id})">✕</button>
            </div>
        </div>
    `).join('');
}

// Edit transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    editingId = id;
    currentType = transaction.type;

    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === currentType) btn.classList.add('active');
    });

    updateCategories();

    document.getElementById('amount').value = transaction.amount;
    document.getElementById('category').value = transaction.category;
    document.getElementById('date').value = transaction.date;
    document.getElementById('notes').value = transaction.notes || '';

    document.getElementById('submitBtn').textContent = 'UPDATE TRANSAKSI';
    switchPage('input');
}

// Delete modal
function openDeleteModal(id) {
    deleteId = id;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    deleteId = null;
    document.getElementById('deleteModal').classList.remove('active');
}

function confirmDelete() {
    if (deleteId) {
        transactions = transactions.filter(t => t.id !== deleteId);
        saveData();
        updateAllUI();
        showNotification('Transaksi berhasil dihapus', 'success');
        closeDeleteModal();
    }
}

// Filter & Search
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        filterTransactions();
    });
});

document.getElementById('searchBox').addEventListener('input', filterTransactions);

function filterTransactions() {
    const filter = document.querySelector('.filter-btn.active').dataset.filter;
    const search = document.getElementById('searchBox').value.toLowerCase();

    let filtered = transactions;

    if (filter !== 'all') {
        filtered = filtered.filter(t => t.type === filter);
    }

    if (search) {
        filtered = filtered.filter(t => 
            (t.description?.toLowerCase() || '').includes(search) ||
            (t.category?.toLowerCase() || '').includes(search) ||
            (t.notes?.toLowerCase() || '').includes(search)
        );
    }

    displayTransactions(filtered);
}

// Dashboard Doughnut Chart
function updateDashboardChart() {
    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;
    
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const income = monthTransactions.filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    if (charts.dashboard) charts.dashboard.destroy();

    charts.dashboard = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#10b981', '#f43f5e'],
                borderColor: ['#059669', '#e11d48'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#a1a1aa', font: { size: 12, weight: '600' }, padding: 15 }
                }
            }
        }
    });
}

// All Charts (Line, Pie, Bar)
function updateCharts() {
    updateLineChart();
    updateExpensePieChart();
    updateBarChart();
}

function updateLineChart() {
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    const monthlyData = {};
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month][t.type] += t.amount;
    });

    const labels = Object.keys(monthlyData).sort().slice(-6);
    const incomeData = labels.map(m => monthlyData[m].income);
    const expenseData = labels.map(m => monthlyData[m].expense);

    if (charts.line) charts.line.destroy();

    charts.line = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(l => {
                const [y, m] = l.split('-');
                return new Date(y, m-1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            }),
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#27272a' },
                    ticks: { color: '#71717a', callback: v => 'Rp ' + (v/1000000).toFixed(1) + 'jt' }
                },
                x: { grid: { display: false }, ticks: { color: '#71717a' } }
            }
        }
    });
}

function updateExpensePieChart() {
    const ctx = document.getElementById('expensePieChart');
    if (!ctx) return;

    const categoryData = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });

    if (charts.expensePie) charts.expensePie.destroy();

    charts.expensePie = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: ['#f43f5e', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#f59e0b'],
                borderColor: '#0f172a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#a1a1aa', font: { size: 12, weight: '600' }, padding: 10 }
                }
            }
        }
    });
}

function updateBarChart() {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    const monthlyData = {};
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month][t.type] += t.amount;
    });

    const labels = Object.keys(monthlyData).sort().slice(-6);
    const incomeData = labels.map(m => monthlyData[m].income);
    const expenseData = labels.map(m => monthlyData[m].expense);

    if (charts.bar) charts.bar.destroy();

    charts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => {
                const [y, m] = l.split('-');
                return new Date(y, m-1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
            }),
            datasets: [
                {
                    label: 'Pemasukan',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                },
                {
                    label: 'Pengeluaran',
                    data: expenseData,
                    backgroundColor: '#f43f5e',
                    borderColor: '#e11d48',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#27272a' },
                    ticks: { color: '#71717a', callback: v => 'Rp ' + (v/1000000).toFixed(1) + 'jt' }
                },
                x: { grid: { display: false }, ticks: { color: '#71717a' } }
            }
        }
    });
}

// Analysis Page
function updateAnalysis() {
    const monthlyData = {};
    transactions.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        monthlyData[month][t.type] += t.amount;
    });

    const months = Object.keys(monthlyData);
    const avgIncome = months.length ? Object.values(monthlyData).reduce((s, m) => s + m.income, 0) / months.length : 0;
    const avgExpense = months.length ? Object.values(monthlyData).reduce((s, m) => s + m.expense, 0) / months.length : 0;

    document.getElementById('avgIncome').textContent = formatCurrency(avgIncome);
    document.getElementById('avgExpense').textContent = formatCurrency(avgExpense);
    document.getElementById('avgBalance').textContent = formatCurrency(avgIncome - avgExpense);

    // Top expense categories
    const categoryData = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
    });

    const topCats = Object.entries(categoryData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    document.getElementById('topCategories').innerHTML = topCats.length > 0 
        ? topCats.map(([cat, amt]) => `
            <div class="analysis-item">
                <span class="analysis-label">${cat}</span>
                <span class="analysis-value">${formatCurrency(amt)}</span>
            </div>
        `).join('')
        : '<div class="empty-state-text" style="padding: 20px;">Belum ada data</div>';

    // Largest transactions
    const largest = [...transactions]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    document.getElementById('largestTransactions').innerHTML = largest.length > 0
        ? largest.map(t => `
            <div class="analysis-item">
                <span class="analysis-label">${t.description}</span>
                <span class="analysis-value">${formatCurrency(t.amount)}</span>
            </div>
        `).join('')
        : '<div class="empty-state-text" style="padding: 20px;">Belum ada data</div>';
}

// Export to CSV
function exportToCSV() {
    if (transactions.length === 0) {
        showNotification('Tidak ada data untuk diekspor', 'error');
        return;
    }

    const csv = [
        ['Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah', 'Catatan'],
        ...transactions.map(t => [
            t.date,
            t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
            t.category,
            t.description,
            t.amount,
            t.notes || ''
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashflow_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Data berhasil diekspor', 'success');
}

// Helpers
function formatCurrency(amount) {
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Initialize categories and load data
updateCategories();
loadData();

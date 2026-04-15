// Dashboard State Management
let currentView = 'overview';
let dashboardData = {
  metrics: {
    monthlyCollections: 0,
    pendingAmount: 0,
    totalCustomers: 0,
    totalClusters: 0,
    monthlyChange: 0,
    pendingChange: 0,
    customersChange: 0,
    clustersChange: 0
  },
  clusters: [],
  customers: [],
  selectedCluster: null,
  chartData: {
    daily: [],
    monthly: []
  }
};

let paymentChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard DOM ready - setting up safe system');
  setupGlobalClickHandlers();
  loadDashboardData();
  initializeChart();
});

// Global click handler for dashboard events
function setupGlobalClickHandlers() {
  document.addEventListener('click', (e) => {
    console.log('Dashboard click detected:', e.target.id);
    
    // Handle logout
    if (e.target.id === 'logout-btn') {
      console.log('Logout clicked');
      logout();
    }
    
    // Handle add customer
    if (e.target.id === 'add-customer') {
      console.log('Add customer clicked');
      openAddCustomer();
    }
    
    // Handle open settings
    if (e.target.id === 'open-settings') {
      console.log('Settings clicked');
      openSettings();
    }
    
    // Handle navigation
    if (e.target.classList.contains('nav-btn')) {
      const view = e.target.dataset.view;
      console.log('Navigation clicked:', view);
      handleNavigation(view);
    }
  });
}

// Safe dashboard rendering
function renderDashboardContent(content) {
  const contentArea = document.getElementById('content-area');
  if (contentArea) {
    contentArea.innerHTML = content;
    console.log('Dashboard content rendered safely');
  } else {
    console.error('Content area not found');
  }
}

  // User menu
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userMenuToggle) {
    userMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!userMenuToggle.contains(e.target)) {
      userDropdown.classList.add('hidden');
    }
  });

  // Chart period buttons
  const chartButtons = document.querySelectorAll('.chart-btn');
  chartButtons.forEach(btn => {
    btn.addEventListener('click', handleChartPeriodChange);
  });
}

function handleNavigation(view) {
  console.log('Navigating to view:', view);
  
  // Update active button
  navButtons.forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-view="${view}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  currentView = view;
  
  // Load data for view using safe content-area rendering
  if (view === 'overview') {
    renderOverviewContent();
  } else if (view === 'clusters') {
    renderClustersContent();
  } else if (view === 'customers') {
    renderCustomersContent();
  }
}

async function loadDashboardData() {
  try {
    // Check user status first
    const statusResponse = await fetch(`${apiBase()}/api/license/status`, {
      headers: {
        'Authorization': `Bearer ${getLicenseKey()}`
      }
    });
    
    const statusResult = await statusResponse.json();
    
    if (statusResult.status !== 'approved') {
      showVerificationScreen();
      return;
    }

    // Load dashboard data
    await Promise.all([
      loadMetrics(),
      loadClusters(),
      loadCustomers(),
      loadChartData()
    ]);
    
    updateMetricsDisplay();
  } catch (error) {
    console.error('Dashboard load error:', error);
    showNotice('Failed to load dashboard data', 'error');
  }
}

async function loadMetrics() {
  try {
    const response = await fetch(`${apiBase()}/api/customers/metrics`, {
      headers: {
        'Authorization': `Bearer ${getLicenseKey()}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      dashboardData.metrics = result.metrics;
    }
  } catch (error) {
    console.error('Metrics load error:', error);
  }
}

async function loadClusters() {
  try {
    const response = await fetch(`${apiBase()}/api/clusters/business/${getBusinessApplicationId()}`, {
      headers: {
        'Authorization': `Bearer ${getLicenseKey()}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      dashboardData.clusters = result.clusters;
      updateClustersDisplay();
    }
  } catch (error) {
    console.error('Clusters load error:', error);
  }
}

async function loadCustomers() {
  try {
    const response = await fetch(`${apiBase()}/api/customers`, {
      headers: {
        'Authorization': `Bearer ${getLicenseKey()}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      dashboardData.customers = result.customers;
      updateCustomersDisplay();
    }
  } catch (error) {
    console.error('Customers load error:', error);
  }
}

async function loadChartData() {
  try {
    const response = await fetch(`${apiBase()}/api/customers/trends`, {
      headers: {
        'Authorization': `Bearer ${getLicenseKey()}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      dashboardData.chartData = result.trends;
      updateChart();
    }
  } catch (error) {
    console.error('Chart data load error:', error);
  }
}

function updateMetricsDisplay() {
  const metrics = dashboardData.metrics;
  
  metricsElements.monthlyCollections.textContent = `₹${metrics.monthlyCollections.toLocaleString('en-IN')}`;
  metricsElements.monthlyChange.textContent = `${metrics.monthlyChange > 0 ? '+' : ''}${metrics.monthlyChange}%`;
  metricsElements.pendingAmount.textContent = `₹${metrics.pendingAmount.toLocaleString('en-IN')}`;
  metricsElements.pendingChange.textContent = `${metrics.pendingChange} customers`;
  metricsElements.totalCustomers.textContent = metrics.totalCustomers.toLocaleString();
  metricsElements.customersChange.textContent = `${metrics.customersChange > 0 ? '+' : ''}${metrics.customersChange} this month`;
  metricsElements.totalClusters.textContent = metrics.totalClusters.toLocaleString();
  metricsElements.clustersChange.textContent = `+${metrics.clustersChange} created`;
  
  // Update change indicators
  updateChangeIndicator(metricsElements.monthlyChange, metrics.monthlyChange > 0);
  updateChangeIndicator(metricsElements.pendingChange, metrics.pendingChange > 0);
}

function updateChangeIndicator(element, isPositive) {
  element.classList.remove('positive', 'negative');
  if (isPositive) {
    element.classList.add('positive');
  } else {
    element.classList.add('negative');
  }
}

function updateClustersDisplay() {
  const container = document.getElementById('clusters-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  dashboardData.clusters.forEach(cluster => {
    const clusterCard = createClusterCard(cluster);
    container.appendChild(clusterCard);
  });
  
  // Update cluster filter
  updateClusterFilter();
}

function createClusterCard(cluster) {
  const card = document.createElement('div');
  card.className = 'cluster-card';
  card.innerHTML = `
    <div class="cluster-header">
      <h3 class="cluster-name">${cluster.name}</h3>
      <div class="cluster-status ${cluster.pendingCount === 0 ? 'status-paid' : 'status-pending'}">
        ${cluster.statusText}
      </div>
    </div>
    <div class="cluster-stats">
      <div class="stat-item">
        <div class="stat-label">Customers</div>
        <div class="stat-value">${cluster.customerCount}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Paid</div>
        <div class="stat-value paid">${cluster.paidCount}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Pending</div>
        <div class="stat-value pending">${cluster.pendingCount}</div>
      </div>
    </div>
    <div class="cluster-actions">
      <button class="btn btn-sm btn-ghost" onclick="viewCluster('${cluster._id}')">View Details</button>
      <button class="btn btn-sm btn-primary" onclick="addCustomerToCluster('${cluster._id}')">Add Customer</button>
    </div>
  `;
  
  card.addEventListener('click', () => viewCluster(cluster._id));
  return card;
}

function updateCustomersDisplay() {
  const tbody = document.getElementById('customers-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  dashboardData.customers.forEach(customer => {
    const row = createCustomerRow(customer);
    tbody.appendChild(row);
  });
}

function createCustomerRow(customer) {
  const row = document.createElement('tr');
  row.className = `customer-row ${customer.status === 'overdue' ? 'overdue' : ''}`;
  row.innerHTML = `
    <td class="customer-name">${customer.name}</td>
    <td class="customer-phone">${customer.phone}</td>
    <td class="customer-amount">₹${customer.amount.toLocaleString('en-IN')}</td>
    <td class="customer-date">${customer.dueDate}</td>
    <td class="customer-status">
      <span class="status-badge status-${customer.status}">${customer.status.toUpperCase()}</span>
    </td>
    <td class="customer-cluster">${customer.clusterName || 'General'}</td>
    <td class="customer-actions">
      <button class="btn btn-sm btn-ghost" onclick="editCustomer('${customer._id}')">Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${customer._id}')">Delete</button>
    </td>
  `;
  return row;
}

function updateClusterFilter() {
  const filter = document.getElementById('cluster-filter');
  if (!filter) return;
  
  // Clear existing options
  filter.innerHTML = '<option value="">All Clusters</option>';
  
  // Add clusters
  dashboardData.clusters.forEach(cluster => {
    const option = document.createElement('option');
    option.value = cluster._id;
    option.textContent = cluster.name;
    filter.appendChild(option);
  });
}

function initializeChart() {
  const ctx = document.getElementById('payment-chart');
  if (!ctx) return;
  
  paymentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Daily Collections',
        data: [],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + value.toLocaleString('en-IN');
            }
          }
        }
      }
    }
  });
  
  updateChart();
}

function updateChart() {
  if (!paymentChart) return;
  
  const period = document.querySelector('.chart-btn.active')?.dataset.period || 'daily';
  const data = dashboardData.chartData[period] || [];
  
  paymentChart.data.labels = data.map(item => item.label);
  paymentChart.data.datasets[0].data = data.map(item => item.value);
  paymentChart.update();
}

function handleChartPeriodChange(e) {
  const period = e.target.dataset.period;
  
  // Update active button
  document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
  e.target.classList.add('active');
  
  updateChart();
}

// Modal Functions
function showCreateClusterModal() {
  document.getElementById('create-cluster-modal').classList.remove('hidden');
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
  document.getElementById('modal-backdrop').classList.add('hidden');
}

async function createCluster() {
  const form = document.getElementById('create-cluster-form');
  const formData = new FormData(form);
  
  const data = {
    name: formData.get('name'),
    description: formData.get('description'),
    businessApplicationId: getBusinessApplicationId()
  };
  
  try {
    const response = await fetch(`${apiBase()}/api/clusters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getLicenseKey()}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (result.success) {
      showNotice('Cluster created successfully!', 'success');
      hideModal('create-cluster-modal');
      loadClusters();
    } else {
      showNotice(result.message || 'Failed to create cluster', 'error');
    }
  } catch (error) {
    console.error('Cluster creation error:', error);
    showNotice('Network error. Please try again.', 'error');
  }
}

function viewCluster(clusterId) {
  dashboardData.selectedCluster = clusterId;
  // Load cluster details and show customers
  loadClusterCustomers(clusterId);
}

async function loadClusterCustomers(clusterId) {
  try {
    const response = await fetch(`${apiBase()}/api/clusters/${clusterId}`, {
      headers: {
        'Authorization': `Bearer ${getLicenseKey()}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      // Update customers display with filtered data
      const tbody = document.getElementById('customers-tbody');
      tbody.innerHTML = '';
      
      result.cluster.customers.forEach(customer => {
        const row = createCustomerRow(customer);
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Cluster customers load error:', error);
  }
}

// User Management Functions
function showEditProfileModal() {
  showNotice('Edit profile feature - update your business information and contact details', 'info');
}

function showManageAccountModal() {
  showNotice('Account management - view subscription details, billing information, and usage statistics', 'info');
}

function showSettingsModal() {
  showNotice('Settings - configure notifications, preferences, and security options', 'info');
}

function logout() {
  localStorage.removeItem('dhanra_session_v1');
  window.location.href = 'index.html';
}

// Utility Functions
function getLicenseKey() {
  return localStorage.getItem('dhanra_session_v1') || '';
}

function getBusinessApplicationId() {
  // This would come from user session after login
  return localStorage.getItem('businessApplicationId') || '';
}

function showVerificationScreen() {
  // Redirect to onboarding verification screen
  window.location.href = 'onboarding.html';
}

function showNotice(message, type = 'info') {
  const noticeContainer = document.getElementById('notice-container');
  const notice = document.createElement('div');
  notice.className = `notice notice-${type}`;
  notice.innerHTML = `
    <div class="notice-content">
      <span class="notice-message">${message}</span>
      <button class="notice-close" onclick="this.parentElement.remove()">×</button>
    </div>
  `;
  
  noticeContainer.appendChild(notice);
  
  setTimeout(() => {
    if (notice.parentElement) {
      notice.remove();
    }
  }, 5000);
}

function apiBase() {
  return import.meta.env?.VITE_API_BASE_URL || "https://dhanra-backend.onrender.com";
}

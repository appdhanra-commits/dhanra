// Simple JavaScript for Dhanra application
// Basic functionality without complex modules

// Demo button functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dhanra app loaded');
    
        
    // Form submission
    const licenseForm = document.getElementById('license-form');
    if (licenseForm) {
        licenseForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Form submitted');
            alert('License request submitted! This is a demo - in production this would send to your database.');
        });
    }
    
    // Tab switching
    const modeRequest = document.getElementById('mode-request');
    const modeVerify = document.getElementById('mode-verify');
    const requestFields = document.getElementById('request-fields');
    const verifyFields = document.getElementById('verify-fields');
    
    if (modeRequest && modeVerify) {
        modeRequest.addEventListener('click', function() {
            modeRequest.classList.add('is-active');
            modeVerify.classList.remove('is-active');
            if (requestFields) requestFields.hidden = false;
            if (verifyFields) verifyFields.hidden = true;
        });
        
        modeVerify.addEventListener('click', function() {
            modeVerify.classList.add('is-active');
            modeRequest.classList.remove('is-active');
            if (requestFields) requestFields.hidden = true;
            if (verifyFields) verifyFields.hidden = false;
        });
    }
    
    // Admin link
    const adminLinks = document.querySelectorAll('a[href*="admin.html"]');
    adminLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            window.open('./admin.html', '_blank');
        });
    });
    
    // Add customer button
    const addCustomerBtn = document.getElementById('btn-add-customer');
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', function() {
            showAddCustomerModal();
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterCustomers();
        });
    }
    
    // Filter dropdown
    const filterSelect = document.getElementById('filter-status');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            filterCustomers();
        });
    }
    
    // Navigation buttons
    const navButtons = document.querySelectorAll('[data-nav]');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const nav = this.getAttribute('data-nav');
            setActiveNav(nav);
        });
    });
    
    // User dropdown menu
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            userDropdown.parentElement.setAttribute('aria-expanded', !isExpanded);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userMenuBtn.setAttribute('aria-expanded', 'false');
                userDropdown.parentElement.setAttribute('aria-expanded', 'false');
            }
        });
    }
    
    // Profile management buttons
    const editProfileBtn = document.getElementById('btn-edit-profile');
    const manageAccountBtn = document.getElementById('btn-manage-account');
    const settingsBtn = document.getElementById('btn-settings');
    const logoutBtn = document.getElementById('btn-logout');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            showEditProfileModal();
        });
    }
    
    if (manageAccountBtn) {
        manageAccountBtn.addEventListener('click', function() {
            showManageAccountModal();
        });
    }
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            showSettingsModal();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
    
    console.log('All event listeners attached');
});


// Add customer modal function
function showAddCustomerModal() {
    showNotice('Add customer feature - please use the license request form to get access', 'warning');
}

// Filter customers function
function filterCustomers() {
    const searchInput = document.getElementById('search');
    const filterSelect = document.getElementById('filter-status');
    const tbody = document.getElementById('customers-tbody');
    
    if (!tbody) return;
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const statusFilter = filterSelect ? filterSelect.value : 'all';
    
    const rows = tbody.getElementsByTagName('tr');
    
    for (let row of rows) {
        const name = row.cells[0].textContent.toLowerCase();
        const phone = row.cells[1].textContent;
        const statusElement = row.cells[4].querySelector('.pill');
        const status = statusElement ? statusElement.textContent.toLowerCase() : '';
        
        const matchesSearch = name.includes(searchTerm) || phone.includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || status === statusFilter;
        
        row.style.display = matchesSearch && matchesStatus ? '' : 'none';
    }
}

// Set active navigation
function setActiveNav(nav) {
    const navButtons = document.querySelectorAll('[data-nav]');
    navButtons.forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-nav') === nav);
    });
    
    // Update page title
    const pageTitle = document.querySelector('.page-title');
    const pageSubtitle = document.querySelector('.page-subtitle');
    
    if (nav === 'customers') {
        if (pageTitle) pageTitle.textContent = 'Customers';
        if (pageSubtitle) pageSubtitle.textContent = 'Manage customer entries and due dates.';
    } else {
        if (pageTitle) pageTitle.textContent = 'Dashboard';
        if (pageSubtitle) pageSubtitle.textContent = 'Track collections and follow up faster.';
    }
}

// Profile management functions
function showEditProfileModal() {
    showNotice('Edit profile feature - update your business information and contact details', 'info');
}

function showManageAccountModal() {
    showNotice('Account management - view subscription details, billing information, and usage statistics', 'info');
}

function showSettingsModal() {
    showNotice('Settings - configure notifications, preferences, and security options', 'info');
}

// Logout function
function logout() {
    // Show auth view, hide dashboard
    const authView = document.getElementById('view-auth');
    const dashboardView = document.getElementById('view-dashboard');
    
    if (authView) authView.setAttribute('aria-hidden', 'false');
    if (dashboardView) dashboardView.setAttribute('aria-hidden', 'true');
    
    showNotice('Logged out successfully', 'success');
}

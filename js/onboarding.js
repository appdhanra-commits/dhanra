// Clean Step Controller System
let currentStep = 'step-account';
let applicationData = {};

// Block ALL form submits globally
document.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log('Form submit blocked globally');
});

// Controller function for switching steps
function showStep(stepId) {
  console.log('Switching to step:', stepId);
  
  // Hide all steps
  document.querySelectorAll(".onboarding-step").forEach(step => {
    step.style.display = "none";
  });
  
  // Show target step
  const targetStep = document.getElementById(stepId);
  if (targetStep) {
    targetStep.style.display = "block";
    currentStep = stepId;
    console.log('Step displayed:', stepId);
  } else {
    console.error('Step not found:', stepId);
  }
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, setting up clean step system');
  
  // Setup toggle buttons
  setupToggleButtons();
  
  // Setup step navigation buttons
  setupStepButtons();
  
  // Setup payment method toggle
  setupPaymentMethodToggle();
  
  // Setup account validation
  setupAccountValidation();
  
  // Show initial step
  showStep('step-account');
  
  function setupToggleButtons() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', function(e) {
        const mode = e.target.dataset.mode;
        console.log('Toggle mode:', mode);
        
        // Update active state
        toggleBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // Show/hide sections
        const newSetup = document.getElementById('new-setup');
        const existingSetup = document.getElementById('existing-setup');
        const progressSteps = document.getElementById('progress-steps');
        
        if (mode === 'new') {
          newSetup.classList.remove('hidden');
          existingSetup.classList.add('hidden');
          progressSteps.classList.remove('hidden');
        } else {
          newSetup.classList.add('hidden');
          existingSetup.classList.remove('hidden');
          progressSteps.classList.add('hidden');
        }
      });
    });
  }
  
  function setupStepButtons() {
    // Account to Profile button
    const proceedProfileBtn = document.getElementById('proceed-profile');
    if (proceedProfileBtn) {
      proceedProfileBtn.addEventListener('click', () => {
        if (validateAccountForm()) {
          showStep('step-profile');
        }
      });
    }
    
    // Profile to Verification button
    const proceedVerificationBtn = document.getElementById('proceed-verification');
    if (proceedVerificationBtn) {
      proceedVerificationBtn.addEventListener('click', () => {
        if (validateProfileForm()) {
          showStep('step-verification');
        }
      });
    }
    
    // Back to Account button
    const backAccountBtn = document.getElementById('back-account');
    if (backAccountBtn) {
      backAccountBtn.addEventListener('click', () => {
        showStep('step-account');
      });
    }
    
    // Access Dashboard button
    const accessDashboardBtn = document.getElementById('access-dashboard');
    if (accessDashboardBtn) {
      accessDashboardBtn.addEventListener('click', () => {
        if (validateLicenseForm()) {
          // Store license and redirect
          const licenseKey = document.getElementById('license-key').value;
          const email = document.getElementById('login-email').value;
          
          localStorage.setItem('dhanra_session_v1', licenseKey);
          localStorage.setItem('dhanra_user_email', email);
          
          console.log('Redirecting to dashboard...');
          window.location.href = 'dashboard.html';
        }
      });
    }
    
    // Progress step clicks
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach(step => {
      step.addEventListener('click', function(e) {
        const targetStep = e.currentTarget.dataset.step;
        const stepMap = {
          '1': 'step-account',
          '2': 'step-profile', 
          '3': 'step-verification'
        };
        
        if (stepMap[targetStep]) {
          showStep(stepMap[targetStep]);
        }
      });
    });
  }
  
  function setupPaymentMethodToggle() {
    const payoutRadios = document.querySelectorAll('input[name="payoutMethod"]');
    payoutRadios.forEach(radio => {
      radio.addEventListener('change', function(e) {
        const method = e.target.value;
        const upiField = document.getElementById('upi-field');
        const bankFields = document.getElementById('bank-fields');
        const bankIfscField = document.getElementById('bank-ifsc-field');
        
        if (method === 'upi') {
          upiField.classList.remove('hidden');
          bankFields.classList.add('hidden');
          bankIfscField.classList.add('hidden');
        } else {
          upiField.classList.add('hidden');
          bankFields.classList.remove('hidden');
          bankIfscField.classList.remove('hidden');
        }
      });
    });
  }
  
  function setupAccountValidation() {
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const proceedBtn = document.getElementById('proceed-profile');
    
    function validateAndUpdate() {
      const isValid = validateAccountForm();
      if (proceedBtn) {
        proceedBtn.disabled = !isValid;
      }
    }
    
    // Add input listeners
    if (emailInput) emailInput.addEventListener('input', validateAndUpdate);
    if (phoneInput) phoneInput.addEventListener('input', validateAndUpdate);
    if (passwordInput) passwordInput.addEventListener('input', validateAndUpdate);
    if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', validateAndUpdate);
    
    // Initial validation
    validateAndUpdate();
  }
  
  function validateAccountForm() {
    const email = document.getElementById('email')?.value?.trim() || '';
    const phone = document.getElementById('phone')?.value?.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailValid = emailRegex.test(email);
    
    // Phone validation
    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    const phoneValid = phoneRegex.test(phone.replace(/\s/g, ''));
    
    // Password validation
    const passwordValid = password.length >= 6;
    const passwordsMatch = password === confirmPassword;
    
    const isValid = emailValid && phoneValid && passwordValid && passwordsMatch;
    
    console.log('Account validation:', { emailValid, phoneValid, passwordValid, passwordsMatch, isValid });
    
    return isValid;
  }
  
  function validateProfileForm() {
    const fullName = document.getElementById('fullName')?.value?.trim() || '';
    const address = document.getElementById('address')?.value?.trim() || '';
    const businessType = document.getElementById('businessType')?.value || '';
    const payoutMethod = document.querySelector('input[name="payoutMethod"]:checked')?.value || '';
    
    if (!fullName || !address || !businessType) {
      console.log('Profile validation failed: missing required fields');
      return false;
    }
    
    if (payoutMethod === 'upi') {
      const upiId = document.getElementById('upiId')?.value?.trim() || '';
      if (!upiId) {
        console.log('Profile validation failed: missing UPI ID');
        return false;
      }
    } else if (payoutMethod === 'bank') {
      const accountNumber = document.getElementById('bankAccountNumber')?.value?.trim() || '';
      const ifsc = document.getElementById('bankIfsc')?.value?.trim() || '';
      if (!accountNumber || !ifsc) {
        console.log('Profile validation failed: missing bank details');
        return false;
      }
    }
    
    console.log('Profile validation passed');
    return true;
  }
  
  function validateLicenseForm() {
    const licenseKey = document.getElementById('license-key')?.value?.trim() || '';
    const email = document.getElementById('login-email')?.value?.trim() || '';
    
    if (!licenseKey || !email) {
      console.log('License validation failed: missing fields');
      return false;
    }
    
    if (!licenseKey.startsWith('DHANRA-') || licenseKey.length < 15) {
      console.log('License validation failed: invalid license key');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('License validation failed: invalid email');
      return false;
    }
    
    console.log('License validation passed');
    return true;
  }
});

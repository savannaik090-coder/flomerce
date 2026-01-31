
/**
 * Logout Confirmation Modal
 * Provides a styled confirmation dialog before logout
 */

window.LogoutConfirmation = (function() {
  let modal = null;

  /**
   * Create the confirmation modal HTML
   */
  function createModal() {
    if (modal) return modal;

    const modalHTML = `
      <div id="logout-confirmation-modal" class="logout-modal" style="display: none;">
        <div class="logout-modal-overlay" onclick="closeModal()"></div>
        <div class="logout-modal-content">
          <div class="logout-modal-header">
            <h3>Confirm Logout</h3>
          </div>
          <div class="logout-modal-body">
            <p>Are you sure you want to log out of your account?</p>
          </div>
          <div class="logout-modal-footer">
            <button type="button" class="logout-btn logout-btn-secondary" onclick="LogoutConfirmation.closeModal()">Cancel</button>
            <button type="button" class="logout-btn logout-btn-primary" onclick="LogoutConfirmation.confirmLogout()">Log Out</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('logout-confirmation-modal');

    // Add styles
    addModalStyles();

    return modal;
  }

  /**
   * Add CSS styles for the modal
   */
  function addModalStyles() {
    if (document.getElementById('logout-modal-styles')) return;

    const styles = `
      <style id="logout-modal-styles">
        .logout-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10000;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .logout-modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .logout-modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          max-width: 400px;
          width: 90%;
          position: relative;
          z-index: 1;
          overflow: hidden;
        }

        .logout-modal-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid #f0f0f0;
        }

        .logout-modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #333;
          font-family: 'Lato', sans-serif;
        }

        .logout-modal-body {
          padding: 20px 24px;
        }

        .logout-modal-body p {
          margin: 0;
          color: #666;
          line-height: 1.5;
          font-family: 'Lato', sans-serif;
        }

        .logout-modal-footer {
          padding: 16px 24px 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .logout-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          font-family: 'Lato', sans-serif;
          transition: all 0.2s ease;
          min-width: 80px;
        }

        .logout-btn-secondary {
          background: #f8f9fa;
          color: #6c757d;
          border: 1px solid #dee2e6;
        }

        .logout-btn-secondary:hover {
          background: #e9ecef;
          color: #495057;
        }

        .logout-btn-primary {
          background: #dc3545;
          color: white;
        }

        .logout-btn-primary:hover {
          background: #c82333;
        }

        .logout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .logout-modal-content {
            margin: 20px;
            width: calc(100% - 40px);
          }
          
          .logout-modal-footer {
            flex-direction: column-reverse;
          }
          
          .logout-btn {
            width: 100%;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  /**
   * Show the logout confirmation modal
   */
  function showModal() {
    createModal();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus on cancel button by default
    setTimeout(() => {
      const cancelBtn = modal.querySelector('.logout-btn-secondary');
      if (cancelBtn) cancelBtn.focus();
    }, 100);
  }

  /**
   * Close the modal
   */
  function closeModal() {
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  /**
   * Handle logout confirmation
   */
  async function confirmLogout() {
    const logoutBtn = modal.querySelector('.logout-btn-primary');
    const cancelBtn = modal.querySelector('.logout-btn-secondary');
    
    // Disable buttons during logout
    logoutBtn.disabled = true;
    cancelBtn.disabled = true;
    logoutBtn.textContent = 'Logging out...';

    try {
      // Use FirebaseAuth with skipConfirmation = true since we already confirmed
      const result = await FirebaseAuth.logoutUser(true);
      
      if (result.success) {
        closeModal();
        // Redirect to home page or login page
        window.location.href = '/';
      } else {
        alert('Logout failed. Please try again.');
        // Re-enable buttons
        logoutBtn.disabled = false;
        cancelBtn.disabled = false;
        logoutBtn.textContent = 'Log Out';
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('An error occurred during logout. Please try again.');
      // Re-enable buttons
      logoutBtn.disabled = false;
      cancelBtn.disabled = false;
      logoutBtn.textContent = 'Log Out';
    }
  }

  /**
   * Initialize logout confirmation for any logout buttons
   */
  function initLogoutButtons() {
    // Only find buttons with explicit logout data attribute
    const logoutButtons = document.querySelectorAll('[data-logout]');
    
    logoutButtons.forEach(button => {
      // Check if event listener is already attached
      if (!button.hasAttribute('data-logout-handler-attached')) {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          showModal();
        });
        button.setAttribute('data-logout-handler-attached', 'true');
      }
    });

    // Only handle logout links that explicitly contain "log out" and are not login related
    const logoutLinks = document.querySelectorAll('a');
    logoutLinks.forEach(link => {
      const linkText = link.textContent.toLowerCase().trim();
      const linkHref = link.getAttribute('href') || '';
      
      // Only attach to links that explicitly say "log out" and are not login/signup related
      if ((linkText === 'log out' || linkText === 'logout' || linkText === 'sign out') && 
          !linkHref.includes('login') && 
          !linkHref.includes('signup') &&
          !link.hasAttribute('data-logout-handler-attached')) {
        
        link.addEventListener('click', function(e) {
          e.preventDefault();
          showModal();
        });
        link.setAttribute('data-logout-handler-attached', 'true');
      }
    });
  }

  // Only initialize when explicitly called or on specific pages
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Only auto-initialize on profile page or pages that definitely have logout functionality
      if (window.location.pathname.includes('profile.html') || 
          document.querySelector('[data-logout]')) {
        initLogoutButtons();
      }
    });
  } else {
    // Only auto-initialize on profile page or pages that definitely have logout functionality
    if (window.location.pathname.includes('profile.html') || 
        document.querySelector('[data-logout]')) {
      initLogoutButtons();
    }
  }

  // Expose public methods
  return {
    showModal,
    closeModal,
    confirmLogout,
    initLogoutButtons
  };
})();

// Global functions for onclick handlers
window.closeLogoutModal = function() {
  LogoutConfirmation.closeModal();
};

window.confirmLogout = function() {
  LogoutConfirmation.confirmLogout();
};

// Authentication utilities for GreekGeek web application

// Check if user is authenticated
function isAuthenticated() {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    try {
        // Decode JWT token to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        return payload.exp > currentTime;
    } catch (error) {
        console.error('Error parsing token:', error);
        return false;
    }
}

// Get current user info from token
function getCurrentUser() {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            user_id: payload.user_id,
            username: payload.username,
            exp: payload.exp
        };
    } catch (error) {
        console.error('Error parsing token:', error);
        return null;
    }
}

// Refresh access token
async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        logout();
        return false;
    }
    
    try {
        const response = await fetch('/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: refreshToken
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access);
            return true;
        } else {
            logout();
            return false;
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        logout();
        return false;
    }
}

// Make authenticated API request
async function apiRequest(url, options = {}) {
    let token = localStorage.getItem('access_token');
    
    // Check if token is expired and try to refresh
    if (!isAuthenticated()) {
        const refreshed = await refreshToken();
        if (!refreshed) {
            throw new Error('Authentication required');
        }
        token = localStorage.getItem('access_token');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (response.status === 401) {
            // Try to refresh token once more
            const refreshed = await refreshToken();
            if (refreshed) {
                finalOptions.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                return await fetch(url, finalOptions);
            } else {
                throw new Error('Authentication failed');
            }
        }
        
        return response;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    updateNavbar();
    
    // Redirect to home page to show login/register options
    window.location.href = '/';
}

// Update navbar based on authentication status
function updateNavbar() {
    const navbarAuth = document.getElementById('navbar-auth');
    if (!navbarAuth) return;
    
    if (isAuthenticated()) {
        // Fetch user info from API to display name
        fetchUserInfo().then(userData => {
            const displayName = userData ? `${userData.first_name} ${userData.last_name}` : 'User';
            navbarAuth.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-user me-1"></i>${displayName}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/">
                            <i class="fas fa-home me-2"></i>Dashboard
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="logout()">
                            <i class="fas fa-sign-out-alt me-2"></i>Logout
                        </a></li>
                    </ul>
                </li>
            `;
        }).catch(error => {
            console.error('Error fetching user info for navbar:', error);
            navbarAuth.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-user me-1"></i>User
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/">
                            <i class="fas fa-home me-2"></i>Dashboard
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="logout()">
                            <i class="fas fa-sign-out-alt me-2"></i>Logout
                        </a></li>
                    </ul>
                </li>
            `;
        });
    } else {
        navbarAuth.innerHTML = `
            <li class="nav-item">
                <a class="nav-link" href="/login/">
                    <i class="fas fa-sign-in-alt me-1"></i>Admin Sign In
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/register/">
                    <i class="fas fa-plus me-1"></i>Start Free Trial
                </a>
            </li>
        `;
    }
}

// Fetch user info for navbar display
async function fetchUserInfo() {
    try {
        const response = await apiRequest('/api/dashboard/');
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
    }
}

// Verify user is admin with org after login
async function verifyAdminStatus() {
    try {
        const response = await apiRequest('/api/dashboard/');
        if (response.ok) {
            const userData = await response.json();
            
            // Check if user is staff (admin) and has an org
            if (!userData.is_staff) {
                showNotification('Access denied. Admin privileges required.', 'danger');
                logout();
                return false;
            }
            
            if (!userData.org) {
                showNotification('Access denied. You must belong to an organization.', 'danger');
                logout();
                return false;
            }
            
            return true;
        } else {
            logout();
            return false;
        }
    } catch (error) {
        console.error('Error verifying admin status:', error);
        logout();
        return false;
    }
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // If user is authenticated, verify admin status
    if (isAuthenticated()) {
        verifyAdminStatus().then(isValidAdmin => {
            if (isValidAdmin) {
                updateNavbar();
            }
            // If not valid admin, verifyAdminStatus will handle logout
        });
    } else {
        updateNavbar();
    }
    
    // Set up periodic token refresh (every 30 minutes)
    setInterval(() => {
        if (isAuthenticated()) {
            refreshToken();
        }
    }, 30 * 60 * 1000);
});

// Global error handler for authentication errors
window.addEventListener('error', function(event) {
    if (event.error && event.error.message === 'Authentication required') {
        logout();
    }
});

// Utility function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
} 
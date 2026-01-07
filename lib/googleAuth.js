// Separate Google OAuth for Classroom API access with Incremental Consent
// This works alongside Firebase Auth

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Define scope sets for incremental consent
const SCOPE_SETS = {
  // Minimal scopes requested at initial signup
  BASIC: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
  ],
  
  // Profile access only (for viewing teacher names, emails, photos)
  CLASSROOM_PROFILE: [
    'https://www.googleapis.com/auth/classroom.profile.emails',
    'https://www.googleapis.com/auth/classroom.profile.photos',
    'https://www.googleapis.com/auth/classroom.rosters.readonly'
  ],
  
  // Classroom basic read scopes (requested when first accessing dashboard)
  CLASSROOM_BASIC: [
    'https://www.googleapis.com/auth/classroom.profile.emails',
    'https://www.googleapis.com/auth/classroom.profile.photos',
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me',
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
    'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly'
  ],
  
  // Drive access (requested when attaching files in Study Assist)
  DRIVE: [
    'https://www.googleapis.com/auth/drive.readonly'
  ],
  
  // Gmail send (if needed for emailing teachers directly)
  GMAIL: [
    'https://www.googleapis.com/auth/gmail.send'
  ]
};

// Storage keys for tracking granted scopes
const STORAGE_KEYS = {
  TOKEN: 'google_classroom_token',
  EXPIRY: 'google_classroom_token_expiry',
  GRANTED_SCOPES: 'google_granted_scopes'
};

class GoogleClassroomAuth {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
    this.grantedScopes = new Set();
    this.loadGrantedScopes();
  }

  // Load previously granted scopes from storage
  loadGrantedScopes() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GRANTED_SCOPES);
      if (stored) {
        this.grantedScopes = new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading granted scopes:', error);
    }
  }

  // Save granted scopes to storage
  saveGrantedScopes() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(
        STORAGE_KEYS.GRANTED_SCOPES,
        JSON.stringify([...this.grantedScopes])
      );
    } catch (error) {
      console.error('Error saving granted scopes:', error);
    }
  }

  // Check if a specific scope set is granted
  hasScopeSet(scopeSetName) {
    const requiredScopes = SCOPE_SETS[scopeSetName];
    if (!requiredScopes) return false;
    
    return requiredScopes.every(scope => this.grantedScopes.has(scope));
  }

  // Get all scopes that should be requested (Basic + any additional)
  getScopesToRequest(additionalScopeSets = []) {
    const scopes = [...SCOPE_SETS.BASIC];
    
    additionalScopeSets.forEach(scopeSetName => {
      if (SCOPE_SETS[scopeSetName]) {
        scopes.push(...SCOPE_SETS[scopeSetName]);
      }
    });
    
    // Remove duplicates
    return [...new Set(scopes)];
  }

  // Initialize Google Identity Services
  async initialize() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google Identity Services only works in browser'));
        return;
      }

      // Load Google Identity Services
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          this.setupTokenClient();
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      } else {
        this.setupTokenClient();
        resolve();
      }
    });
  }

  setupTokenClient() {
    // Check if Google Client ID is available
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not found in environment variables');
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      console.error('Google Identity Services not properly loaded');
      return;
    }

    // Note: We'll create token clients dynamically per request now
    console.log('Google Identity Services initialized for incremental consent');
  }

  // Request specific scopes with incremental consent
  async requestScopes(scopeSets = ['BASIC'], forcePrompt = false) {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      await this.initialize();
    }

    const scopesToRequest = this.getScopesToRequest(scopeSets);
    console.log('Requesting scopes:', scopeSets, 'Total scopes:', scopesToRequest);

    return new Promise((resolve, reject) => {
      // Check if we have a valid stored token first
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const tokenExpiry = localStorage.getItem(STORAGE_KEYS.EXPIRY);
      
      // If we have a valid token and all required scopes, return it
      if (!forcePrompt && storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        const hasAllScopes = scopeSets.every(set => this.hasScopeSet(set));
        if (hasAllScopes) {
          this.accessToken = storedToken;
          resolve(storedToken);
          return;
        }
      }

      // Determine if we need a consent prompt
      // We need consent if:
      // 1. Force prompt is requested, OR
      // 2. No stored token exists, OR
      // 3. We're requesting new scopes that haven't been granted yet
      const needsNewScopes = scopeSets.some(set => !this.hasScopeSet(set));
      const shouldPrompt = forcePrompt || !storedToken || needsNewScopes;

      console.log('OAuth prompt decision:', {
        forcePrompt,
        hasStoredToken: !!storedToken,
        needsNewScopes,
        shouldPrompt,
        requestingScopeSets: scopeSets
      });

      // Create a new token client for the specific scopes
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: scopesToRequest.join(' '),
          include_granted_scopes: true, // Key for incremental consent!
          callback: (tokenResponse) => {
            if (tokenResponse.error) {
              console.error('Token request error:', tokenResponse.error);
              reject(new Error(tokenResponse.error));
              return;
            }
            
            this.accessToken = tokenResponse.access_token;
            
            // Store token
            localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
            const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
            localStorage.setItem(STORAGE_KEYS.EXPIRY, expiryTime.toString());
            
            // Update granted scopes
            scopesToRequest.forEach(scope => this.grantedScopes.add(scope));
            this.saveGrantedScopes();
            
            console.log('Successfully obtained access token with scopes:', scopeSets);
            resolve(tokenResponse.access_token);
          }
        });

        // Request token with proper prompt setting
        tokenClient.requestAccessToken({
          prompt: shouldPrompt ? 'consent' : ''
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Convenience method for initial Classroom access
  async requestAccessToken(forcePrompt = false) {
    // Always show consent for initial Classroom access to ensure fresh token
    // This prevents issues with stale tokens that claim to have scopes but don't
    console.log('requestAccessToken called with forcePrompt:', forcePrompt);
    
    // If not forcing and we think we have the scopes, verify by checking token validity
    if (!forcePrompt && this.hasScopeSet('CLASSROOM_BASIC')) {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const tokenExpiry = localStorage.getItem(STORAGE_KEYS.EXPIRY);
      if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        console.log('Using existing valid token with Classroom scopes');
        return storedToken;
      }
    }
    
    // Clear potentially stale scope data before requesting
    console.log('Clearing stale scope data and requesting fresh Classroom access...');
    this.grantedScopes.clear();
    this.saveGrantedScopes();
    
    return this.requestScopes(['CLASSROOM_BASIC'], true);
  }

  // Request profile access only (for viewing teacher info)
  async requestProfileAccess(forcePrompt = false) {
    console.log('requestProfileAccess called, current CLASSROOM_PROFILE scope status:', this.hasScopeSet('CLASSROOM_PROFILE'));
    
    if (!forcePrompt && this.hasScopeSet('CLASSROOM_PROFILE')) {
      console.log('Profile scope already granted, returning existing token');
      return this.getAccessToken();
    }
    
    console.log('Profile scope not granted or forcing prompt, requesting new scopes...');
    return this.requestScopes(['CLASSROOM_PROFILE'], true);
  }

  // Request Drive access incrementally
  async requestDriveAccess() {
    console.log('requestDriveAccess called, current DRIVE scope status:', this.hasScopeSet('DRIVE'));
    
    if (this.hasScopeSet('DRIVE')) {
      console.log('Drive scope already granted, returning existing token');
      return this.getAccessToken();
    }
    
    console.log('Drive scope not granted, requesting new scopes...');
    return this.requestScopes(['CLASSROOM_BASIC', 'DRIVE'], false);
  }

  // Request Gmail access incrementally
  async requestGmailAccess() {
    console.log('requestGmailAccess called, current GMAIL scope status:', this.hasScopeSet('GMAIL'));
    
    if (this.hasScopeSet('GMAIL')) {
      console.log('Gmail scope already granted, returning existing token');
      return this.getAccessToken();
    }
    
    console.log('Gmail scope not granted, requesting new scopes...');
    return this.requestScopes(['CLASSROOM_BASIC', 'GMAIL'], false);
  }

  // Check if user has granted Classroom permissions
  hasValidToken() {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const tokenExpiry = localStorage.getItem(STORAGE_KEYS.EXPIRY);
      
      return storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry);
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  }

  // Get current access token
  getAccessToken() {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    
    try {
      return this.accessToken || localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Revoke access token
  revokeToken() {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken);
    }
    
    this.accessToken = null;
    this.grantedScopes.clear();
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.GRANTED_SCOPES);
  }

  // Clear all OAuth state (useful for debugging/resetting)
  clearOAuthState() {
    console.log('Clearing all OAuth state...');
    this.accessToken = null;
    this.grantedScopes.clear();
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.EXPIRY);
      localStorage.removeItem(STORAGE_KEYS.GRANTED_SCOPES);
    }
    console.log('OAuth state cleared');
  }
}

export default GoogleClassroomAuth;
export { SCOPE_SETS };

// Debug helper - can be called from browser console
if (typeof window !== 'undefined') {
  window.debugGoogleAuth = {
    clearOAuthState: () => {
      localStorage.removeItem('google_classroom_token');
      localStorage.removeItem('google_classroom_token_expiry');
      localStorage.removeItem('google_granted_scopes');
      console.log('✅ OAuth state cleared. Refresh the page and try again.');
    },
    showStoredScopes: () => {
      const scopes = localStorage.getItem('google_granted_scopes');
      const token = localStorage.getItem('google_classroom_token');
      const expiry = localStorage.getItem('google_classroom_token_expiry');
      console.log('Stored OAuth State:');
      console.log('- Token exists:', !!token);
      console.log('- Token expiry:', expiry ? new Date(parseInt(expiry)).toLocaleString() : 'N/A');
      console.log('- Granted scopes:', scopes ? JSON.parse(scopes) : []);
    }
  };
  console.log('🔧 Debug helpers available: window.debugGoogleAuth.clearOAuthState() and window.debugGoogleAuth.showStoredScopes()');
}

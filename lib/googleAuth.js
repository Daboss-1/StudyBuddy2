// Separate Google OAuth for Classroom API access
// This works alongside Firebase Auth

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID; // You'll need this from Google Cloud Console

// Full scopes for personal accounts
const FULL_SCOPES = [
  // Basic profile scopes (required for user authentication)
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/classroom.profile.photos',

  // Classroom API scopes
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

// Minimal scopes that might work for Workspace accounts
const MINIMAL_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Default to full scopes
const CLASSROOM_SCOPES = FULL_SCOPES;

class GoogleClassroomAuth {
  constructor() {
    this.tokenClient = null;
    this.accessToken = null;
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

    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: CLASSROOM_SCOPES.join(' '),
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Token response error:', tokenResponse.error);
            return;
          }
          
          this.accessToken = tokenResponse.access_token;
          console.log('Got access token for Classroom API');
          
          // Store token securely (optional)
          localStorage.setItem('google_classroom_token', tokenResponse.access_token);
          
          // Store expiry time
          const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
          localStorage.setItem('google_classroom_token_expiry', expiryTime.toString());
        },
      });
    } catch (error) {
      console.error('Error initializing token client:', error);
    }
  }

  // Request access token for Classroom (with fallback for Workspace accounts)
  async requestAccessToken(useMinimalScopes = false, skipPromptIfTokenExists = false) {
    if (!this.tokenClient) {
      await this.initialize();
    }

    const scopesToUse = useMinimalScopes ? MINIMAL_SCOPES : CLASSROOM_SCOPES;
    console.log(`Requesting token with ${useMinimalScopes ? 'minimal' : 'full'} scopes:`, scopesToUse);

    return new Promise((resolve, reject) => {
      // Check if we have a valid stored token (only for full scopes)
      if (!useMinimalScopes) {
        const storedToken = localStorage.getItem('google_classroom_token');
        const tokenExpiry = localStorage.getItem('google_classroom_token_expiry');
        
        if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
          this.accessToken = storedToken;
          resolve(storedToken);
          return;
        }
      }

      // Create a new token client for the specific scopes
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          scope: scopesToUse.join(' '),
          callback: (tokenResponse) => {
            if (tokenResponse.error) {
              if (!useMinimalScopes && tokenResponse.error === 'access_denied') {
                // Don't retry with minimal scopes - just reject so user knows they need full access
                console.log('Full scopes denied by user');
                reject(new Error('access_denied'));
                return;
              }
              reject(new Error(tokenResponse.error));
              return;
            }
            
            this.accessToken = tokenResponse.access_token;
            
            // Store token (only for full scopes)
            if (!useMinimalScopes) {
              localStorage.setItem('google_classroom_token', tokenResponse.access_token);
              const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
              localStorage.setItem('google_classroom_token_expiry', expiryTime.toString());
            }
            
            resolve(tokenResponse.access_token);
          }
        });

        // Request token - only show consent prompt if necessary
        tokenClient.requestAccessToken({
          prompt: skipPromptIfTokenExists ? '' : 'consent'
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Helper method for interactive token request
  requestInteractiveToken(resolve, reject) {
    this.tokenClient.callback = (tokenResponse) => {
      if (tokenResponse.error) {
        reject(new Error(tokenResponse.error));
        return;
      }
      
      this.accessToken = tokenResponse.access_token;
      
      // Store token
      localStorage.setItem('google_classroom_token', tokenResponse.access_token);
      const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
      localStorage.setItem('google_classroom_token_expiry', expiryTime.toString());
      
      console.log('Successfully obtained Classroom access token via user interaction');
      resolve(tokenResponse.access_token);
    };

    this.tokenClient.requestAccessToken({
      prompt: 'consent'
    });
  }

  // Check if user has granted Classroom permissions
  hasValidToken() {
    // Check if we're in browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    
    try {
      const storedToken = localStorage.getItem('google_classroom_token');
      const tokenExpiry = localStorage.getItem('google_classroom_token_expiry');
      
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
      return this.accessToken || localStorage.getItem('google_classroom_token');
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
    localStorage.removeItem('google_classroom_token');
    localStorage.removeItem('google_classroom_token_expiry');
  }
}

export default GoogleClassroomAuth;

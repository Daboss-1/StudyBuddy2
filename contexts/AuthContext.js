import { createContext, useContext, useEffect, useState } from 'react';
import { createUser, getUser } from '../lib/firestore';
import GoogleClassroomAuth from '../lib/googleAuth';
import classroomCache from '../lib/classroomCache';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classroomAuth] = useState(new GoogleClassroomAuth());
  const [hasClassroomAccess, setHasClassroomAccess] = useState(false);
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const [hasBeenPromptedForClassroom, setHasBeenPromptedForClassroom] = useState(false);

  // Check for existing classroom token on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load prompt status from localStorage
      const promptedBefore = localStorage.getItem('classroom_auth_prompted') === 'true';
      setHasBeenPromptedForClassroom(promptedBefore);
      
      const checkToken = () => {
        const hasToken = classroomAuth.hasValidToken();
        const previousState = hasClassroomAccess;
        
        setHasClassroomAccess(hasToken);
        
        // If token became invalid, notify user
        if (previousState && !hasToken && user) {
          console.log('Classroom token expired, showing re-auth prompt');
          // You could show a notification or modal here
        }
        
        console.log('Classroom token check:', hasToken ? 'Valid' : 'Invalid/Expired');
      };
      
      // Check immediately
      checkToken();
      
      // Check periodically to handle token expiry
      const tokenCheckInterval = setInterval(checkToken, 30000); // Check every 30 seconds
      
      return () => clearInterval(tokenCheckInterval);
    }
  }, [classroomAuth, hasClassroomAccess, user]);

  // Check for existing user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const customUserId = typeof window !== 'undefined' ? localStorage.getItem('custom_user_id') : null;
      
      if (customUserId) {
        console.log('Found custom user session:', customUserId);
        try {
          const userData = await getUser(customUserId);
          if (userData) {
            setUser({ uid: customUserId, ...userData });
            
            // Check if we still have a valid OAuth token
            const hasToken = classroomAuth.hasValidToken();
            setHasClassroomAccess(hasToken);
            
            // Initialize cache if token is valid
            if (hasToken && !cacheInitialized) {
              await initializeCache();
            }
          } else {
            // User data not found - clear session
            localStorage.removeItem('custom_user_id');
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to restore custom user session:', error);
          localStorage.removeItem('custom_user_id');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };
    
    restoreSession();
  }, []);

  // Initialize classroom cache
  const initializeCache = async () => {
    if (cacheInitialized) return;
    
    try {
      // Create context object for cache to use
      const cacheContext = {
        callRealClassroomAPI: callRealClassroomAPI,
        hasClassroomToken: () => hasClassroomAccess
      };
      
      await classroomCache.initialize(cacheContext);
      setCacheInitialized(true);
      console.log('Classroom cache initialized');
    } catch (error) {
      console.error('Failed to initialize classroom cache:', error);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Use Google Identity Services OAuth directly (works for both Gmail and Workspace accounts)
      console.log('Using Google Identity Services for authentication...');
      await loginWithGoogleIdentityServices();
      
    } catch (error) {
      console.error('Login error:', error);
      alert(error.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  // Alternative login method using Google Identity Services (for Workspace accounts blocked by Firebase)
  const loginWithGoogleIdentityServices = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        // Initialize Google Identity Services if needed
        await classroomAuth.initialize();
        
        // First get the OAuth token with all scopes
        console.log('Requesting Google OAuth token with all scopes...');
        const accessToken = await classroomAuth.requestAccessToken();
        
        if (!accessToken) {
          reject(new Error('Failed to get OAuth access token'));
          return;
        }
        
        setHasClassroomAccess(true);
        
        // Now get user info using the access token
        console.log('Fetching user info from Google API...');
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (!userInfoResponse.ok) {
          reject(new Error('Failed to fetch user information'));
          return;
        }
        
        const userInfo = await userInfoResponse.json();
        console.log('Got user info:', userInfo.email);
        
        // Create a custom Firebase token or use custom auth
        // For now, we'll create a user in Firestore without Firebase Auth
        const customUserId = `google_${userInfo.id}`;
        const isWorkspaceAccount = userInfo.email && !userInfo.email.endsWith('@gmail.com');
        
        const userData = {
          email: userInfo.email,
          name: userInfo.name,
          photoURL: userInfo.picture,
          provider: 'google-identity',
          hasClassroomAccess: true,
          isWorkspaceAccount: isWorkspaceAccount,
          lastLogin: new Date().toISOString(),
          lastClassroomSync: new Date().toISOString(),
          googleId: userInfo.id
        };
        
        // Store in Firestore
        await createUser(customUserId, userData);
        
        // Update local state
        setUser({ uid: customUserId, ...userData });
        setHasBeenPromptedForClassroom(true);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('classroom_auth_prompted', 'true');
          // Store the custom user ID for session management
          localStorage.setItem('custom_user_id', customUserId);
        }
        
        console.log('Alternative login successful!');
        
        // Initialize cache
        if (!cacheInitialized) {
          await initializeCache();
        }
        
        // Reload the page to ensure clean state with authenticated user
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
        
        resolve(userData);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const logout = async () => {
    try {
      // Clear user session
      if (typeof window !== 'undefined') {
        localStorage.removeItem('custom_user_id');
        localStorage.removeItem('google_classroom_token');
        localStorage.removeItem('google_classroom_token_expiry');
        localStorage.removeItem('classroom_auth_prompted');
      }
      
      // Revoke OAuth token
      classroomAuth.revokeToken();
      
      // Stop cache refresh
      classroomCache.stopBackgroundRefresh();
      setCacheInitialized(false);
      
      setUser(null);
      setHasClassroomAccess(false);
      setHasBeenPromptedForClassroom(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get user's OAuth token for API calls
  const getIdTokenValue = async () => {
    if (user) {
      return classroomAuth.getAccessToken();
    }
    
    return null;
  };

  // Call Google Classroom API
  const callClassroomAPI = async (action, courseId = null) => {
    try {
      const idToken = await getIdTokenValue();
      if (!idToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/google-classroom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          courseId,
          idToken
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API call failed');
      }

      return data.data;
    } catch (error) {
      console.error('Classroom API call failed:', error);
      throw error;
    }
  };

  // Enable Classroom access for current user
  const enableClassroomAccess = async () => {
    if (!user) {
      alert('Please log in first');
      return;
    }
    
    try {
      // Request Google Classroom access token
      await classroomAuth.requestAccessToken();

      // Immediately mark access as enabled in local state so UI can react
      setHasClassroomAccess(true);
      
      // Update user data
      const updatedUserData = {
        ...user,
        hasClassroomAccess: true,
        lastClassroomSync: new Date().toISOString()
      };
      
      await createUser(user.uid, updatedUserData);
      setUser(updatedUserData);
      
      // Mark user as prompted and save to localStorage
      setHasBeenPromptedForClassroom(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('classroom_auth_prompted', 'true');
      }
      
      // Start background refresh
      if (!cacheInitialized) {
        await initializeCache();
      }

      // Start/ensure background refresh now that we have a token
      classroomCache.startBackgroundRefresh();

      // Prime cache immediately so dashboards/pages can show real data right away
      try {
        await classroomCache.getData('courses', null, true);
        await classroomCache.getData('assignments', null, true);
      } catch (prefetchError) {
        console.warn('Classroom cache prefetch failed (will fall back as needed):', prefetchError?.message || prefetchError);
      }
      
      return true;
    } catch (error) {
      if (error.message.includes('access_denied')) {
        alert('You need to grant Google Classroom permissions for this feature to work.');
      } else if (error.message.includes('popup_closed_by_user')) {
        alert('Permission dialog was closed. Please try again and accept the permissions.');
      } else {
        alert('Failed to get Classroom permissions. Please try again.');
      }
      return false;
    }
  };

  // Mark user as having been prompted for classroom access
  const markUserPromptedForClassroom = () => {
    setHasBeenPromptedForClassroom(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('classroom_auth_prompted', 'true');
    }
  };

  // Get valid access token, refresh if needed
  const getValidClassroomToken = async () => {
    try {
      return classroomAuth.getAccessToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      setHasClassroomAccess(false);
      return null;
    }
  };

  // Get real Google Classroom data using access token via API route
  const callRealClassroomAPI = async (action, courseId = null) => {
    try {
      // Ensure we have a valid token
      const accessToken = await getValidClassroomToken();
      if (!accessToken) {
        throw new Error('No valid Classroom access token available');
      }

      // Call the server-side API route with the access token
      const response = await fetch('/api/google-classroom-real', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          courseId,
          accessToken
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Real Classroom API call failed');
      }
      console.log('Real Classroom API response:', data);
      return data.data;
    } catch (error) {
      console.error('Real Classroom API call failed:', error);
      throw error;
    }
  };

  // Get cached classroom data with automatic refresh
  const getCachedClassroomData = async (dataType, courseId = null, forceRefresh = false) => {
    if (!cacheInitialized) {
      console.warn('Cache not initialized, falling back to direct API call');
      return await callRealClassroomAPI(
        dataType === 'courses' ? 'getCourses' :
        dataType === 'assignments' ? 'getCourseGrades' :
        dataType === 'grades' ? 'getCourseOverallGrade' :
        'getCourses',
        courseId
      );
    }
    
    return await classroomCache.getData(dataType, courseId, forceRefresh);
  };

  // Subscribe to cache updates
  const subscribeToCacheUpdates = (dataType, callback) => {
    if (!cacheInitialized) {
      console.warn('Cache not initialized for subscriptions');
      return () => {};
    }
    
    return classroomCache.subscribe(dataType, callback);
  };

  // Get cache statistics
  const getCacheStats = () => {
    return classroomCache.getCacheStats();
  };

  // Clear cache
  const clearClassroomCache = () => {
    classroomCache.clearCache();
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Update the user data in Firestore
      const updatedUserData = {
        ...user,
        ...profileData,
        updatedAt: new Date().toISOString()
      };

      await createUser(user.uid, updatedUserData);
      setUser(updatedUserData);
      
      return updatedUserData;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    logout,
    updateProfile,
    callClassroomAPI,
    callRealClassroomAPI,
    enableClassroomAccess,
    markUserPromptedForClassroom,
    getValidClassroomToken,
    hasClassroomToken: () => hasClassroomAccess,
    hasBeenPromptedForClassroom,
    setHasBeenPromptedForClassroom,
    // New cached data methods
    getCachedClassroomData,
    subscribeToCacheUpdates,
    getCacheStats,
    clearClassroomCache,
    cacheInitialized
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

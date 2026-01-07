// Google Classroom Data Cache Manager
// Handles local storage, background refresh, and seamless data updates

class ClassroomDataCache {
  constructor() {
    this.cacheKeys = {
      courses: 'classroom_courses',
      assignments: 'classroom_assignments',
      grades: 'classroom_grades',
      lastUpdate: 'classroom_last_update',
      refreshInProgress: 'classroom_refresh_in_progress'
    };
    
    // Cache TTL in milliseconds (how long cache is considered valid)
    this.cacheTTL = {
      courses: 4 * 60 * 60 * 1000, // 4 hours (courses rarely change)
      assignments: 60 * 60 * 1000, // 1 hour (assignments don't change that often)
      grades: 30 * 60 * 1000 // 30 minutes (grades might update more frequently)
    };
    
    // Background refresh intervals (should be LONGER to reduce API calls)
    this.refreshIntervals = {
      courses: 2 * 60 * 60 * 1000, // 2 hours (courses are very stable)
      assignments: 45 * 60 * 1000, // 45 minutes (reasonable for assignment updates)
      grades: 20 * 60 * 1000 // 20 minutes (check for grade updates)
    };
    
    this.refreshTimers = {};
    this.subscribers = {};
    this.isInitialized = false;
    this.pendingRequests = new Map(); // Track in-flight requests to prevent duplicates
  }

  // Initialize the cache system
  async initialize(authContext) {
    if (this.isInitialized) return;
    
    this.authContext = authContext;
    
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    this.isInitialized = true;
    
    // Start background refresh timers if we have valid tokens
    if (this.authContext.hasClassroomToken()) {
      this.startBackgroundRefresh();
    }
    
    console.log('Classroom cache initialized');
  }

  // Check if cached data exists and is valid
  isCacheValid(dataType) {
    if (typeof window === 'undefined') return false;
    
    try {
      const cacheKey = this.cacheKeys[dataType];
      const lastUpdateKey = `${cacheKey}_timestamp`;
      
      const cachedData = localStorage.getItem(cacheKey);
      const lastUpdate = localStorage.getItem(lastUpdateKey);
      
      if (!cachedData || !lastUpdate) return false;
      
      const cacheAge = Date.now() - parseInt(lastUpdate);
      const ttl = this.cacheTTL[dataType] || this.cacheTTL.assignments;
      
      return cacheAge < ttl;
    } catch (error) {
      console.error('Error checking cache validity:', error);
      return false;
    }
  }

  // Get cached data
  getCachedData(dataType) {
    if (typeof window === 'undefined') return null;
    
    try {
      const cacheKey = this.cacheKeys[dataType];
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const parsed = JSON.parse(cachedData);
      return parsed;
    } catch (error) {
      console.error(`Error retrieving cached ${dataType}:`, error);
      return null;
    }
  }

  // Store data in cache
  setCachedData(dataType, data) {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheKey = this.cacheKeys[dataType];
      const timestampKey = `${cacheKey}_timestamp`;
      
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(timestampKey, Date.now().toString());
      
      console.log(`Cached ${dataType}:`, data.length || 'N/A', 'items');
      
      // Notify subscribers of data update
      this.notifySubscribers(dataType, data);
    } catch (error) {
      console.error(`Error caching ${dataType}:`, error);
    }
  }

  // Get data with cache-first strategy
  async getData(dataType, courseId = null, forceRefresh = false) {
    // Check cache first unless force refresh is requested
    if (!forceRefresh && this.isCacheValid(dataType)) {
      const cachedData = this.getCachedData(dataType);
      if (cachedData) {
        // Start background refresh if cache is getting old
        this.maybeStartBackgroundRefresh(dataType);
        return cachedData;
      }
    }

    // If no valid cache or force refresh, fetch fresh data
    try {
      const freshData = await this.fetchFreshData(dataType, courseId);
      if (freshData) {
        this.setCachedData(dataType, freshData);
        return freshData;
      }
    } catch (error) {
      console.error(`Error fetching fresh ${dataType}:`, error);
      
      // If fresh fetch fails, return stale cache data as fallback
      const staleData = this.getCachedData(dataType);
      if (staleData) {
        console.log(`Using stale cached ${dataType} as fallback`);
        return staleData;
      }
    }

    return null;
  }

  // Fetch fresh data from API with request deduplication
  async fetchFreshData(dataType, courseId = null) {
    if (!this.authContext) {
      throw new Error('Auth context not available');
    }

    // Request deduplication: If a request is already in flight, wait for it
    const requestKey = `${dataType}_${courseId || 'all'}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log(`⏳ Waiting for existing ${dataType} request...`);
      return await this.pendingRequests.get(requestKey);
    }

    // Create new request and store the promise
    const requestPromise = this._fetchFreshDataInternal(dataType, courseId);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up completed request
      this.pendingRequests.delete(requestKey);
    }
  }

  // Internal fetch method (actual API calls)
  async _fetchFreshDataInternal(dataType, courseId = null) {
    console.log(`📡 Fetching fresh ${dataType} data...`);
    const startTime = Date.now();

    try {
      let result;

      switch (dataType) {
        case 'courses':
          result = await this.authContext.callRealClassroomAPI('getCourses');
          break;
          
        case 'assignments':
          // Get all courses first, then fetch assignments for each
          const courses = await this.getData('courses');
          if (!courses || courses.length === 0) return [];
          
          const allAssignments = [];
          // Fetch assignments in parallel (but limit concurrency to avoid rate limits)
          const batchSize = 3; // Process 3 courses at a time
          for (let i = 0; i < courses.length; i += batchSize) {
            const batch = courses.slice(i, i + batchSize);
            const batchPromises = batch.map(async (course) => {
              try {
                const courseAssignments = await this.authContext.callRealClassroomAPI('getCourseGrades', course.id);
                return {
                  courseId: course.id,
                  courseName: course.name,
                  assignments: courseAssignments
                };
              } catch (error) {
                console.warn(`Failed to fetch assignments for ${course.name}:`, error.message);
                return null;
              }
            });
            
            const batchResults = await Promise.all(batchPromises);
            allAssignments.push(...batchResults.filter(r => r !== null));
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < courses.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          result = allAssignments;
          break;
          
        case 'grades':
          // Optimize: grades and assignments use same data (getCourseGrades)
          // So we can reuse assignments data
          const assignmentsData = await this.getData('assignments');
          if (assignmentsData && this.isCacheValid('assignments')) {
            console.log('♻️ Reusing assignments data for grades (no additional API calls!)');
            // Just calculate overall grades from existing data
            result = assignmentsData.map(courseData => ({
              courseId: courseData.courseId,
              courseName: courseData.courseName,
              overallGrade: this._calculateOverallGrade(courseData.assignments),
              assignments: courseData.assignments
            }));
          } else {
            // Fetch fresh if no valid assignments cache
            const coursesForGrades = await this.getData('courses');
            if (!coursesForGrades || coursesForGrades.length === 0) return [];
            
            const allGrades = [];
            // Fetch in batches
            const batchSize = 3;
            for (let i = 0; i < coursesForGrades.length; i += batchSize) {
              const batch = coursesForGrades.slice(i, i + batchSize);
              const batchPromises = batch.map(async (course) => {
                try {
                  const courseGrades = await this.authContext.callRealClassroomAPI('getCourseGrades', course.id);
                  const overallGrade = this._calculateOverallGrade(courseGrades);
                  
                  return {
                    courseId: course.id,
                    courseName: course.name,
                    overallGrade,
                    assignments: courseGrades
                  };
                } catch (error) {
                  console.warn(`Failed to fetch grades for ${course.name}:`, error.message);
                  return null;
                }
              });
              
              const batchResults = await Promise.all(batchPromises);
              allGrades.push(...batchResults.filter(r => r !== null));
              
              if (i + batchSize < coursesForGrades.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }
            result = allGrades;
          }
          break;
          
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Fetched ${dataType} in ${duration}ms`);
      return result;

    } catch (error) {
      console.error(`❌ Error fetching ${dataType}:`, error);
      throw error;
    }
  }

  // Calculate overall grade from assignments
  _calculateOverallGrade(assignments) {
    let totalPoints = 0;
    let earnedPoints = 0;
    let gradedAssignments = 0;

    assignments.forEach(assignment => {
      const grade = assignment.submission?.assignedGrade;
      const maxPoints = assignment.maxPoints;
      
      if (grade !== undefined && grade !== null && maxPoints > 0) {
        earnedPoints += grade;
        totalPoints += maxPoints;
        gradedAssignments++;
      }
    });

    return {
      overallGrade: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null,
      totalPoints,
      earnedPoints,
      gradedAssignments,
      totalAssignments: assignments.length
    };
  }

  // Start background refresh for specific data type
  maybeStartBackgroundRefresh(dataType) {
    const cacheKey = this.cacheKeys[dataType];
    const timestampKey = `${cacheKey}_timestamp`;
    const lastUpdate = localStorage.getItem(timestampKey);
    
    if (!lastUpdate) return;
    
    const timeSinceUpdate = Date.now() - parseInt(lastUpdate);
    const refreshInterval = this.refreshIntervals[dataType];
    
    // If data is older than refresh interval, start background refresh
    if (timeSinceUpdate > refreshInterval && !this.refreshTimers[dataType]) {
      this.startBackgroundRefreshForType(dataType);
    }
  }

  // Start background refresh timers
  startBackgroundRefresh() {
    if (!this.authContext.hasClassroomToken()) {
      console.log('No classroom token, skipping background refresh');
      return;
    }

    // Start timers for each data type
    Object.keys(this.refreshIntervals).forEach(dataType => {
      this.startBackgroundRefreshForType(dataType);
    });
    
    console.log('Started background refresh timers');
  }

  // Start background refresh for specific data type
  startBackgroundRefreshForType(dataType) {
    // Clear existing timer
    if (this.refreshTimers[dataType]) {
      clearInterval(this.refreshTimers[dataType]);
    }

    const interval = this.refreshIntervals[dataType];
    
    this.refreshTimers[dataType] = setInterval(async () => {
      // Skip if no token
      if (!this.authContext.hasClassroomToken()) {
        console.log(`⏸️ Stopping background refresh for ${dataType} - no token`);
        this.stopBackgroundRefresh(dataType);
        return;
      }

      // Skip if user is not actively using the app (page hidden)
      if (typeof document !== 'undefined' && document.hidden) {
        console.log(`⏸️ Skipping background refresh for ${dataType} - page not visible`);
        return;
      }

      // Skip if cache is still fresh enough (within 75% of TTL)
      const cacheKey = this.cacheKeys[dataType];
      const timestampKey = `${cacheKey}_timestamp`;
      const lastUpdate = localStorage.getItem(timestampKey);
      
      if (lastUpdate) {
        const cacheAge = Date.now() - parseInt(lastUpdate);
        const ttl = this.cacheTTL[dataType];
        if (cacheAge < (ttl * 0.75)) {
          console.log(`⏸️ Skipping background refresh for ${dataType} - cache still fresh (${Math.round(cacheAge / 1000 / 60)}min old)`);
          return;
        }
      }

      try {
        console.log(`🔄 Background refreshing ${dataType}...`);
        const freshData = await this.fetchFreshData(dataType);
        if (freshData) {
          this.setCachedData(dataType, freshData);
        }
      } catch (error) {
        console.warn(`❌ Background refresh failed for ${dataType}:`, error.message);
        
        // If we hit quota limits, slow down the refresh rate significantly
        if (error.message.includes('quota') || error.message.includes('429') || error.message.includes('rate limit')) {
          console.log(`🐌 Slowing down refresh rate for ${dataType} due to quota/rate limits`);
          this.slowDownRefresh(dataType);
        }
      }
    }, interval);
    
    console.log(`✅ Started background refresh for ${dataType} (every ${interval / 1000 / 60} minutes)`);
  }

  // Slow down refresh rate when hitting quota limits
  slowDownRefresh(dataType) {
    const currentInterval = this.refreshIntervals[dataType];
    const newInterval = Math.min(currentInterval * 2, 60 * 60 * 1000); // Max 1 hour
    
    this.refreshIntervals[dataType] = newInterval;
    
    // Restart timer with new interval
    this.startBackgroundRefreshForType(dataType);
    
    console.log(`Refresh interval for ${dataType} increased to ${newInterval / 1000 / 60} minutes`);
  }

  // Stop background refresh
  stopBackgroundRefresh(dataType = null) {
    if (dataType) {
      if (this.refreshTimers[dataType]) {
        clearInterval(this.refreshTimers[dataType]);
        delete this.refreshTimers[dataType];
      }
    } else {
      // Stop all timers
      Object.keys(this.refreshTimers).forEach(type => {
        clearInterval(this.refreshTimers[type]);
        delete this.refreshTimers[type];
      });
    }
  }

  // Subscribe to data updates
  subscribe(dataType, callback) {
    if (!this.subscribers[dataType]) {
      this.subscribers[dataType] = [];
    }
    this.subscribers[dataType].push(callback);
    
    return () => {
      // Return unsubscribe function
      if (this.subscribers[dataType]) {
        this.subscribers[dataType] = this.subscribers[dataType].filter(cb => cb !== callback);
      }
    };
  }

  // Notify subscribers of data updates
  notifySubscribers(dataType, data) {
    if (this.subscribers[dataType]) {
      this.subscribers[dataType].forEach(callback => {
        try {
          callback(data, dataType);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Clear all cached data
  clearCache() {
    if (typeof window === 'undefined') return;
    
    Object.values(this.cacheKeys).forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_timestamp`);
    });
    
    console.log('Cleared all classroom cache data');
  }

  // Get cache statistics
  getCacheStats() {
    if (typeof window === 'undefined') return {};
    
    const stats = {};
    
    Object.keys(this.cacheKeys).forEach(dataType => {
      const cacheKey = this.cacheKeys[dataType];
      const timestampKey = `${cacheKey}_timestamp`;
      
      const cachedData = localStorage.getItem(cacheKey);
      const lastUpdate = localStorage.getItem(timestampKey);
      
      stats[dataType] = {
        hasData: !!cachedData,
        lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)).toISOString() : null,
        isValid: this.isCacheValid(dataType),
        dataSize: cachedData ? cachedData.length : 0
      };
    });
    
    return stats;
  }
}

// Create singleton instance
const classroomCache = new ClassroomDataCache();

export default classroomCache;

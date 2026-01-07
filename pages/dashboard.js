import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import Layout from '../components/Layout';
import ClassCountdown from '../components/ClassCountdown';
import ClassroomReauth from '../components/ClassroomReauth';
import ClassroomPrompt from '../components/ClassroomPrompt';
import StudyAssistModal from '../components/StudyAssistModal';
import ContactTeacherDropdown from '../components/ContactTeacherDropdown';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Link from 'next/link';
import CacheStatus from '../components/CacheStatus';
import chatRoomService from '../lib/chatRooms';

export default function Dashboard() {
  const { 
    user, 
    loading, 
    callClassroomAPI, 
    enableClassroomAccess, 
    getCachedClassroomData, 
    subscribeToCacheUpdates,
    hasClassroomToken,
    cacheInitialized,
    getValidClassroomToken,
    hasBeenPromptedForClassroom,
    markUserPromptedForClassroom
  } = useAuth();
  
  const { showTip } = useSettings();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState({
    assignmentsDue: [],
    studySuggestions: [],
    loading: true,
    classroomConnected: false,
    lastUpdated: null,
    fromCache: false
  });
  
  const [showWelcomeTips, setShowWelcomeTips] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [showClassroomPrompt, setShowClassroomPrompt] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [showStudyAssist, setShowStudyAssist] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [sendingEmailReport, setSendingEmailReport] = useState(false);

  const handleEnableClassroomAccess = async () => {
    // Flip UI immediately so user sees progress as soon as they consent.
    setDashboardData(prev => ({ ...prev, loading: true }));

    const success = await enableClassroomAccess();
    if (success) {
      await loadDashboardData();
    } else {
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleStudyAssist = (assignment) => {
    console.log('DEBUG: handleStudyAssist called with assignment:', JSON.stringify(assignment, null, 2));
    console.log('DEBUG: Assignment has courseId?', !!assignment.courseId);
    console.log('DEBUG: Assignment has courseWorkId?', !!assignment.courseWorkId);
    
    setSelectedAssignment(assignment);
    setShowStudyAssist(true);
  };

  const handleSendEmailReport = async () => {
    if (sendingEmailReport) return;
    
    setSendingEmailReport(true);
    try {
      const accessToken = await getValidClassroomToken();
      if (!accessToken) {
        showTip('Please reconnect your Google Classroom to send the report.', 'warning', 4000);
        setShowReauthModal(true);
        return;
      }

      const response = await fetch('/api/send-homework-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          accessToken,
          singleUser: true // Send only to this user
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showTip('📧 Homework report sent to your email!', 'success', 4000);
      } else {
        showTip(result.error || 'Failed to send email report.', 'danger', 4000);
      }
    } catch (error) {
      console.error('Error sending email report:', error);
      showTip('Failed to send email report. Please try again.', 'danger', 4000);
    } finally {
      setSendingEmailReport(false);
    }
  };

  // Subscribe to cache updates for real-time data
  useEffect(() => {
    if (!cacheInitialized || !user) return;

    const unsubscribeAssignments = subscribeToCacheUpdates('assignments', (data) => {
      console.log('Received assignments update from cache:', data.length, 'courses');
      updateDashboardFromCacheData(data, 'assignments');
    });

    const unsubscribeCourses = subscribeToCacheUpdates('courses', (data) => {
      console.log('Received courses update from cache:', data.length, 'courses');
      // Reload dashboard data when courses update
      loadDashboardData();
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeCourses();
    };
  }, [cacheInitialized, user]);

  // Remove auto-refresh since background cache handles this now
  // Auto-refresh data every 5 minutes
  useEffect(() => {
    if (user && user.hasClassroomAccess) {
      const interval = setInterval(() => {
        console.log('Auto-refreshing dashboard data...');
        loadDashboardData();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      
      // Show welcome tips for new users
      if (!showWelcomeTips) {
        setTimeout(() => {
          showTip(
            'Welcome to StudyBuddy! Click the ⚙️ Settings button in the navigation to customize your class schedule.',
            'info',
            10000
          );
          setShowWelcomeTips(true);
        }, 2000);
        
        setTimeout(() => {
          showTip(
            'The countdown timer shows your current class and time until your next one. Customize lunch time in settings!',
            'success',
            8000
          );
        }, 6000);
      }
    }
  }, [user, showTip, showWelcomeTips]);

  // Load user's chat groups
  useEffect(() => {
    const loadUserGroups = async () => {
      if (user?.uid) {
        try {
          const groups = await chatRoomService.getUserRooms(user.uid);
          setUserGroups(groups);
        } catch (error) {
          console.error('Error loading user groups:', error);
        }
      }
    };
    loadUserGroups();
  }, [user]);

  // Show one-time classroom authentication prompt - only if not already authenticated
  // and only for users who haven't been prompted before
  useEffect(() => {
    if (user && !loading && !hasClassroomToken() && !hasBeenPromptedForClassroom && !user.hasClassroomAccess) {
      // Check localStorage for dismissal flag
      const dismissedPrompt = localStorage.getItem('classroom_prompt_dismissed');
      
      if (!dismissedPrompt) {
        // Show prompt after a short delay to let the user settle into the dashboard
        const promptTimer = setTimeout(() => {
          setShowClassroomPrompt(true);
        }, 5000); // 5 second delay - give more time for initial auth to complete
        
        return () => clearTimeout(promptTimer);
      }
    }
  }, [user, loading, hasClassroomToken, hasBeenPromptedForClassroom]);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data for user:', user.name);
      setDashboardData(prev => ({ ...prev, loading: true }));
      
      // Use cached data if available and initialized
      if (user.hasClassroomAccess && cacheInitialized) {
        try {
          // Check for valid token first
          const validToken = await getValidClassroomToken();
          
          if (!validToken) {
            console.log('No valid token available');
            // Only show reauth modal once per session
            const reauthShownThisSession = sessionStorage.getItem('reauth_modal_shown');
            if (!reauthShownThisSession) {
              setTokenExpired(true);
              setShowReauthModal(true);
              sessionStorage.setItem('reauth_modal_shown', 'true');
            }
            loadMockData();
            return;
          }

          console.log('Using cached classroom data...');
          
          // Get assignments from cache (this includes background refresh)
          const cachedAssignments = await getCachedClassroomData('assignments');
          
          if (cachedAssignments && cachedAssignments.length > 0) {
            updateDashboardFromCacheData(cachedAssignments, 'assignments');
            return;
          } else {
            console.log('No cached assignments found, will try mock data');
          }
        } catch (cacheError) {
          console.warn('Cache error, falling back to mock data:', cacheError.message);
          
          // Check if this is an authentication error - only show modal once per session
          if (cacheError.message.includes('authentication') || cacheError.message.includes('token')) {
            console.log('Authentication error detected');
            const reauthShownThisSession = sessionStorage.getItem('reauth_modal_shown');
            if (!reauthShownThisSession) {
              setTokenExpired(true);
              setShowReauthModal(true);
              sessionStorage.setItem('reauth_modal_shown', 'true');
            }
          }
        }
      }
      
      // Fallback to mock data
      loadMockData();
      console.log('Loaded static mock data');
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  // Update dashboard from cached data
  const updateDashboardFromCacheData = (cachedData, dataType) => {
    console.log('DEBUG: updateDashboardFromCacheData called with:', {
      dataType,
      cachedDataLength: cachedData?.length || 0
    });
    
    if (dataType === 'assignments') {
      const assignmentsDue = [];
      const studySuggestions = [];
      
      cachedData.forEach((courseData, courseIndex) => {
        console.log(`DEBUG: Processing course ${courseIndex}:`, courseData.courseName, 'with', courseData.assignments?.length || 0, 'assignments');
        
        if (courseData.assignments) {
          // Filter upcoming assignments (due within next 7 days)
          const upcomingAssignments = courseData.assignments.filter(assignment => {
            if (!assignment.dueDate) return false;
            
            const dueDate = new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day);
            const now = new Date();
            const daysDiff = (dueDate - now) / (1000 * 60 * 60 * 24);
            
            return daysDiff >= 0 && daysDiff <= 7;
          });
          
          console.log(`DEBUG: Course ${courseData.courseName} has ${upcomingAssignments.length} upcoming assignments`);
          
          upcomingAssignments.forEach((assignment, assignmentIndex) => {
            console.log(`DEBUG: Processing assignment ${assignmentIndex}:`, {
              title: assignment.title,
              courseWorkId: assignment.courseWorkId,
              id: assignment.id,
              hasId: !!(assignment.courseWorkId || assignment.id)
            });
            
            assignmentsDue.push({
              courseId: courseData.courseId, // Make sure courseId is included
              courseWorkId: assignment.courseWorkId || assignment.id, // Use courseWorkId or fall back to id
              courseName: courseData.courseName,
              title: assignment.title,
              description: assignment.description, // Include description for AI
              dueDate: new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day).toLocaleString(),
              maxPoints: assignment.maxPoints,
              link: assignment.alternateLink
            });
          });
          
          // Generate study suggestions based on grades
          const gradedAssignments = courseData.assignments.filter(a => 
            a.submission && a.submission.assignedGrade !== undefined
          );
          
          if (gradedAssignments.length > 0) {
            const avgGrade = gradedAssignments.reduce((sum, a) => 
              sum + (a.submission.assignedGrade / a.maxPoints * 100), 0) / gradedAssignments.length;
            
            if (avgGrade < 85) {
              studySuggestions.push({
                courseName: courseData.courseName,
                currentGrade: Math.round(avgGrade),
                message: `Current average: ${Math.round(avgGrade)}%. Consider reviewing recent assignments.`,
                priority: avgGrade < 70 ? 'high' : 'medium'
              });
            }
          }
        }
      });
      
      console.log('DEBUG: Final assignments due:', assignmentsDue.map(a => ({
        title: a.title,
        courseId: a.courseId,
        courseWorkId: a.courseWorkId
      })));
      
      setDashboardData({
        assignmentsDue: assignmentsDue.slice(0, 6), // Limit to 6 most recent
        studySuggestions: studySuggestions.slice(0, 3), // Limit to 3 suggestions
        loading: false,
        classroomConnected: true,
        lastUpdated: new Date().toLocaleString(),
        fromCache: true
      });
      
      console.log('Dashboard updated with cached data:', assignmentsDue.length, 'assignments,', studySuggestions.length, 'suggestions');
    }
  };

  const loadMockData = () => {
    console.log('DEBUG: Loading mock data...');
    setDashboardData({
      assignmentsDue: [
        {
          courseId: 'mock_course_1',
          courseWorkId: 'mock_assignment_1',
          courseName: 'Math 101',
          title: 'Algebra Homework',
          description: 'Complete the algebra problems from chapter 5',
          dueDate: '12/25/2024 23:59',
          maxPoints: 100
        },
        {
          courseId: 'mock_course_2',
          courseWorkId: 'mock_assignment_2',
          courseName: 'Science',
          title: 'Lab Report',
          description: 'Write a report on the chemistry lab experiment',
          dueDate: '12/26/2024 18:00',
          maxPoints: 50
        }
      ],
      studySuggestions: [
        {
          courseName: 'Math 101',
          currentGrade: 75,
          message: 'Focus on Math 101 - current grade is 75%',
          priority: 'medium'
        }
      ],
      loading: false,
      classroomConnected: false,
      lastUpdated: new Date().toLocaleString(),
      fromCache: false
    });
  };

  if (loading || !user) {
    return (
      <Layout>
        <Container className="mt-5 text-center">
          <div className="loading-spinner">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-5">
        <div className="dashboard-header mb-5 text-center">
          <h1 className="display-3 fw-bold dashboard-title mb-3">
            Welcome back, {user.displayName?.split(' ')[0] || 'Student'}! 
          </h1>
          <p className="lead dashboard-subtitle mb-4">
            Your personalized study dashboard with real-time updates and smart insights
          </p>
          <div className="dashboard-stats d-flex justify-content-center gap-4 flex-wrap">
            <div className="stat-item">
              <i className="fas fa-book text-primary"></i>
              <span className="ms-2">4 Active Courses</span>
            </div>
            <div className="stat-item">
              <i className="fas fa-calendar-check text-success"></i>
              <span className="ms-2">{dashboardData.assignmentsDue.length} Due Soon</span>
            </div>
            <div className="stat-item">
              <i className="fas fa-clock text-warning"></i>
              <span className="ms-2">Next: Period 3</span>
            </div>
          </div>
        </div>
      </Container>

      {/* Token Expiration Alert */}
      {tokenExpired && (
        <Container className="mt-4">
          <Alert variant="warning" className="d-flex align-items-center">
            <div className="flex-grow-1">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Google Classroom Access Expired</strong>
              <div className="mt-1">
                Your access token has expired. Re-authorize to continue accessing your real classroom data.
              </div>
            </div>
            <Button 
              variant="outline-warning" 
              size="sm"
              onClick={() => setShowReauthModal(true)}
            >
              Re-authorize Now
            </Button>
          </Alert>
        </Container>
      )}

      {/* Quick Actions */}
      <Container className="mt-5">
        <Row>
          {/* Class Countdown Timer */}
          <Col xs={12} className="mb-4">
            <ClassCountdown />
          </Col>
        </Row>
        
        <Row>
          <Col xs={12} md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0 quick-action-card schedule-card">
              <div className="card-img-overlay-custom">
                <div className="overlay-gradient schedule-gradient"></div>
              </div>
              <Card.Body className="position-relative">
                <Card.Title className="text-white fw-bold">
                  <i className="fas fa-calendar-alt me-2"></i>
                  Your Schedule
                </Card.Title>
                <Card.Text className="text-white-50">
                  View and manage your study schedule with real-time updates.
                </Card.Text>
                <Button as={Link} href="/courses" variant="light" className="fw-bold">
                  <i className="fas fa-arrow-right me-2"></i>
                  Go to Schedule
                </Button>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0 quick-action-card progress-card">
              <div className="card-img-overlay-custom">
                <div className="overlay-gradient progress-gradient"></div>
              </div>
              <Card.Body className="position-relative">
                <Card.Title className="text-white fw-bold">
                  <i className="fas fa-chart-line me-2"></i>
                  Your Progress
                </Card.Title>
                <Card.Text className="text-white-50">
                  Track your study progress and academic achievements.
                </Card.Text>
                <Button as={Link} href="/grades" variant="light" className="fw-bold">
                  <i className="fas fa-arrow-right me-2"></i>
                  View Progress
                </Button>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0 quick-action-card friends-card">
              <div className="card-img-overlay-custom">
                <div className="overlay-gradient friends-gradient"></div>
              </div>
              <Card.Body className="position-relative">
                <Card.Title className="text-white fw-bold">
                  <i className="fas fa-users me-2"></i>
                  Connect with Peers
                </Card.Title>
                <Card.Text className="text-white-50">
                  Find and connect with study buddies in your classes.
                </Card.Text>
                <Button as={Link} href="/chat" variant="light" className="fw-bold position-relative">
                  <i className="fas fa-arrow-right me-2"></i>
                  Find Peers
                  {userGroups.length > 0 && (
                    <Badge 
                      bg="primary" 
                      className="ms-2 position-absolute top-0 start-100 translate-middle"
                      style={{ fontSize: '0.75rem' }}
                    >
                      {userGroups.length}
                    </Badge>
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Dashboard Content */}
      <Container className="mt-5">
        <Card className="p-4">
          {!hasClassroomToken() && (
            <div className="alert alert-info mb-4">
              <h5>
                <i className="fas fa-info-circle me-2"></i>
                Connect Google Classroom for Real Data
              </h5>
              <p className="mb-2">
                {user.hasClassroomAccess 
                  ? "You have Firebase authentication but need additional permissions for Google Classroom API access to see your real assignments and grades."
                  : "To see your real assignments and grades, please enable Google Classroom access."
                }
              </p>
              <Button variant="primary" onClick={handleEnableClassroomAccess}>
                <i className="fab fa-google me-2"></i>
                Enable Real Classroom Access
              </Button>
              <small className="text-muted d-block mt-2">
                This will request additional permissions to access your Google Classroom data.
              </small>
            </div>
          )}
          
          {dashboardData.loading ? (
            <h3 className="text-center">Loading assignments and study suggestions...</h3>
          ) : (
            <>
              {dashboardData.assignmentsDue.length > 0 && (
                <>
                  <div className="section-header-wrapper mb-4">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                      <div className="section-title-group">
                        <h3 className="section-title mb-2">
                          Assignments Upcoming
                        </h3>
                        {dashboardData.classroomConnected && (
                          <div className="status-badge">
                            <i className="fas fa-check-circle me-1"></i>
                            {dashboardData.fromCache ? 'Auto-Synced' : 'Live Data'}
                          </div>
                        )}
                      </div>
                      <div className="d-flex flex-column align-items-start align-items-md-end gap-2">
                        {dashboardData.lastUpdated && (
                          <small className="text-muted timestamp-text">
                            <i className="far fa-clock me-1"></i>
                            {dashboardData.lastUpdated}
                          </small>
                        )}
                        <div className="d-flex gap-2 flex-wrap">
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            className="email-report-btn"
                            onClick={handleSendEmailReport}
                            disabled={sendingEmailReport}
                          >
                            {sendingEmailReport ? (
                              <>
                                <i className="fas fa-spinner fa-spin me-2"></i>
                                Sending...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-envelope me-2"></i>
                                Email Report
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="refresh-btn"
                            onClick={() => {
                              console.log('Manual refresh triggered');
                              // Force refresh from API, not cache
                              if (cacheInitialized && user.hasClassroomAccess) {
                                getCachedClassroomData('assignments', null, true);
                              } else {
                                loadDashboardData();
                              }
                            }}
                            disabled={dashboardData.loading}
                          >
                            <i className="fas fa-sync-alt me-2"></i>
                            Refresh Data
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Row className="assignment-cards">
                    {dashboardData.assignmentsDue.map((assignment, index) => (
                      <Col xs={12} md={4} key={index}>
                        <Card className="mb-3 shadow-sm">
                          <Card.Body>
                            <Card.Title className="text-primary fw-semibold mb-2 text-break">
                              {assignment.courseName}
                            </Card.Title>
                            <Card.Text className="fw-medium mb-2 text-break">
                              {assignment.title}
                            </Card.Text>
                            <Card.Text className="mb-3">
                              <small className="text-muted d-block text-break">Due: {assignment.dueDate}</small>
                              {assignment.maxPoints && (
                                <small className="text-muted d-block">
                                  Points: {assignment.maxPoints}
                                </small>
                              )}
                            </Card.Text>
                            <div className="d-flex flex-column flex-sm-row gap-2">
                              {assignment.link && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  href={assignment.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-fill"
                                >
                                  View in Classroom
                                </Button>
                              )}
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleStudyAssist(assignment)}
                                className="flex-fill"
                              >
                                <i className="fas fa-robot me-1"></i>
                                Study Assist
                              </Button>
                              <ContactTeacherDropdown
                                courseId={assignment.courseId}
                                assignmentTitle={assignment.title}
                                courseName={assignment.courseName}
                              />
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                  <hr className="my-4" />
                </>
              )}

              {dashboardData.studySuggestions.length > 0 && (
                <>
                  <h3 className="section-title">Study Suggestions:</h3>
                  <Row className="study-suggestions">
                    {dashboardData.studySuggestions.map((suggestion, index) => (
                      <Col xs={12} md={4} key={index}>
                        <Card className={`mb-3 shadow-sm border-${
                          suggestion.priority === 'high' ? 'danger' : 
                          suggestion.priority === 'medium' ? 'warning' : 'info'
                        }`}>
                          <Card.Body>
                            <Card.Title className={`text-${
                              suggestion.priority === 'high' ? 'danger' : 
                              suggestion.priority === 'medium' ? 'warning' : 'info'
                            }`}>
                              {suggestion.courseName}
                              {suggestion.currentGrade && (
                                <small className="d-block">
                                  Current Grade: {suggestion.currentGrade}%
                                </small>
                              )}
                            </Card.Title>
                            <Card.Text className="text-break">{suggestion.message}</Card.Text>
                            <Button
                              variant={
                                suggestion.priority === 'high' ? 'danger' : 
                                suggestion.priority === 'medium' ? 'warning' : 'info'
                              }
                              size="sm"
                              as={Link}
                              href={`/ai-study-help?course=${suggestion.courseName}`}
                              className="w-100"
                            >
                              Get Study Help
                            </Button>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </>
              )}

              {dashboardData.assignmentsDue.length === 0 && dashboardData.studySuggestions.length === 0 && (
                <h3 className="text-center text-muted">
                  {dashboardData.classroomConnected 
                    ? 'No assignments due soon!' 
                    : 'Connect Google Classroom to see your assignments!'
                  }
                </h3>
              )}
            </>
          )}
        </Card>

        {/* Cache Status (for debugging/admin) */}
        {cacheInitialized && user?.hasClassroomAccess && (
          <Container className="mt-4">
            <CacheStatus />
          </Container>
        )}
      </Container>

      {/* Classroom Re-authorization Modal */}
      <ClassroomReauth 
        show={showReauthModal}
        onHide={() => setShowReauthModal(false)}
        onSuccess={() => {
          setTokenExpired(false);
          setShowReauthModal(false);
          loadDashboardData(); // Reload data after successful auth
        }}
      />

      {/* Study Assist Modal */}
      <StudyAssistModal
        show={showStudyAssist}
        onHide={() => setShowStudyAssist(false)}
        assignment={selectedAssignment}
      />

      {/* One-time Classroom Authentication Prompt */}
      <ClassroomPrompt
        show={showClassroomPrompt}
        onHide={() => setShowClassroomPrompt(false)}
        onSuccess={async () => {
          setShowClassroomPrompt(false);
          await loadDashboardData();
        }}
      />
      
      <style jsx>{`
        .dashboard-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 25px;
          padding: 3rem 2rem;
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .dashboard-header::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.5; }
          50% { transform: scale(1.1) rotate(180deg); opacity: 0.8; }
        }
        
        .dashboard-title {
          position: relative;
          z-index: 1;
          font-size: 3.5rem;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .dashboard-subtitle {
          position: relative;
          z-index: 1;
          font-size: 1.3rem;
          opacity: 0.9;
        }
        
        .dashboard-stats {
          position: relative;
          z-index: 1;
        }
        
        .stat-item {
          background: rgba(255,255,255,0.2);
          padding: 0.75rem 1.5rem;
          border-radius: 15px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .stat-item:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-3px);
        }
        
        .quick-action-card {
          border-radius: 20px;
          overflow: hidden;
          transition: all 0.3s ease;
          min-height: 320px;
          position: relative;
        }
        
        .quick-action-card:hover {
          transform: translateY(-15px);
          box-shadow: 0 25px 50px rgba(0,0,0,0.2) !important;
        }
        
        .card-img-overlay-custom {
          position: relative;
          height: 140px;
          overflow: hidden;
        }
        
        .card-img-custom {
          width: 100%;
          height: 140px;
          object-fit: cover;
          transition: all 0.3s ease;
        }
        
        .quick-action-card:hover .card-img-custom {
          transform: scale(1.1);
        }
        
        .overlay-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.9;
          transition: opacity 0.3s ease;
        }
        
        .quick-action-card:hover .overlay-gradient {
          opacity: 0.95;
        }
        
        .schedule-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .progress-gradient {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        
        .friends-gradient {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
        }
        
        .schedule-card .card-body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          position: relative;
        }
        
        .progress-card .card-body {
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          position: relative;
        }
        
        .friends-card .card-body {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
          position: relative;
        }
        
        .quick-action-card .card-body::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at bottom right, rgba(255,255,255,0.2) 0%, transparent 60%);
          pointer-events: none;
        }
        
        .assignment-cards .card {
          border-radius: 20px;
          border: none;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          overflow: visible;
          position: relative;
          z-index: 1;
        }
        
        .assignment-cards .col {
          overflow: visible;
        }
        
        .assignment-cards {
          overflow: visible;
        }

        .section-header-wrapper {
          padding-bottom: 1rem;
          border-bottom: 2px solid #e9ecef;
        }

        .section-title-group .section-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #2c3e50;
          margin: 0;
        }

        .status-badge {
          display: inline-block;
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          color: #155724;
          padding: 0.35rem 0.9rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid #b1dfbb;
        }

        .timestamp-text {
          font-size: 0.875rem;
          color: #6c757d;
          font-weight: 500;
        }

        .refresh-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.3s ease;
          border: 2px solid #007bff;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #007bff;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .email-report-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.3s ease;
          border: 2px solid #28a745;
        }

        .email-report-btn:hover:not(:disabled) {
          background: #28a745;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        .email-report-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .assignment-cards .card-title,
        .assignment-cards .card-text,
        .study-suggestions .card-title,
        .study-suggestions .card-text {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .assignment-cards .card:hover,
        .assignment-cards .card:focus-within {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.12);
          z-index: 1000;
        }
        
        .study-suggestions .card {
          border-radius: 20px;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        }
        
        .study-suggestions .card:hover {
          transform: translateY(-8px);
          border-color: #667eea;
          box-shadow: 0 15px 30px rgba(102, 126, 234, 0.2);
        }
        
        .main-content-card {
          border-radius: 25px;
          border: none;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        
        .main-content-card .card-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: none;
          padding: 1.5rem;
        }
        
        @media (max-width: 768px) {
          .dashboard-title {
            font-size: 2.5rem;
          }
          
          .dashboard-header {
            padding: 2rem 1rem;
          }
          
          .dashboard-stats {
            flex-direction: column;
            align-items: center;
          }
          
          .stat-item {
            margin-bottom: 0.5rem;
          }
        }
      `}</style>
    </Layout>
  );
}

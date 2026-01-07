import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import Layout from '../components/Layout';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Tabs, Badge, Spinner } from 'react-bootstrap';
import { useRouter } from 'next/router';
import { updateUser } from '../lib/firestore';

export default function Settings() {
  const { 
    user, 
    loading, 
    requestDriveAccess, 
    requestGmailAccess, 
    hasScopeSet,
    hasClassroomToken,
    getCachedClassroomData,
    enableClassroomAccess
  } = useAuth();
  const { 
    settings, 
    updateLunchTime, 
    updatePeriodSubject, 
    updatePeriodTime,
    toggleTips, 
    updateSetting, 
    showTip 
  } = useSettings();
  const router = useRouter();
  
  const [lunchStart, setLunchStart] = useState('');
  const [lunchEnd, setLunchEnd] = useState('');
  const [activeTab, setActiveTab] = useState('schedule');
  const [periodSubjects, setPeriodSubjects] = useState({});
  const [periodTimes, setPeriodTimes] = useState({});
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [homeworkReminderEnabled, setHomeworkReminderEnabled] = useState(true);
  const [savingEmailPref, setSavingEmailPref] = useState(false);
  const [savingReminderPref, setSavingReminderPref] = useState(false);
  
  // Scope management state
  const [scopeStatus, setScopeStatus] = useState({
    classroom: false,
    drive: false,
    gmail: false
  });
  const [requestingScope, setRequestingScope] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  // Handle query parameters to switch tabs (e.g., ?tab=permissions)
  useEffect(() => {
    if (router.query.tab && ['schedule', 'preferences', 'permissions'].includes(router.query.tab)) {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab]);

  // Load email notification preference from user data
  useEffect(() => {
    if (user) {
      setEmailNotificationsEnabled(user.emailNotificationsEnabled !== false);
      setHomeworkReminderEnabled(user.homeworkReminderEnabled !== false);
    }
  }, [user]);

  // Check scope status and verify actual Classroom connection
  useEffect(() => {
    const checkRealConnection = async () => {
      // Check if they have a valid Classroom token
      const hasValidToken = hasClassroomToken && hasClassroomToken();
      
      let actuallyConnected = false;
      if (hasValidToken && getCachedClassroomData) {
        // Verify token works by trying to get data
        try {
          const testData = await getCachedClassroomData('courses');
          actuallyConnected = testData && testData.length > 0;
        } catch (error) {
          console.log('Classroom connection check failed:', error.message);
          actuallyConnected = false;
        }
      }
      
      setScopeStatus({
        classroom: actuallyConnected,
        drive: hasValidToken && hasScopeSet('DRIVE'),
        gmail: hasValidToken && hasScopeSet('GMAIL')
      });
    };
    
    checkRealConnection();
  }, [hasClassroomToken, hasScopeSet, getCachedClassroomData]);

  useEffect(() => {
    if (settings.schedule) {
      setLunchStart(settings.schedule.lunchTime.start);
      setLunchEnd(settings.schedule.lunchTime.end);
      
      // Initialize period subjects and times
      const subjects = {};
      const times = {};
      settings.schedule.periods.forEach(period => {
        subjects[period.id] = period.subject || '';
        times[period.id] = {
          start: period.startTime,
          end: period.endTime
        };
      });
      setPeriodSubjects(subjects);
      setPeriodTimes(times);
    }
  }, [settings.schedule]);

  const handleLunchTimeUpdate = () => {
    updateLunchTime(lunchStart, lunchEnd);
    setShowSaveAlert(true);
    showTip('Lunch time updated successfully!', 'success');
    setTimeout(() => setShowSaveAlert(false), 3000);
  };

  const handlePeriodSubjectUpdate = (periodId, subject) => {
    setPeriodSubjects(prev => ({ ...prev, [periodId]: subject }));
    updatePeriodSubject(periodId, subject);
    showTip(`${settings.schedule.periods.find(p => p.id === periodId)?.name} subject updated to ${subject}`, 'success');
  };

  const handlePeriodTimeUpdate = (periodId, startTime, endTime) => {
    setPeriodTimes(prev => ({ 
      ...prev, 
      [periodId]: { start: startTime, end: endTime }
    }));
    updatePeriodTime(periodId, startTime, endTime);
    showTip(`${settings.schedule.periods.find(p => p.id === periodId)?.name} time updated`, 'success');
  };

  const handleEmailNotificationToggle = async (enabled) => {
    if (!user?.uid) return;
    
    setSavingEmailPref(true);
    try {
      await updateUser(user.uid, { emailNotificationsEnabled: enabled });
      setEmailNotificationsEnabled(enabled);
      showTip(
        enabled 
          ? 'Daily homework emails enabled! You\'ll receive reports at 2:00 PM ET.' 
          : 'Daily homework emails disabled.',
        enabled ? 'success' : 'info'
      );
    } catch (error) {
      console.error('Error updating email preference:', error);
      showTip('Failed to update email preference. Please try again.', 'danger');
    } finally {
      setSavingEmailPref(false);
    }
  };

  const handleHomeworkReminderToggle = async (enabled) => {
    if (!user?.uid) return;
    
    setSavingReminderPref(true);
    try {
      await updateUser(user.uid, { homeworkReminderEnabled: enabled });
      setHomeworkReminderEnabled(enabled);
      showTip(
        enabled 
          ? 'Homework reminders enabled! You\'ll get a nudge at 6:30 PM ET if you have unsubmitted work.' 
          : 'Homework reminders disabled.',
        enabled ? 'success' : 'info'
      );
    } catch (error) {
      console.error('Error updating reminder preference:', error);
      showTip('Failed to update reminder preference. Please try again.', 'danger');
    } finally {
      setSavingReminderPref(false);
    }
  };

  const handleRequestScope = async (scopeName) => {
    setRequestingScope(scopeName);
    try {
      let success = false;
      
      if (scopeName === 'classroom') {
        await enableClassroomAccess();
        success = true;
        // Reload page to refresh connection status
        setTimeout(() => window.location.reload(), 1000);
      } else if (scopeName === 'drive') {
        success = await requestDriveAccess();
      } else if (scopeName === 'gmail') {
        success = await requestGmailAccess();
      }
      
      if (success) {
        setScopeStatus(prev => ({ ...prev, [scopeName]: true }));
        showTip(`${scopeName.charAt(0).toUpperCase() + scopeName.slice(1)} access granted!`, 'success', 4000);
      } else {
        showTip(`Failed to grant ${scopeName} access. Please try again.`, 'danger', 4000);
      }
    } catch (error) {
      console.error(`Error requesting ${scopeName} access:`, error);
      showTip(`Error: ${error.message}`, 'danger', 4000);
    } finally {
      setRequestingScope(null);
    }
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
        <div className="jumbotron mb-4">
          <h1 className="display-4">
            <i className="fas fa-cog me-3"></i>
            Settings & Preferences
          </h1>
          <p className="lead">Customize your StudyBuddy experience, schedule, and preferences.</p>
        </div>

        {showSaveAlert && (
          <Alert variant="success" dismissible onClose={() => setShowSaveAlert(false)}>
            <i className="fas fa-check-circle me-2"></i>
            Settings saved successfully!
          </Alert>
        )}

        <Row>
          <Col lg={12}>
            <Card className="shadow-sm settings-card">
              <Card.Body>
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-4 custom-tabs"
                >
                  {/* Schedule Settings Tab */}
                  <Tab eventKey="schedule" title={
                    <span><i className="fas fa-calendar-alt me-2"></i>Schedule</span>
                  }>
                    <div className="schedule-settings">
                      <h4 className="mb-4">High School Schedule Configuration</h4>
                      
                      {/* Period Configuration */}
                      <Row>
                        {settings.schedule.periods.map((period) => (
                          <Col xs={12} md={6} key={period.id} className="mb-4">
                            <Card className="period-config-card">
                              <Card.Header className={`period-header ${period.id === 'lunch' ? 'lunch-header' : 'class-header'}`}>
                                <h6 className="mb-0">
                                  <i className={`fas ${period.id === 'lunch' ? 'fa-utensils' : 'fa-clock'} me-2`}></i>
                                  {period.name}
                                </h6>
                              </Card.Header>
                              <Card.Body>
                                {period.id !== 'lunch' && (
                                  <Form.Group className="mb-3">
                                    <Form.Label>Subject</Form.Label>
                                    <Form.Control
                                      type="text"
                                      value={periodSubjects[period.id] || ''}
                                      onChange={(e) => handlePeriodSubjectUpdate(period.id, e.target.value)}
                                      placeholder="Enter subject name"
                                    />
                                  </Form.Group>
                                )}
                                
                                <Row>
                                  <Col sm={6}>
                                    <Form.Group className="mb-3">
                                      <Form.Label>Start Time</Form.Label>
                                      <Form.Control
                                        type="time"
                                        value={periodTimes[period.id]?.start || period.startTime}
                                        onChange={(e) => handlePeriodTimeUpdate(
                                          period.id, 
                                          e.target.value, 
                                          periodTimes[period.id]?.end || period.endTime
                                        )}
                                      />
                                    </Form.Group>
                                  </Col>
                                  <Col sm={6}>
                                    <Form.Group className="mb-3">
                                      <Form.Label>End Time</Form.Label>
                                      <Form.Control
                                        type="time"
                                        value={periodTimes[period.id]?.end || period.endTime}
                                        onChange={(e) => handlePeriodTimeUpdate(
                                          period.id, 
                                          periodTimes[period.id]?.start || period.startTime,
                                          e.target.value
                                        )}
                                      />
                                    </Form.Group>
                                  </Col>
                                </Row>
                                
                                <div className="text-muted">
                                  <small>Duration: {period.duration} minutes</small>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </Tab>

                  {/* General Settings Tab */}
                  <Tab eventKey="general" title={
                    <span><i className="fas fa-sliders-h me-2"></i>General</span>
                  }>
                    <div className="general-settings">
                      <h4 className="mb-4">General Preferences</h4>
                      
                      {/* Email Notifications Card */}
                      <Card className="mb-4 email-notifications-card">
                        <Card.Body>
                          <div className="d-flex align-items-start">
                            <div className="email-icon-wrapper me-3">
                              <i className="fas fa-envelope"></i>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1">Daily Homework Report Emails</h6>
                              <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                                Receive a beautiful daily email at 2:00 PM ET with your assignments due today and tomorrow, 
                                showing what you've completed and what's still pending.
                              </p>
                              <Form.Check
                                type="switch"
                                id="email-notifications-toggle"
                                label={
                                  <span>
                                    {emailNotificationsEnabled ? (
                                      <span className="text-success">
                                        <i className="fas fa-check-circle me-1"></i>
                                        Enabled
                                      </span>
                                    ) : (
                                      <span className="text-muted">Disabled</span>
                                    )}
                                    {savingEmailPref && (
                                      <span className="spinner-border spinner-border-sm ms-2" role="status">
                                        <span className="visually-hidden">Saving...</span>
                                      </span>
                                    )}
                                  </span>
                                }
                                checked={emailNotificationsEnabled}
                                onChange={(e) => handleEmailNotificationToggle(e.target.checked)}
                                disabled={savingEmailPref}
                                className="email-toggle"
                              />
                              <small className="text-muted d-block mt-2">
                                <i className="fas fa-info-circle me-1"></i>
                                You can still manually send a report anytime from your dashboard.
                              </small>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>

                      <Card className="mb-4 email-notifications-card">
                        <Card.Body>
                          <div className="d-flex align-items-start">
                            <div className="email-icon-wrapper reminder-icon me-3">
                              <i className="fas fa-bell"></i>
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1">Evening Homework Reminder</h6>
                              <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                                Get a friendly reminder at 6:30 PM ET if you have unsubmitted homework due tomorrow. 
                                Don't forget to press that turn-in button!
                              </p>
                              <Form.Check
                                type="switch"
                                id="homework-reminder-toggle"
                                label={
                                  <span>
                                    {homeworkReminderEnabled ? (
                                      <span className="text-success">
                                        <i className="fas fa-check-circle me-1"></i>
                                        Enabled
                                      </span>
                                    ) : (
                                      <span className="text-muted">Disabled</span>
                                    )}
                                    {savingReminderPref && (
                                      <span className="spinner-border spinner-border-sm ms-2" role="status">
                                        <span className="visually-hidden">Saving...</span>
                                      </span>
                                    )}
                                  </span>
                                }
                                checked={homeworkReminderEnabled}
                                onChange={(e) => handleHomeworkReminderToggle(e.target.checked)}
                                disabled={savingReminderPref}
                                className="email-toggle"
                              />
                              <small className="text-muted d-block mt-2">
                                <i className="fas fa-clock me-1"></i>
                                Only sends if you have pending assignments due the next day.
                              </small>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                      
                      <Card className="mb-4">
                        <Card.Body>
                          <h6>Notifications & Tips</h6>
                          <Form.Check
                            type="switch"
                            id="tips-toggle"
                            label="Show helpful tips and notifications"
                            checked={settings.showTips}
                            onChange={toggleTips}
                            className="mb-3"
                          />
                          <Form.Check
                            type="switch"
                            id="notifications-toggle"
                            label="Enable browser notifications"
                            checked={settings.notifications}
                            onChange={(e) => updateSetting('notifications', e.target.checked)}
                          />
                        </Card.Body>
                      </Card>

                      <Card className="mb-4">
                        <Card.Body>
                          <h6>Theme Settings</h6>
                          <Form.Select
                            value={settings.theme}
                            onChange={(e) => updateSetting('theme', e.target.value)}
                          >
                            <option value="light">Light Theme</option>
                            <option value="dark">Dark Theme</option>
                            <option value="auto">Auto (System Default)</option>
                          </Form.Select>
                        </Card.Body>
                      </Card>
                    </div>
                  </Tab>

                  {/* Account Settings Tab */}
                  <Tab eventKey="account" title={
                    <span><i className="fas fa-user me-2"></i>Account</span>
                  }>
                    <div className="account-settings">
                      <h4 className="mb-4">Account Information</h4>
                      
                      <Card className="mb-4">
                        <Card.Body>
                          <Row>
                            <Col xs={12} md={8}>
                              <h6>Profile Information</h6>
                              <p className="mb-1"><strong>Name:</strong> {user.displayName || 'Not provided'}</p>
                              <p className="mb-1"><strong>Email:</strong> {user.email}</p>
                              <p className="mb-0"><strong>Account Type:</strong> Student</p>
                            </Col>
                            <Col xs={12} md={4} className="text-center text-md-end mt-3 mt-md-0">
                              {user.photoURL && (
                                <img
                                  src={user.photoURL}
                                  alt="Profile"
                                  className="rounded-circle profile-image-large"
                                  style={{ width: '80px', height: '80px' }}
                                />
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      <Card>
                        <Card.Body>
                          <h6 className="text-danger">Danger Zone</h6>
                          <p className="text-muted">These actions cannot be undone.</p>
                          <Button variant="outline-danger" size="sm">
                            Reset All Settings
                          </Button>
                        </Card.Body>
                      </Card>
                    </div>
                  </Tab>

                  {/* Permissions Tab */}
                  <Tab eventKey="permissions" title={
                    <span><i className="fas fa-shield-alt me-2"></i>Permissions</span>
                  }>
                    <div className="permissions-settings">
                      <h4 className="mb-3">OAuth Permissions & Scopes</h4>
                      <p className="text-muted mb-4">
                        Manage which permissions you've granted to StudyBuddy. Request additional permissions as needed for specific features.
                      </p>

                      {/* Classroom Access */}
                      <Card className="mb-3 permission-card">
                        <Card.Body>
                          <Row className="align-items-center">
                            <Col xs={12} md={8}>
                              <div className="d-flex align-items-start">
                                <div className="permission-icon me-3">
                                  <i className="fas fa-chalkboard-teacher fa-2x text-primary"></i>
                                </div>
                                <div>
                                  <h5 className="mb-2">
                                    Google Classroom Access
                                    {scopeStatus.classroom && (
                                      <Badge bg="success" className="ms-2">
                                        <i className="fas fa-check-circle me-1"></i>Granted
                                      </Badge>
                                    )}
                                  </h5>
                                  <p className="text-muted mb-2">
                                    Required to view your courses, assignments, grades, and class materials.
                                  </p>
                                  <ul className="small text-muted mb-0">
                                    <li>View courses and assignments</li>
                                    <li>Access grades and submissions</li>
                                    <li>Read class rosters and teacher info</li>
                                  </ul>
                                </div>
                              </div>
                            </Col>
                            <Col xs={12} md={4} className="text-end mt-3 mt-md-0">
                              {scopeStatus.classroom ? (
                                <Badge bg="success" pill className="px-3 py-2">
                                  <i className="fas fa-check me-1"></i>Active
                                </Badge>
                              ) : (
                                <div>
                                  <Alert variant="warning" className="mb-2 small">
                                    <i className="fas fa-exclamation-triangle me-1"></i>
                                    Not connected - using mock data
                                  </Alert>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleRequestScope('classroom')}
                                    disabled={requestingScope === 'classroom'}
                                  >
                                    {requestingScope === 'classroom' ? (
                                      <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Connecting...
                                      </>
                                    ) : (
                                      <>
                                        <i className="fab fa-google me-2"></i>
                                        Connect Classroom
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      {/* Drive Access */}
                      <Card className="mb-3 permission-card">
                        <Card.Body>
                          <Row className="align-items-center">
                            <Col xs={12} md={8}>
                              <div className="d-flex align-items-start">
                                <div className="permission-icon me-3">
                                  <i className="fab fa-google-drive fa-2x text-success"></i>
                                </div>
                                <div>
                                  <h5 className="mb-2">
                                    Google Drive Access
                                    {scopeStatus.drive && (
                                      <Badge bg="success" className="ms-2">
                                        <i className="fas fa-check-circle me-1"></i>Granted
                                      </Badge>
                                    )}
                                  </h5>
                                  <p className="text-muted mb-2">
                                    Allows Study Assist to read files attached to assignments for better AI help.
                                  </p>
                                  <ul className="small text-muted mb-0">
                                    <li>Read Google Docs, Sheets, and Slides</li>
                                    <li>Access PDF attachments from teachers</li>
                                    <li>Include file content in AI study sessions</li>
                                  </ul>
                                  {!scopeStatus.drive && (
                                    <Alert variant="info" className="mt-2 mb-0 small">
                                      <i className="fas fa-info-circle me-1"></i>
                                      This permission is requested automatically when you open Study Assist with file attachments
                                    </Alert>
                                  )}
                                </div>
                              </div>
                            </Col>
                            <Col xs={12} md={4} className="text-end mt-3 mt-md-0">
                              {scopeStatus.drive ? (
                                <Badge bg="success" pill className="px-3 py-2">
                                  <i className="fas fa-check me-1"></i>Active
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleRequestScope('drive')}
                                  disabled={requestingScope === 'drive'}
                                >
                                  {requestingScope === 'drive' ? (
                                    <>
                                      <Spinner animation="border" size="sm" className="me-2" />
                                      Requesting...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fab fa-google me-2"></i>
                                      Grant Access
                                    </>
                                  )}
                                </Button>
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      {/* Gmail Access (Future Feature) */}
                      <Card className="mb-3 permission-card">
                        <Card.Body>
                          <Row className="align-items-center">
                            <Col xs={12} md={8}>
                              <div className="d-flex align-items-start">
                                <div className="permission-icon me-3">
                                  <i className="fas fa-envelope fa-2x text-danger"></i>
                                </div>
                                <div>
                                  <h5 className="mb-2">
                                    Gmail Send Access
                                    {scopeStatus.gmail && (
                                      <Badge bg="success" className="ms-2">
                                        <i className="fas fa-check-circle me-1"></i>Granted
                                      </Badge>
                                    )}
                                    <Badge bg="secondary" className="ms-2">Future Feature</Badge>
                                  </h5>
                                  <p className="text-muted mb-2">
                                    Would allow sending emails directly from StudyBuddy (not currently used).
                                  </p>
                                  <ul className="small text-muted mb-0">
                                    <li>Send emails on your behalf</li>
                                    <li>Compose messages to teachers</li>
                                    <li>Automated email notifications</li>
                                  </ul>
                                  <Alert variant="secondary" className="mt-2 mb-0 small">
                                    <i className="fas fa-lightbulb me-1"></i>
                                    Currently, "Contact Teacher" opens Gmail in a new tab without requiring this permission
                                  </Alert>
                                </div>
                              </div>
                            </Col>
                            <Col xs={12} md={4} className="text-end mt-3 mt-md-0">
                              {scopeStatus.gmail ? (
                                <Badge bg="success" pill className="px-3 py-2">
                                  <i className="fas fa-check me-1"></i>Active
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline-secondary"
                                  size="sm"
                                  onClick={() => handleRequestScope('gmail')}
                                  disabled={requestingScope === 'gmail'}
                                >
                                  {requestingScope === 'gmail' ? (
                                    <>
                                      <Spinner animation="border" size="sm" className="me-2" />
                                      Requesting...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fab fa-google me-2"></i>
                                      Grant Access
                                    </>
                                  )}
                                </Button>
                              )}
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>

                      {/* Security Note */}
                      <Card className="border-info">
                        <Card.Body>
                          <h6 className="text-info">
                            <i className="fas fa-shield-alt me-2"></i>
                            Privacy & Security
                          </h6>
                          <p className="small text-muted mb-2">
                            StudyBuddy uses OAuth 2.0 incremental consent, which means:
                          </p>
                          <ul className="small text-muted mb-2">
                            <li>You only grant permissions as you need them</li>
                            <li>You can revoke permissions anytime through your Google Account settings</li>
                            <li>We never store your passwords - authentication is handled by Google</li>
                            <li>All permissions are read-only except where explicitly stated</li>
                          </ul>
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            href="https://myaccount.google.com/permissions"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Manage Google Account Permissions
                            <i className="fas fa-external-link-alt ms-1"></i>
                          </Button>
                        </Card.Body>
                      </Card>
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      
      <style jsx>{`
        .settings-card {
          border-radius: 20px;
          border: none;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        :global(.custom-tabs .nav-link) {
          border-radius: 15px 15px 0 0;
          margin-right: 5px;
          border: none;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          color: #495057;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        :global(.custom-tabs .nav-link:hover) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: translateY(-2px);
        }
        
        :global(.custom-tabs .nav-link.active) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
        }
        
        .period-config-card {
          border-radius: 15px;
          border: none;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }
        
        .period-config-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 25px rgba(0,0,0,0.1);
        }
        
        .period-header.class-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 15px 15px 0 0;
        }
        
        .period-header.lunch-header {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
          color: white;
          border-radius: 15px 15px 0 0;
        }
        
        :global(.form-control:focus) {
          border-color: #667eea;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }
        
        :global(.form-check-input:checked) {
          background-color: #667eea;
          border-color: #667eea;
        }
        
        .profile-image-large {
          border: 4px solid #667eea;
        }
        
        .email-notifications-card {
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        
        .email-notifications-card:hover {
          border-color: #667eea;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
        }
        
        .email-icon-wrapper {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
          flex-shrink: 0;
        }

        .email-icon-wrapper.reminder-icon {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        
        :global(.email-toggle .form-check-input) {
          width: 3rem;
          height: 1.5rem;
        }
        
        :global(.email-toggle .form-check-input:checked) {
          background-color: #10b981;
          border-color: #10b981;
        }

        .permission-card {
          border-radius: 15px;
          border: none;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }

        .permission-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.12);
        }

        .permission-icon {
          min-width: 50px;
        }

        .permissions-settings h5 {
          font-size: 1.1rem;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .permission-card .text-end {
            text-align: left !important;
          }
        }
      `}</style>
    </Layout>
  );
}

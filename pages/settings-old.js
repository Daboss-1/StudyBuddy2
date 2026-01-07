import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import Layout from '../components/Layout';
import { Container, Row, Col, Card, Button, Form, Badge, Alert, Table } from 'react-bootstrap';
import { useRouter } from 'next/router';

export default function Settings() {
  const { user, loading } = useAuth();
  const { 
    settings, 
    updateLunchTime, 
    updateSetting, 
    showTip,
    toggleTips 
  } = useSettings();
  const router = useRouter();
  
  const [lunchStart, setLunchStart] = useState(settings.schedule.lunchTime.start);
  const [lunchEnd, setLunchEnd] = useState(settings.schedule.lunchTime.end);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  useEffect(() => {
    setLunchStart(settings.schedule.lunchTime.start);
    setLunchEnd(settings.schedule.lunchTime.end);
  }, [settings.schedule.lunchTime]);

  const handleLunchTimeSubmit = (e) => {
    e.preventDefault();
    updateLunchTime(lunchStart, lunchEnd);
    showTip(
      `Lunch time updated to ${lunchStart} - ${lunchEnd}! The countdown timer will reflect this change.`,
      'success'
    );
  };

  const showLunchTip = () => {
    showTip(
      'Customize your lunch period to match your school schedule. This affects the countdown timer and period transitions.',
      'info',
      8000
    );
  };

  const showTipsTip = () => {
    showTip(
      'Tips help you discover features and settings. You can disable them anytime in settings.',
      'info',
      6000
    );
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
        <div className="jumbotron">
          <h1 className="display-4">Settings</h1>
          <p className="lead">Customize your StudyBuddy experience.</p>
        </div>
      </Container>

      <Container className="mt-4">
        <Row>
          <Col lg={8} className="mx-auto">
            
            {/* Schedule Settings */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-calendar-alt me-2"></i>
                  Schedule Settings
                </h5>
              </Card.Header>
              <Card.Body>
                <Alert variant="info" className="d-flex justify-content-between align-items-center">
                  <span>
                    <i className="fas fa-info-circle me-2"></i>
                    Customize your high school schedule to match your school's timing.
                  </span>
                  <Button 
                    variant="outline-info" 
                    size="sm" 
                    onClick={showLunchTip}
                  >
                    <i className="fas fa-question-circle"></i>
                  </Button>
                </Alert>

                {/* Current Schedule Display */}
                <div className="mb-4">
                  <h6>Current Schedule:</h6>
                  <Table striped bordered size="sm">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Time</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.schedule.periods.map((period) => (
                        <tr key={period.id}>
                          <td>
                            <Badge 
                              bg={period.id === 'lunch' ? 'warning' : 'primary'}
                              className="me-2"
                            >
                              {period.name}
                            </Badge>
                          </td>
                          <td>{period.startTime} - {period.endTime}</td>
                          <td>{period.duration} minutes</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Lunch Time Customization */}
                <Form onSubmit={handleLunchTimeSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          <i className="fas fa-utensils me-2 text-warning"></i>
                          Lunch Start Time
                        </Form.Label>
                        <Form.Control
                          type="time"
                          value={lunchStart}
                          onChange={(e) => setLunchStart(e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>
                          <i className="fas fa-utensils me-2 text-warning"></i>
                          Lunch End Time
                        </Form.Label>
                        <Form.Control
                          type="time"
                          value={lunchEnd}
                          onChange={(e) => setLunchEnd(e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Button type="submit" variant="primary">
                    <i className="fas fa-save me-2"></i>
                    Update Lunch Time
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            {/* Interface Settings */}
            <Card className="mb-4 shadow-sm">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">
                  <i className="fas fa-cog me-2"></i>
                  Interface Settings
                </h5>
              </Card.Header>
              <Card.Body>
                
                {/* Tips Toggle */}
                <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                  <div>
                    <h6 className="mb-1">
                      <i className="fas fa-lightbulb me-2 text-warning"></i>
                      Show Helpful Tips
                    </h6>
                    <small className="text-muted">
                      Display floating tips to help you discover features
                    </small>
                  </div>
                  <div className="d-flex align-items-center">
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      className="me-2"
                      onClick={showTipsTip}
                    >
                      <i className="fas fa-question-circle"></i>
                    </Button>
                    <Form.Check 
                      type="switch"
                      id="tips-toggle"
                      checked={settings.showTips}
                      onChange={toggleTips}
                      label=""
                    />
                  </div>
                </div>

                {/* Theme Setting */}
                <div className="mb-3 p-3 bg-light rounded">
                  <h6 className="mb-2">
                    <i className="fas fa-palette me-2 text-info"></i>
                    Theme
                  </h6>
                  <Form.Select
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value)}
                  >
                    <option value="light">Light Theme</option>
                    <option value="dark">Dark Theme (Coming Soon)</option>
                  </Form.Select>
                </div>

                {/* Notifications Setting */}
                <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                  <div>
                    <h6 className="mb-1">
                      <i className="fas fa-bell me-2 text-primary"></i>
                      Desktop Notifications
                    </h6>
                    <small className="text-muted">
                      Get notified about upcoming classes and assignments
                    </small>
                  </div>
                  <Form.Check 
                    type="switch"
                    id="notifications-toggle"
                    checked={settings.notifications}
                    onChange={(e) => updateSetting('notifications', e.target.checked)}
                    label=""
                  />
                </div>
              </Card.Body>
            </Card>

            {/* Advanced Settings */}
            <Card className="mb-4 shadow-sm">
              <Card.Header 
                className="bg-secondary text-white d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <h5 className="mb-0">
                  <i className="fas fa-tools me-2"></i>
                  Advanced Settings
                </h5>
                <i className={`fas fa-chevron-${showAdvanced ? 'up' : 'down'}`}></i>
              </Card.Header>
              {showAdvanced && (
                <Card.Body>
                  <Alert variant="warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    These settings are for advanced users. Changes may affect app performance.
                  </Alert>
                  
                  <div className="mb-3">
                    <h6>Cache Management</h6>
                    <p className="text-muted small">
                      Clear cached data to force fresh downloads from Google Classroom.
                    </p>
                    <Button variant="outline-danger" size="sm">
                      <i className="fas fa-trash me-2"></i>
                      Clear All Cache
                    </Button>
                  </div>

                  <div className="mb-3">
                    <h6>Debug Mode</h6>
                    <Form.Check 
                      type="switch"
                      id="debug-toggle"
                      label="Enable debug console logs"
                      onChange={(e) => updateSetting('debugMode', e.target.checked)}
                    />
                  </div>
                </Card.Body>
              )}
            </Card>

            {/* Reset Settings */}
            <Card className="mb-4 shadow-sm border-danger">
              <Card.Header className="bg-danger text-white">
                <h5 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Reset Settings
                </h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted">
                  Reset all settings to default values. This cannot be undone.
                </p>
                <Button 
                  variant="outline-danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
                      localStorage.removeItem('studybuddy_settings');
                      window.location.reload();
                    }
                  }}
                >
                  <i className="fas fa-undo me-2"></i>
                  Reset All Settings
                </Button>
              </Card.Body>
            </Card>

          </Col>
        </Row>
      </Container>
    </Layout>
  );
}

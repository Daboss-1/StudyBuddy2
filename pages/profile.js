import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Image, Tabs, Tab } from 'react-bootstrap';
import { useRouter } from 'next/router';
import { getSchools } from '../lib/getSchools'
export default function Profile() {
    const {
        user,
        loading,
        updateProfile,
        hasClassroomToken,
        enableClassroomAccess,
        getCacheStats
    } = useAuth();
    const router = useRouter();

    const [profileData, setProfileData] = useState({
        displayName: '',
        email: '',
        grade: '',
        school: '',
        bio: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [schoolResults, setSchoolResults] = useState([]);
    const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/signup');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            setProfileData({
                displayName: user.displayName || '',
                email: user.email || '',
                grade: user.grade || '',
                school: user.school || '',
                bio: user.bio || ''
            });
        }
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        setMessage('');

        try {
            await updateProfile({
                displayName: profileData.displayName,
                grade: profileData.grade,
                school: profileData.school,
                bio: profileData.bio
            });

            setIsEditing(false);
            setMessage('Profile updated successfully!');

            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage('Error updating profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSchoolSearch = async (value) => {
        setProfileData(prev => ({
            ...prev,
            school: value
        }));

        if (value.length > 3) {
            try {
                const schools = await getSchools(value);
                setSchoolResults(schools || []);
                setShowSchoolDropdown(schools && schools.length > 0);
            } catch (error) {
                console.error('Error fetching schools:', error);
                setSchoolResults([]);
                setShowSchoolDropdown(false);
            }
        } else {
            setSchoolResults([]);
            setShowSchoolDropdown(false);
        }
    };

    const selectSchool = (schoolName) => {
        setProfileData(prev => ({
            ...prev,
            school: schoolName
        }));
        setShowSchoolDropdown(false);
        setSchoolResults([]);
    };

    const getAccountStats = () => {
        const joinDate = user?.metadata?.creationTime ?
            new Date(user.metadata.creationTime).toLocaleDateString() :
            'Unknown';

        const lastLogin = user?.metadata?.lastSignInTime ?
            new Date(user.metadata.lastSignInTime).toLocaleDateString() :
            'Unknown';

        return { joinDate, lastLogin };
    };

    const getCacheStatistics = () => {
        try {
            return getCacheStats ? getCacheStats() : {};
        } catch (error) {
            return {};
        }
    };

    if (loading) {
        return (
            <Layout>
                <Container className="mt-5 text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </Container>
            </Layout>
        );
    }

    if (!user) {
        return null;
    }

    const { joinDate, lastLogin } = getAccountStats();
    const cacheStats = getCacheStatistics();

    return (
        <Layout>
            <Container className="mt-5">
                {/* Profile Header */}
                <div className="profile-header text-center mb-5">
                    <div className="position-relative d-inline-block">
                        {user.photoURL ? (
                            <Image
                                src={user.photoURL}
                                alt="Profile"
                                width={120}
                                height={120}
                                className="rounded-circle mb-3 profile-photo"
                            />
                        ) : (
                            <div className="profile-placeholder-xl mb-3">
                                <i className="fas fa-user"></i>
                            </div>
                        )}
                    </div>
                    <h2 className="mb-1">{user.displayName || 'Student'}</h2>
                    <p className="text-muted mb-3">{user.email}</p>
                    {user.grade && (
                        <Badge bg="primary" className="me-2">Grade {user.grade}</Badge>
                    )}
                    {user.school && (
                        <Badge bg="outline-secondary">{user.school}</Badge>
                    )}
                </div>

                {message && (
                    <Alert variant={message.includes('Error') ? 'danger' : 'success'}>
                        {message}
                    </Alert>
                )}

                <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                    <Tab eventKey="profile" title="Profile Information">
                        <Card>
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">Personal Information</h5>
                                <Button
                                    variant={isEditing ? 'outline-secondary' : 'primary'}
                                    size="sm"
                                    onClick={() => setIsEditing(!isEditing)}
                                >
                                    {isEditing ? (
                                        <>
                                            <i className="fas fa-times me-2"></i>
                                            Cancel
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-edit me-2"></i>
                                            Edit Profile
                                        </>
                                    )}
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <Form>
                                    <Row>
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Display Name</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    value={profileData.displayName}
                                                    onChange={(e) => setProfileData(prev => ({
                                                        ...prev,
                                                        displayName: e.target.value
                                                    }))}
                                                    disabled={!isEditing}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Email</Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    value={profileData.email}
                                                    disabled
                                                    className="bg-light"
                                                />
                                                <Form.Text className="text-muted">
                                                    Email cannot be changed
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <Row>
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Grade Level</Form.Label>
                                                <Form.Select
                                                    value={profileData.grade}
                                                    onChange={(e) => setProfileData(prev => ({
                                                        ...prev,
                                                        grade: e.target.value
                                                    }))}
                                                    disabled={!isEditing}
                                                >
                                                    <option value="">Select Grade</option>
                                                    <option value="9">9th Grade</option>
                                                    <option value="10">10th Grade</option>
                                                    <option value="11">11th Grade</option>
                                                    <option value="12">12th Grade</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>School</Form.Label>
                                                <div className="position-relative">
                                                    <Form.Control
                                                        type="text"
                                                        value={profileData.school}
                                                        onChange={(e) => handleSchoolSearch(e.target.value)}
                                                        disabled={!isEditing}
                                                        placeholder="Enter your school name"
                                                        onFocus={() => {
                                                            if (schoolResults.length > 0) {
                                                                setShowSchoolDropdown(true);
                                                            }
                                                        }}
                                                        onBlur={() => {
                                                            // Delay hiding dropdown to allow clicking on items
                                                            setTimeout(() => setShowSchoolDropdown(false), 150);
                                                        }}
                                                    />
                                                    {showSchoolDropdown && schoolResults.length > 0 && (
                                                        <div className="school-dropdown">
                                                            {schoolResults.map((school, index) => (
                                                                <div
                                                                    key={index}
                                                                    className="school-dropdown-item"
                                                                    onClick={() => selectSchool(school)}
                                                                >
                                                                    {school}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Bio</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={profileData.bio}
                                            onChange={(e) => setProfileData(prev => ({
                                                ...prev,
                                                bio: e.target.value
                                            }))}
                                            disabled={!isEditing}
                                            placeholder="Tell us about yourself..."
                                        />
                                    </Form.Group>

                                    {isEditing && (
                                        <div className="d-flex gap-2">
                                            <Button
                                                variant="success"
                                                onClick={handleSave}
                                                disabled={saving}
                                            >
                                                {saving ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-save me-2"></i>
                                                        Save Changes
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </Form>
                            </Card.Body>
                        </Card>
                    </Tab>

                    <Tab eventKey="account" title="Account Settings">
                        <Card>
                            <Card.Header>
                                <h5 className="mb-0">Account Information</h5>
                            </Card.Header>
                            <Card.Body>
                                <Row>
                                    <Col xs={12} md={6}>
                                        <Card className="mb-3">
                                            <Card.Body>
                                                <h6><i className="fas fa-calendar-alt me-2"></i>Account Created</h6>
                                                <p className="mb-0">{joinDate}</p>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col xs={12} md={6}>
                                        <Card className="mb-3">
                                            <Card.Body>
                                                <h6><i className="fas fa-clock me-2"></i>Last Login</h6>
                                                <p className="mb-0">{lastLogin}</p>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                <Card className="mb-3">
                                    <Card.Header>
                                        <h6 className="mb-0"><i className="fas fa-google me-2"></i>Google Classroom Integration</h6>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <p className="mb-1">
                                                    <strong>Status:</strong>{' '}
                                                    <Badge bg={user.hasClassroomAccess ? 'success' : 'secondary'}>
                                                        {user.hasClassroomAccess ? 'Connected' : 'Not Connected'}
                                                    </Badge>
                                                </p>
                                                <p className="mb-0 text-muted">
                                                    {user.hasClassroomAccess ?
                                                        'Your Google Classroom is connected and syncing.' :
                                                        'Connect your Google Classroom to see real assignments and grades.'
                                                    }
                                                </p>
                                            </div>
                                            {!user.hasClassroomAccess && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={enableClassroomAccess}
                                                >
                                                    <i className="fas fa-google me-2"></i>
                                                    Connect
                                                </Button>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Card.Body>
                        </Card>
                    </Tab>

                    <Tab eventKey="activity" title="Activity Stats">
                        <Card>
                            <Card.Header>
                                <h5 className="mb-0">Your StudyBuddy Activity</h5>
                            </Card.Header>
                            <Card.Body>
                                <Row>
                                    <Col xs={12} md={4}>
                                        <div className="text-center mb-3 mb-md-0">
                                            <div className="activity-stat">
                                                <h3 className="text-primary">{cacheStats.courses?.dataSize || 0}</h3>
                                                <p className="text-muted mb-0">Courses</p>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={12} md={4}>
                                        <div className="text-center mb-3 mb-md-0">
                                            <div className="activity-stat">
                                                <h3 className="text-success">{cacheStats.assignments?.dataSize || 0}</h3>
                                                <p className="text-muted mb-0">Assignments</p>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={12} md={4}>
                                        <div className="text-center mb-3 mb-md-0">
                                            <div className="activity-stat">
                                                <h3 className="text-info">{cacheStats.grades?.dataSize || 0}</h3>
                                                <p className="text-muted mb-0">Grades</p>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                {user.hasClassroomAccess && (
                                    <div className="mt-4">
                                        <h6>Data Sync Information</h6>
                                        <ul className="list-unstyled">
                                            <li>
                                                <strong>Courses Last Updated:</strong>{' '}
                                                {cacheStats.courses?.lastUpdate ?
                                                    new Date(cacheStats.courses.lastUpdate).toLocaleString() :
                                                    'Never'
                                                }
                                            </li>
                                            <li>
                                                <strong>Assignments Last Updated:</strong>{' '}
                                                {cacheStats.assignments?.lastUpdate ?
                                                    new Date(cacheStats.assignments.lastUpdate).toLocaleString() :
                                                    'Never'
                                                }
                                            </li>
                                            <li>
                                                <strong>Grades Last Updated:</strong>{' '}
                                                {cacheStats.grades?.lastUpdate ?
                                                    new Date(cacheStats.grades.lastUpdate).toLocaleString() :
                                                    'Never'
                                                }
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Tab>
                </Tabs>
            </Container>

            <style jsx>{`
        .profile-header {
          padding: 2rem 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: -2rem -15px 2rem -15px;
          border-radius: 0 0 25px 25px;
          color: white;
        }
        
        .profile-photo {
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .profile-placeholder-xl {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          color: #6c757d;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          margin: 0 auto;
        }
        
        .activity-stat {
          padding: 1rem;
          border-radius: 10px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          margin-bottom: 1rem;
        }
        
        .activity-stat h3 {
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .school-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 0.375rem;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
        }

        .school-dropdown-item {
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-bottom: 1px solid #f8f9fa;
          transition: background-color 0.15s ease-in-out;
        }

        .school-dropdown-item:hover {
          background-color: #f8f9fa;
        }

        .school-dropdown-item:last-child {
          border-bottom: none;
        }
      `}</style>
        </Layout>
    );
}

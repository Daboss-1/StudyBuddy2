import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import Layout from '../components/Layout';
import ClassroomEmptyNotice from '../components/ClassroomEmptyNotice';
import { Container, Row, Col, Card, Button, Form, Badge } from 'react-bootstrap';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Courses() {
  const { 
    user, 
    loading, 
    callClassroomAPI, 
    getCachedClassroomData, 
    subscribeToCacheUpdates, 
    hasClassroomToken,
    cacheInitialized 
  } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCourse, setNewCourse] = useState({ name: '', description: '', period: 1 });
  const [isRealData, setIsRealData] = useState(false);
  const [realDataEmpty, setRealDataEmpty] = useState(false);

  // Calculate accurate average grade for a course
  const calculateCourseGrade = (assignments) => {
    if (!assignments || assignments.length === 0) return null;
    
    const gradedAssignments = assignments.filter(assignment => 
      assignment.grade !== undefined && assignment.grade !== null && assignment.maxGrade > 0
    );
    
    if (gradedAssignments.length === 0) return null;
    
    const totalPoints = gradedAssignments.reduce((sum, assignment) => 
      sum + (assignment.grade || 0), 0
    );
    const totalPossible = gradedAssignments.reduce((sum, assignment) => 
      sum + (assignment.maxGrade || 100), 0
    );
    
    return Math.round((totalPoints / totalPossible) * 100);
  };

  // Get period name for a course
  const getPeriodName = (periodNumber) => {
    const period = settings.schedule?.periods.find(p => p.id === periodNumber);
    return period ? `${period.name} (${period.subject || 'Unassigned'})` : `Period ${periodNumber}`;
  };

  // Create safe HTML ID from course name (same as grades page)
  const createSafeId = (courseName) => {
    return courseName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadCourses();
    }
  }, [user]);

  // Subscribe to cache updates
  useEffect(() => {
    if (!cacheInitialized || !user) return;

    const unsubscribe = subscribeToCacheUpdates('courses', (data) => {
      console.log('Received courses update from cache:', data.length, 'courses');
      if (user.hasClassroomAccess && data.length === 0) {
        setRealDataEmpty(true);
      }
      updateCoursesFromCacheData(data);
    });

    return () => unsubscribe();
  }, [cacheInitialized, user]);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      
      // Use cached data if available and initialized
      if (user.hasClassroomAccess && cacheInitialized) {
        try {
          const cachedCourses = await getCachedClassroomData('courses');
          
          if (cachedCourses && Array.isArray(cachedCourses) && cachedCourses.length > 0) {
            updateCoursesFromCacheData(cachedCourses);
            return;
          } else if (cachedCourses && Array.isArray(cachedCourses) && cachedCourses.length === 0) {
            setRealDataEmpty(true);
          }
        } catch (cacheError) {
          console.warn('Cache error, falling back to mock data:', cacheError.message);
        }
      }
      
      // Fallback to mock data
      if (user.hasClassroomAccess) {
        try {
          console.log('Using mock Classroom API for courses');
          const coursesData = await callClassroomAPI('getCourses');
          setIsRealData(false);
          
          // Transform classroom courses to our format
          const transformedCourses = coursesData.map(course => ({
            id: course.id,
            name: course.name,
            description: course.description || course.descriptionHeading || 'No description available',
            teacher: course.teacherFolder?.title || course.ownerId || 'Unknown Teacher',
            period: Math.floor(Math.random() * 4) + 1, // Random period 1-4
            progress: Math.floor(Math.random() * 40 + 60), // Random progress 60-100%
            assignments: course.assignments || [],
            averageGrade: calculateCourseGrade(course.assignments || []),
            alternateLink: course.alternateLink
          }));
          
          setCourses(transformedCourses);
        } catch (error) {
          console.error('Mock API error:', error);
          loadStaticMockCourses();
        }
      } else {
        // Fallback to static mock data if no classroom access
        loadStaticMockCourses();
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading courses:', error);
      loadStaticMockCourses();
      setIsLoading(false);
    }
  };

  // Update courses from cached data
  const updateCoursesFromCacheData = (cachedData) => {
    // Transform classroom courses to our format
    const transformedCourses = cachedData.map(course => ({
      id: course.id,
      name: course.name,
      description: course.description || course.descriptionHeading || 'No description available',
      teacher: course.teacherFolder?.title || course.ownerId || 'Unknown Teacher',
      period: Math.floor(Math.random() * 4) + 1, // Random period 1-4
      progress: Math.floor(Math.random() * 40 + 60), // Random progress 60-100%
      assignments: course.assignments || [],
      averageGrade: calculateCourseGrade(course.assignments || []),
      alternateLink: course.alternateLink
    }));
    
    setCourses(transformedCourses);
    setIsRealData(true);
    setIsLoading(false);
    console.log('Courses updated with cached data:', transformedCourses.length, 'courses');
  };

  // Load static mock courses
  const loadStaticMockCourses = () => {
    setCourses([
      {
        id: 'math101',
        name: 'Math 101',
        description: 'Introduction to Algebra',
        period: 1,
        progress: 75,
        averageGrade: 87,
        assignments: [
          { title: 'Algebra Homework', dueDate: '2024-12-25', completed: false, grade: 85, maxGrade: 100 },
          { title: 'Quiz 1', dueDate: '2024-12-20', completed: true, grade: 92, maxGrade: 100 }
        ]
      },
      {
        id: 'science',
        name: 'Science',
        description: 'General Science Course',
        period: 2,
        progress: 60,
        averageGrade: 91,
        assignments: [
          { title: 'Lab Report', dueDate: '2024-12-26', completed: false, grade: 88, maxGrade: 100 },
          { title: 'Chapter 5 Questions', dueDate: '2024-12-22', completed: true, grade: 94, maxGrade: 100 }
        ]
      }
    ]);
    setIsRealData(false);
  };

  const addCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.name) return;

    try {
      // TODO: Add course to Firestore
      const course = {
        id: newCourse.name.toLowerCase().replace(/\s+/g, ''),
        name: newCourse.name,
        description: newCourse.description,
        period: newCourse.period,
        progress: 0,
        averageGrade: null,
        assignments: []
      };
      
      setCourses(prev => [...prev, course]);
      setNewCourse({ name: '', description: '', period: 1 });
    } catch (error) {
      console.error('Error adding course:', error);
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
        <div className="jumbotron">
          <h1 className="display-4">My Courses</h1>
          <p className="lead">Manage your courses and track your progress.</p>
          {isRealData && (
            <div className="alert alert-success mt-3">
              <i className="fas fa-check-circle me-2"></i>
              Showing real Google Classroom data (cached for efficiency)
            </div>
          )}
          {!isRealData && user.hasClassroomAccess && (
            <div className="alert alert-info mt-3">
              <i className="fas fa-info-circle me-2"></i>
              Showing simulated course data - Enable Classroom access for real data
            </div>
          )}
        </div>
      </Container>

      {/* Add Course Form */}
      <Container className="mt-4">
        <Card>
          <Card.Header>
            <h4>Add New Course</h4>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={addCourse}>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Course Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={newCourse.name}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter course name"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={newCourse.description}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter course description"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Period</Form.Label>
                    <Form.Select
                      value={newCourse.period}
                      onChange={(e) => setNewCourse(prev => ({ ...prev, period: parseInt(e.target.value) }))}
                    >
                      {settings.schedule?.periods.filter(p => p.id !== 'lunch').map(period => (
                        <option key={period.id} value={period.id}>
                          {getPeriodName(period.id)}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button type="submit" variant="primary" className="mb-3 w-100">
                    Add Course
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      </Container>

      {/* Courses List */}
      <Container className="mt-5">
        {realDataEmpty && user.hasClassroomAccess && (
          <ClassroomEmptyNotice />
        )}
        
        {isLoading ? (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading courses...</span>
            </div>
          </div>
        ) : (
          <Row>
            {courses.map((course) => (
              <Col xs={12} md={6} lg={4} className="mb-4" key={course.id}>
                <Card className="h-100 shadow-sm course-card">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title className="text-primary course-title">{course.name}</Card.Title>
                      <Badge 
                        bg="outline-primary" 
                        className="period-badge"
                        style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          color: 'white'
                        }}
                      >
                        {getPeriodName(course.period)}
                      </Badge>
                    </div>
                    
                    <Card.Text className="text-muted">{course.description}</Card.Text>
                    
                    {/* Average Grade Display */}
                    {course.averageGrade !== null && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">Current Grade</small>
                          <small className={`fw-bold ${
                            course.averageGrade >= 90 ? 'text-success' : 
                            course.averageGrade >= 80 ? 'text-primary' : 
                            course.averageGrade >= 70 ? 'text-warning' : 'text-danger'
                          }`}>
                            {course.averageGrade}%
                          </small>
                        </div>
                        <div className="progress mb-2">
                          <div
                            className={`progress-bar ${
                              course.averageGrade >= 90 ? 'bg-success' : 
                              course.averageGrade >= 80 ? 'bg-primary' : 
                              course.averageGrade >= 70 ? 'bg-warning' : 'bg-danger'
                            }`}
                            role="progressbar"
                            style={{ width: `${course.averageGrade}%` }}
                            aria-valuenow={course.averageGrade}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Course Progress</small>
                        <small className="text-muted">{course.progress}%</small>
                      </div>
                      <div className="progress">
                        <div
                          className="progress-bar bg-info"
                          role="progressbar"
                          style={{ width: `${course.progress}%` }}
                          aria-valuenow={course.progress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                    </div>

                    {/* Assignments Summary */}
                    <div className="mb-3">
                      <small className="text-muted">
                        {course.assignments.filter(a => !a.completed).length} pending assignments
                      </small>
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        as={Link}
                        href={`/course/${course.id}`}
                        variant="primary"
                        size="sm"
                        className="course-btn"
                      >
                        View Details
                      </Button>
                      <Button
                        as={Link}
                        href={`/grades#${createSafeId(course.name)}`}
                        variant="outline-primary"
                        size="sm"
                        className="course-btn"
                      >
                        Assignments
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
            
            {courses.length === 0 && (
              <Col xs={12}>
                <Card className="text-center">
                  <Card.Body>
                    <h5>No courses yet</h5>
                    <p className="text-muted">Add your first course using the form above.</p>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Container>
      
      <style jsx>{`
        .course-card {
          border-radius: 20px;
          border: none;
          transition: all 0.3s ease;
        }
        
        .course-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
        }
        
        .course-title {
          font-size: 1.2rem;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .period-badge {
          font-size: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-radius: 15px;
          font-weight: 500;
        }
        
        .course-btn {
          border-radius: 15px;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .course-btn:hover {
          transform: translateY(-2px);
        }
        
        :global(.progress) {
          height: 8px;
          border-radius: 10px;
          background-color: #f1f3f4;
        }
        
        :global(.progress-bar) {
          border-radius: 10px;
        }
      `}</style>
    </Layout>
  );
}

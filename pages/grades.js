import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import StudyAssistModal from '../components/StudyAssistModal';
import ContactTeacherDropdown from '../components/ContactTeacherDropdown';
import { Container, Row, Col, Card, Button, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { useRouter } from 'next/router';

export default function Grades() {
  const { 
    user, 
    loading, 
    callClassroomAPI, 
    getCachedClassroomData, 
    subscribeToCacheUpdates, 
    hasClassroomToken, 
    enableClassroomAccess,
    cacheInitialized 
  } = useAuth();
  const router = useRouter();
  const [gradesData, setGradesData] = useState({
    courses: [],
    loading: true,
    error: null,
    classroomConnected: false
  });
  const [showStudyAssist, setShowStudyAssist] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const handleStudyAssist = (assignment) => {
    setSelectedAssignment(assignment);
    setShowStudyAssist(true);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  // Handle URL hash changes for direct navigation
  useEffect(() => {
    const handleRouteChange = () => {
      const hash = router.asPath.split('#')[1];
      if (hash && !gradesData.loading && gradesData.courses.length > 0) {
        setTimeout(() => {
          const decodedHash = decodeURIComponent(hash);
          
          // Try multiple strategies to find the element
          let element = null;
          
          // Strategy 1: Try direct ID match with decoded hash
          element = document.getElementById(decodedHash);
          
          // Strategy 2: Try safe ID version of decoded hash
          if (!element) {
            element = document.getElementById(createSafeId(decodedHash));
          }
          
          // Strategy 3: Find course by name and use its safe ID
          if (!element) {
            const targetCourse = gradesData.courses.find(course => 
              course.name === decodedHash || 
              course.name.toLowerCase() === decodedHash.toLowerCase() ||
              createSafeId(course.name) === decodedHash ||
              createSafeId(course.name) === createSafeId(decodedHash)
            );
            
            if (targetCourse) {
              element = document.getElementById(createSafeId(targetCourse.name));
            }
          }
          
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
            
            // Add a temporary highlight effect to indicate we've scrolled to this section
            element.style.transition = 'box-shadow 0.3s ease';
            element.style.boxShadow = '0 0 20px rgba(13, 110, 253, 0.5)';
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 2000);
          }
        }, 300);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, gradesData.loading, gradesData.courses]);

  useEffect(() => {
    if (user && user.hasClassroomAccess) {
      loadGradesData();
    } else if (user) {
      setGradesData(prev => ({ ...prev, loading: false, classroomConnected: false }));
    }
  }, [user]);

  // Subscribe to cache updates
  useEffect(() => {
    if (!cacheInitialized || !user) return;

    const unsubscribe = subscribeToCacheUpdates('grades', (data) => {
      console.log('Received grades update from cache:', data.length, 'courses');
      updateGradesFromCacheData(data);
    });

    return () => unsubscribe();
  }, [cacheInitialized, user]);

  // Handle scrolling to course section when data loads
  useEffect(() => {
    if (!gradesData.loading && gradesData.courses.length > 0) {
      const hash = router.asPath.split('#')[1];
      if (hash) {
        // Wait a bit for the DOM to update, then scroll
        setTimeout(() => {
          const decodedHash = decodeURIComponent(hash);
          
          // Try multiple strategies to find the element
          let element = null;
          
          // Strategy 1: Try direct ID match with decoded hash
          element = document.getElementById(decodedHash);
          
          // Strategy 2: Try safe ID version of decoded hash
          if (!element) {
            element = document.getElementById(createSafeId(decodedHash));
          }
          
          // Strategy 3: Find course by name and use its safe ID
          if (!element) {
            const targetCourse = gradesData.courses.find(course => 
              course.name === decodedHash || 
              course.name.toLowerCase() === decodedHash.toLowerCase() ||
              createSafeId(course.name) === decodedHash ||
              createSafeId(course.name) === createSafeId(decodedHash)
            );
            
            if (targetCourse) {
              element = document.getElementById(createSafeId(targetCourse.name));
            }
          }
          
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
            
            // Add a temporary highlight effect to indicate we've scrolled to this section
            element.style.transition = 'box-shadow 0.3s ease';
            element.style.boxShadow = '0 0 20px rgba(13, 110, 253, 0.5)';
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 2000);
          }
        }, 300); // Increased delay to ensure DOM is ready
      }
    }
  }, [gradesData.loading, gradesData.courses, router.asPath]);

  const loadGradesData = async () => {
    try {
      setGradesData(prev => ({ ...prev, loading: true, error: null }));
      
      // Use cached data if available and initialized
      if (user.hasClassroomAccess && cacheInitialized) {
        try {
          const cachedGrades = await getCachedClassroomData('grades');
          
          if (cachedGrades && Array.isArray(cachedGrades) && cachedGrades.length > 0) {
            updateGradesFromCacheData(cachedGrades);
            return;
          }
        } catch (cacheError) {
          console.warn('Cache error, falling back to mock data:', cacheError.message);
        }
      }
      
      // Fallback to mock data
      console.log('Using mock Classroom API for grades');
      let courses;
      let isRealData = false;
      
      courses = await callClassroomAPI('getCourses');
      console.log('Courses:', courses);
      
      // Get grades for each course
      const coursesWithGrades = await Promise.all(
        courses.map(async (course) => {
          try {
            const [overallGrade, courseGrades] = await Promise.all([
              callClassroomAPI('getCourseOverallGrade', course.id),
              callClassroomAPI('getCourseGrades', course.id)
            ]);
            
            return {
              ...course,
              overallGrade,
              assignments: courseGrades
            };
          } catch (error) {
            console.error(`Error loading grades for ${course.name}:`, error);
            return {
              ...course,
              overallGrade: { overallGrade: null, error: true },
              assignments: []
            };
          }
        })
      );

      setGradesData({
        courses: coursesWithGrades,
        loading: false,
        error: null,
        classroomConnected: isRealData
      });
    } catch (error) {
      console.error('Error loading grades:', error);
      setGradesData(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        classroomConnected: false
      }));
    }
  };

  // Update grades from cached data
  const updateGradesFromCacheData = (cachedData) => {
    const coursesWithGrades = cachedData.map(courseData => ({
      id: courseData.courseId,
      name: courseData.courseName,
      overallGrade: courseData.overallGrade,
      assignments: courseData.assignments || []
    }));

    setGradesData({
      courses: coursesWithGrades,
      loading: false,
      error: null,
      classroomConnected: true
    });
    
    console.log('Grades updated with cached data:', coursesWithGrades.length, 'courses');
  };

  const getGradeColor = (grade) => {
    if (grade === null || grade === undefined) return 'secondary';
    if (grade >= 90) return 'success';
    if (grade >= 80) return 'primary';
    if (grade >= 70) return 'warning';
    return 'danger';
  };

  const getGradeLetter = (grade) => {
    if (grade === null || grade === undefined) return 'N/A';
    if (grade >= 97) return 'A+';
    if (grade >= 93) return 'A';
    if (grade >= 90) return 'A-';
    if (grade >= 87) return 'B+';
    if (grade >= 83) return 'B';
    if (grade >= 80) return 'B-';
    if (grade >= 77) return 'C+';
    if (grade >= 73) return 'C';
    if (grade >= 70) return 'C-';
    if (grade >= 67) return 'D+';
    if (grade >= 65) return 'D';
    return 'F';
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return 'No due date';
    const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
    return date.toLocaleDateString();
  };

  // Create safe HTML ID from course name
  const createSafeId = (courseName) => {
    return courseName.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  if (loading || !user) {
    return (
      <Layout>
        <Container className="mt-5 text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-5">
        <div className="jumbotron">
          <h1 className="display-4">My Grades</h1>
          <p className="lead">View your Google Classroom grades and progress.</p>
        </div>
      </Container>

      <Container className="mt-4">
        {!gradesData.classroomConnected && (
          <Alert variant="warning">
            <Alert.Heading>Google Classroom Not Connected</Alert.Heading>
            <p>
              To view your grades, you need to enable Google Classroom access.
            </p>
            <Button variant="primary" onClick={enableClassroomAccess}>
              Enable Classroom Access
            </Button>
          </Alert>
        )}

        {gradesData.error && (
          <Alert variant="danger">
            <Alert.Heading>Error Loading Grades</Alert.Heading>
            <p>{gradesData.error}</p>
            <Button variant="outline-danger" onClick={loadGradesData}>
              Try Again
            </Button>
          </Alert>
        )}

        {gradesData.loading ? (
          <div className="text-center">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading grades...</span>
            </Spinner>
            <p className="mt-2">Loading your grades from Google Classroom...</p>
          </div>
        ) : gradesData.courses.length === 0 ? (
          <Alert variant="info">
            <h5>No Courses Found</h5>
            <p>No active courses found in your Google Classroom account.</p>
          </Alert>
        ) : (
          <>
            {/* Overall Grades Summary */}
            <Row className="mb-4">
              {gradesData.courses.map((course) => (
                <Col md={6} lg={4} className="mb-3" key={course.id}>
                  <Card className="h-100">
                    <Card.Header>
                      <h5 className="mb-0">{course.name}</h5>
                      <small className="text-muted">{course.section}</small>
                    </Card.Header>
                    <Card.Body className="text-center">
                      {course.overallGrade?.error ? (
                        <p className="text-muted">Unable to calculate grade</p>
                      ) : course.overallGrade?.overallGrade !== null ? (
                        <>
                          <h2 className={`text-${getGradeColor(course.overallGrade.overallGrade)}`}>
                            {course.overallGrade.overallGrade}%
                          </h2>
                          <Badge bg={getGradeColor(course.overallGrade.overallGrade)} className="mb-2">
                            {getGradeLetter(course.overallGrade.overallGrade)}
                          </Badge>
                          <p className="small text-muted">
                            {course.overallGrade.gradedAssignments} of {course.overallGrade.totalAssignments} assignments graded
                          </p>
                        </>
                      ) : (
                        <p className="text-muted">No graded assignments yet</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Detailed Assignment Grades */}
            {gradesData.courses.map((course) => (
              <Card id={createSafeId(course.name)} className="mb-4" key={course.id}>
                <Card.Header>
                  <h4>{course.name} - Assignment Details</h4>
                </Card.Header>
                <Card.Body>
                  {course.assignments.length === 0 ? (
                    <p className="text-muted">No assignments found for this course.</p>
                  ) : (
                    <div className="table-responsive">
                      <Table responsive striped className="d-none d-md-table">
                        <thead>
                          <tr>
                            <th>Assignment</th>
                            <th>Due Date</th>
                            <th>Points Possible</th>
                            <th>Grade</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {course.assignments.map((assignment, index) => (
                            <tr key={index}>
                              <td>
                                <strong>{assignment.title}</strong>
                                {assignment.description && (
                                  <div className="small text-muted">
                                    {assignment.description.substring(0, 100)}
                                    {assignment.description.length > 100 && '...'}
                                  </div>
                                )}
                              </td>
                              <td>{formatDate(assignment.dueDate)}</td>
                              <td>{assignment.maxPoints || 'Ungraded'}</td>
                              <td>
                                {assignment.submission?.assignedGrade !== undefined ? (
                                  <Badge bg={getGradeColor(
                                    (assignment.submission.assignedGrade / assignment.maxPoints) * 100
                                  )}>
                                    {assignment.submission.assignedGrade}/{assignment.maxPoints}
                                  </Badge>
                                ) : assignment.submission?.draftGrade !== undefined ? (
                                  <Badge bg="secondary">
                                    Draft: {assignment.submission.draftGrade}/{assignment.maxPoints}
                                  </Badge>
                                ) : (
                                  <Badge bg="secondary">Not Graded</Badge>
                                )}
                              </td>
                              <td>
                                <Badge 
                                  bg={
                                    assignment.submission?.state === 'TURNED_IN' ? 'success' :
                                    assignment.submission?.state === 'RETURNED' ? 'primary' :
                                    assignment.submission?.state === 'CREATED' ? 'warning' :
                                    'secondary'
                                  }
                                >
                                  {assignment.submission?.state || 'Not Submitted'}
                                </Badge>
                              </td>
                              <td>
                                <div className="d-flex gap-2 flex-wrap">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => {
                                      handleStudyAssist({
                                        ...assignment,
                                        courseId: course.id,
                                        courseWorkId: assignment.courseWorkId || assignment.id,
                                        courseName: course.name
                                      })
                                    }}
                                  >
                                    <i className="fas fa-robot me-1"></i>
                                    Study Assist
                                  </Button>
                                  <ContactTeacherDropdown
                                    courseId={course.id}
                                    assignmentTitle={assignment.title}
                                    courseName={course.name}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      
                      {/* Mobile Card View */}
                      <div className="d-md-none">
                        {course.assignments.map((assignment, index) => (
                          <Card key={index} className="mb-3">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="mb-0 flex-grow-1">{assignment.title}</h6>
                                <Badge 
                                  bg={
                                    assignment.submission?.state === 'TURNED_IN' ? 'success' :
                                    assignment.submission?.state === 'RETURNED' ? 'primary' :
                                    assignment.submission?.state === 'CREATED' ? 'warning' :
                                    'secondary'
                                  }
                                  className="ms-2"
                                >
                                  {assignment.submission?.state || 'Not Submitted'}
                                </Badge>
                              </div>
                              
                              {assignment.description && (
                                <p className="small text-muted mb-2">
                                  {assignment.description.substring(0, 80)}
                                  {assignment.description.length > 80 && '...'}
                                </p>
                              )}
                              
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <small className="text-muted">
                                  <i className="far fa-calendar me-1"></i>
                                  {formatDate(assignment.dueDate)}
                                </small>
                                <div>
                                  {assignment.submission?.assignedGrade !== undefined ? (
                                    <Badge bg={getGradeColor(
                                      (assignment.submission.assignedGrade / assignment.maxPoints) * 100
                                    )}>
                                      {assignment.submission.assignedGrade}/{assignment.maxPoints}
                                    </Badge>
                                  ) : assignment.submission?.draftGrade !== undefined ? (
                                    <Badge bg="secondary">
                                      Draft: {assignment.submission.draftGrade}/{assignment.maxPoints}
                                    </Badge>
                                  ) : (
                                    <Badge bg="secondary">Not Graded</Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="flex-fill"
                                  onClick={() => {
                                    handleStudyAssist({
                                      ...assignment,
                                      courseId: course.id,
                                      courseWorkId: assignment.courseWorkId || assignment.id,
                                      courseName: course.name
                                    })
                                  }}
                                >
                                  <i className="fas fa-robot me-1"></i>
                                  Study Assist
                                </Button>
                                <ContactTeacherDropdown
                                  courseId={course.id}
                                  assignmentTitle={assignment.title}
                                  courseName={course.name}
                                />
                              </div>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </>
        )}
      </Container>
      
      {/* Study Assist Modal */}
      <StudyAssistModal
        show={showStudyAssist}
        onHide={() => setShowStudyAssist(false)}
        assignment={selectedAssignment}
      />
    </Layout>
  );
}

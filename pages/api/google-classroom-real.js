// Server-side API route for real Google Classroom integration
import GoogleClassroomService from '../../lib/googleClassroom';

export default async function handler(req, res) {
  console.log('DEBUG: API route called with method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { action, courseId, courseWorkId, accessToken } = req.body;
    console.log('DEBUG: Request body received:', {
      action,
      courseId,
      courseWorkId,
      accessTokenLength: accessToken?.length || 0
    });

    if (!accessToken) {
      console.log('DEBUG: No access token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    console.log('DEBUG: Initializing GoogleClassroomService...');
    // Initialize the Google Classroom service with the access token
    const classroomService = new GoogleClassroomService();
    await classroomService.initialize(accessToken);
    console.log('DEBUG: GoogleClassroomService initialized successfully');

    let data;

    console.log(`DEBUG: Executing action: ${action}`);
    switch (action) {
      case 'getCourses':
        data = await classroomService.getCourses();
        break;
      case 'getCourseTeachers':
        if (!courseId) {
          return res.status(400).json({ message: 'Course ID required for getCourseTeachers' });
        }
        data = await classroomService.getCourseTeachers(courseId);
        console.log('getCourseTeachers response for course', courseId, ':', JSON.stringify(data));
        break;
      case 'getCourseGrades':
        if (!courseId) {
          return res.status(400).json({ message: 'Course ID required for getCourseGrades' });
        }
        data = await classroomService.getCourseGrades(courseId);
        break;
      case 'getCourseOverallGrade':
        if (!courseId) {
          return res.status(400).json({ message: 'Course ID required for getCourseOverallGrade' });
        }
        data = await classroomService.getCourseOverallGrade(courseId);
        break;
      case 'getUpcomingAssignments':
        data = await classroomService.getUpcomingAssignments();
        break;
      case 'getDueWork':
        data = await classroomService.getDueWork();
        break;
      case 'getDueWorkToday':
        data = await classroomService.getDueWorkToday();
        break;
      case 'getDueWorkTomorrow':
        data = await classroomService.getDueWorkTomorrow();
        break;
      case 'getStudySuggestions':
        data = await classroomService.getStudySuggestions();
        break;
      case 'getAssignmentMaterials':
        if (!courseId || !courseWorkId) {
          console.log('DEBUG: Missing courseId or courseWorkId for getAssignmentMaterials');
          return res.status(400).json({ message: 'Course ID and Course Work ID required for getAssignmentMaterials' });
        }
        console.log('DEBUG: Calling getAssignmentMaterials...');
        data = await classroomService.getAssignmentMaterials(courseId, courseWorkId);
        console.log('DEBUG: getAssignmentMaterials returned:', data?.length || 0, 'materials');
        break;
      default:
        console.log('DEBUG: Invalid action provided:', action);
        return res.status(400).json({ message: 'Invalid action' });
    }

    console.log('DEBUG: Sending successful response');
    res.status(200).json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('DEBUG: Google Classroom API error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to call Google Classroom API',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

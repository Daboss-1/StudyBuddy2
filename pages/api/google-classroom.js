import { google } from 'googleapis';
import { adminAuth } from '../../lib/firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action, courseId, idToken } = req.body;

  if (!idToken) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Generate dynamic mock data that changes over time
    // This simulates real Google Classroom data updates
    const userId = decodedToken.uid;
    const currentDate = new Date();
    
    let result;

    switch (action) {
      case 'getCourses':
        result = [
          {
            id: 'course1',
            name: 'Mathematics 101',
            description: 'Advanced mathematics including algebra, geometry, and calculus',
            teacherFolder: { title: 'Mr. Smith' },
            alternateLink: 'https://classroom.google.com/c/course1',
            assignments: []
          },
          {
            id: 'course2', 
            name: 'Science 201',
            description: 'General science covering biology, chemistry, and physics',
            teacherFolder: { title: 'Ms. Johnson' },
            alternateLink: 'https://classroom.google.com/c/course2',
            assignments: []
          },
          {
            id: 'course3',
            name: 'History 150',
            description: 'World history from ancient civilizations to modern times',
            teacherFolder: { title: 'Dr. Wilson' },
            alternateLink: 'https://classroom.google.com/c/course3', 
            assignments: []
          }
        ];
        break;

      case 'getCourseGrades':
        // Generate dynamic grades based on courseId and current time
        const courseGrades = courseId === 'course1' ? [
          {
            courseWorkId: 'work1',
            title: 'Algebra Assignment 1',
            description: 'Solve quadratic equations and graph functions',
            dueDate: { year: 2025, month: 8, day: 15 },
            maxPoints: 100,
            submission: {
              id: 'sub1',
              state: 'RETURNED',
              assignedGrade: 85,
              submissionHistory: [{
                stateHistory: { state: 'TURNED_IN' },
                submissionTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
              }]
            }
          },
          {
            courseWorkId: 'work2', 
            title: 'Geometry Quiz',
            description: 'Test on triangles, circles, and coordinate geometry',
            dueDate: { year: 2025, month: 8, day: 12 },
            maxPoints: 50,
            submission: {
              id: 'sub2',
              state: 'RETURNED',
              assignedGrade: 42,
              submissionHistory: [{
                stateHistory: { state: 'TURNED_IN' },
                submissionTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
              }]
            }
          },
          {
            courseWorkId: 'work3',
            title: 'Calculus Introduction',
            description: 'Limits and derivatives practice problems',
            dueDate: { year: 2025, month: 8, day: Math.min(20, currentDate.getDate() + 3) },
            maxPoints: 75,
            submission: {
              id: 'sub3',
              state: 'CREATED',
              submissionHistory: []
            }
          }
        ] : courseId === 'course2' ? [
          {
            courseWorkId: 'sci1',
            title: 'Chemical Reactions Lab',
            description: 'Lab report on acid-base reactions',
            dueDate: { year: 2025, month: 8, day: Math.min(25, currentDate.getDate() + 5) },
            maxPoints: 100,
            submission: {
              id: 'sci_sub1',
              state: 'TURNED_IN',
              draftGrade: 88,
              submissionHistory: [{
                stateHistory: { state: 'TURNED_IN' },
                submissionTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
              }]
            }
          },
          {
            courseWorkId: 'sci2',
            title: 'Biology Cell Structure',
            description: 'Essay on cell organelles and their functions',
            dueDate: { year: 2025, month: 8, day: 18 },
            maxPoints: 80,
            submission: {
              id: 'sci_sub2',
              state: 'RETURNED',
              assignedGrade: 72
            }
          }
        ] : [
          {
            courseWorkId: 'hist1',
            title: 'World War Analysis',
            description: 'Compare causes of WWI and WWII',
            dueDate: { year: 2025, month: 8, day: 22 },
            maxPoints: 90,
            submission: {
              id: 'hist_sub1',
              state: 'CREATED'
            }
          }
        ];
        
        result = courseGrades;
        break;

      case 'getCourseOverallGrade':
        // Calculate dynamic overall grade based on courseId
        const overallGrades = {
          'course1': { overallGrade: 87, earnedPoints: 127, totalPoints: 150, gradedAssignments: 2, totalAssignments: 3 },
          'course2': { overallGrade: 78, earnedPoints: 72, totalPoints: 100, gradedAssignments: 1, totalAssignments: 2 },
          'course3': { overallGrade: null, earnedPoints: 0, totalPoints: 90, gradedAssignments: 0, totalAssignments: 1 }
        };
        result = overallGrades[courseId] || { overallGrade: null, earnedPoints: 0, totalPoints: 0, gradedAssignments: 0, totalAssignments: 0 };
        break;

      case 'getUpcomingAssignments':
        // Generate upcoming assignments based on current date
        const upcomingDays = [3, 5, 7]; // Days from now
        
        result = [
          {
            courseId: 'course1',
            courseName: 'Mathematics 101',
            courseWorkId: 'work3',
            title: 'Calculus Problem Set',
            description: 'Practice derivatives and integrals - Chapter 3-4',
            dueDate: new Date(Date.now() + upcomingDays[0] * 24 * 60 * 60 * 1000),
            maxPoints: 75,
            alternateLink: 'https://classroom.google.com/c/course1/a/work3'
          },
          {
            courseId: 'course2',
            courseName: 'Science 201', 
            courseWorkId: 'work4',
            title: 'Lab Report - Chemical Reactions',
            description: 'Complete analysis of acid-base neutralization experiment',
            dueDate: new Date(Date.now() + upcomingDays[1] * 24 * 60 * 60 * 1000),
            maxPoints: 100,
            alternateLink: 'https://classroom.google.com/c/course2/a/work4'
          },
          {
            courseId: 'course3',
            courseName: 'History 150',
            courseWorkId: 'hist2',
            title: 'Renaissance Essay',
            description: 'Analyze the impact of Renaissance on modern society',
            dueDate: new Date(Date.now() + upcomingDays[2] * 24 * 60 * 60 * 1000),
            maxPoints: 85,
            alternateLink: 'https://classroom.google.com/c/course3/a/hist2'
          }
        ].filter(assignment => assignment.dueDate > currentDate); // Only show future assignments
        break;

      case 'getStudySuggestions':
        // Generate dynamic study suggestions based on "grades"
        const suggestions = [];
        
        // Suggest improvement for courses with lower grades
        suggestions.push({
          type: 'grade_improvement',
          courseId: 'course2',
          courseName: 'Science 201',
          currentGrade: 78,
          message: 'Focus on Science 201 - current grade is 78%. Consider reviewing lab techniques.',
          priority: 'medium'
        });
        
        // Suggest preparation for upcoming assignments
        const upcomingCount = Math.floor(Math.random() * 3) + 1; // 1-3 assignments
        suggestions.push({
          type: 'upcoming_assignment',
          courseId: 'course1', 
          courseName: 'Mathematics 101',
          assignmentCount: upcomingCount,
          message: `${upcomingCount} assignment(s) due soon in Mathematics 101`,
          priority: 'high',
          assignments: ['Calculus Problem Set', 'Integration Quiz'].slice(0, upcomingCount)
        });
        
        // Time-based suggestions
        const hour = currentDate.getHours();
        if (hour >= 18 && hour <= 22) { // Evening study time
          suggestions.push({
            type: 'study_time',
            message: 'Great time for focused study! Consider reviewing today\'s materials.',
            priority: 'low'
          });
        }
        
        result = suggestions;
        break;

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.status(200).json({ 
      success: true, 
      data: result,
      timestamp: new Date().toISOString(),
      lastUpdated: 'Live data simulation - updates based on current time'
    });

  } catch (error) {
    console.error('Google Classroom API error:', error);
    
    res.status(500).json({ 
      message: 'Failed to fetch Google Classroom data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

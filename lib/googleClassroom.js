import { google } from 'googleapis';

// Google Classroom API scopes
const CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
  'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
];

class GoogleClassroomService {
  constructor() {
    this.classroom = null;
    this.accessToken = null;
  }

  // Initialize Google APIs client with user's OAuth token
  async initialize(accessToken) {
    this.accessToken = accessToken;

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Initialize Classroom API
    this.classroom = google.classroom({
      version: 'v1',
      auth: oauth2Client
    });

    // Initialize Drive API for accessing file content
    this.drive = google.drive({
      version: 'v3',
      auth: oauth2Client
    });
  }

  // Get user's courses
  async getCourses() {
    try {
      if (!this.classroom) {
        throw new Error('Classroom API not initialized');
      }

      const response = await this.classroom.courses.list({
        studentId: 'me',
        courseStates: ['ACTIVE']
      });
      console.log("THESE ARE THE FLIPPING COURSES", response.data.courses);
      return response.data.courses || [];
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  }

  // Get course work (assignments) for a specific course
  async getCourseWork(courseId) {
    try {
      if (!this.classroom) {
        throw new Error('Classroom API not initialized');
      }

      const response = await this.classroom.courses.courseWork.list({
        courseId: courseId,
        courseWorkStates: ['PUBLISHED']
      });

      return response.data.courseWork || [];
    } catch (error) {
      console.error('Error fetching course work:', error);
      throw error;
    }
  }

  // Get a specific course work item with full details including materials
  async getCourseWorkDetails(courseId, courseWorkId) {
    try {
      if (!this.classroom) {
        throw new Error('Classroom API not initialized');
      }

      const response = await this.classroom.courses.courseWork.get({
        courseId: courseId,
        id: courseWorkId
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching course work details:', error);
      throw error;
    }
  }

  // Download file and return file info for attachment to AI
  async downloadDriveFile(fileId) {
    console.log(`DEBUG: downloadDriveFile called for fileId: ${fileId}`);

    try {
      if (!this.drive) {
        throw new Error('Drive API not initialized');
      }

      console.log('DEBUG: Getting file metadata for download...');
      // Get file metadata first
      const fileInfo = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size'
      });

      console.log('DEBUG: File metadata for download:', JSON.stringify(fileInfo.data, null, 2));
      const mimeType = fileInfo.data.mimeType;
      let downloadResponse;
      let finalMimeType = mimeType;
      let fileExtension = '';

      // Handle different file types and download appropriately
      if (mimeType === 'application/vnd.google-apps.document') {
        console.log('DEBUG: Downloading Google Doc as PDF...');
        // Google Docs - export as PDF for better formatting preservation
        downloadResponse = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'application/pdf'
        }, { responseType: 'arraybuffer' });
        finalMimeType = 'application/pdf';
        fileExtension = '.pdf';
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        console.log('DEBUG: Downloading Google Slides as PDF...');
        // Google Slides - export as PDF
        downloadResponse = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'application/pdf'
        }, { responseType: 'arraybuffer' });
        finalMimeType = 'application/pdf';
        fileExtension = '.pdf';
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        console.log('DEBUG: Downloading Google Sheets as Excel...');
        // Google Sheets - export as Excel for better compatibility
        downloadResponse = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }, { responseType: 'arraybuffer' });
        finalMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = '.xlsx';
      } else if (mimeType.startsWith('text/') ||
        mimeType === 'application/pdf' ||
        mimeType.includes('document') ||
        mimeType.includes('presentation') ||
        mimeType.includes('spreadsheet')) {
        console.log('DEBUG: Downloading file directly...');
        // Direct download for supported file types
        downloadResponse = await this.drive.files.get({
          fileId: fileId,
          alt: 'media'
        }, { responseType: 'arraybuffer' });
        // Determine file extension from name or mime type
        if (fileInfo.data.name.includes('.')) {
          fileExtension = '.' + fileInfo.data.name.split('.').pop();
        } else if (mimeType === 'application/pdf') {
          fileExtension = '.pdf';
        } else if (mimeType.startsWith('text/')) {
          fileExtension = '.txt';
        }
      } else {
        // Unsupported file type
        console.log(`DEBUG: File type ${mimeType} not supported for download`);
        return {
          name: fileInfo.data.name,
          mimeType: mimeType,
          supported: false,
          error: `File type ${mimeType} not supported for AI analysis`
        };
      }

      console.log(`DEBUG: File downloaded successfully, data type: ${typeof downloadResponse.data}`);

      // Convert to Buffer first if it's an ArrayBuffer, then to base64 for JSON transmission
      let dataToSend = downloadResponse.data;
      let encoding = 'utf8';

      // Handle ArrayBuffer from Drive API
      if (downloadResponse.data instanceof ArrayBuffer) {
        console.log(`DEBUG: Converting ArrayBuffer (${downloadResponse.data.byteLength} bytes) to Buffer...`);
        const buffer = Buffer.from(downloadResponse.data);
        console.log(`DEBUG: Converting Buffer to base64...`);
        dataToSend = buffer.toString('base64');
        encoding = 'base64';
        console.log(`DEBUG: Base64 string length: ${dataToSend.length}`);
      } else if (Buffer.isBuffer(downloadResponse.data)) {
        console.log(`DEBUG: Converting Buffer (${downloadResponse.data.length} bytes) to base64...`);
        dataToSend = downloadResponse.data.toString('base64');
        encoding = 'base64';
        console.log(`DEBUG: Base64 string length: ${dataToSend.length}`);
      }

      // Return file data for temporary storage and AI attachment
      return {
        name: fileInfo.data.name,
        originalName: fileInfo.data.name,
        mimeType: finalMimeType,
        data: dataToSend, // Now base64 string instead of Buffer
        encoding: encoding, // 'base64' if it was a Buffer, 'utf8' otherwise
        size: fileInfo.data.size,
        fileExtension: fileExtension,
        supported: true
      };

    } catch (error) {
      console.error('DEBUG: Error downloading drive file:', error);
      return {
        name: 'Unknown file',
        mimeType: 'unknown',
        supported: false,
        error: `Error downloading file: ${error.message}`
      };
    }
  }

  // Get content from Google Drive files (documents, presentations, etc.)
  async getDriveFileContent(fileId) {
    console.log(`DEBUG: getDriveFileContent called for fileId: ${fileId}`);

    try {
      if (!this.drive) {
        throw new Error('Drive API not initialized');
      }

      console.log('DEBUG: Getting file metadata...');
      // Get file metadata first
      const fileInfo = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size'
      });

      console.log('DEBUG: File metadata:', JSON.stringify(fileInfo.data, null, 2));
      const mimeType = fileInfo.data.mimeType;

      // Handle different file types
      if (mimeType === 'application/vnd.google-apps.document') {
        console.log('DEBUG: Processing Google Doc...');
        // Google Docs - export as plain text
        const response = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'text/plain'
        });
        console.log(`DEBUG: Google Doc content length: ${response.data.length}`);
        return {
          name: fileInfo.data.name,
          content: response.data,
          type: 'document'
        };
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        console.log('DEBUG: Processing Google Slides...');
        // Google Slides - export as plain text
        const response = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'text/plain'
        });
        console.log(`DEBUG: Google Slides content length: ${response.data.length}`);
        return {
          name: fileInfo.data.name,
          content: response.data,
          type: 'presentation'
        };
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        console.log('DEBUG: Processing Google Sheets...');
        // Google Sheets - export as CSV
        const response = await this.drive.files.export({
          fileId: fileId,
          mimeType: 'text/csv'
        });
        console.log(`DEBUG: Google Sheets content length: ${response.data.length}`);
        return {
          name: fileInfo.data.name,
          content: response.data,
          type: 'spreadsheet'
        };
      } else if (mimeType === 'application/pdf') {
        console.log('DEBUG: Processing PDF (metadata only)...');
        // PDF files - we can't easily extract text, so just return metadata
        return {
          name: fileInfo.data.name,
          content: `[PDF Document: ${fileInfo.data.name} - ${fileInfo.data.size} bytes - Content not extractable via API]`,
          type: 'pdf'
        };
      } else if (mimeType.startsWith('text/')) {
        console.log('DEBUG: Processing text file...');
        // Plain text files
        const response = await this.drive.files.get({
          fileId: fileId,
          alt: 'media'
        });
        console.log(`DEBUG: Text file content length: ${response.data.length}`);
        return {
          name: fileInfo.data.name,
          content: response.data,
          type: 'text'
        };
      } else {
        console.log(`DEBUG: Unknown file type: ${mimeType}, returning metadata only`);
        // Other file types - just return metadata
        return {
          name: fileInfo.data.name,
          content: `[File: ${fileInfo.data.name} - Type: ${mimeType} - Content not extractable]`,
          type: 'other'
        };
      }
    } catch (error) {
      console.error('DEBUG: Error fetching drive file content:', error);
      return {
        name: 'Unknown file',
        content: `[Error accessing file: ${error.message}]`,
        type: 'error'
      };
    }
  }

  // Process material information with Drive content access
  async processCourseworkMaterial(material) {
    console.log(`DEBUG: Processing coursework material:`, JSON.stringify(material, null, 2));

    try {
      if (material.driveFile) {
        console.log(`DEBUG: Processing drive file: ${material.driveFile.driveFile.title}`);

        try {
          // Try to get the actual file content using Drive API
          const fileContent = await this.getDriveFileContent(material.driveFile.driveFile.id);
          console.log(`DEBUG: Successfully fetched content for ${material.driveFile.driveFile.title}:`,
            `${fileContent.content.length} characters`);

          return {
            type: 'driveFile',
            title: material.driveFile.driveFile.title,
            content: fileContent.content, // Actual file content!
            fileType: fileContent.type,
            link: material.driveFile.driveFile.alternateLink,
            thumbnailUrl: material.driveFile.driveFile.thumbnailUrl
          };
        } catch (driveError) {
          console.error(`DEBUG: Error fetching drive file content for ${material.driveFile.driveFile.title}:`, driveError);
          // Fallback to metadata only
          return {
            type: 'driveFile',
            title: material.driveFile.driveFile.title,
            content: `[Google Drive File: ${material.driveFile.driveFile.title}]\nFile Type: ${this.getFileTypeFromTitle(material.driveFile.driveFile.title)}\nError: ${driveError.message}\n\nPlease open the file link to view content.`,
            fileType: this.getFileTypeFromTitle(material.driveFile.driveFile.title),
            link: material.driveFile.driveFile.alternateLink,
            thumbnailUrl: material.driveFile.driveFile.thumbnailUrl
          };
        }
      } else if (material.link) {
        console.log(`DEBUG: Processing link: ${material.link.title || material.link.url}`);
        return {
          type: 'link',
          title: material.link.title || material.link.url,
          url: material.link.url,
          content: `[External Link: ${material.link.title || material.link.url}]\nURL: ${material.link.url}`
        };
      } else if (material.youtubeVideo) {
        console.log(`DEBUG: Processing YouTube video: ${material.youtubeVideo.title}`);
        return {
          type: 'youtubeVideo',
          title: material.youtubeVideo.title,
          videoId: material.youtubeVideo.id,
          content: `[YouTube Video: ${material.youtubeVideo.title}]\nVideo ID: ${material.youtubeVideo.id}\nURL: https://www.youtube.com/watch?v=${material.youtubeVideo.id}`
        };
      } else if (material.form) {
        console.log(`DEBUG: Processing Google Form: ${material.form.title}`);
        return {
          type: 'form',
          title: material.form.title,
          content: `[Google Form: ${material.form.title}]\nForm URL: ${material.form.formUrl}`,
          url: material.form.formUrl
        };
      } else {
        console.log('DEBUG: Unknown material type:', JSON.stringify(material, null, 2));
        return {
          type: 'unknown',
          title: 'Unknown Material',
          content: `[Unknown Material Type]\n${JSON.stringify(material, null, 2)}`
        };
      }
    } catch (error) {
      console.error('DEBUG: Error processing coursework material:', error);
      return {
        type: 'error',
        title: 'Error Processing Material',
        content: `[Error accessing material: ${error.message}]`
      };
    }
  }

  // Process material information for file attachment (downloads files)
  async processCourseworkMaterialForAttachment(material) {
    console.log(`DEBUG: Processing coursework material for attachment:`, JSON.stringify(material, null, 2));

    try {
      if (material.driveFile) {
        console.log(`DEBUG: Processing drive file for download: ${material.driveFile.driveFile.title}`);

        try {
          // Download the actual file for attachment
          const fileData = await this.downloadDriveFile(material.driveFile.driveFile.id);
          console.log(`DEBUG: Successfully downloaded file for ${material.driveFile.driveFile.title}:`,
            `${fileData.supported ? 'supported' : 'not supported'}`);

          if (fileData.supported) {
            return {
              type: 'driveFile',
              title: material.driveFile.driveFile.title,
              driveFileId: material.driveFile.driveFile.id, // Add Drive file ID for streaming
              fileType: fileData.mimeType,
              link: material.driveFile.driveFile.alternateLink,
              downloadSupported: true
            };
          } else {
            // Fallback to text content if download not supported
            const textContent = await this.getDriveFileContent(material.driveFile.driveFile.id);
            return {
              type: 'driveFile',
              title: material.driveFile.driveFile.title,
              driveFileId: material.driveFile.driveFile.id, // Include ID even for unsupported
              content: textContent.content,
              fileType: textContent.type,
              link: material.driveFile.driveFile.alternateLink,
              downloadSupported: false,
              error: fileData.error
            };
          }
        } catch (error) {
          console.error(`DEBUG: Error downloading file ${material.driveFile.driveFile.title}:`, error);
          return {
            type: 'driveFile',
            title: material.driveFile.driveFile.title,
            content: `[Error downloading file: ${error.message}]`,
            link: material.driveFile.driveFile.alternateLink,
            downloadSupported: false,
            error: error.message
          };
        }
      } else if (material.link) {
        console.log(`DEBUG: Processing external link: ${material.link.title || material.link.url}`);
        return {
          type: 'link',
          title: material.link.title || 'External Link',
          url: material.link.url,
          content: `[External Link: ${material.link.title || material.link.url}]\nURL: ${material.link.url}`,
          downloadSupported: false
        };
      } else if (material.youtubeVideo) {
        console.log(`DEBUG: Processing YouTube video: ${material.youtubeVideo.title}`);
        return {
          type: 'youtubeVideo',
          title: material.youtubeVideo.title,
          videoId: material.youtubeVideo.id,
          content: `[YouTube Video: ${material.youtubeVideo.title}]\nVideo ID: ${material.youtubeVideo.id}\nURL: https://www.youtube.com/watch?v=${material.youtubeVideo.id}`,
          downloadSupported: false
        };
      } else if (material.form) {
        console.log(`DEBUG: Processing Google Form: ${material.form.title}`);
        return {
          type: 'form',
          title: material.form.title,
          content: `[Google Form: ${material.form.title}]\nForm URL: ${material.form.formUrl}`,
          url: material.form.formUrl,
          downloadSupported: false
        };
      } else {
        console.log('DEBUG: Unknown material type:', JSON.stringify(material, null, 2));
        return {
          type: 'unknown',
          title: 'Unknown Material',
          content: `[Unknown Material Type]\n${JSON.stringify(material, null, 2)}`,
          downloadSupported: false
        };
      }
    } catch (error) {
      console.error('DEBUG: Error processing coursework material for attachment:', error);
      return {
        type: 'error',
        title: 'Error Processing Material',
        content: `[Error accessing material: ${error.message}]`,
        downloadSupported: false,
        error: error.message
      };
    }
  }

  // Helper method to determine file type from filename
  getFileTypeFromTitle(title) {
    const extension = title.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'doc':
      case 'docx':
        return 'document';
      case 'pdf':
        return 'pdf';
      case 'ppt':
      case 'pptx':
        return 'presentation';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      case 'txt':
        return 'text';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      default:
        if (title.includes('Google Docs') || title.includes('Document')) return 'document';
        if (title.includes('Google Slides') || title.includes('Presentation')) return 'presentation';
        if (title.includes('Google Sheets') || title.includes('Spreadsheet')) return 'spreadsheet';
        return 'other';
    }
  }

  // Get assignment materials with content
  async getAssignmentMaterials(courseId, courseWorkId) {
    try {
      const courseWork = await this.getCourseWorkDetails(courseId, courseWorkId);
      const materials = [];

      if (courseWork.materials) {
        for (const material of courseWork.materials) {
          if (material.driveFile) {
            const fileContent = await this.getDriveFileContent(material.driveFile.driveFile.id);
            materials.push({
              type: 'driveFile',
              title: material.driveFile.driveFile.title,
              content: fileContent.content,
              fileType: fileContent.type,
              link: material.driveFile.driveFile.alternateLink
            });
          } else if (material.link) {
            materials.push({
              type: 'link',
              title: material.link.title,
              url: material.link.url,
              content: `[Link: ${material.link.title || material.link.url}]`
            });
          } else if (material.youtubeVideo) {
            materials.push({
              type: 'youtubeVideo',
              title: material.youtubeVideo.title,
              videoId: material.youtubeVideo.id,
              content: `[YouTube Video: ${material.youtubeVideo.title}]`
            });
          }
        }
      }

      return materials;
    } catch (error) {
      console.error('Error fetching assignment materials:', error);
      throw error;
    }
  }

  // Get student submissions for course work
  async getStudentSubmissions(courseId, courseWorkId) {
    try {
      if (!this.classroom) {
        throw new Error('Classroom API not initialized');
      }

      const response = await this.classroom.courses.courseWork.studentSubmissions.list({
        courseId: courseId,
        courseWorkId: courseWorkId,
        userId: 'me'
      });

      return response.data.studentSubmissions || [];
    } catch (error) {
      console.error('Error fetching student submissions:', error);
      throw error;
    }
  }

  // Get ALL student submissions for a course at once (MUCH more efficient!)
  async getAllCourseSubmissions(courseId) {
    try {
      if (!this.classroom) {
        throw new Error('Classroom API not initialized');
      }

      // Use "-" as courseWorkId to get ALL submissions for the course in one call
      const response = await this.classroom.courses.courseWork.studentSubmissions.list({
        courseId: courseId,
        courseWorkId: '-', // Special value to get all submissions
        userId: 'me',
        pageSize: 100 // Get up to 100 submissions per page
      });

      return response.data.studentSubmissions || [];
    } catch (error) {
      console.error('Error fetching all course submissions:', error);
      throw error;
    }
  }

  // Get grades for a student in a specific course (OPTIMIZED)
  async getCourseGrades(courseId) {
    try {
      // Make 2 API calls instead of N+1:
      // 1. Get all course work
      // 2. Get ALL submissions at once
      const [courseWork, allSubmissions] = await Promise.all([
        this.getCourseWork(courseId),
        this.getAllCourseSubmissions(courseId)
      ]);

      // Create a map of submissions by courseWorkId for O(1) lookup
      const submissionMap = new Map();
      allSubmissions.forEach(submission => {
        submissionMap.set(submission.courseWorkId, submission);
      });

      // Match course work with submissions
      const gradesData = courseWork.map(work => {
        const submission = submissionMap.get(work.id);

        return {
          courseWorkId: work.id,
          title: work.title,
          description: work.description,
          dueDate: work.dueDate,
          dueTime: work.dueTime,
          maxPoints: work.maxPoints,
          submission: submission ? {
            id: submission.id,
            state: submission.state,
            assignedGrade: submission.assignedGrade,
            draftGrade: submission.draftGrade,
            submissionHistory: submission.submissionHistory
          } : null
        };
      });

      console.log(`✅ Fetched grades for course ${courseId} with only 2 API calls (${courseWork.length} assignments)`);
      return gradesData;
    } catch (error) {
      console.error('Error fetching course grades:', error);
      throw error;
    }
  }

  // Get overall grade for a course
  async getCourseOverallGrade(courseId) {
    try {
      const grades = await this.getCourseGrades(courseId);

      let totalPoints = 0;
      let earnedPoints = 0;
      let gradedAssignments = 0;

      grades.forEach(grade => {
        if (grade.submission?.assignedGrade !== undefined && grade.maxPoints) {
          earnedPoints += grade.submission.assignedGrade;
          totalPoints += grade.maxPoints;
          gradedAssignments++;
        }
      });

      return {
        overallGrade: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null,
        earnedPoints,
        totalPoints,
        gradedAssignments,
        totalAssignments: grades.length
      };
    } catch (error) {
      console.error('Error calculating overall grade:', error);
      throw error;
    }
  }

  // Get upcoming assignments (due in the next 7 days)
  async getUpcomingAssignments() {
    try {
      const courses = await this.getCourses();
      const upcomingAssignments = [];
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (const course of courses) {
        const courseWork = await this.getCourseWork(course.id);

        courseWork.forEach(work => {
          if (work.dueDate) {
            const dueDate = new Date(
              work.dueDate.year,
              work.dueDate.month - 1, // JavaScript months are 0-indexed
              work.dueDate.day,
              work.dueTime?.hours || 23,
              work.dueTime?.minutes || 59
            );

            if (dueDate >= now && dueDate <= nextWeek) {
              upcomingAssignments.push({
                courseId: course.id,
                courseName: course.name,
                courseWorkId: work.id,
                title: work.title,
                description: work.description,
                dueDate: dueDate,
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink
              });
            }
          }
        });
      }

      // Sort by due date
      upcomingAssignments.sort((a, b) => a.dueDate - b.dueDate);

      return upcomingAssignments;
    } catch (error) {
      console.error('Error fetching upcoming assignments:', error);
      throw error;
    }
  }

  // Get work due today (for "today's assignments" section)
  async getDueWorkToday() {
    try {
      const courses = await this.getCourses();
      const assignments = [];
      
      // Get today in Eastern Time
      const now = new Date();
      const easternOffset = this.getEasternOffset(now);
      const nowEastern = new Date(now.getTime() + easternOffset);
      
      // Today: start of day to end of day (Eastern)
      const todayStart = new Date(nowEastern);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(nowEastern);
      todayEnd.setHours(23, 59, 59, 999);

      for (const course of courses) {
        const courseWork = await this.getCourseWork(course.id);
        const submissions = await this.getAllCourseSubmissions(course.id);
        
        courseWork.forEach(work => {
          if (work.dueDate) {
            // Google returns dueDate in UTC, with optional dueTime
            const dueDate = new Date(Date.UTC(
              work.dueDate.year,
              work.dueDate.month - 1,
              work.dueDate.day,
              work.dueTime?.hours || 23,
              work.dueTime?.minutes || 59,
              0
            ));
            
            // Convert to Eastern for comparison
            const dueDateEastern = new Date(dueDate.getTime() + easternOffset);
            
            if (dueDateEastern >= todayStart && dueDateEastern <= todayEnd) {
              const submission = submissions.find(sub => sub.courseWorkId === work.id);
              const isDone = submission && (submission.state === 'TURNED_IN' || submission.state === 'RETURNED');
              
              assignments.push({
                courseId: course.id,
                courseName: course.name,
                courseWorkId: work.id,
                title: work.title,
                description: work.description,
                dueDate: dueDate,
                dueDateFormatted: dueDateEastern.toLocaleString('en-US', { 
                  timeZone: 'America/New_York',
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                }),
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink,
                isDone: isDone
              });
            }
          }
        });
      }
      
      // Sort by due date
      assignments.sort((a, b) => a.dueDate - b.dueDate);
      return assignments;
    } catch (error) {
      console.error('Error fetching today\'s due work:', error);
      throw error;
    }
  }

  // Get work due tomorrow (for "tomorrow's assignments" section)
  async getDueWorkTomorrow() {
    try {
      const courses = await this.getCourses();
      const assignments = [];
      
      // Get tomorrow in Eastern Time
      const now = new Date();
      const easternOffset = this.getEasternOffset(now);
      const nowEastern = new Date(now.getTime() + easternOffset);
      
      // Tomorrow: start of tomorrow to end of tomorrow (Eastern)
      const tomorrowStart = new Date(nowEastern);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      for (const course of courses) {
        const courseWork = await this.getCourseWork(course.id);
        const submissions = await this.getAllCourseSubmissions(course.id);
        
        courseWork.forEach(work => {
          if (work.dueDate) {
            // Google returns dueDate in UTC, with optional dueTime
            const dueDate = new Date(Date.UTC(
              work.dueDate.year,
              work.dueDate.month - 1,
              work.dueDate.day,
              work.dueTime?.hours || 23,
              work.dueTime?.minutes || 59,
              0
            ));
            
            // Convert to Eastern for comparison
            const dueDateEastern = new Date(dueDate.getTime() + easternOffset);
            
            if (dueDateEastern >= tomorrowStart && dueDateEastern <= tomorrowEnd) {
              const submission = submissions.find(sub => sub.courseWorkId === work.id);
              const isDone = submission && (submission.state === 'TURNED_IN' || submission.state === 'RETURNED');
              
              assignments.push({
                courseId: course.id,
                courseName: course.name,
                courseWorkId: work.id,
                title: work.title,
                description: work.description,
                dueDate: dueDate,
                dueDateFormatted: dueDateEastern.toLocaleString('en-US', { 
                  timeZone: 'America/New_York',
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                }),
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink,
                isDone: isDone
              });
            }
          }
        });
      }
      
      // Sort by due date
      assignments.sort((a, b) => a.dueDate - b.dueDate);
      return assignments;
    } catch (error) {
      console.error('Error fetching tomorrow\'s due work:', error);
      throw error;
    }
  }

  // Helper: Get Eastern Time offset in milliseconds (handles DST)
  getEasternOffset(date) {
    // Create a date string in Eastern timezone and parse it back
    const easternString = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const easternDate = new Date(easternString);
    return date.getTime() - easternDate.getTime();
  }

  // Original getDueWork - now uses correct UTC handling (today + tomorrow combined)
  async getDueWork() {
    try {
      const courses = await this.getCourses();
      const assignments = [];
      
      // Get current time in Eastern
      const now = new Date();
      const easternOffset = this.getEasternOffset(now);
      const nowEastern = new Date(now.getTime() + easternOffset);
      
      // End of tomorrow (Eastern)
      const tomorrowEnd = new Date(nowEastern);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      tomorrowEnd.setHours(23, 59, 59, 999);

      for (const course of courses) {
        const courseWork = await this.getCourseWork(course.id);
        const submissions = await this.getAllCourseSubmissions(course.id);
        
        courseWork.forEach(work => {
          if (work.dueDate) {
            // Google returns dueDate in UTC, with optional dueTime
            const dueDate = new Date(Date.UTC(
              work.dueDate.year,
              work.dueDate.month - 1,
              work.dueDate.day,
              work.dueTime?.hours || 23,
              work.dueTime?.minutes || 59,
              0
            ));
            
            // Convert to Eastern for comparison
            const dueDateEastern = new Date(dueDate.getTime() + easternOffset);
            
            if (dueDateEastern >= nowEastern && dueDateEastern <= tomorrowEnd) {
              const submission = submissions.find(sub => sub.courseWorkId === work.id);
              const isDone = submission && (submission.state === 'TURNED_IN' || submission.state === 'RETURNED');
              
              assignments.push({
                courseId: course.id,
                courseName: course.name,
                courseWorkId: work.id,
                title: work.title,
                description: work.description,
                dueDate: dueDate,
                dueDateFormatted: dueDateEastern.toLocaleString('en-US', { 
                  timeZone: 'America/New_York',
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                }),
                maxPoints: work.maxPoints,
                alternateLink: work.alternateLink,
                isDone: isDone
              });
            }
          }
        });
      }
      
      // Sort by due date
      assignments.sort((a, b) => a.dueDate - b.dueDate);
      return assignments;
    } catch (error) {
      console.error('Error fetching due work:', error);
      throw error;
    }
  }

  // Get assignment materials with content
  async getAssignmentMaterials(courseId, courseWorkId) {
    console.log(`DEBUG: Starting getAssignmentMaterials for courseId: ${courseId}, courseWorkId: ${courseWorkId}`);

    try {
      const courseWork = await this.getCourseWorkDetails(courseId, courseWorkId);
      console.log('DEBUG: Retrieved courseWork details:', JSON.stringify(courseWork, null, 2));

      const materials = [];

      if (courseWork.materials) {
        console.log(`DEBUG: Found ${courseWork.materials.length} materials in assignment`);

        for (const [index, material] of courseWork.materials.entries()) {
          console.log(`DEBUG: Processing material ${index + 1}:`, JSON.stringify(material, null, 2));

          // Use the new processCourseworkMaterial method instead of trying to access Drive content
          const processedMaterial = await this.processCourseworkMaterial(material);
          materials.push(processedMaterial);
        }
      } else {
        console.log('DEBUG: No materials found in courseWork');
      }

      console.log(`DEBUG: Returning ${materials.length} processed materials`);
      return materials;
    } catch (error) {
      console.error('DEBUG: Error in getAssignmentMaterials:', error);
      throw error;
    }
  }

  // Get study suggestions based on grades and upcoming assignments
  async getStudySuggestions() {
    try {
      const courses = await this.getCourses();
      const suggestions = [];

      for (const course of courses) {
        const overallGrade = await this.getCourseOverallGrade(course.id);
        const upcomingAssignments = await this.getCourseWork(course.id);

        // Suggest study focus for courses with lower grades
        if (overallGrade.overallGrade !== null && overallGrade.overallGrade < 80) {
          suggestions.push({
            type: 'grade_improvement',
            courseId: course.id,
            courseName: course.name,
            currentGrade: overallGrade.overallGrade,
            message: `Focus on ${course.name} - current grade is ${overallGrade.overallGrade}%`,
            priority: overallGrade.overallGrade < 70 ? 'high' : 'medium'
          });
        }

        // Suggest preparation for upcoming assignments
        const nextWeekAssignments = upcomingAssignments.filter(work => {
          if (!work.dueDate) return false;
          const dueDate = new Date(
            work.dueDate.year,
            work.dueDate.month - 1,
            work.dueDate.day
          );
          const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          return dueDate <= nextWeek;
        });

        if (nextWeekAssignments.length > 0) {
          suggestions.push({
            type: 'upcoming_assignment',
            courseId: course.id,
            courseName: course.name,
            assignmentCount: nextWeekAssignments.length,
            message: `${nextWeekAssignments.length} assignment(s) due soon in ${course.name}`,
            priority: 'medium',
            assignments: nextWeekAssignments.map(work => work.title)
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating study suggestions:', error);
      throw error;
    }
  }

  // Get assignment materials with file attachments for AI
  async getAssignmentMaterialsForAttachment(courseId, courseWorkId) {
    console.log(`DEBUG: Starting getAssignmentMaterialsForAttachment for courseId: ${courseId}, courseWorkId: ${courseWorkId}`);

    try {
      // Get raw materials from API (not processed) - these are teacher attachments
      const courseWorkDetails = await this.getCourseWorkDetails(courseId, courseWorkId);
      const rawMaterials = courseWorkDetails.materials || [];

      console.log(`DEBUG: Retrieved ${rawMaterials.length} teacher-provided materials`);

      // Get student submissions to include student's work attachments
      const studentSubmissions = await this.getStudentSubmissions(courseId, courseWorkId);
      console.log(`DEBUG: Retrieved ${studentSubmissions.length} student submissions`);

      // Process materials for file attachment
      const processedMaterials = [];

      // Process teacher-provided materials
      for (const material of rawMaterials) {
        try {
          const processed = await this.processCourseworkMaterialForAttachment(material);
          processedMaterials.push(processed);
          console.log(`DEBUG: Processed teacher material: ${processed.title} (download supported: ${processed.downloadSupported})`);
        } catch (error) {
          console.error(`DEBUG: Error processing teacher material:`, error);
          processedMaterials.push({
            type: 'error',
            title: 'Error Processing Material',
            content: `[Error: ${error.message}]`,
            downloadSupported: false,
            error: error.message
          });
        }
      }

      // Process student submission attachments
      for (const submission of studentSubmissions) {
        if (submission.assignmentSubmission && submission.assignmentSubmission.attachments) {
          console.log(`DEBUG: Processing ${submission.assignmentSubmission.attachments.length} student submission attachments`);
          for (const attachment of submission.assignmentSubmission.attachments) {
            try {
              // Student attachments have driveFile property
              if (attachment.driveFile) {
                const processed = await this.processCourseworkMaterialForAttachment({ driveFile: attachment });
                processed.isStudentWork = true; // Mark as student work
                processedMaterials.push(processed);
                console.log(`DEBUG: Processed student attachment: ${processed.title} (download supported: ${processed.downloadSupported})`);
              }
            } catch (error) {
              console.error(`DEBUG: Error processing student attachment:`, error);
            }
          }
        }
      }

      console.log(`DEBUG: Finished processing materials for attachment. ${processedMaterials.filter(m => m.downloadSupported).length} files can be attached.`);
      return processedMaterials;

    } catch (error) {
      console.error('DEBUG: Error in getAssignmentMaterialsForAttachment:', error);
      throw error;
    }
  }
}

export default GoogleClassroomService;

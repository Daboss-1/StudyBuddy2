import GoogleClassroomService from '../../lib/googleClassroom';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { courseId, assignmentId, accessToken } = req.body;

    if (!courseId || !assignmentId || !accessToken) {
      return res.status(400).json({ 
        message: 'Missing required parameters: courseId, assignmentId, and accessToken' 
      });
    }

    console.log(`DEBUG: Getting assignment materials with attachments for course ${courseId}, assignment ${assignmentId}`);

    // Initialize Google Classroom service with access token
    const classroomService = new GoogleClassroomService();
    await classroomService.initialize(accessToken);


    // Get materials with file attachment support
    const materials = await classroomService.getAssignmentMaterialsForAttachment(courseId, assignmentId);
    console.log(`DEBUG: Retrieved ${materials.length} materials, ${materials.filter(m => m.downloadSupported).length} with file attachments`);

    // Separate materials into downloadable files and text content
    // Don't include fileData to avoid 4MB API limit - return URLs instead
    const attachments = [];
    const textMaterials = [];

    for (const material of materials) {
      console.log(`DEBUG API: Processing material - downloadSupported: ${material.downloadSupported}, requiresDriveAccess: ${material.requiresDriveAccess}, title: ${material.title}`);
      
      if (material.downloadSupported) {
        attachments.push({
          name: material.title,
          type: material.type,
          mimeType: material.fileType,
          // Return the download URL or file ID instead of the actual file data
          downloadUrl: material.downloadUrl || material.driveFileId,
          driveFileId: material.driveFileId,
          // Only include small text content, not large file data
          hasFileData: !!material.fileData,
          fileSize: material.fileData ? Buffer.byteLength(material.fileData, 'base64') : 0
        });
      } else if (material.requiresDriveAccess) {
        console.log(`DEBUG API: Adding ${material.title} as requiring Drive access`);
        // Mark materials that require Drive access so UI can prompt user
        attachments.push({
          name: material.title,
          type: material.type,
          driveFileId: material.driveFileId,
          requiresDriveAccess: true,
          error: 'Drive access required to attach this file'
        });
      } else if (material.content) {
        // Only add to text materials if it's actual text content
        textMaterials.push({
          name: material.title,
          type: material.type,
          content: material.content,
          error: material.error
        });
      }
    }

    return res.status(200).json({
      data: {
        attachments: attachments,
        textMaterials: textMaterials,
        totalMaterials: materials.length,
        attachmentCount: attachments.length,
        textMaterialCount: textMaterials.length
      }
    });

  } catch (error) {
    console.error('DEBUG: Error getting assignment materials with attachments:', error);
    
    if (error.message.includes('insufficient authentication scopes')) {
      return res.status(403).json({ 
        message: 'Insufficient permissions. Please re-authenticate with Google Classroom.' 
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        message: 'Assignment or course not found.' 
      });
    }

    return res.status(500).json({ 
      message: error.message || 'Failed to get assignment materials' 
    });
  }
}

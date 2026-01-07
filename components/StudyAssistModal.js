import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Alert, Spinner, Card, Badge, Collapse, ListGroup } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { InlineDriveAccessPrompt } from './DriveAccessPrompt';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function StudyAssistModal({ show, onHide, assignment }) {
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [structuredResponse, setStructuredResponse] = useState(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [error, setError] = useState('');
  const [materials, setMaterials] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState(new Set());
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasDriveAccess, setHasDriveAccess] = useState(false);
  const sectionRefs = useRef({});
  const { getValidClassroomToken, requestDriveAccess, hasScopeSet } = useAuth();

  // Check Drive access on mount and when modal opens
  useEffect(() => {
    if (show) {
      setHasDriveAccess(hasScopeSet('DRIVE'));
    }
  }, [show, hasScopeSet]);

  // Handle Drive access grant
  const handleGrantDriveAccess = async () => {
    const success = await requestDriveAccess();
    if (success) {
      setHasDriveAccess(true);
      // Refetch materials now that we have access
      await fetchMaterials();
    }
    return success;
  };

  // Fetch materials with file attachments when modal opens
  const fetchMaterials = async () => {
    if (!assignment || !assignment.courseId || !assignment.courseWorkId) {
      console.log('DEBUG: Missing assignment data for materials fetch');
      console.log('DEBUG: assignment:', assignment);
      console.log('DEBUG: assignment.courseId:', assignment ? assignment.courseId : 'N/A');
      console.log('DEBUG: assignment.courseWorkId:', assignment ? assignment.courseWorkId : 'N/A');
      return;
    }
    
    setLoadingMaterials(true);
    setMaterials([]);
    
    try {
      const accessToken = await getValidClassroomToken();
      if (!accessToken) {
        console.log('DEBUG: No access token available');
        return;
      }
      
      console.log('DEBUG: Fetching materials with file attachments...');
      const response = await fetch('/api/assignment-materials-attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: assignment.courseId,
          assignmentId: assignment.courseWorkId,
          accessToken: accessToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('DEBUG: Materials response:', data);
        
        // Combine attachments and text materials, marking student vs teacher
        const combinedMaterials = [];
        
        // Add file attachments
        if (data.data.attachments) {
          data.data.attachments.forEach((attachment, index) => {
            const materialId = `attachment_${index}`;
            
            // Check if this attachment requires Drive access
            if (attachment.requiresDriveAccess) {
              combinedMaterials.push({
                id: materialId,
                title: attachment.name,
                type: attachment.type,
                content: `[File: ${attachment.name}] - Requires Google Drive access to attach`,
                hasAttachment: true, // Mark as attachment so it shows properly
                requiresDriveAccess: true, // But flag that it needs Drive access
                attachmentData: attachment,
                driveFileId: attachment.driveFileId,
                error: attachment.error,
                isStudentWork: false // These come from attachments array, determine from context
              });
            } else {
              combinedMaterials.push({
                id: materialId,
                title: attachment.name,
                type: attachment.type,
                content: `[File Attachment: ${attachment.name}] - This file will be attached to the AI`,
                hasAttachment: true,
                attachmentData: attachment,
                fileType: attachment.mimeType,
                isStudentWork: attachment.fileData?.isStudentWork || false
              });
            }
          });
        }
        
        // Add text materials
        if (data.data.textMaterials) {
          data.data.textMaterials.forEach((textMaterial, index) => {
            const materialId = `text_${index}`;
            combinedMaterials.push({
              id: materialId,
              title: textMaterial.name,
              type: textMaterial.type,
              content: textMaterial.content,
              hasAttachment: false,
              error: textMaterial.error,
              isStudentWork: textMaterial.isStudentWork || false
            });
          });
        }
        
        setMaterials(combinedMaterials);
        
        // Select all attachments by default
        const allAttachmentIds = combinedMaterials
          .filter(m => m.hasAttachment)
          .map(m => m.id);
        setSelectedMaterials(new Set(allAttachmentIds));
        
        console.log(`DEBUG: Set ${combinedMaterials.length} materials`);
      } else {
        console.error('DEBUG: Error fetching materials');
        setMaterials([]);
      }
    } catch (error) {
      console.error('DEBUG: Exception fetching materials:', error);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Fetch materials when assignment changes
  useEffect(() => {
    if (show && assignment) {
      fetchMaterials();
    }
  }, [show, assignment]);

  const handleGetHelp = async () => {
    if (!assignment) return;
    
    setLoading(true);
    setError('');
    
    try {
      const accessToken = await getValidClassroomToken();
      if (!accessToken) {
        throw new Error('Unable to get access token. Please try again.');
      }

      // Prepare text materials and file URIs separately - ONLY selected ones
      const textMaterials = [];
      const fileUris = [];
      const filesForUpload = [];
      
      console.log("CLASSWORK_MATERIALS:", materials);
      console.log("SELECTED_MATERIALS:", Array.from(selectedMaterials));
      
      materials.forEach(material => {
        const isSelected = selectedMaterials.has(material.id);
        
        if (material.hasAttachment && material.attachmentData && isSelected) {
          // Instead of sending file data, prepare for upload
          filesForUpload.push({
            name: material.title,
            driveFileId: material.attachmentData.driveFileId,
            mimeType: material.fileType,
            isStudentWork: material.isStudentWork
          });
        } else if (!material.hasAttachment) {
          textMaterials.push(material);
        }
      });

      // Upload files to Gemini first (streaming from Drive)
      if (filesForUpload.length > 0) {
        console.log(`DEBUG: Uploading ${filesForUpload.length} files to Gemini...`);
        setError(`Uploading ${filesForUpload.length} file(s)...`);
        
        for (const file of filesForUpload) {
          try {
            console.log(`DEBUG: Uploading ${file.name} to Gemini...`);
            const uploadResponse = await fetch('/api/gemini-upload-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                driveFileId: file.driveFileId,
                accessToken: accessToken,
                fileName: file.name,
                mimeType: file.mimeType
              })
            });

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json();
              console.error(`DEBUG: Failed to upload ${file.name}:`, errorData);
              throw new Error(errorData.error || `Failed to upload ${file.name}`);
            }

            const uploadData = await uploadResponse.json();
            fileUris.push({
              uri: uploadData.fileUri,
              mimeType: uploadData.mimeType,
              displayName: uploadData.displayName,
              isStudentWork: file.isStudentWork
            });
            console.log(`DEBUG: Successfully uploaded ${file.name}`);
          } catch (uploadError) {
            console.error(`DEBUG: Error uploading ${file.name}:`, uploadError);
            // Continue with other files even if one fails
            setError(`Warning: Could not upload ${file.name}. Continuing with other files...`);
          }
        }
        
        setError(''); // Clear the uploading message
      }

      // Build prompt with assignment details
      let materialsSection = '';
      if (textMaterials.length > 0) {
        materialsSection = '\n\nText Materials:\n';
        textMaterials.forEach((material, index) => {
          materialsSection += `${index + 1}. ${material.title}: ${material.content}\n`;
        });
      }

      let attachmentSection = '';
      if (fileUris.length > 0) {
        const teacherFiles = fileUris.filter(f => !f.isStudentWork);
        const studentFiles = fileUris.filter(f => f.isStudentWork);
        
        attachmentSection = `\n\nAttached Files (${fileUris.length} total):\n`;
        
        if (teacherFiles.length > 0) {
          attachmentSection += '\nTeacher-Provided Materials:\n';
          teacherFiles.forEach((file, index) => {
            attachmentSection += `${index + 1}. ${file.displayName}\n`;
          });
        }
        
        if (studentFiles.length > 0) {
          attachmentSection += '\nStudent Submitted Work:\n';
          studentFiles.forEach((file, index) => {
            attachmentSection += `${index + 1}. ${file.displayName}\n`;
          });
        }
        
        attachmentSection += '\nPlease analyze the attached files when providing your response.\n';
      }

      // Prepare the prompt with assignment details - requesting JSON structure
      const prompt = `Help me with this assignment:

Title: ${assignment.title}
Course: ${assignment.courseName || 'Unknown Course'}
Description: ${assignment.description || 'No description provided'}
Due Date: ${assignment.dueDate ? formatDate(assignment.dueDate) : 'No due date'}
Points Possible: ${assignment.maxPoints || 'Not specified'}${attachmentSection}${materialsSection}

${userQuestion ? `Specific Question: ${userQuestion}` : ''}

CRITICAL INSTRUCTIONS:
1. Return ONLY a JSON object - no other text, no markdown code blocks
2. Start with { and end with }
3. Keep ALL responses CONCISE - use 2-4 sentences max per section
4. Do NOT directly answer questions - instead provide EXAMPLES with step-by-step solutions
5. Use simple markdown: **bold**, bullet lists with *, numbered steps
6. NO LaTeX math notation or special characters

JSON Structure:
{
  "sections": [
    {
      "id": "overview",
      "title": "Assignment Overview",
      "content": "1-2 sentences explaining what this assignment requires"
    },
    {
      "id": "key-concepts",
      "title": "Key Concepts",
      "content": "2-3 bullet points of essential concepts needed"
    },
    {
      "id": "example-solution",
      "title": "Example with Solution",
      "content": "A similar example problem with step-by-step solution showing HOW to approach it. Do NOT solve their actual assignment."
    },
    {
      "id": "common-mistakes",
      "title": "Common Mistakes",
      "content": "2-3 bullet points of what to avoid"
    },
    {
      "id": "approach",
      "title": "How to Approach This",
      "content": "2-3 numbered steps to get started on similar problems"
    }
  ]
}

Remember: Be BRIEF. No paragraphs. Use examples to teach, not direct answers.`;

      console.log('Debug: Sending prompt to AI with file URIs:', fileUris.length);
      
      const requestBody = {
        prompt,
        assignment: {
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          maxPoints: assignment.maxPoints
        }
      };

      // Add file URIs if we have any (already uploaded to Gemini)
      if (fileUris.length > 0) {
        requestBody.fileUris = fileUris;
      }

      const response = await fetch('/api/gemini-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Check for 413 Payload Too Large error
        if (response.status === 413 || data.error?.includes('413') || data.error?.includes('too large')) {
          throw new Error('The selected files are too large to process. Please deselect some attachments and try again.');
        }
        throw new Error(data.error || 'Failed to get AI assistance');
      }

      // Try to parse JSON response
      let responseText = data.response;
      console.log('AI Response:', responseText.substring(0, 200)); // Log first 200 chars
      
      try {
        // Remove markdown code blocks if present - be more aggressive
        let cleanResponse = responseText.trim();
        
        // Remove ```json ... ``` or ``` ... ```
        cleanResponse = cleanResponse.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '');
        
        // Find the actual JSON object
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        
        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
          throw new Error('No valid JSON object found in response');
        }
        
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        
        console.log('Extracted JSON:', cleanResponse.substring(0, 300));
        
        // Parse the JSON
        const parsed = JSON.parse(cleanResponse);
        console.log('Parsed JSON successfully:', parsed);
        
        // Validate structure
        if (parsed && parsed.sections && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          console.log('Valid structured response with', parsed.sections.length, 'sections');
          setStructuredResponse(parsed);
          setAiResponse(''); // Clear markdown response
          setSidebarOpen(true); // Open sidebar on new response
        } else {
          console.warn('Invalid JSON structure, missing sections array. Using as markdown.');
          setAiResponse(responseText);
          setStructuredResponse(null);
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using as markdown:', parseError);
        console.error('Parse error details:', parseError.message);
        console.error('Response text that failed:', responseText.substring(0, 500));
        // Fallback to markdown if JSON parsing fails
        setAiResponse(responseText);
        setStructuredResponse(null);
      }
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatDate = (dateObj) => {
    if (!dateObj) return 'No due date';
    const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day);
    return date.toLocaleDateString();
  };

  const toggleMaterialSelection = (materialId) => {
    setSelectedMaterials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(materialId)) {
        newSet.delete(materialId);
      } else {
        newSet.add(materialId);
      }
      return newSet;
    });
  };

  const selectAllMaterials = () => {
    const allAttachmentIds = materials
      .filter(m => m.hasAttachment)
      .map(m => m.id);
    setSelectedMaterials(new Set(allAttachmentIds));
  };

  const deselectAllMaterials = () => {
    setSelectedMaterials(new Set());
  };

  // Separate materials into teacher and student
  const teacherMaterials = materials.filter(m => !m.isStudentWork);
  const studentMaterials = materials.filter(m => m.isStudentWork);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-robot me-2"></i>
          Study Assist - {assignment?.title}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {assignment && (
          <Card className="mb-3 border-primary">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">Assignment Details</h6>
            </Card.Header>
            <Card.Body>
              <p><strong>Title:</strong> {assignment.title}</p>
              {assignment.description && (
                <p><strong>Description:</strong> {assignment.description}</p>
              )}
              <p><strong>Due Date:</strong> {formatDate(assignment.dueDate)}</p>
              {assignment.maxPoints && (
                <p><strong>Points:</strong> {assignment.maxPoints}</p>
              )}
              {/* Show Drive access prompt if needed */}
              {!hasDriveAccess && materials.filter(m => m.hasAttachment).length > 0 && (
                <InlineDriveAccessPrompt 
                  onGrantAccess={handleGrantDriveAccess}
                  variant="warning"
                />
              )}
              
              {/* Show fetched materials with checkboxes, separated by teacher/student */}
              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Materials to Send to AI:</strong>
                  {materials.filter(m => m.hasAttachment).length > 0 && (
                    <div>
                      <Button 
                        size="sm" 
                        variant="outline-primary" 
                        onClick={selectAllMaterials}
                        disabled={!hasDriveAccess}
                        title={!hasDriveAccess ? "Grant Drive access first" : ""}
                        className="me-2"
                      >
                        Select All
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline-secondary" 
                        onClick={deselectAllMaterials}
                        disabled={!hasDriveAccess}
                        title={!hasDriveAccess ? "Grant Drive access first" : ""}
                      >
                        Deselect All
                      </Button>
                    </div>
                  )}
                </div>
                
                {loadingMaterials ? (
                  <div className="mt-2">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <small>Loading materials...</small>
                  </div>
                ) : materials.length > 0 ? (
                  <>
                    {/* Teacher Materials Section */}
                    {teacherMaterials.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-primary mb-2">
                          <i className="fas fa-chalkboard-teacher me-2"></i>
                          Teacher-Provided Materials ({teacherMaterials.length})
                        </h6>
                        <ul className="list-unstyled ms-3">
                          {teacherMaterials.map((material) => (
                            <li key={material.id} className="mb-2">
                              <div className="d-flex align-items-start">
                                {material.hasAttachment && (
                                  <Form.Check 
                                    type="checkbox"
                                    checked={selectedMaterials.has(material.id)}
                                    onChange={() => toggleMaterialSelection(material.id)}
                                    disabled={!hasDriveAccess}
                                    title={!hasDriveAccess ? "Grant Drive access to select files" : ""}
                                    className="me-2 mt-1"
                                  />
                                )}
                                <div className="flex-grow-1">
                                  {material.hasAttachment ? (
                                    <>
                                      <i className="fas fa-file-pdf me-2 text-danger"></i>
                                      <strong>{material.title}</strong>
                                      <Badge bg="primary" className="ms-2">Teacher File</Badge>
                                      {!hasDriveAccess && (
                                        <Badge bg="secondary" className="ms-1">
                                          <i className="fas fa-lock me-1"></i>Requires Drive Access
                                        </Badge>
                                      )}
                                      {selectedMaterials.has(material.id) && hasDriveAccess && (
                                        <Badge bg="success" className="ms-1">
                                          <i className="fas fa-check me-1"></i>Selected
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-file-text me-2 text-info"></i>
                                      <strong>{material.title}</strong>
                                      <Badge bg="info" className="ms-2">Text</Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Student Work Section */}
                    {studentMaterials.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-success mb-2">
                          <i className="fas fa-user-graduate me-2"></i>
                          Your Submitted Work ({studentMaterials.length})
                        </h6>
                        <ul className="list-unstyled ms-3">
                          {studentMaterials.map((material) => (
                            <li key={material.id} className="mb-2">
                              <div className="d-flex align-items-start">
                                {material.hasAttachment && (
                                  <Form.Check 
                                    type="checkbox"
                                    checked={selectedMaterials.has(material.id)}
                                    onChange={() => toggleMaterialSelection(material.id)}
                                    disabled={!hasDriveAccess}
                                    title={!hasDriveAccess ? "Grant Drive access to select files" : ""}
                                    className="me-2 mt-1"
                                  />
                                )}
                                <div className="flex-grow-1">
                                  {material.hasAttachment ? (
                                    <>
                                      <i className="fas fa-file-pdf me-2 text-danger"></i>
                                      <strong>{material.title}</strong>
                                      <Badge bg="success" className="ms-2">Your Work</Badge>
                                      {!hasDriveAccess && (
                                        <Badge bg="secondary" className="ms-1">
                                          <i className="fas fa-lock me-1"></i>Requires Drive Access
                                        </Badge>
                                      )}
                                      {selectedMaterials.has(material.id) && hasDriveAccess && (
                                        <Badge bg="warning" className="ms-1">
                                          <i className="fas fa-check me-1"></i>Selected
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-file-text me-2 text-info"></i>
                                      <strong>{material.title}</strong>
                                      <Badge bg="info" className="ms-2">Text</Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {materials.length === 0 && (
                      <p className="text-muted mt-2">No materials attached to this assignment.</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted mt-2">No materials attached to this assignment.</p>
                )}
              </div>
              
              {/* Legacy materials display (for backwards compatibility) */}
              {assignment.materials && assignment.materials.length > 0 && (
                <div className="mt-3">
                  <strong>Legacy Materials:</strong>
                  <ul className="mt-2">
                    {assignment.materials.map((material, index) => (
                      <li key={index}>
                        {material.driveFile ? (
                          <a href={material.driveFile.alternateLink} target="_blank" rel="noopener noreferrer">
                            <i className="fas fa-file me-2"></i>
                            {material.driveFile.title}
                          </a>
                        ) : material.youtubeVideo ? (
                          <a href={`https://www.youtube.com/watch?v=${material.youtubeVideo.id}`} target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-youtube me-2"></i>
                            {material.youtubeVideo.title}
                          </a>
                        ) : material.link ? (
                          <a href={material.link.url} target="_blank" rel="noopener noreferrer">
                            <i className="fas fa-link me-2"></i>
                            {material.link.title || material.link.url}
                          </a>
                        ) : (
                          'Unknown material'
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Do you have a specific question about this assignment?</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="e.g., 'I don't understand the requirements', 'How do I get started?', 'What format should this be in?'"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
          />
        </Form.Group>

        {error && (
          <Alert variant="danger">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Getting AI assistance for your assignment...</p>
          </div>
        )}

        {structuredResponse && structuredResponse.sections && structuredResponse.sections.length > 0 && (
          <div className="mt-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="fas fa-lightbulb me-2 text-success"></i>
                AI Study Assistance
              </h5>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <i className={`fas fa-${sidebarOpen ? 'chevron-left' : 'bars'} me-2`}></i>
                {sidebarOpen ? 'Hide' : 'Show'} Navigation
              </Button>
            </div>

            <div className="study-assist-container">
              <Collapse in={sidebarOpen} dimension="width">
                <div className="study-assist-sidebar">
                  <Card className="border-primary">
                    <Card.Header className="bg-primary text-white">
                      <i className="fas fa-list me-2"></i>
                      <strong>Contents</strong>
                    </Card.Header>
                    <ListGroup variant="flush">
                      {structuredResponse.sections.map((section, index) => (
                        <ListGroup.Item
                          key={section.id}
                          action
                          onClick={() => scrollToSection(section.id)}
                          className="d-flex align-items-center"
                          style={{ cursor: 'pointer' }}
                        >
                          <Badge bg="primary" className="me-2">{index + 1}</Badge>
                          <span>{section.title}</span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Card>
                </div>
              </Collapse>

              <div className="study-assist-content">
                {structuredResponse.sections.map((section) => (
                  <Card
                    key={section.id}
                    className="mb-3"
                    ref={(el) => (sectionRefs.current[section.id] = el)}
                  >
                    <Card.Header className="bg-success text-white">
                      <h5 className="mb-0">
                        <i className="fas fa-bookmark me-2"></i>
                        {section.title}
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          h1: ({node, ...props}) => <h3 className="mt-3 mb-2" {...props} />,
                          h2: ({node, ...props}) => <h4 className="mt-3 mb-2" {...props} />,
                          h3: ({node, ...props}) => <h5 className="mt-2 mb-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="mb-3" {...props} />,
                          ol: ({node, ...props}) => <ol className="mb-3" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2" {...props} />,
                          code: ({node, inline, className, children, ...props}) => {
                            if (inline) {
                              return <code className="bg-light px-1 rounded" {...props}>{children}</code>;
                            }
                            return (
                              <pre className="bg-light p-3 rounded mb-3">
                                <code className={className} {...props}>{children}</code>
                              </pre>
                            );
                          },
                          pre: ({node, ...props}) => <div className="mb-3" {...props} />,
                          table: ({node, ...props}) => (
                            <div className="table-responsive mb-3">
                              <table className="table table-bordered" {...props} />
                            </div>
                          ),
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-start border-3 border-primary ps-3 mb-3" {...props} />
                          ),
                          strong: ({node, ...props}) => <strong {...props} />,
                          em: ({node, ...props}) => <em {...props} />
                        }}
                      >
                        {section.content}
                      </ReactMarkdown>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {aiResponse && !structuredResponse && (
          <Card className="mt-3">
            <Card.Header className="bg-success text-white">
              <i className="fas fa-lightbulb me-2"></i>
              AI Study Assistance
            </Card.Header>
            <Card.Body>
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  h1: ({node, ...props}) => <h3 className="mt-3 mb-2" {...props} />,
                  h2: ({node, ...props}) => <h4 className="mt-3 mb-2" {...props} />,
                  h3: ({node, ...props}) => <h5 className="mt-2 mb-2" {...props} />,
                  ul: ({node, ...props}) => <ul className="mb-3" {...props} />,
                  ol: ({node, ...props}) => <ol className="mb-3" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  p: ({node, ...props}) => <p className="mb-2" {...props} />,
                  code: ({node, inline, className, children, ...props}) => {
                    if (inline) {
                      return <code className="bg-light px-1 rounded" {...props}>{children}</code>;
                    }
                    return (
                      <pre className="bg-light p-3 rounded mb-3">
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    );
                  },
                  pre: ({node, ...props}) => <div className="mb-3" {...props} />,
                  table: ({node, ...props}) => (
                    <div className="table-responsive mb-3">
                      <table className="table table-bordered" {...props} />
                    </div>
                  ),
                  blockquote: ({node, ...props}) => (
                    <blockquote className="border-start border-3 border-primary ps-3 mb-3" {...props} />
                  ),
                  strong: ({node, ...props}) => <strong {...props} />,
                  em: ({node, ...props}) => <em {...props} />
                }}
              >
                {aiResponse}
              </ReactMarkdown>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button 
          variant="primary" 
          onClick={handleGetHelp}
          disabled={loading}
        >
          <i className="fas fa-robot me-2"></i>
          {loading ? 'Getting Help...' : 'Get AI Help'}
        </Button>
      </Modal.Footer>

      <style jsx>{`
        .study-assist-container {
          display: flex;
          gap: 1rem;
          position: relative;
        }

        .study-assist-sidebar {
          flex-shrink: 0;
          width: 250px;
          position: sticky;
          top: 0;
          align-self: flex-start;
          max-height: 60vh;
          overflow-y: auto;
        }

        .study-assist-content {
          flex: 1;
          min-width: 0;
        }

        :global(.list-group-item) {
          transition: all 0.2s ease;
        }

        :global(.list-group-item:hover) {
          background-color: #f8f9fa;
          transform: translateX(5px);
        }

        @media (max-width: 768px) {
          .study-assist-container {
            flex-direction: column;
          }

          .study-assist-sidebar {
            width: 100%;
            position: static;
            max-height: 300px;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </Modal>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Dropdown, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

export default function ContactTeacherDropdown({ courseId, assignmentTitle, courseName }) {
  const { callRealClassroomAPI, hasScopeSet, requestProfileAccess } = useAuth();
  const dropdownRef = useRef(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  const setParentStackingContext = (isOpen) => {
    const dropdownEl = dropdownRef.current;
    if (!dropdownEl) return;

    const parentCard = dropdownEl.closest('.card');
    const parentCol = dropdownEl.closest('.col');

    const elevatedZ = '2000';

    if (isOpen) {
      if (parentCol) {
        parentCol.style.position = parentCol.style.position || 'relative';
        parentCol.style.zIndex = elevatedZ;
      }
      if (parentCard) {
        parentCard.style.position = parentCard.style.position || 'relative';
        parentCard.style.zIndex = elevatedZ;
      }
      return;
    }

    if (parentCol) {
      parentCol.style.zIndex = '';
    }
    if (parentCard) {
      parentCard.style.zIndex = '';
    }
  };

  const handleToggle = (isOpen) => {
    setParentStackingContext(isOpen);
    if (isOpen) {
      // Check if we have the necessary scopes for teacher profile info
      // Accept either CLASSROOM_PROFILE or CLASSROOM_BASIC (which includes profile scopes)
      const hasProfileAccess = hasScopeSet('CLASSROOM_PROFILE') || hasScopeSet('CLASSROOM_BASIC');
      if (!hasProfileAccess) {
        setNeedsPermission(true);
        setFetched(true);
        return;
      }
      setNeedsPermission(false);
      fetchTeachers();
    }
  };

  const handleGrantPermission = async () => {
    setLoading(true);
    setError(null);
    try {
      // Force prompt to re-authenticate with proper scopes
      const success = await requestProfileAccess(true);
      if (success) {
        setNeedsPermission(false);
        setFetched(false); // Reset fetched state so we can fetch again
        // Now fetch teachers with the new permissions
        await fetchTeachers();
      } else {
        setError('Failed to grant permissions. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error granting permission:', err);
      setError('Failed to grant permissions. Please try again.');
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    if (fetched || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching teachers for course:', courseId);
      const result = await callRealClassroomAPI('getCourseTeachers', courseId);
      console.log('Teachers API result:', result, 'Type:', typeof result, 'IsArray:', Array.isArray(result));
      
      if (result) {
        // The result is already an array of teachers
        const teachersList = Array.isArray(result) ? result : [];
        console.log('Teachers list:', teachersList, 'Length:', teachersList.length);
        
        // Show all teachers (some may not have email - we'll handle that in UI)
        if (teachersList.length > 0) {
          setTeachers(teachersList);
          console.log('Set teachers state:', teachersList);
        } else {
          console.log('No teachers in the list');
          setError('No teachers found for this course');
        }
      } else {
        console.log('Result was falsy:', result);
        setError('Could not load teachers');
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
      
      // Check if it's a permission error
      if (err.message && err.message.includes('permission')) {
        console.log('Permission error detected, prompting user for access');
        setNeedsPermission(true);
        setError(null);
      } else {
        setError('Could not load teachers: ' + err.message);
      }
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const handleContactTeacher = (teacher) => {
    if (!teacher.email) {
      alert(`No email address available for ${teacher.name}. Please contact them through Google Classroom directly.`);
      return;
    }
    const subject = encodeURIComponent(`Help with ${assignmentTitle}`);
    const body = encodeURIComponent(`Hi ${teacher.name.split(' ')[0]},\n\nI had a question about the assignment "${assignmentTitle}" in ${courseName}.\n\n`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${teacher.email}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <Dropdown ref={dropdownRef} className="contact-teacher-wrapper" onToggle={handleToggle}>
      <Dropdown.Toggle 
        variant="outline-info" 
        size="sm" 
        className="contact-teacher-btn"
        id={`contact-dropdown-${courseId}`}
      >
        <i className="fas fa-envelope me-1"></i>
        Contact Teacher
      </Dropdown.Toggle>

      <Dropdown.Menu className="contact-teacher-menu">
        {needsPermission && (
          <Dropdown.Item 
            onClick={handleGrantPermission}
            className="text-primary"
            disabled={loading}
          >
            <i className="fas fa-lock me-2"></i>
            {loading ? 'Requesting permission...' : 'Allow access to view teacher info'}
          </Dropdown.Item>
        )}
        
        {loading && !needsPermission && (
          <Dropdown.Item disabled>
            <Spinner animation="border" size="sm" className="me-2" />
            Loading teachers...
          </Dropdown.Item>
        )}
        
        {error && !needsPermission && (
          <Dropdown.Item disabled className="text-danger">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Dropdown.Item>
        )}
        
        {!loading && !error && !needsPermission && teachers.length === 0 && fetched && (
          <Dropdown.Item disabled>
            <i className="fas fa-info-circle me-2"></i>
            No teachers found (courseId: {courseId})
          </Dropdown.Item>
        )}
        
        {!loading && !needsPermission && teachers.map((teacher, index) => (
          <Dropdown.Item 
            key={teacher.id || index}
            onClick={() => handleContactTeacher(teacher)}
            className="d-flex align-items-center teacher-item"
          >
            {teacher.photoUrl ? (
              <img 
                src={"https:" + teacher.photoUrl} 
                alt={teacher.name}
                className="teacher-photo me-2"
                referrerPolicy="no-referrer"
                onError={(e) => {
                    console.log('Error loading teacher photo for', teacher.name);
                    console.error(e);
                  e.target.onerror = null;
                  e.target.src = '';
                  e.target.style.display = 'none';
                  e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                }}
              />
            ) : null}
            <div className={`teacher-photo-placeholder me-2 ${teacher.photoUrl ? 'd-none' : ''}`}>
              <i className="fas fa-user"></i>
            </div>
            <div className="teacher-info">
              <div className="teacher-name">{teacher.name}</div>
              <small className="teacher-email text-muted">{teacher.email || 'No email available'}</small>
            </div>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>

      <style jsx global>{`
        .contact-teacher-btn {
          border-radius: 8px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .contact-teacher-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(23, 162, 184, 0.3);
        }
        
        /* Ensure dropdown container has proper positioning context */
        .dropdown.contact-teacher-wrapper {
          position: relative;
        }
        
        .contact-teacher-menu {
          min-width: 280px;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border: 1px solid #e9ecef;
          padding: 8px;
          z-index: 9999;
          position: absolute !important;
        }
        
        .contact-teacher-menu .dropdown-item {
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 4px;
        }
        
        .contact-teacher-menu .dropdown-item:last-child {
          margin-bottom: 0;
        }
        
        .contact-teacher-menu .dropdown-item:hover:not(:disabled) {
          background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
        }
        
        .contact-teacher-menu .teacher-item {
          cursor: pointer;
        }
        
        .contact-teacher-menu .teacher-item:active {
          background: linear-gradient(135deg, #bbdefb 0%, #c8e6c9 100%);
        }
        
        .teacher-photo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .teacher-photo-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
        }
        
        .teacher-info {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }
        
        .teacher-name {
          font-weight: 600;
          color: #333;
        }
        
        .teacher-email {
          font-size: 0.75rem;
        }
      `}</style>
    </Dropdown>
  );
}

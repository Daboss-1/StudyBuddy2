import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

export default function ClassroomPrompt({ show, onHide, onSuccess }) {
  const { enableClassroomAccess, markUserPromptedForClassroom } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEnableAccess = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await enableClassroomAccess();
      
      if (success) {
        if (typeof onHide === 'function') {
          onHide();
        }

        if (typeof onSuccess === 'function') {
          await onSuccess();
        }
      } else {
        setError('Failed to enable Google Classroom access. You can try again later from Settings.');
      }
    } catch (error) {
      console.error('Classroom access error:', error);
      setError('Authentication failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    // Mark user as prompted so they won't see this again
    markUserPromptedForClassroom();
    // Also set a dismissal flag to prevent showing on page refresh
    localStorage.setItem('classroom_prompt_dismissed', 'true');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleDecline} centered backdrop="static">
      <Modal.Header>
        <Modal.Title>
          <i className="fas fa-graduation-cap text-primary me-2"></i>
          Connect Google Classroom
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div className="text-center mb-4">
          <i className="fas fa-google text-danger" style={{ fontSize: '3rem' }}></i>
          <h5 className="mt-3 mb-3">Get the Most Out of StudyBuddy!</h5>
        </div>
        
        <Alert variant="info" className="mb-3">
          <i className="fas fa-info-circle me-2"></i>
          Connect your Google Classroom to access your real assignments, grades, and courses instead of sample data.
        </Alert>
        
        {error && (
          <Alert variant="danger" className="mb-3">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        <div className="mb-3">
          <h6>What you'll get:</h6>
          <ul className="list-unstyled mt-2">
            <li><i className="fas fa-check text-success me-2"></i>Your real Google Classroom courses</li>
            <li><i className="fas fa-check text-success me-2"></i>Live assignment updates and due dates</li>
            <li><i className="fas fa-check text-success me-2"></i>Accurate grade tracking and progress</li>
            <li><i className="fas fa-check text-success me-2"></i>AI-powered study assistance for your assignments</li>
            <li><i className="fas fa-check text-success me-2"></i>Personalized study recommendations</li>
          </ul>
        </div>
        
        <div className="text-muted">
          <small>
            <i className="fas fa-shield-alt me-1"></i>
            Your data remains secure and private. StudyBuddy only accesses classroom information you authorize.
          </small>
        </div>
        
        <div className="text-muted mt-2">
          <small>
            <i className="fas fa-info me-1"></i>
            You can enable this later from Settings if you change your mind.
          </small>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleDecline} disabled={loading}>
          <i className="fas fa-times me-2"></i>
          Maybe Later
        </Button>
        <Button 
          variant="primary" 
          onClick={handleEnableAccess}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Connecting...
            </>
          ) : (
            <>
              <i className="fas fa-google me-2"></i>
              Connect Google Classroom
            </>
          )}
        </Button>
      </Modal.Footer>
      
      <style jsx>{`
        :global(.modal-content) {
          border-radius: 20px !important;
          border: none !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
        }
        
        :global(.modal-header) {
          background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #ea4335 100%);
          color: white;
          border-radius: 20px 20px 0 0 !important;
          border: none !important;
        }
        
        :global(.modal-title) {
          font-weight: 600;
        }
        
        :global(.modal-footer) {
          border: none !important;
          padding: 1.5rem !important;
        }
      `}</style>
    </Modal>
  );
}

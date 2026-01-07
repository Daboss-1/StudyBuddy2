import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

export default function ClassroomReauth({ show, onHide, onSuccess }) {
  const { enableClassroomAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleReauth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await enableClassroomAccess();
      
      if (success) {
        // Clear the session flag so modal can show again if needed in future
        sessionStorage.removeItem('reauth_modal_shown');
        onSuccess?.();
        onHide();
      } else {
        setError('Failed to enable Google Classroom access. Please try again.');
      }
    } catch (error) {
      console.error('Re-authentication error:', error);
      setError('Authentication failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-exclamation-triangle text-warning me-2"></i>
          Google Classroom Access Expired
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Alert variant="info" className="mb-3">
          <i className="fas fa-info-circle me-2"></i>
          Your Google Classroom access token has expired. To continue accessing your real classroom data, please re-authorize StudyBuddy.
        </Alert>
        
        {error && (
          <Alert variant="danger" className="mb-3">
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        <div className="mb-3">
          <h6>What happens when you re-authorize:</h6>
          <ul className="list-unstyled mt-2">
            <li><i className="fas fa-check text-success me-2"></i>Access to your real Google Classroom courses</li>
            <li><i className="fas fa-check text-success me-2"></i>Real-time assignment updates</li>
            <li><i className="fas fa-check text-success me-2"></i>Accurate grade tracking</li>
            <li><i className="fas fa-check text-success me-2"></i>Seamless data synchronization</li>
          </ul>
        </div>
        
        <div className="text-muted">
          <small>
            <i className="fas fa-shield-alt me-1"></i>
            Your data remains secure and private. StudyBuddy only accesses classroom information you authorize.
          </small>
        </div>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Use Sample Data Instead
        </Button>
        <Button 
          variant="primary" 
          onClick={handleReauth}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Re-authorizing...
            </>
          ) : (
            <>
              <i className="fas fa-sync-alt me-2"></i>
              Re-authorize Google Classroom
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
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #ffd1d1 100%);
          color: white;
          border-radius: 20px 20px 0 0 !important;
          border: none !important;
        }
        
        :global(.modal-title) {
          font-weight: 600;
        }
        
        :global(.btn-close) {
          filter: brightness(0) invert(1);
        }
        
        :global(.modal-footer) {
          border: none !important;
          padding: 1.5rem !important;
        }
      `}</style>
    </Modal>
  );
}

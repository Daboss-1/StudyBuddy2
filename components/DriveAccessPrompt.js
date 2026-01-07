import { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

export default function DriveAccessPrompt({ show, onHide, onSuccess }) {
  const { ensureDriveAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestAccess = async () => {
    setLoading(true);
    setError('');
    
    try {
      const accessToken = await ensureDriveAccess();
      if (accessToken) {
        onSuccess();
        onHide();
      }
    } catch (error) {
      console.error('Drive access request failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fab fa-google-drive me-2"></i>
          Google Drive Access Required
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Alert variant="info">
          <i className="fas fa-info-circle me-2"></i>
          <strong>Enhanced Study Assistance Available!</strong>
        </Alert>
        
        <p>
          To provide better study help, StudyBuddy needs permission to read the documents 
          and materials that your teachers attach to assignments.
        </p>
        
        <div className="bg-light p-3 rounded mb-3">
          <h6>This will allow StudyBuddy to:</h6>
          <ul className="mb-0">
            <li>Read Google Docs, Slides, and Sheets attached to assignments</li>
            <li>Include document content in AI study assistance</li>
            <li>Provide more relevant and specific help based on actual materials</li>
          </ul>
        </div>
        
        <small className="text-muted">
          <i className="fas fa-shield-alt me-1"></i>
          Your documents are only read to provide study assistance and are not stored or shared.
        </small>

        {error && (
          <Alert variant="danger" className="mt-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Skip for Now
        </Button>
        <Button 
          variant="primary" 
          onClick={handleRequestAccess}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Requesting Access...
            </>
          ) : (
            <>
              <i className="fab fa-google me-2"></i>
              Grant Drive Access
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

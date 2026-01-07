import { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

// Inline prompt component for embedding in other components
export function InlineDriveAccessPrompt({ onGrantAccess, variant = 'info' }) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');

  const handleGrantAccess = async () => {
    setRequesting(true);
    setError('');
    
    try {
      const success = await onGrantAccess();
      if (!success) {
        setError('Failed to grant Drive access. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Drive access error:', err);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Alert variant={variant} className="mt-3 mb-3">
      <div className="d-flex align-items-start">
        <div className="flex-grow-1">
          <Alert.Heading className="h6">
            <i className="fas fa-google-drive me-2"></i>
            Google Drive Access Required
          </Alert.Heading>
          <p className="mb-2">
            To attach files from Google Drive to your AI study session, we need permission to read your Drive files.
          </p>
          <ul className="mb-2 small">
            <li>This is a <strong>one-time</strong> request</li>
            <li>We only read files - never modify or delete</li>
            <li>Access is only used for Study Assist features</li>
          </ul>
          {error && (
            <p className="text-danger small mb-2">
              <i className="fas fa-exclamation-triangle me-1"></i>
              {error}
            </p>
          )}
          <Button 
            variant="primary"
            size="sm"
            onClick={handleGrantAccess}
            disabled={requesting}
          >
            {requesting ? (
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
        </div>
      </div>
    </Alert>
  );
}

// Modal version for standalone use
export default function DriveAccessPrompt({ show, onHide, onSuccess }) {
  const { requestDriveAccess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestAccess = async () => {
    setLoading(true);
    setError('');
    
    try {
      const success = await requestDriveAccess();
      if (success) {
        if (onSuccess) onSuccess();
        onHide();
      } else {
        setError('Failed to grant Drive access. Please try again.');
      }
    } catch (error) {
      console.error('Drive access request failed:', error);
      setError(error.message || 'An error occurred');
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

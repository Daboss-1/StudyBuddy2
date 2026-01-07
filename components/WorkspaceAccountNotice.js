import React from 'react';
import { Alert, Button, Card, Badge } from 'react-bootstrap';

export default function WorkspaceAccountNotice({ user, onRequestApproval }) {
  const isWorkspaceAccount = user?.isWorkspaceAccount;
  const hasClassroomAccess = user?.hasClassroomAccess;

  if (!isWorkspaceAccount) {
    return null; // Don't show for personal accounts
  }

  return (
    <Card className="mb-4 border-warning">
      <Card.Header className="bg-warning text-dark">
        <i className="fas fa-school me-2"></i>
        School/Organization Account Detected
      </Card.Header>
      <Card.Body>
        <div className="d-flex align-items-center mb-3">
          <Badge bg="info" className="me-2">{user.email}</Badge>
          <Badge bg={hasClassroomAccess ? "success" : "warning"}>
            {hasClassroomAccess ? "Classroom Access: Enabled" : "Classroom Access: Restricted"}
          </Badge>
        </div>

        {!hasClassroomAccess ? (
          <>
            <Alert variant="warning" className="mb-3">
              <i className="fas fa-exclamation-triangle me-2"></i>
              <strong>Limited Functionality:</strong> Your school's IT administrator has restricted 
              access to Google Classroom data for third-party applications like StudyBuddy.
            </Alert>

            <h6>What you can do:</h6>
            <ul className="mb-3">
              <li><strong>Contact IT Support:</strong> Ask your school's IT administrator to approve StudyBuddy</li>
              <li><strong>Use Personal Account:</strong> Log in with a personal Gmail account instead</li>
              <li><strong>Manual Upload:</strong> You can still get AI help by manually uploading documents</li>
            </ul>

            <div className="d-flex gap-2">
              <Button 
                variant="primary" 
                onClick={onRequestApproval}
                size="sm"
              >
                <i className="fas fa-envelope me-1"></i>
                Get IT Approval Email Template
              </Button>
              <Button 
                variant="outline-secondary" 
                href="mailto:support@studybuddy.app?subject=Workspace Account Access Issue"
                size="sm"
              >
                <i className="fas fa-life-ring me-1"></i>
                Contact Support
              </Button>
            </div>
          </>
        ) : (
          <Alert variant="success">
            <i className="fas fa-check-circle me-2"></i>
            Great! Your school administrator has approved StudyBuddy. You have full access to all features.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
}

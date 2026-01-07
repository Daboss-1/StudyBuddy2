import { Alert, Button } from 'react-bootstrap';

export default function ClassroomEmptyNotice() {
  const openClassroom = () => {
    window.open('https://classroom.google.com', '_blank');
  };

  return (
    <Alert variant="info" className="mb-4">
      <Alert.Heading>
        <i className="fas fa-graduation-cap me-2"></i>
        Google Classroom Connected Successfully!
      </Alert.Heading>
      <p>
        Your Google Classroom account is connected, but we didn't find any active courses.
      </p>
      <div className="mt-3">
        <h6>To see your real courses and assignments:</h6>
        <ul className="mb-3">
          <li>Ask your teachers to invite you to their Google Classroom</li>
          <li>Make sure you're using the same Google account that has your courses</li>
          <li>Check that your courses are active (not archived)</li>
        </ul>
        <Button variant="primary" size="sm" onClick={openClassroom}>
          <i className="fas fa-external-link-alt me-2"></i>
          Open Google Classroom
        </Button>
      </div>
      <hr />
      <p className="mb-0 small text-muted">
        <i className="fas fa-info-circle me-1"></i>
        For now, we're showing sample data so you can explore the app's features.
      </p>
    </Alert>
  );
}

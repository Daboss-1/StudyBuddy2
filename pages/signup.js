import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Container, Button, Card } from 'react-bootstrap';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Signup() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      await loginWithGoogle();
      // User will be automatically redirected to dashboard via the useEffect above
    } catch (error) {
      console.error('Sign-in error:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Container className="mt-5 text-center">
          <div className="loading-spinner">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container className="mt-4">
        <div className="jumbotron text-center">
          <h1 className="display-5 fw-bold text-primary">Sign Up for StudyBuddy</h1>
          <p className="lead text-muted">Join other students improving their study habits!</p>
          <hr className="my-4" />
          <p className="text-muted mb-4 fs-6">
            <i className="fas fa-info-circle me-2 text-primary"></i>
            You'll be asked to grant access to <span className="fw-semibold text-dark">Google Classroom</span> and <span className="fw-semibold text-dark">Drive</span> during sign-up.
            <br />
            This allows StudyBuddy to show you real assignments, grades, and provide <span className="fst-italic">AI study help</span>.
          </p>
          <Button 
            variant="primary" 
            size="lg"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        </div>
      </Container>

      {/* Test Account Info */}
      <Container className="mt-4">
        <Card className="text-center shadow-sm">
          <Card.Body>
            <Card.Title className="h5 text-primary fw-bold mb-3">Demo Account</Card.Title>
            <p className="text-muted mb-3">You can use any Google account to sign in and test the application, but for a quick demo:</p>
            <div className="d-flex flex-column align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <div className="text-end" style={{minWidth: '80px'}}>
                  <small className="text-muted">Email:</small>
                </div>
                <code className="bg-light px-3 py-2 rounded">studybuddy.student123@gmail.com</code>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => navigator.clipboard.writeText('studybuddy.student123@gmail.com')}
                  title="Copy email"
                >
                  <i className="fas fa-copy"></i>
                </Button>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="text-end" style={{minWidth: '80px'}}>
                  <small className="text-muted">Password:</small>
                </div>
                <code className="bg-light px-3 py-2 rounded">Student_2027</code>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => navigator.clipboard.writeText('Student_2027')}
                  title="Copy password"
                >
                  <i className="fas fa-copy"></i>
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </Layout>
  );
}

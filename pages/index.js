import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

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
      {/* Hero Section */}
      <Container className="mt-4">
        <div className="jumbotron text-center">
          <h1 className="display-5">Welcome to StudyBuddy!</h1>
          <p className="lead">Your ultimate companion for efficient and effective studying.</p>
          <hr className="my-4" />
          <p>Explore our features and start your journey to better learning today.</p>
          <Button variant="primary" size="lg" href="#features">
            Learn more
          </Button>
        </div>
      </Container>

      {/* Features Section */}
      <Container className="mt-4" id="features">
        <Row>
          <Col xs={12} md={4} className="mb-4">
            <Card>
              <Card.Body className="text-center">
                <Card.Title>View Work</Card.Title>
                <Card.Text>
                  All of your work, here in one place. See what's missing, upcoming, and completed!
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4} className="mb-4">
            <Card>
              <Card.Body className="text-center">
                <Card.Title>How You Stack Up</Card.Title>
                <Card.Text>
                  Want to know how you stack up with your peers in a subject?
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4} className="mb-4">
            <Card>
              <Card.Body className="text-center">
                <Card.Title>Peer Teaching</Card.Title>
                <Card.Text>
                  Study with somebody in the subjects that are harder!
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* CTA Section */}
      <Container className="mt-4">
        <div className="jumbotron text-center">
          <h1 className="display-5">Ready to get started?</h1>
          <p className="lead">Sign up today and start your journey to better learning!</p>
          <hr className="my-4" />
          <Button variant="primary" size="lg" href="/signup">
            Sign up
          </Button>
        </div>
      </Container>
    </Layout>
  );
}

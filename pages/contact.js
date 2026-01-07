import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Container, Row, Col, Card, Button, Form, Alert } from 'react-bootstrap';
import { useState } from 'react';

export default function Contact() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: ''
  });
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      // TODO: Send contact form data to API route
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: 'Thank you for your message! We\'ll get back to you soon.'
        });
        setFormData({
          name: user?.name || '',
          email: user?.email || '',
          subject: '',
          message: ''
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending contact form:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Sorry, there was an error sending your message. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <Container className="mt-5">
        <div className="jumbotron">
          <h1 className="display-4">Contact Us</h1>
          <p className="lead">Get in touch with the StudyBuddy team.</p>
        </div>
      </Container>

      <Container className="mt-5">
        <Row>
          <Col md={8}>
            <Card>
              <Card.Header>
                <h4>Send us a Message</h4>
              </Card.Header>
              <Card.Body>
                {submitStatus.message && (
                  <Alert variant={submitStatus.type === 'success' ? 'success' : 'danger'}>
                    {submitStatus.message}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Subject *</Form.Label>
                    <Form.Control
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      placeholder="What's this about?"
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Message *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={6}
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      placeholder="Tell us more details..."
                    />
                  </Form.Group>
                  
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-100"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </span>
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4}>
            <Card>
              <Card.Header>
                <h4>Get in Touch</h4>
              </Card.Header>
              <Card.Body>
                <h5>Contact Information</h5>
                <p>
                  <strong>Email:</strong><br />
                  <a href="mailto:everett.hurder@gmail.com">everett.hurder@gmail.com</a>
                </p>
                
                <hr />
                
                <h5>Frequently Asked Questions</h5>
                <div className="mb-3">
                  <h6>How do I add courses?</h6>
                  <p className="text-muted">
                    Go to the Courses page and use the "Add New Course" form.
                  </p>
                </div>
                
                <div className="mb-3">
                  <h6>How do I find study buddies?</h6>
                  <p className="text-muted">
                    Visit the Chat page to join study groups and connect with peers.
                  </p>
                </div>
                
                <div className="mb-3">
                  <h6>How does the AI study suggestions work?</h6>
                  <p className="text-muted">
                    Our AI analyzes your courses and performance to suggest optimal study partners and resources.
                  </p>
                </div>
              </Card.Body>
            </Card>
            
            <Card className="mt-4">
              <Card.Header>
                <h4>Quick Links</h4>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  <Button variant="outline-primary" href="/dashboard">
                    Dashboard
                  </Button>
                  <Button variant="outline-primary" href="/courses">
                    My Courses
                  </Button>
                  <Button variant="outline-primary" href="/chat">
                    Study Groups
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { FaRobot, FaShieldAlt, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

const ModerationTest = () => {
  const [testMessage, setTestMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testModerationAPI = async () => {
    if (!testMessage.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/moderate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: testMessage }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error testing moderation:', error);
      setResult({ error: 'Failed to test moderation' });
    } finally {
      setLoading(false);
    }
  };

  const exampleTests = [
    {
      label: 'Normal Message',
      text: 'Can someone help me with this math problem?'
    },
    {
      label: 'Disguised Profanity',
      text: 'This is so st*pid and d*mb'
    },
    {
      label: 'L33t Speak',
      text: 'ur 5uch 4n 1d10t'
    },
    {
      label: 'Gossip',
      text: 'Did you hear what Sarah said about Mike behind his back?'
    },
    {
      label: 'Subtle Bullying',
      text: 'Nobody asked for your opinion anyway'
    },
    {
      label: 'Spaced Words',
      text: 's t u p i d answer'
    }
  ];

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card className="shadow-lg">
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">
                <FaRobot className="me-2" />
                Enhanced AI Content Moderation Test
              </h3>
              <small>Test the advanced sentiment analysis and content filtering</small>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h5>
                    <FaShieldAlt className="me-2 text-primary" />
                    Test Message
                  </h5>
                  <Form.Group className="mb-3">
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Enter a message to test moderation..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    onClick={testModerationAPI}
                    disabled={loading || !testMessage.trim()}
                    className="mb-3"
                  >
                    {loading ? 'Analyzing...' : 'Test Moderation'}
                  </Button>

                  <h6>Quick Test Examples:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {exampleTests.map((example, index) => (
                      <Button
                        key={index}
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setTestMessage(example.text)}
                        title={example.text}
                      >
                        {example.label}
                      </Button>
                    ))}
                  </div>
                </Col>

                <Col md={6}>
                  <h5>
                    <FaCheckCircle className="me-2 text-success" />
                    Moderation Results
                  </h5>
                  {result && !result.error && (
                    <Card className={`border-${result.approved ? 'success' : 'danger'}`}>
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0">
                            {result.approved ? (
                              <Badge bg="success">✓ APPROVED</Badge>
                            ) : (
                              <Badge bg="danger">✗ BLOCKED</Badge>
                            )}
                          </h6>
                          <Badge bg="info">
                            Confidence: {Math.round((result.confidence || 0) * 100)}%
                          </Badge>
                        </div>

                        {result.reason && (
                          <Alert variant="danger" className="mb-3">
                            <FaExclamationTriangle className="me-2" />
                            <strong>Reason:</strong> {result.reason}
                          </Alert>
                        )}

                        {result.suggestions && (
                          <Alert variant="info" className="mb-3">
                            <strong>💡 Suggestion:</strong> {result.suggestions}
                          </Alert>
                        )}

                        <Row className="mb-3">
                          <Col sm={6}>
                            <small className="text-muted">Sentiment Score</small>
                            <div className="d-flex align-items-center">
                              <ProgressBar
                                now={((result.sentiment || 0) + 1) * 50}
                                variant={result.sentiment > 0 ? 'success' : result.sentiment < -0.3 ? 'danger' : 'warning'}
                                className="flex-grow-1 me-2"
                              />
                              <small>{(result.sentiment || 0).toFixed(2)}</small>
                            </div>
                          </Col>
                          <Col sm={6}>
                            <small className="text-muted">Toxicity Score</small>
                            <div className="d-flex align-items-center">
                              <ProgressBar
                                now={(result.toxicityScore || 0) * 100}
                                variant={result.toxicityScore > 0.6 ? 'danger' : result.toxicityScore > 0.3 ? 'warning' : 'success'}
                                className="flex-grow-1 me-2"
                              />
                              <small>{Math.round((result.toxicityScore || 0) * 100)}%</small>
                            </div>
                          </Col>
                        </Row>

                        <Row className="mb-3">
                          <Col>
                            <small className="text-muted">Educational Value</small>
                            <div className="d-flex align-items-center">
                              <ProgressBar
                                now={(result.educationalValue || 0) * 100}
                                variant="info"
                                className="flex-grow-1 me-2"
                              />
                              <small>{Math.round((result.educationalValue || 0) * 100)}%</small>
                            </div>
                          </Col>
                        </Row>

                        {result.categories && result.categories.length > 0 && (
                          <div className="mb-3">
                            <small className="text-muted d-block mb-2">Violation Categories:</small>
                            <div className="d-flex flex-wrap gap-1">
                              {result.categories.map((category, index) => (
                                <Badge key={index} bg="warning" text="dark">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.flags && Object.keys(result.flags).some(key => result.flags[key]) && (
                          <div>
                            <small className="text-muted d-block mb-2">Detection Flags:</small>
                            <div className="d-flex flex-wrap gap-1">
                              {Object.entries(result.flags).map(([flag, active]) => active && (
                                <Badge key={flag} bg="secondary">
                                  {flag.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  )}

                  {result && result.error && (
                    <Alert variant="danger">
                      <FaExclamationTriangle className="me-2" />
                      {result.error}
                    </Alert>
                  )}

                  {!result && (
                    <div className="text-center text-muted py-4">
                      Enter a message above and click "Test Moderation" to see results
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mt-4">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">Enhanced AI Moderation Features</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6 className="text-primary">✨ Advanced Detection</h6>
                  <ul>
                    <li><strong>Disguised Profanity:</strong> st*pid, st0pid, s t u p i d</li>
                    <li><strong>L33t Speak:</strong> 5tup1d, 1d10t, h4t3</li>
                    <li><strong>Subtle Bullying:</strong> Passive-aggressive comments</li>
                    <li><strong>Gossip Detection:</strong> "Did you hear...", rumors</li>
                    <li><strong>Context Analysis:</strong> Intent and educational value</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <h6 className="text-success">🎯 Smart Scoring</h6>
                  <ul>
                    <li><strong>Sentiment:</strong> -1.0 (very negative) to +1.0 (very positive)</li>
                    <li><strong>Toxicity:</strong> 0% (clean) to 100% (toxic)</li>
                    <li><strong>Educational Value:</strong> Relevance to learning</li>
                    <li><strong>Confidence:</strong> AI certainty in decision</li>
                    <li><strong>Multiple Fallbacks:</strong> Always gets a result</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ModerationTest;

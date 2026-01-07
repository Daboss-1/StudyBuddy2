import { useState } from 'react';
import Layout from '../components/Layout';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function AIStudyHelper() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/ai-study-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: question,
          context: context
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to get AI response');
      }

      setResponse(data.response);
    } catch (err) {
      console.error('Error getting AI help:', err);
      setError(err.message || 'Failed to get study help. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setQuestion('');
    setContext('');
    setResponse('');
    setError('');
  };

  const exampleQuestions = [
    'Explain the quadratic formula and when to use it',
    'What are the key differences between mitosis and meiosis?',
    'Help me understand the causes of World War II',
    'Explain photosynthesis in simple terms',
    'How do I solve systems of linear equations?'
  ];

  return (
    <Layout>
      <Container className="mt-5">
        <div className="jumbotron">
          <h1 className="display-4">AI Study Helper</h1>
          <p className="lead">Get personalized study help powered by AI.</p>
        </div>
      </Container>

      <Container className="mt-4">
        <Row>
          <Col xs={12} md={8}>
            <Card>
              <Card.Header>
                <h4>Ask Your Study Question</h4>
              </Card.Header>
              <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Your Question *</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask any study-related question..."
                      required
                      disabled={isLoading}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Additional Context (Optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="Provide any additional context, like your grade level, what you're struggling with, etc."
                      disabled={isLoading}
                    />
                  </Form.Group>

                  <div className="d-flex flex-column flex-sm-row gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading || !question.trim()}
                      className="flex-fill"
                    >
                      {isLoading ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Getting Help...
                        </>
                      ) : (
                        'Get Study Help'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={clearForm}
                      disabled={isLoading}
                      className="flex-fill"
                    >
                      Clear
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>

            {response && (
              <Card className="mt-4">
                <Card.Header>
                  <h4>AI Study Response</h4>
                </Card.Header>
                <Card.Body>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      // Custom styling for markdown elements
                      h1: ({node, ...props}) => <h3 className="mt-3 mb-2" {...props} />,
                      h2: ({node, ...props}) => <h4 className="mt-3 mb-2" {...props} />,
                      h3: ({node, ...props}) => <h5 className="mt-2 mb-2" {...props} />,
                      ul: ({node, ...props}) => <ul className="mb-3" {...props} />,
                      ol: ({node, ...props}) => <ol className="mb-3" {...props} />,
                      li: ({node, ...props}) => <li className="mb-1" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2" {...props} />,
                      code: ({node, inline, className, children, ...props}) => {
                        if (inline) {
                          return <code className="bg-light px-1 rounded" {...props}>{children}</code>;
                        }
                        return (
                          <pre className="bg-light p-3 rounded mb-3">
                            <code className={className} {...props}>{children}</code>
                          </pre>
                        );
                      },
                      pre: ({node, ...props}) => <div className="mb-3" {...props} />,
                      table: ({node, ...props}) => (
                        <div className="table-responsive mb-3">
                          <table className="table table-bordered" {...props} />
                        </div>
                      ),
                      blockquote: ({node, ...props}) => (
                        <blockquote className="border-start border-3 border-primary ps-3 mb-3" {...props} />
                      ),
                      // Handle strong/bold
                      strong: ({node, ...props}) => <strong {...props} />,
                      // Handle emphasis/italic
                      em: ({node, ...props}) => <em {...props} />
                    }}
                  >
                    {response}
                  </ReactMarkdown>
                </Card.Body>
              </Card>
            )}
          </Col>

          <Col xs={12} md={4}>
            <Card>
              <Card.Header>
                <h5>How to Use</h5>
              </Card.Header>
              <Card.Body>
                <p>
                  Ask any study-related question and get personalized help from our AI tutor.
                </p>
                <ul>
                  <li>Ask for explanations of concepts</li>
                  <li>Get help with homework problems</li>
                  <li>Request study strategies</li>
                  <li>Clarify confusing topics</li>
                </ul>
              </Card.Body>
            </Card>

            <Card className="mt-4">
              <Card.Header>
                <h5>Example Questions</h5>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  {exampleQuestions.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setQuestion(example)}
                      disabled={isLoading}
                      className="text-start"
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </Card.Body>
            </Card>

            <Card className="mt-4">
              <Card.Header>
                <h5>Tips for Better Results</h5>
              </Card.Header>
              <Card.Body>
                <ul className="mb-0">
                  <li>Be specific about what you're struggling with</li>
                  <li>Include your grade level if relevant</li>
                  <li>Ask follow-up questions for clarification</li>
                  <li>Provide context about your assignment</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
}

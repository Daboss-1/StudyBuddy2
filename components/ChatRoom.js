import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, ListGroup, Badge, Dropdown, InputGroup, Alert, Spinner, Row, Col, Card, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import chatRoomService from '../lib/chatRooms';
import { FaPaperPlane, FaUsers, FaCog, FaExclamationTriangle, FaSmile, FaInfoCircle, FaShieldAlt } from 'react-icons/fa';

const ChatRoom = ({ show, onHide, room }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomData, setRoomData] = useState(room);
  const [showSettings, setShowSettings] = useState(false);
  const [showModerationDetails, setShowModerationDetails] = useState(false);
  const [moderationResult, setModerationResult] = useState(null);
  const [blockedMessage, setBlockedMessage] = useState('');
  const messagesEndRef = useRef(null);
  const unsubscribeMessages = useRef(null);
  const unsubscribeRoom = useRef(null);

  useEffect(() => {
    if (show && room && user) {
      loadMessages();
      subscribeToUpdates();
    }

    return () => {
      // Cleanup subscriptions
      if (unsubscribeMessages.current) {
        unsubscribeMessages.current();
      }
      if (unsubscribeRoom.current) {
        unsubscribeRoom.current();
      }
    };
  }, [show, room, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const roomMessages = await chatRoomService.getRoomMessages(room.id);
      setMessages(roomMessages);
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    // Subscribe to real-time messages
    unsubscribeMessages.current = chatRoomService.subscribeToMessages(room.id, (messages) => {
      setMessages(messages);
    });

    // Subscribe to room updates
    unsubscribeRoom.current = chatRoomService.subscribeToRoom(room.id, (updatedRoom) => {
      setRoomData(updatedRoom);
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    try {
      setLoading(true);
      setError('');
      await chatRoomService.sendMessage(room.id, user.uid, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      // Try to parse the moderation result from the error
      let moderationData = null;
      try {
        // Check if the error message contains JSON data (from our moderation API)
        const match = err.message.match(/\{.*\}/);
        if (match) {
          moderationData = JSON.parse(match[0]);
        }
      } catch (parseError) {
        // Not JSON data, continue with regular error handling
      }

      if (moderationData) {
        // Store moderation result for "See Why" modal
        setModerationResult(moderationData);
        setBlockedMessage(newMessage.trim());
        
        // Create brief AI explanation
        let briefExplanation = 'AI detected inappropriate content';
        if (moderationData.reason) {
          // Extract the key issue from the AI's reason
          if (moderationData.reason.includes('inappropriate language')) {
            briefExplanation = 'Contains inappropriate language';
          } else if (moderationData.reason.includes('gossip')) {
            briefExplanation = 'Detected gossip or drama';
          } else if (moderationData.reason.includes('bullying') || moderationData.reason.includes('harassment')) {
            briefExplanation = 'Contains bullying behavior';
          } else if (moderationData.reason.includes('spam')) {
            briefExplanation = 'Detected spam patterns';
          } else if (moderationData.reason.includes('negative sentiment')) {
            briefExplanation = 'Very negative tone detected';
          } else {
            briefExplanation = 'Does not meet educational standards';
          }
        }

        // Add detected categories as badges
        let categoryBadges = '';
        if (moderationData.categories && moderationData.categories.length > 0) {
          const displayCategories = moderationData.categories.slice(0, 3); // Show max 3
          categoryBadges = displayCategories.map(cat => 
            cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          ).join(', ');
        }

        const errorMessage = `🤖 ${briefExplanation}${categoryBadges ? ` (${categoryBadges})` : ''}`;
        setError(errorMessage);
      } else {
        // Regular error handling for non-moderation errors
        let errorMessage = err.message || 'Failed to send message';
        
        // Provide helpful suggestions for common moderation issues
        if (errorMessage.includes('inappropriate language')) {
          errorMessage += '\n💡 Tip: Try rephrasing using respectful, educational language.';
        } else if (errorMessage.includes('gossip')) {
          errorMessage += '\n💡 Tip: Focus on learning topics rather than personal discussions.';
        } else if (errorMessage.includes('spam')) {
          errorMessage += '\n💡 Tip: Avoid repetitive characters or excessive formatting.';
        }
        
        setError(errorMessage);
      }
      
      // Clear error after 8 seconds
      setTimeout(() => setError(''), 8000);
    } finally {
      setLoading(false);
    }
  };

  const handleKickUser = async (targetUserId) => {
    try {
      await chatRoomService.kickUser(room.id, targetUserId, user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBanUser = async (targetUserId) => {
    try {
      await chatRoomService.banUser(room.id, targetUserId, user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const isCurrentUserModerator = () => {
    return roomData?.moderators?.includes(user?.uid);
  };

  const isCurrentUserCreator = () => {
    return roomData?.createdBy === user?.uid;
  };

  if (!room) return null;

  const messageGroups = groupMessagesByDate(messages);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title className="d-flex align-items-center">
          <span className="me-2">{roomData?.name || room.name}</span>
          <Badge bg="secondary" className="me-2">
            <FaUsers className="me-1" />
            {roomData?.members?.length || 0}
          </Badge>
          {(isCurrentUserModerator() || isCurrentUserCreator()) && (
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <FaCog />
            </Button>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ height: '500px', padding: 0 }}>
        {error && (
          <Alert variant="danger" className="m-3 mb-0 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <FaExclamationTriangle className="me-2" />
              <span style={{ whiteSpace: 'pre-line' }}>{error}</span>
            </div>
            {moderationResult && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setShowModerationDetails(true)}
                className="ms-2"
              >
                <FaInfoCircle className="me-1" />
                See Why
              </Button>
            )}
          </Alert>
        )}

        <div 
          className="messages-container h-100 p-3 overflow-auto"
          style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}
        >
          {loading && messages.length === 0 ? (
            <div className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            Object.entries(messageGroups).map(([date, dateMessages]) => (
              <div key={date}>
                <div className="text-center my-3">
                  <Badge bg="secondary" className="px-3 py-2">
                    {date}
                  </Badge>
                </div>
                {dateMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`message mb-3 ${message.userId === user?.uid ? 'text-end' : ''}`}
                  >
                    <div
                      className={`message-bubble d-inline-block p-3 rounded-3 ${
                        message.userId === user?.uid
                          ? 'bg-primary text-white ms-5'
                          : 'bg-white me-5 shadow-sm'
                      }`}
                      style={{ maxWidth: '70%' }}
                    >
                      {message.userId !== user?.uid && (
                        <div className="message-sender small fw-bold mb-1 text-muted">
                          {message.userId}
                        </div>
                      )}
                      <div className="message-content mb-1">
                        {message.content}
                        {message.flagged && (
                          <Badge bg="warning" className="ms-2" title="Content flagged by AI moderation">
                            <FaExclamationTriangle />
                          </Badge>
                        )}
                        {message.moderationScore < -0.5 && (
                          <Badge bg="info" className="ms-2" title="Low sentiment detected">
                            Reviewed
                          </Badge>
                        )}
                      </div>
                      <div className="message-time small opacity-75">
                        {formatTime(message.timestamp)}
                        {message.edited && (
                          <span className="ms-1">(edited)</span>
                        )}
                      </div>
                    </div>
                    {(isCurrentUserModerator() || isCurrentUserCreator()) && 
                     message.userId !== user?.uid && (
                      <Dropdown className="d-inline-block ms-2">
                        <Dropdown.Toggle
                          variant="link"
                          size="sm"
                          className="text-muted p-0"
                        >
                          ⋮
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item
                            onClick={() => handleKickUser(message.userId)}
                          >
                            Kick User
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => handleBanUser(message.userId)}
                          >
                            Ban User
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </Modal.Body>

      <Modal.Footer className="p-3 bg-light">
        <Form onSubmit={handleSendMessage} className="w-100">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={loading}
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '25px 0 0 25px'
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!newMessage.trim() || loading}
              style={{
                borderRadius: '0 25px 25px 0',
                background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)'
              }}
            >
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <FaPaperPlane />
              )}
            </Button>
          </InputGroup>
        </Form>
      </Modal.Footer>

      {/* Room Settings Modal */}
      <ChatRoomSettings
        show={showSettings}
        onHide={() => setShowSettings(false)}
        room={roomData}
        isCreator={isCurrentUserCreator()}
        isModerator={isCurrentUserModerator()}
        onKickUser={handleKickUser}
        onBanUser={handleBanUser}
      />

      {/* Moderation Details Modal */}
      <ModerationDetailsModal
        show={showModerationDetails}
        onHide={() => setShowModerationDetails(false)}
        moderationResult={moderationResult}
        blockedMessage={blockedMessage}
      />
    </Modal>
  );
};

// Room Settings Component
const ChatRoomSettings = ({ show, onHide, room, isCreator, isModerator, onKickUser, onBanUser }) => {
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && room) {
      // In a real app, you'd fetch user details for all members
      setMembersList(room.members || []);
    }
  }, [show, room]);

  const handleAddModerator = async (userId) => {
    try {
      await chatRoomService.addModerator(room.id, userId, room.createdBy);
    } catch (err) {
      console.error('Failed to add moderator:', err);
    }
  };

  if (!room) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Room Settings - {room.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-4">
          <h6>Room Information</h6>
          <p className="mb-1"><strong>Description:</strong> {room.description}</p>
          <p className="mb-1"><strong>Subject:</strong> {room.subject}</p>
          <p className="mb-1"><strong>Members:</strong> {room.members?.length || 0} / {room.maxMembers}</p>
          <p className="mb-1"><strong>Created:</strong> {room.createdAt?.toDate?.()?.toLocaleDateString()}</p>
        </div>

        <div className="mb-4">
          <h6>Members ({room.members?.length || 0})</h6>
          <ListGroup>
            {membersList.map(memberId => (
              <ListGroup.Item
                key={memberId}
                className="d-flex justify-content-between align-items-center"
              >
                <span>
                  {memberId}
                  {room.createdBy === memberId && (
                    <Badge bg="success" className="ms-2">Creator</Badge>
                  )}
                  {room.moderators?.includes(memberId) && (
                    <Badge bg="primary" className="ms-2">Moderator</Badge>
                  )}
                </span>
                {(isModerator || isCreator) && memberId !== room.createdBy && (
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      Actions
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      {isCreator && !room.moderators?.includes(memberId) && (
                        <Dropdown.Item onClick={() => handleAddModerator(memberId)}>
                          Make Moderator
                        </Dropdown.Item>
                      )}
                      <Dropdown.Item onClick={() => onKickUser(memberId)}>
                        Kick from Room
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => onBanUser(memberId)}>
                        Ban from Room
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>

        <div>
          <h6>Room Rules</h6>
          <ul className="list-unstyled">
            {room.rules?.map((rule, index) => (
              <li key={index} className="mb-1">
                <small className="text-muted">• {rule}</small>
              </li>
            ))}
          </ul>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// Moderation Details Modal Component
const ModerationDetailsModal = ({ show, onHide, moderationResult, blockedMessage }) => {
  if (!moderationResult) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title>
          <FaShieldAlt className="me-2" />
          Message Blocked - AI Analysis
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <Card className="border-danger mb-3">
              <Card.Header className="bg-light">
                <h6 className="mb-0">
                  <FaExclamationTriangle className="text-danger me-2" />
                  Your Message
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="p-3 bg-light rounded border">
                  <em>"{blockedMessage}"</em>
                </div>
              </Card.Body>
            </Card>

            {moderationResult.reason && (
              <Alert variant="danger">
                <strong>🤖 AI Analysis:</strong><br />
                {moderationResult.reason}
              </Alert>
            )}

            {moderationResult.suggestions && (
              <Alert variant="info">
                <strong>💡 Suggestion:</strong><br />
                {moderationResult.suggestions}
              </Alert>
            )}
          </Col>

          <Col md={6}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">AI Scoring Breakdown</h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">Approval Status</small>
                    <Badge bg={moderationResult.approved ? 'success' : 'danger'}>
                      {moderationResult.approved ? '✓ APPROVED' : '✗ BLOCKED'}
                    </Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">AI Confidence</small>
                    <small>{Math.round((moderationResult.confidence || 0) * 100)}%</small>
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">Sentiment Score</small>
                  <div className="d-flex align-items-center">
                    <ProgressBar
                      now={((moderationResult.sentiment || 0) + 1) * 50}
                      variant={moderationResult.sentiment > 0 ? 'success' : moderationResult.sentiment < -0.3 ? 'danger' : 'warning'}
                      className="flex-grow-1 me-2"
                    />
                    <small>{(moderationResult.sentiment || 0).toFixed(2)}</small>
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">Toxicity Score</small>
                  <div className="d-flex align-items-center">
                    <ProgressBar
                      now={(moderationResult.toxicityScore || 0) * 100}
                      variant={moderationResult.toxicityScore > 0.6 ? 'danger' : moderationResult.toxicityScore > 0.3 ? 'warning' : 'success'}
                      className="flex-grow-1 me-2"
                    />
                    <small>{Math.round((moderationResult.toxicityScore || 0) * 100)}%</small>
                  </div>
                </div>

                <div className="mb-3">
                  <small className="text-muted">Educational Value</small>
                  <div className="d-flex align-items-center">
                    <ProgressBar
                      now={(moderationResult.educationalValue || 0) * 100}
                      variant="info"
                      className="flex-grow-1 me-2"
                    />
                    <small>{Math.round((moderationResult.educationalValue || 0) * 100)}%</small>
                  </div>
                </div>

                {moderationResult.categories && moderationResult.categories.length > 0 && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">Violation Categories:</small>
                    <div className="d-flex flex-wrap gap-1">
                      {moderationResult.categories.map((category, index) => (
                        <Badge key={index} bg="warning" text="dark">
                          {category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {moderationResult.flags && Object.keys(moderationResult.flags).some(key => moderationResult.flags[key]) && (
                  <div>
                    <small className="text-muted d-block mb-2">Detection Flags:</small>
                    <div className="d-flex flex-wrap gap-1">
                      {Object.entries(moderationResult.flags).map(([flag, active]) => active && (
                        <Badge key={flag} bg="secondary">
                          {flag.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Alert variant="info" className="mt-3">
          <strong>💭 Remember:</strong> Our AI helps maintain a positive learning environment. 
          Try rephrasing your message using respectful, educational language that supports everyone's learning journey.
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ChatRoom;

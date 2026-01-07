import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ListGroup, Badge, Alert, Spinner, Tab, Tabs, Card } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import chatRoomService from '../lib/chatRooms';
import ChatRoom from './ChatRoom';
import { FaPlus, FaUsers, FaLock, FaGlobe, FaComments, FaClock } from 'react-icons/fa';

const ChatRoomList = ({ show, onHide }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('myRooms');
  const [myRooms, setMyRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);

  useEffect(() => {
    if (show && user) {
      loadRooms();
    }
  }, [show, user, activeTab]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError('');

      if (activeTab === 'myRooms') {
        const userRooms = await chatRoomService.getUserRooms(user.uid);
        setMyRooms(userRooms);
      } else {
        const availableRooms = await chatRoomService.getPublicRooms(user.uid);
        setPublicRooms(availableRooms);
      }
    } catch (err) {
      setError('Failed to load chat rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      setLoading(true);
      await chatRoomService.joinRoom(roomId, user.uid);
      await loadRooms(); // Refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async (roomId) => {
    try {
      setLoading(true);
      await chatRoomService.leaveRoom(roomId, user.uid);
      await loadRooms(); // Refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (room) => {
    setSelectedRoom(room);
    setShowChatModal(true);
  };

  const formatLastActivity = (timestamp) => {
    if (!timestamp) return 'No activity';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Active now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const renderRoomCard = (room, showJoinButton = false) => (
    <Card key={room.id} className="mb-3 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center mb-2">
              <Card.Title className="mb-0 me-2">{room.name}</Card.Title>
              {room.isPrivate ? (
                <Badge bg="warning">
                  <FaLock className="me-1" />
                  Private
                </Badge>
              ) : (
                <Badge bg="success">
                  <FaGlobe className="me-1" />
                  Public
                </Badge>
              )}
            </div>
            {room.description && (
              <Card.Text className="text-muted small mb-2">
                {room.description}
              </Card.Text>
            )}
            <div className="d-flex align-items-center text-muted small">
              <span className="me-3">
                <FaUsers className="me-1" />
                {room.members?.length || 0} members
              </span>
              <span className="me-3">
                <FaComments className="me-1" />
                {room.messageCount || 0} messages
              </span>
              <span>
                <FaClock className="me-1" />
                {formatLastActivity(room.lastActivity)}
              </span>
            </div>
            {room.lastMessage && (
              <div className="mt-2 p-2 bg-light rounded">
                <small className="text-muted">
                  Last: {room.lastMessage.content}
                </small>
              </div>
            )}
          </div>
          <div className="d-flex flex-column gap-2">
            {showJoinButton ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleJoinRoom(room.id)}
                disabled={loading}
              >
                Join Room
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenChat(room)}
                >
                  Open Chat
                </Button>
                {room.createdBy !== user?.uid && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleLeaveRoom(room.id)}
                    disabled={loading}
                  >
                    Leave
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <Badge bg="info">{room.subject}</Badge>
          {room.createdBy === user?.uid && (
            <Badge bg="success">Owner</Badge>
          )}
          {room.moderators?.includes(user?.uid) && room.createdBy !== user?.uid && (
            <Badge bg="primary">Moderator</Badge>
          )}
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaComments className="me-2" />
            Chat Rooms
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="d-flex justify-content-between align-items-center mb-3">
            <Tabs
              activeKey={activeTab}
              onSelect={(tab) => setActiveTab(tab)}
              className="flex-grow-1"
            >
              <Tab eventKey="myRooms" title="My Rooms" />
              <Tab eventKey="publicRooms" title="Discover" />
            </Tabs>
            <Button
              variant="success"
              onClick={() => setShowCreateModal(true)}
              className="ms-3"
            >
              <FaPlus className="me-1" />
              Create Room
            </Button>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <div className="mt-2">Loading chat rooms...</div>
              </div>
            ) : (
              <>
                {activeTab === 'myRooms' && (
                  <>
                    {myRooms.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="text-muted mb-3">
                          <FaComments size={48} />
                        </div>
                        <h5>No chat rooms yet</h5>
                        <p className="text-muted">
                          Create your first room or join a public room to get started!
                        </p>
                      </div>
                    ) : (
                      myRooms.map(room => renderRoomCard(room, false))
                    )}
                  </>
                )}

                {activeTab === 'publicRooms' && (
                  <>
                    {publicRooms.length === 0 ? (
                      <div className="text-center py-5">
                        <div className="text-muted mb-3">
                          <FaGlobe size={48} />
                        </div>
                        <h5>No public rooms available</h5>
                        <p className="text-muted">
                          Be the first to create a public room for others to join!
                        </p>
                      </div>
                    ) : (
                      publicRooms.map(room => renderRoomCard(room, true))
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Create Room Modal */}
      <CreateRoomModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        onRoomCreated={() => {
          setShowCreateModal(false);
          loadRooms();
        }}
      />

      {/* Chat Modal */}
      <ChatRoom
        show={showChatModal}
        onHide={() => setShowChatModal(false)}
        room={selectedRoom}
      />
    </>
  );
};

// Create Room Modal Component
const CreateRoomModal = ({ show, onHide, onRoomCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: 'General',
    isPrivate: false,
    maxMembers: 50,
    allowFileUploads: false,
    moderationLevel: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subjects = [
    'General', 'Mathematics', 'Science', 'English', 'History',
    'Computer Science', 'Art', 'Music', 'Study Groups', 'Homework Help'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Room name is required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await chatRoomService.createRoom(formData, user.uid);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        subject: 'General',
        isPrivate: false,
        maxMembers: 50,
        allowFileUploads: false,
        moderationLevel: 'medium'
      });
      
      onRoomCreated();
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Chat Room</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Room Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter room name"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what this room is for"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Subject</Form.Label>
            <Form.Select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Maximum Members</Form.Label>
            <Form.Control
              type="number"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              min="2"
              max="200"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Content Moderation</Form.Label>
            <Form.Select
              name="moderationLevel"
              value={formData.moderationLevel}
              onChange={handleChange}
            >
              <option value="low">Low - Basic filtering</option>
              <option value="medium">Medium - Balanced moderation</option>
              <option value="high">High - Strict filtering</option>
            </Form.Select>
          </Form.Group>

          <div className="mb-3">
            <Form.Check
              type="checkbox"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleChange}
              label="Private room (invite only)"
            />
            <Form.Check
              type="checkbox"
              name="allowFileUploads"
              checked={formData.allowFileUploads}
              onChange={handleChange}
              label="Allow file uploads"
            />
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ChatRoomList;

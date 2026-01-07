import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import ChatNotification from '../components/ChatNotification';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Modal, Spinner, InputGroup, ListGroup, Offcanvas, Tabs, Tab } from 'react-bootstrap';
import { useRouter } from 'next/router';
import chatRoomService from '../lib/chatRooms';

export default function Chat() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMobileRooms, setShowMobileRooms] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', description: '', isPrivate: false, emailRestricted: false, allowedEmails: '', maxMembers: 50 });
  const [joinCode, setJoinCode] = useState('');
  const [notification, setNotification] = useState(null);
  const [unsubscribeMessages, setUnsubscribeMessages] = useState(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signup');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadUserRooms();
    }
  }, [user]);

  useEffect(() => {
    if (router.query.room && chatRooms.length > 0) {
      const room = chatRooms.find(r => r.id === router.query.room);
      if (room) {
        selectRoom(room);
      }
    }
  }, [router.query.room, chatRooms]);

  useEffect(() => {
    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [unsubscribeMessages]);

  const loadUserRooms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const rooms = await chatRoomService.getUserRooms(user.uid);
      setChatRooms(rooms);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      setError('Failed to load chat rooms. Please try again.');
      setIsLoading(false);
    }
  };

  const selectRoom = async (room) => {
    try {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
      setSelectedRoom(room);
      setShowMobileRooms(false);
      const unsubscribe = chatRoomService.subscribeToMessages(room.id, (newMessages) => {
        setMessages(newMessages);
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.userId !== user.uid) {
            showNotification({ roomId: room.id, roomName: room.name, userName: lastMessage.userName || 'Someone', userPhoto: lastMessage.userPhoto, message: lastMessage.content });
          }
        }
      });
      setUnsubscribeMessages(() => unsubscribe);
    } catch (error) {
      console.error('Error selecting room:', error);
      setError('Failed to load room messages.');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;
    try {
      await chatRoomService.sendMessage(selectedRoom.id, user.uid, newMessage.trim());
      setNewMessage('');
      setError(null);
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.message.includes('Message blocked:')) {
        setError(error.message.replace('Message blocked: ', ''));
      } else {
        setError('Failed to send message. Please try again.');
      }
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomData.name.trim()) {
      setError('Room name is required');
      return;
    }
    try {
      const allowedEmails = newRoomData.allowedEmails.split(',').map(email => email.trim()).filter(email => email);
      const roomData = { ...newRoomData, allowedEmails: newRoomData.emailRestricted ? allowedEmails : [], requireJoinCode: newRoomData.isPrivate };
      const room = await chatRoomService.createRoom(roomData, user.uid);
      await loadUserRooms();
      setShowCreateModal(false);
      setNewRoomData({ name: '', description: '', isPrivate: false, emailRestricted: false, allowedEmails: '', maxMembers: 50 });
      selectRoom(room);
      setError(null);
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again.');
    }
  };

  const joinRoomWithCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a join code');
      return;
    }
    try {
      await chatRoomService.joinRoomWithCode(joinCode.trim().toUpperCase(), user.uid, user.email);
      await loadUserRooms();
      setShowJoinModal(false);
      setJoinCode('');
      setError(null);
    } catch (error) {
      console.error('Error joining room:', error);
      setError(error.message || 'Failed to join room. Please check the code and try again.');
    }
  };

  const leaveRoom = async (roomId) => {
    if (!confirm('Are you sure you want to leave this room?')) return;
    try {
      await chatRoomService.leaveRoom(roomId, user.uid);
      await loadUserRooms();
      if (selectedRoom?.id === roomId) {
        setSelectedRoom(null);
        setMessages([]);
      }
      setError(null);
    } catch (error) {
      console.error('Error leaving room:', error);
      setError('Failed to leave room. Please try again.');
    }
  };

  const showNotification = (notificationData) => {
    setNotification(notificationData);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  const isOwner = (room) => {
    return room && room.createdBy === user?.uid;
  };

  if (loading || !user) {
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
      <Container fluid className="chat-page mt-3 px-0 px-md-3">
        <div className="d-md-none mb-3 px-3">
          <Button variant="primary" className="w-100" onClick={() => setShowMobileRooms(true)}>
            <i className="fas fa-list me-2"></i>Study Groups ({chatRooms.length})
          </Button>
        </div>
        <Row className="g-0 g-md-3">
          <Col md={4} lg={3} className="d-none d-md-block chat-sidebar-col">
            <Card className="chat-sidebar-card">
              <Card.Header className="bg-primary text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0"><i className="fas fa-users me-2"></i>Study Groups</h5>
                  <Badge bg="light" text="primary">{chatRooms.length}</Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="d-grid gap-2 p-3">
                  <Button variant="success" size="sm" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus me-2"></i>Create Room</Button>
                  <Button variant="outline-primary" size="sm" onClick={() => setShowJoinModal(true)}><i className="fas fa-key me-2"></i>Join with Code</Button>
                </div>
                {error && <Alert variant="danger" className="m-3 mb-0" dismissible onClose={() => setError(null)}>{error}</Alert>}
                <div className="chat-rooms-list">
                  {isLoading ? (
                    <div className="text-center p-4"><Spinner animation="border" size="sm" /></div>
                  ) : chatRooms.length === 0 ? (
                    <div className="text-center p-4 text-muted">
                      <i className="fas fa-comments fa-3x mb-3"></i>
                      <p>No study groups yet</p>
                      <p className="small">Create or join a group to start chatting!</p>
                    </div>
                  ) : (
                    chatRooms.map((room) => (
                      <div key={room.id} className={`chat-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`} onClick={() => selectRoom(room)}>
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div className="flex-grow-1">
                            <h6 className="mb-0 text-truncate">{room.name}</h6>
                            <div className="d-flex align-items-center mt-1">
                              {room.isPrivate && <Badge bg="warning" className="me-2" style={{ fontSize: '0.7rem' }}><i className="fas fa-lock me-1"></i>Private</Badge>}
                              <small className="text-muted"><i className="fas fa-user-friends me-1"></i>{room.members?.length || 0}</small>
                            </div>
                          </div>
                          {isOwner(room) && <Badge bg="success" className="ms-2">Owner</Badge>}
                        </div>
                        {room.lastMessage && <p className="text-muted small mb-0 text-truncate">{room.lastMessage.content}</p>}
                      </div>
                    ))
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={8} lg={9}>
            {selectedRoom ? (
              <Card className="chat-messages-card">
                <Card.Header className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="flex-grow-1">
                      <h5 className="mb-0">{selectedRoom.name}</h5>
                      <small className="text-muted">
                        <i className="fas fa-user-friends me-1"></i>{selectedRoom.members?.length || 0} members
                        {selectedRoom.isPrivate && <><span> • </span><i className="fas fa-lock me-1"></i>Private</>}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      {isOwner(selectedRoom) && (
                        <Button variant="outline-primary" size="sm" onClick={() => setShowSettingsModal(true)}>
                          <i className="fas fa-cog"></i><span className="d-none d-md-inline ms-2">Settings</span>
                        </Button>
                      )}
                      <Button variant="outline-danger" size="sm" onClick={() => leaveRoom(selectedRoom.id)}>
                        <i className="fas fa-sign-out-alt"></i><span className="d-none d-md-inline ms-2">Leave</span>
                      </Button>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body className="chat-messages-body">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      <i className="fas fa-comment-alt fa-3x mb-3"></i>
                      <p>No messages yet. Be the first to say hello!</p>
                    </div>
                  ) : (
                    <div className="messages-container">
                      {messages.map((message) => (
                        <div key={message.id} className={`message-bubble ${message.userId === user.uid ? 'own-message' : 'other-message'}`}>
                          {message.userId !== user.uid && <div className="message-sender">{message.userName || 'Anonymous'}</div>}
                          <div className="message-content">{message.content}</div>
                          <div className="message-timestamp">{formatTimestamp(message.timestamp)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
                <Card.Footer className="bg-white">
                  {error && <Alert variant="danger" className="mb-2" dismissible onClose={() => setError(null)}>{error}</Alert>}
                  <Form onSubmit={sendMessage}>
                    <InputGroup>
                      <Form.Control type="text" placeholder="Type your message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={!selectedRoom} />
                      <Button type="submit" variant="primary" disabled={!newMessage.trim()}>
                        <i className="fas fa-paper-plane"></i><span className="d-none d-md-inline ms-2">Send</span>
                      </Button>
                    </InputGroup>
                  </Form>
                </Card.Footer>
              </Card>
            ) : (
              <Card className="chat-messages-card">
                <Card.Body className="text-center py-5">
                  <i className="fas fa-comments fa-4x text-muted mb-3"></i>
                  <h4>Welcome to Study Groups!</h4>
                  <p className="text-muted">Select a study group from the sidebar to start chatting, or create a new group to collaborate with your classmates.</p>
                  <div className="d-flex gap-2 justify-content-center mt-4 flex-wrap">
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus me-2"></i>Create Group</Button>
                    <Button variant="outline-primary" onClick={() => setShowJoinModal(true)}><i className="fas fa-key me-2"></i>Join with Code</Button>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Offcanvas show={showMobileRooms} onHide={() => setShowMobileRooms(false)} placement="start" className="chat-mobile-offcanvas">
          <Offcanvas.Header closeButton className="bg-primary text-white">
            <Offcanvas.Title><i className="fas fa-users me-2"></i>Study Groups</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-0">
            <div className="d-grid gap-2 p-3">
              <Button variant="success" onClick={() => { setShowMobileRooms(false); setShowCreateModal(true); }}><i className="fas fa-plus me-2"></i>Create Room</Button>
              <Button variant="outline-primary" onClick={() => { setShowMobileRooms(false); setShowJoinModal(true); }}><i className="fas fa-key me-2"></i>Join with Code</Button>
            </div>
            {error && <Alert variant="danger" className="m-3" dismissible onClose={() => setError(null)}>{error}</Alert>}
            <div className="chat-rooms-list">
              {isLoading ? (
                <div className="text-center p-4"><Spinner animation="border" /></div>
              ) : chatRooms.length === 0 ? (
                <div className="text-center p-4 text-muted"><i className="fas fa-comments fa-3x mb-3"></i><p>No study groups yet</p></div>
              ) : (
                chatRooms.map((room) => (
                  <div key={room.id} className={`chat-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`} onClick={() => selectRoom(room)}>
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div className="flex-grow-1">
                        <h6 className="mb-0">{room.name}</h6>
                        <div className="d-flex align-items-center mt-1">
                          {room.isPrivate && <Badge bg="warning" className="me-2" style={{ fontSize: '0.7rem' }}><i className="fas fa-lock me-1"></i>Private</Badge>}
                          <small className="text-muted"><i className="fas fa-user-friends me-1"></i>{room.members?.length || 0}</small>
                        </div>
                      </div>
                      {isOwner(room) && <Badge bg="success">Owner</Badge>}
                    </div>
                    {room.lastMessage && <p className="text-muted small mb-0 text-truncate">{room.lastMessage.content}</p>}
                  </div>
                ))
              )}
            </div>
          </Offcanvas.Body>
        </Offcanvas>
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Create Study Group</Modal.Title></Modal.Header>
          <Form onSubmit={createRoom}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Group Name *</Form.Label>
                <Form.Control type="text" placeholder="e.g., AP Chemistry Study Group" value={newRoomData.name} onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={2} placeholder="What's this group about?" value={newRoomData.description} onChange={(e) => setNewRoomData({ ...newRoomData, description: e.target.value })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" label="Private Group (requires join code)" checked={newRoomData.isPrivate} onChange={(e) => setNewRoomData({ ...newRoomData, isPrivate: e.target.checked })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" label="Restrict by email addresses" checked={newRoomData.emailRestricted} onChange={(e) => setNewRoomData({ ...newRoomData, emailRestricted: e.target.checked })} />
                {newRoomData.emailRestricted && (
                  <Form.Text className="d-block mt-2">
                    <Form.Control type="text" placeholder="Enter emails separated by commas" value={newRoomData.allowedEmails} onChange={(e) => setNewRoomData({ ...newRoomData, allowedEmails: e.target.value })} className="mt-2" />
                    <small className="text-muted">Only users with these email addresses can join</small>
                  </Form.Text>
                )}
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Max Members</Form.Label>
                <Form.Select value={newRoomData.maxMembers} onChange={(e) => setNewRoomData({ ...newRoomData, maxMembers: parseInt(e.target.value) })}>
                  <option value={10}>10 members</option>
                  <option value={25}>25 members</option>
                  <option value={50}>50 members</option>
                  <option value={100}>100 members</option>
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit"><i className="fas fa-plus me-2"></i>Create Group</Button>
            </Modal.Footer>
          </Form>
        </Modal>
        <Modal show={showJoinModal} onHide={() => setShowJoinModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Join Study Group</Modal.Title></Modal.Header>
          <Form onSubmit={joinRoomWithCode}>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Enter Join Code</Form.Label>
                <Form.Control type="text" placeholder="e.g., ABC123" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.2rem', textAlign: 'center' }} maxLength={6} required />
                <Form.Text>Ask the group owner for the 6-character join code</Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowJoinModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit"><i className="fas fa-key me-2"></i>Join Group</Button>
            </Modal.Footer>
          </Form>
        </Modal>
        {selectedRoom && isOwner(selectedRoom) && (
          <RoomSettingsModal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} room={selectedRoom} onUpdate={loadUserRooms} />
        )}
        {notification && <ChatNotification notification={notification} onClose={() => setNotification(null)} />}
      </Container>
      <style jsx global>{`
        .chat-page { height: calc(100vh - 120px); max-height: calc(100vh - 120px); }
        .chat-sidebar-col { height: calc(100vh - 140px); }
        .chat-sidebar-card { height: 100%; display: flex; flex-direction: column; }
        .chat-sidebar-card .card-body { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        .chat-rooms-list { flex: 1; overflow-y: auto; }
        .chat-room-item { padding: 1rem; border-bottom: 1px solid #dee2e6; cursor: pointer; transition: all 0.2s; }
        .chat-room-item:hover { background-color: #f8f9fa; }
        .chat-room-item.active { background-color: #e7f3ff; border-left: 4px solid #007bff; }
        .chat-messages-card { height: calc(100vh - 140px); display: flex; flex-direction: column; }
        .chat-messages-body { flex: 1; overflow-y: auto; background-color: #f8f9fa; }
        .messages-container { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; }
        .message-bubble { max-width: 70%; padding: 0.75rem 1rem; border-radius: 1rem; word-wrap: break-word; }
        .message-bubble.own-message { align-self: flex-end; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-bottom-right-radius: 0.25rem; }
        .message-bubble.other-message { align-self: flex-start; background-color: white; border: 1px solid #dee2e6; border-bottom-left-radius: 0.25rem; }
        .message-sender { font-size: 0.75rem; font-weight: 600; color: #007bff; margin-bottom: 0.25rem; }
        .message-content { font-size: 0.95rem; line-height: 1.4; }
        .message-timestamp { font-size: 0.7rem; opacity: 0.7; margin-top: 0.25rem; text-align: right; }
        @media (max-width: 768px) {
          .chat-page { height: calc(100vh - 180px); }
          .chat-messages-card { height: calc(100vh - 220px); }
          .message-bubble { max-width: 85%; font-size: 0.9rem; padding: 0.6rem 0.9rem; }
          .chat-mobile-offcanvas .offcanvas-body { padding: 0; }
          .messages-container { padding: 0.75rem; }
        }
      `}</style>
    </Layout>
  );
}

function RoomSettingsModal({ show, onHide, room, onUpdate }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [joinCode, setJoinCode] = useState(room.joinCode);
  const [allowedEmails, setAllowedEmails] = useState(room.allowedEmails?.join(', ') || '');
  const [emailRestricted, setEmailRestricted] = useState(room.settings?.emailRestricted || false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const regenerateCode = async () => {
    if (!confirm('This will invalidate the old join code. Continue?')) return;
    try {
      setIsLoading(true);
      const newCode = await chatRoomService.regenerateJoinCode(room.id, user.uid);
      setJoinCode(newCode);
      setSuccess('Join code regenerated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateEmails = async () => {
    try {
      setIsLoading(true);
      const emails = allowedEmails.split(',').map(email => email.trim()).filter(email => email);
      await chatRoomService.updateAllowedEmails(room.id, emails, user.uid);
      setSuccess('Allowed emails updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      if (onUpdate) onUpdate();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton><Modal.Title><i className="fas fa-cog me-2"></i>Room Settings</Modal.Title></Modal.Header>
      <Modal.Body>
        {success && <Alert variant="success">{success}</Alert>}
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
          <Tab eventKey="general" title="General">
            <h6>Room Information</h6>
            <ListGroup variant="flush" className="mb-3">
              <ListGroup.Item><strong>Name:</strong> {room.name}</ListGroup.Item>
              <ListGroup.Item><strong>Members:</strong> {room.members?.length || 0} / {room.maxMembers}</ListGroup.Item>
              <ListGroup.Item><strong>Type:</strong> <Badge bg={room.isPrivate ? 'warning' : 'success'}>{room.isPrivate ? 'Private' : 'Public'}</Badge></ListGroup.Item>
            </ListGroup>
            <h6>Join Code</h6>
            <InputGroup className="mb-3">
              <Form.Control type="text" value={joinCode} readOnly style={{ fontFamily: 'monospace', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }} />
              <Button variant="outline-primary" onClick={() => copyToClipboard(joinCode)}><i className="fas fa-copy"></i></Button>
              <Button variant="outline-secondary" onClick={regenerateCode} disabled={isLoading}><i className="fas fa-sync-alt"></i></Button>
            </InputGroup>
            <Form.Text className="text-muted">Share this code with people you want to invite</Form.Text>
          </Tab>
          <Tab eventKey="access" title="Access Control">
            <Form.Group className="mb-3">
              <Form.Check type="checkbox" label="Restrict by email addresses" checked={emailRestricted} onChange={(e) => setEmailRestricted(e.target.checked)} />
            </Form.Group>
            {emailRestricted && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Allowed Email Addresses</Form.Label>
                  <Form.Control as="textarea" rows={4} placeholder="Enter email addresses, separated by commas" value={allowedEmails} onChange={(e) => setAllowedEmails(e.target.value)} />
                  <Form.Text>Only users with these email addresses can join this room</Form.Text>
                </Form.Group>
                <Button variant="primary" onClick={updateEmails} disabled={isLoading}>
                  {isLoading ? <><Spinner animation="border" size="sm" className="me-2" />Updating...</> : <><i className="fas fa-save me-2"></i>Update Emails</>}
                </Button>
              </>
            )}
            {!emailRestricted && <Alert variant="info">Email restriction is disabled. Anyone with the join code can access this room.</Alert>}
          </Tab>
          <Tab eventKey="members" title="Members">
            <ListGroup>
              {room.members?.map((memberId) => (
                <ListGroup.Item key={memberId} className="d-flex justify-content-between align-items-center">
                  <span>{memberId}</span>
                  {room.createdBy === memberId && <Badge bg="success">Owner</Badge>}
                  {room.moderators?.includes(memberId) && room.createdBy !== memberId && <Badge bg="primary">Moderator</Badge>}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={onHide}>Close</Button></Modal.Footer>
    </Modal>
  );
}
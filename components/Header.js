import { useAuth } from '../contexts/AuthContext';
import { Navbar, Nav, Container, Button, Dropdown } from 'react-bootstrap';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import ChatRoomList from './ChatRoomList';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showChatRooms, setShowChatRooms] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <>
      {/* Desktop Navigation */}
      <Navbar expand="lg" className="bg-primary d-none d-md-flex">
        <Container>
          <Navbar.Brand as={Link} href="/" className="text-white">
            StudyBuddy
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} href="/" className="text-white">
                Home
              </Nav.Link>
              {user && (
                <>
                  <Nav.Link as={Link} href="/dashboard" className="text-white">
                    Dashboard
                  </Nav.Link>
                  <Nav.Link as={Link} href="/courses" className="text-white">
                    Courses
                  </Nav.Link>
                  <Nav.Link as={Link} href="/grades" className="text-white">
                    Grades
                  </Nav.Link>
                  <Nav.Link
                    href="#"
                    className="text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowChatRooms(true);
                    }}
                  >
                    Chat Rooms
                  </Nav.Link>
                  <Nav.Link as={Link} href="/ai-study-help" className="text-white">
                    AI Helper
                  </Nav.Link>
                </>
              )}
              <Nav.Link as={Link} href="/contact" className="text-white">
                Contact
              </Nav.Link>
            </Nav>
            
            {user && (
              <Nav className="ms-auto">
                <Dropdown align="end">
                  <Dropdown.Toggle 
                    as="div" 
                    id="user-dropdown" 
                    style={{ cursor: 'pointer' }}
                    className="d-flex align-items-center p-0 border-0 bg-transparent"
                  >
                    <div className="d-flex align-items-center profile-dropdown-trigger">
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt="Profile"
                          width={45}
                          height={45}
                          className="rounded-circle me-2 profile-image"
                        />
                      ) : (
                        <div className="profile-placeholder me-2">
                          <i className="fas fa-user"></i>
                        </div>
                      )}
                      <div className="d-none d-lg-block text-white">
                        <div className="fw-bold">{user.displayName?.split(' ')[0] || 'User'}</div>
                        <small className="opacity-75 text-truncate d-block header-email">{user.email}</small>
                      </div>
                      <i className="fas fa-chevron-down ms-2 text-white"></i>
                    </div>
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="profile-dropdown-menu shadow-lg">
                    <div className="profile-dropdown-header">
                      <div className="d-flex align-items-center p-3">
                        {user.photoURL ? (
                          <Image
                            src={user.photoURL}
                            alt="Profile"
                            width={50}
                            height={50}
                            className="rounded-circle me-3"
                          />
                        ) : (
                          <div className="profile-placeholder-large me-3">
                            <i className="fas fa-user"></i>
                          </div>
                        )}
                        <div>
                          <div className="fw-bold">{user.displayName || 'User'}</div>
                          <small className="text-muted text-truncate d-block header-email-menu">{user.email}</small>
                        </div>
                      </div>
                    </div>
                    
                    <Dropdown.Divider />
                    
                    <Dropdown.Item as={Link} href="/settings" className="dropdown-item-custom">
                      <i className="fas fa-cog me-2"></i>
                      Settings & Schedule
                    </Dropdown.Item>
                    
                    <Dropdown.Item as={Link} href="/profile" className="dropdown-item-custom">
                      <i className="fas fa-user-circle me-2"></i>
                      My Profile
                    </Dropdown.Item>
                    
                    <Dropdown.Item 
                      href="#"
                      className="dropdown-item-custom"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowChatRooms(true);
                      }}
                    >
                      <i className="fas fa-comments me-2"></i>
                      Chat Rooms
                    </Dropdown.Item>
                    
                    <Dropdown.Item as={Link} href="/grades" className="dropdown-item-custom">
                      <i className="fas fa-chart-bar me-2"></i>
                      Grade Analytics
                    </Dropdown.Item>
                    
                    <Dropdown.Divider />
                    
                    <Dropdown.Item onClick={handleLogout} className="dropdown-item-custom text-danger">
                      <i className="fas fa-sign-out-alt me-2"></i>
                      Logout
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav>
            )}
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Mobile Navigation */}
      {user && (
        <nav className="navbar-bottom d-md-none">
          <div className="nav-item">
            <Link href="/dashboard" className="nav-link">
              <i className="fas fa-home"></i>
            </Link>
          </div>
          <div className="nav-item">
            <Link href="/courses" className="nav-link">
              <i className="fas fa-clipboard-list"></i>
            </Link>
          </div>
          <div className="nav-item">
            <Link href="/grades" className="nav-link">
              <i className="fas fa-graduation-cap"></i>
            </Link>
          </div>
          <div className="nav-item">
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setShowChatRooms(true);
              }}
            >
              <i className="fas fa-comments"></i>
            </a>
          </div>
          <div className="nav-item">
            <Link href="/ai-study-help" className="nav-link">
              <i className="fas fa-robot"></i>
            </Link>
          </div>
        </nav>
      )}
      
      <style jsx>{`
        .profile-dropdown-trigger:hover {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px 12px;
          transition: all 0.3s ease;
        }

        .header-email {
          max-width: 240px;
        }

        .header-email-menu {
          max-width: 220px;
        }
        
        .profile-image {
          border: 3px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }
        
        .profile-image:hover {
          border-color: rgba(255, 255, 255, 0.6);
          transform: scale(1.05);
        }
        
        .profile-placeholder, .profile-placeholder-large {
          width: 45px;
          height: 45px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
        }
        
        .profile-placeholder-large {
          width: 50px;
          height: 50px;
          font-size: 20px;
        }
        
        :global(.profile-dropdown-menu) {
          border-radius: 15px !important;
          border: none !important;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
          padding: 0 !important;
          min-width: 280px !important;
          overflow: hidden;
        }
        
        :global(.profile-dropdown-header) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        :global(.dropdown-item-custom) {
          padding: 12px 20px !important;
          transition: all 0.2s ease !important;
          border: none !important;
        }
        
        :global(.dropdown-item-custom:hover) {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
          transform: translateX(5px);
          color: #495057 !important;
        }
        
        :global(.dropdown-item-custom.text-danger:hover) {
          background: linear-gradient(135deg, #ffe6e6 0%, #ffcccc 100%) !important;
          color: #dc3545 !important;
        }
      `}</style>

      {/* Chat Rooms Modal */}
      <ChatRoomList 
        show={showChatRooms} 
        onHide={() => setShowChatRooms(false)} 
      />
    </>
  );
}

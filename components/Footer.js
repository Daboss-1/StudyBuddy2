import { Container, Row, Col } from 'react-bootstrap';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer-section mt-5">
      <div className="footer-main py-4">
        <Container>
          <Row>
            <Col md={6} className="text-center text-md-start">
              <h5 className="footer-brand mb-3">StudyBuddy</h5>
              <p className="footer-description mb-3">
                Your AI-powered academic companion for managing assignments, 
                tracking grades, and getting personalized study assistance.
              </p>
            </Col>
            <Col md={3} className="text-center text-md-start">
              <h6 className="footer-heading mb-3">Quick Links</h6>
              <ul className="footer-links list-unstyled">
                <li><Link href="/dashboard">Dashboard</Link></li>
                <li><Link href="/courses">Courses</Link></li>
                <li><Link href="/grades">Grades</Link></li>
                <li><Link href="/contact">Contact</Link></li>
              </ul>
            </Col>
            <Col md={3} className="text-center text-md-start">
              <h6 className="footer-heading mb-3">Legal</h6>
              <ul className="footer-links list-unstyled">
                <li><Link href="/terms-of-service">Terms of Service</Link></li>
                <li><Link href="/privacy-policy">Privacy Policy</Link></li>
              </ul>
            </Col>
          </Row>
        </Container>
      </div>
      
      <div className="footer-bottom py-3">
        <Container>
          <Row>
            <Col className="text-center">
              <p className="footer-copyright mb-0">
                &copy; 2025 StudyBuddy. All rights reserved. | 
                <span className="ms-2">
                  <i className="fas fa-heart text-danger"></i> Made for students
                </span>
              </p>
            </Col>
          </Row>
        </Container>
      </div>

      <style jsx>{`
        .footer-section {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          margin-top: auto;
        }
        
        .footer-main {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .footer-brand {
          font-weight: bold;
          color: #3498db;
          margin-bottom: 1rem;
        }
        
        .footer-description {
          color: #bdc3c7;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        
        .footer-heading {
          font-weight: 600;
          color: #ecf0f1;
          margin-bottom: 1rem;
        }
        
        .footer-links li {
          margin-bottom: 0.5rem;
        }
        
        .footer-links a {
          color: #bdc3c7;
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.3s ease;
        }
        
        .footer-links a:hover {
          color: #3498db;
        }
        
        .footer-bottom {
          background: rgba(0, 0, 0, 0.1);
        }
        
        .footer-copyright {
          font-size: 0.9rem;
          color: #bdc3c7;
        }
        
        @media (max-width: 768px) {
          .footer-main .col-md-3,
          .footer-main .col-md-6 {
            margin-bottom: 2rem;
          }
          
          .footer-main .col-md-3:last-child,
          .footer-main .col-md-6:last-child {
            margin-bottom: 0;
          }
        }
      `}</style>
    </footer>
  );
}

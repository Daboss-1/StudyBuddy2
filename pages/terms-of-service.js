import Layout from '../components/Layout';
import { Container, Card } from 'react-bootstrap';

export default function TermsOfService() {
  return (
    <Layout>
      <Container className="mt-5 mb-5">
        <div className="text-center mb-5">
          <h1 className="display-4">Terms of Service</h1>
          <p className="lead text-muted">Last updated: October 22, 2025</p>
        </div>

        <Card className="shadow-sm">
          <Card.Body className="p-5">
            <div className="terms-content">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using StudyBuddy ("the Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                StudyBuddy is an educational platform that helps students manage their academic work by:
              </p>
              <ul>
                <li>Integrating with Google Classroom to display assignments and grades</li>
                <li>Providing study assistance through AI-powered tutoring</li>
                <li>Organizing academic schedules and deadlines</li>
                <li>Offering study tips and educational resources</li>
              </ul>

              <h2>3. User Accounts and Registration</h2>
              <p>
                To access certain features of StudyBuddy, you must create an account using your Google account. 
                You are responsible for:
              </p>
              <ul>
                <li>Maintaining the confidentiality of your account</li>
                <li>Ensuring all information provided is accurate and up-to-date</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>

              <h2>4. Google Classroom Integration</h2>
              <p>
                When you connect your Google Classroom account, you grant StudyBuddy permission to:
              </p>
              <ul>
                <li>Read your course information and enrollment</li>
                <li>Access your assignments and their details</li>
                <li>View your grades and submission status</li>
                <li>Display class rosters for collaborative features</li>
              </ul>
              <p>
                We only access the minimum data necessary to provide our services and never modify your 
                Google Classroom content.
              </p>

              <h2>5. AI Study Assistance</h2>
              <p>
                Our AI study assistance feature is provided for educational support only. You acknowledge that:
              </p>
              <ul>
                <li>AI responses are for guidance and should not replace your own learning</li>
                <li>You are responsible for verifying the accuracy of AI-generated content</li>
                <li>AI assistance should supplement, not substitute, proper academic work</li>
                <li>Using AI assistance for academic dishonesty violates your school's policies</li>
              </ul>

              <h2>6. Acceptable Use</h2>
              <p>You agree not to use StudyBuddy to:</p>
              <ul>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code or attempt to hack the system</li>
                <li>Share inappropriate, offensive, or harmful content</li>
                <li>Impersonate others or create false accounts</li>
                <li>Use the service for commercial purposes without permission</li>
                <li>Circumvent academic integrity policies</li>
              </ul>

              <h2>7. Privacy and Data Protection</h2>
              <p>
                Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect 
                your information. By using StudyBuddy, you also agree to our Privacy Policy.
              </p>

              <h2>8. Content and Intellectual Property</h2>
              <p>
                StudyBuddy respects intellectual property rights. You retain ownership of content you create, 
                but grant us a license to use it as necessary to provide our services. We reserve all rights 
                to our proprietary content, including but not limited to:
              </p>
              <ul>
                <li>Software code and algorithms</li>
                <li>User interface design</li>
                <li>Educational content we create</li>
                <li>Trademarks and branding</li>
              </ul>

              <h2>9. Service Availability</h2>
              <p>
                While we strive to provide continuous service, we do not guarantee uninterrupted access. 
                We may temporarily suspend service for:
              </p>
              <ul>
                <li>Scheduled maintenance</li>
                <li>Emergency repairs</li>
                <li>System upgrades</li>
                <li>Technical difficulties beyond our control</li>
              </ul>

              <h2>10. Age Requirements</h2>
              <p>
                StudyBuddy is intended for students aged 13 and older. Users under 13 require parental 
                consent to use our services. Users under 18 should have parental guidance when using 
                our platform.
              </p>

              <h2>11. Limitation of Liability</h2>
              <p>
                StudyBuddy is provided "as is" without warranties of any kind. We are not liable for:
              </p>
              <ul>
                <li>Any damages resulting from use or inability to use our service</li>
                <li>Academic performance or outcomes</li>
                <li>Loss of data or content</li>
                <li>Third-party content or services (including Google Classroom)</li>
                <li>Decisions made based on AI-generated content</li>
              </ul>

              <h2>12. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless StudyBuddy and its affiliates from any claims, 
                damages, or expenses arising from your use of the service or violation of these terms.
              </p>

              <h2>13. Termination</h2>
              <p>
                We may terminate or suspend your account at any time for violation of these terms. 
                You may also terminate your account at any time. Upon termination:
              </p>
              <ul>
                <li>Your access to the service will be immediately revoked</li>
                <li>We may delete your account data after a reasonable period</li>
                <li>Sections of these terms that should survive will remain in effect</li>
              </ul>

              <h2>14. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of significant 
                changes through the platform or email. Continued use of StudyBuddy after changes constitutes 
                acceptance of the new terms.
              </p>

              <h2>15. Educational Use Only</h2>
              <p>
                StudyBuddy is designed for educational purposes. We encourage:
              </p>
              <ul>
                <li>Honest academic work</li>
                <li>Proper citation of sources</li>
                <li>Compliance with your school's academic integrity policies</li>
                <li>Using our tools to enhance, not replace, your learning</li>
              </ul>

              <h2>16. Governing Law</h2>
              <p>
                These terms are governed by the laws of state jurisdiction. Any disputes will be resolved 
                through binding arbitration or in the courts of state jurisdiction.
              </p>

              <h2>17. Contact Information</h2>
              <p>
                If you have questions about these Terms of Service, please contact us at:
              </p>
              <ul>
                <li>Email: everett.hurder@gmail.com</li>
              </ul>

              <hr className="my-4" />
              
              <p className="text-muted small">
                By using StudyBuddy, you acknowledge that you have read, understood, and agree to be bound 
                by these Terms of Service. These terms constitute the entire agreement between you and 
                StudyBuddy regarding your use of the service.
              </p>
            </div>
          </Card.Body>
        </Card>
      </Container>

      <style jsx>{`
        .terms-content h2 {
          color: #2c3e50;
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        
        .terms-content h2:first-child {
          margin-top: 0;
        }
        
        .terms-content p {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        
        .terms-content ul {
          margin-bottom: 1.5rem;
        }
        
        .terms-content li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
      `}</style>
    </Layout>
  );
}

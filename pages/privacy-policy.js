import Layout from '../components/Layout';
import { Container, Card, Alert } from 'react-bootstrap';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <Container className="mt-5 mb-5">
        <div className="text-center mb-5">
          <h1 className="display-4">Privacy Policy</h1>
          <p className="lead text-muted">Last updated: August 11, 2025</p>
        </div>

        <Alert variant="info" className="mb-4">
          <Alert.Heading>Your Privacy Matters</Alert.Heading>
          <p className="mb-0">
            This Privacy Policy explains how StudyBuddy collects, uses, and protects your personal 
            information. We are committed to protecting your privacy and ensuring transparency about 
            our data practices.
          </p>
        </Alert>

        <Card className="shadow-sm">
          <Card.Body className="p-5">
            <div className="privacy-content">
              <h2>1. Information We Collect</h2>
              
              <h3>Personal Information</h3>
              <p>When you create an account with StudyBuddy, we collect:</p>
              <ul>
                <li><strong>Google Account Information:</strong> Name, email address, profile picture</li>
                <li><strong>Profile Data:</strong> Grade level, school name, bio (optional)</li>
                <li><strong>Account Metadata:</strong> Creation date, last login, preferences</li>
              </ul>

              <h3>Google Classroom Data</h3>
              <p>When you connect your Google Classroom, we access:</p>
              <ul>
                <li><strong>Course Information:</strong> Course names, descriptions, teacher names</li>
                <li><strong>Assignment Data:</strong> Titles, descriptions, due dates, point values</li>
                <li><strong>Grade Information:</strong> Assignment grades, overall course grades</li>
                <li><strong>Submission Status:</strong> Whether assignments are turned in, returned, or graded</li>
                <li><strong>Class Materials:</strong> Links to documents, videos, and other resources</li>
              </ul>

              <h3>Usage Information</h3>
              <p>We automatically collect:</p>
              <ul>
                <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
                <li><strong>Usage Analytics:</strong> Pages visited, features used, time spent on platform</li>
                <li><strong>Error Logs:</strong> Technical errors and performance data</li>
                <li><strong>Study Assistance Interactions:</strong> Questions asked to our AI tutor</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              
              <h3>Primary Service Functions</h3>
              <ul>
                <li><strong>Dashboard Display:</strong> Show your courses, assignments, and grades</li>
                <li><strong>Schedule Management:</strong> Organize your academic calendar</li>
                <li><strong>Study Assistance:</strong> Provide personalized AI tutoring based on your assignments</li>
                <li><strong>Progress Tracking:</strong> Monitor your academic progress and performance</li>
              </ul>

              <h3>Platform Improvement</h3>
              <ul>
                <li><strong>Feature Development:</strong> Analyze usage patterns to improve our service</li>
                <li><strong>Bug Fixes:</strong> Identify and resolve technical issues</li>
                <li><strong>Performance Optimization:</strong> Enhance speed and reliability</li>
              </ul>

              <h3>Communication</h3>
              <ul>
                <li><strong>Service Updates:</strong> Notify you about important changes or new features</li>
                <li><strong>Support:</strong> Respond to your questions and provide assistance</li>
                <li><strong>Security Alerts:</strong> Inform you about security-related issues</li>
              </ul>

              <h2>3. Data Sharing and Disclosure</h2>
              
              <h3>We DO NOT sell your personal information.</h3>
              
              <h3>Limited Sharing</h3>
              <p>We may share your information only in these specific circumstances:</p>
              <ul>
                <li><strong>Service Providers:</strong> Third-party services that help us operate (e.g., Google Cloud, Firebase)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or legal process</li>
                <li><strong>Safety:</strong> To protect the safety of users or prevent illegal activity</li>
                <li><strong>Business Transfers:</strong> In the event of a merger or acquisition (with user notification)</li>
              </ul>

              <h3>Google Classroom Integration</h3>
              <p>
                Your Google Classroom data is accessed through Google's secure APIs. We do not share this 
                data with any third parties except as necessary to provide our services.
              </p>

              <h2>4. Data Security</h2>
              
              <h3>Protection Measures</h3>
              <ul>
                <li><strong>Encryption:</strong> Data is encrypted in transit and at rest</li>
                <li><strong>Access Controls:</strong> Strict limits on who can access user data</li>
                <li><strong>Secure Infrastructure:</strong> Hosted on Google Cloud with enterprise-grade security</li>
                <li><strong>Regular Audits:</strong> Periodic security reviews and updates</li>
                <li><strong>Authentication:</strong> Secure Google OAuth for account access</li>
              </ul>

              <h3>Incident Response</h3>
              <p>
                In the event of a data breach, we will notify affected users within 72 hours and 
                provide information about the incident and remediation steps.
              </p>

              <h2>5. Your Rights and Choices</h2>
              
              <h3>Account Control</h3>
              <ul>
                <li><strong>Access:</strong> View all data we have about you</li>
                <li><strong>Update:</strong> Modify your profile information at any time</li>
                <li><strong>Delete:</strong> Request deletion of your account and associated data</li>
                <li><strong>Download:</strong> Export your data in a portable format</li>
              </ul>

              <h3>Google Classroom Permissions</h3>
              <ul>
                <li><strong>Revoke Access:</strong> Disconnect Google Classroom integration at any time</li>
                <li><strong>Selective Permissions:</strong> Control which Google services we can access</li>
                <li><strong>Data Refresh:</strong> Choose how often we sync your classroom data</li>
              </ul>

              <h3>Communication Preferences</h3>
              <ul>
                <li><strong>Email Settings:</strong> Control what notifications you receive</li>
                <li><strong>Opt-out:</strong> Unsubscribe from non-essential communications</li>
              </ul>

              <h2>6. Data Retention</h2>
              
              <h3>Retention Periods</h3>
              <ul>
                <li><strong>Active Accounts:</strong> Data retained as long as your account is active</li>
                <li><strong>Inactive Accounts:</strong> Deleted after 2 years of inactivity</li>
                <li><strong>Deleted Accounts:</strong> Most data deleted within 30 days</li>
                <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
              </ul>

              <h3>Backup Retention</h3>
              <p>
                Data in our backup systems is automatically deleted according to our backup retention 
                schedule, typically within 90 days.
              </p>

              <h2>7. Children's Privacy</h2>
              
              <h3>Age Requirements</h3>
              <ul>
                <li><strong>Minimum Age:</strong> Users must be at least 13 years old</li>
                <li><strong>Parental Consent:</strong> Users under 13 require verifiable parental consent</li>
                <li><strong>COPPA Compliance:</strong> We comply with the Children's Online Privacy Protection Act</li>
                <li><strong>Educational Use:</strong> Designed for educational purposes in compliance with FERPA</li>
              </ul>

              <h2>8. International Users</h2>
              
              <h3>Data Transfers</h3>
              <p>
                StudyBuddy is based in the United States. If you are accessing our service from outside 
                the US, your data may be transferred to and stored in the US. We ensure appropriate 
                safeguards are in place for international data transfers.
              </p>

              <h3>Regional Compliance</h3>
              <ul>
                <li><strong>GDPR:</strong> European users have additional rights under GDPR</li>
                <li><strong>CCPA:</strong> California residents have specific privacy rights</li>
                <li><strong>Other Laws:</strong> We comply with applicable regional privacy laws</li>
              </ul>

              <h2>9. Third-Party Services</h2>
              
              <h3>Google Services</h3>
              <p>
                StudyBuddy integrates with Google services (Authentication, Classroom, Cloud). 
                Google's privacy practices are governed by their own privacy policy.
              </p>

              <h3>AI Services</h3>
              <p>
                Our AI tutoring feature uses Google's Gemini AI service. Study assistance requests 
                are processed according to Google's AI service terms and privacy policies.
              </p>

              <h2>10. Cookies and Tracking</h2>
              
              <h3>Necessary Cookies</h3>
              <ul>
                <li><strong>Authentication:</strong> Keep you logged in securely</li>
                <li><strong>Preferences:</strong> Remember your settings</li>
                <li><strong>Session Management:</strong> Maintain your session state</li>
              </ul>

              <h3>Analytics</h3>
              <p>
                We use analytics to understand how our service is used and to improve user experience. 
                You can opt out of analytics tracking in your account settings.
              </p>

              <h2>11. Changes to This Policy</h2>
              
              <h3>Policy Updates</h3>
              <ul>
                <li><strong>Notification:</strong> We'll notify you of significant changes</li>
                <li><strong>Effective Date:</strong> Changes take effect 30 days after notification</li>
                <li><strong>Continued Use:</strong> Using StudyBuddy after changes means you accept them</li>
                <li><strong>Version History:</strong> Previous versions available upon request</li>
              </ul>

              <h2>12. Contact Us</h2>
              
              <h3>Privacy Questions</h3>
              <p>If you have questions about this Privacy Policy or our data practices:</p>
              <ul>
                <li><strong>Email:</strong> everett.hurder@gmail.com</li>
              </ul>

              <h3>Data Protection Officer</h3>
              <p>For GDPR-related inquiries, contact our Data Protection Officer (me) at: everett.hurder@gmail.com</p>

              <hr className="my-4" />
              
              <div className="bg-light p-3 rounded">
                <h3>Summary of Your Rights</h3>
                <p><strong>You have the right to:</strong></p>
                <ul className="mb-0">
                  <li>Know what personal information we collect and how we use it</li>
                  <li>Access and update your personal information</li>
                  <li>Delete your account and associated data</li>
                  <li>Control your Google Classroom integration</li>
                  <li>Opt out of non-essential communications</li>
                  <li>Request a copy of your data</li>
                  <li>File a complaint with privacy regulators</li>
                </ul>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Container>

      <style jsx>{`
        .privacy-content h2 {
          color: #2c3e50;
          margin-top: 2rem;
          margin-bottom: 1rem;
          font-weight: 600;
        }
        
        .privacy-content h2:first-child {
          margin-top: 0;
        }
        
        .privacy-content h3 {
          color: #34495e;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
        }
        
        .privacy-content p {
          margin-bottom: 1rem;
          line-height: 1.6;
        }
        
        .privacy-content ul {
          margin-bottom: 1.5rem;
        }
        
        .privacy-content li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        
        .privacy-content strong {
          color: #2c3e50;
        }
      `}</style>
    </Layout>
  );
}

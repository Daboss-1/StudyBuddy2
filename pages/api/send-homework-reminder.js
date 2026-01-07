// API endpoint to send homework reminder emails at 6:30 PM ET
import nodemailer from 'nodemailer';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import GoogleClassroomService from '../../lib/googleClassroom';

// Email configuration - set these in environment variables
const EMAIL_USER = process.env.EMAIL_USER || 'studybuddy.teacher123@gmail.com';
const EMAIL_PASS = process.env.EMAIL_APP_PASSWORD;

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

// Generate reminder email HTML template
const generateReminderEmailHTML = (userName, unsubmittedAssignments) => {
  const firstName = userName?.split(' ')[0] || 'Student';
  const assignmentCount = unsubmittedAssignments.length;
  
  const renderAssignment = (assignment) => {
    return `
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #f0f0f0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="36" valign="top" style="padding-right: 12px;">
                <table cellpadding="0" cellspacing="0" border="0" width="24" height="24" style="
                  width: 24px;
                  height: 24px;
                  min-width: 24px;
                  max-width: 24px;
                  border-radius: 12px;
                  background: linear-gradient(135deg, #ef4444, #dc2626);
                ">
                  <tr>
                    <td align="center" valign="middle" style="
                      width: 24px;
                      height: 24px;
                      line-height: 24px;
                      text-align: center;
                      vertical-align: middle;
                      color: white;
                      font-size: 12px;
                    ">!</td>
                  </tr>
                </table>
              </td>
              <td valign="top">
                <div style="
                  font-size: 16px;
                  font-weight: 600;
                  color: #1f2937;
                  margin-bottom: 4px;
                ">
                  ${assignment.title}
                </div>
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px;">
                  📚 ${assignment.courseName}
                </div>
                <div style="font-size: 13px; color: #9ca3af;">
                  ⏰ Due: ${assignment.dueDateFormatted}
                  ${assignment.maxPoints ? ` • ${assignment.maxPoints} pts` : ''}
                </div>
                ${assignment.alternateLink ? `
                  <a href="${assignment.alternateLink}" style="
                    display: inline-block;
                    margin-top: 8px;
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 600;
                  ">
                    Open & Turn In →
                  </a>
                ` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Homework Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
              <h1 style="color: white; margin: 0 0 8px 0; font-size: 28px; font-weight: 700;">
                Hey ${firstName}!
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">
                You have ${assignmentCount} unsubmitted assignment${assignmentCount > 1 ? 's' : ''} due tomorrow!
              </p>
            </td>
          </tr>

          <!-- Urgent Message -->
          <tr>
            <td style="padding: 30px;">
              <div style="
                background: linear-gradient(135deg, #fef2f2, #fee2e2);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                border-left: 4px solid #ef4444;
              ">
                <div style="font-size: 18px; font-weight: 600; color: #991b1b; margin-bottom: 8px;">
                  🚨 Don't forget to turn in your work!
                </div>
                <div style="font-size: 14px; color: #7f1d1d;">
                  Make sure to press the "Turn In" button in Google Classroom, even if you've already uploaded your files.
                </div>
              </div>
            </td>
          </tr>

          <!-- Assignments Section -->
          <tr>
            <td style="padding: 0 30px 10px 30px;">
              <div style="
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
              ">
                📋 Needs Your Attention
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="
                background: #fafafa;
                border-radius: 12px;
                overflow: hidden;
              ">
                ${unsubmittedAssignments.map(renderAssignment).join('')}
              </table>
            </td>
          </tr>

          <!-- Tips Section -->
          <tr>
            <td style="padding: 30px;">
              <div style="
                background: linear-gradient(135deg, #ecfdf5, #d1fae5);
                border-radius: 12px;
                padding: 24px;
                text-align: center;
              ">
                <div style="font-size: 32px; margin-bottom: 12px;">💡</div>
                <div style="font-size: 16px; font-weight: 600; color: #065f46; margin-bottom: 8px;">
                  Quick Reminder
                </div>
                <div style="font-size: 14px; color: #047857; line-height: 1.6;">
                  <strong>Step 1:</strong> Open the assignment in Google Classroom<br>
                  <strong>Step 2:</strong> Make sure all your work is attached<br>
                  <strong>Step 3:</strong> Click the "Turn In" button<br>
                  <strong>Step 4:</strong> Relax and enjoy your evening! 🎉
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <div style="font-size: 20px; margin-bottom: 8px;">📚 StudyBuddy</div>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated reminder. You can disable these in your StudyBuddy settings.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Send reminder email to a single user
export const sendReminderToUser = async (userEmail, userName, accessToken) => {
  try {
    if (!EMAIL_PASS) {
      throw new Error('EMAIL_APP_PASSWORD not configured');
    }

    // Initialize classroom service and get tomorrow's assignments
    const classroomService = new GoogleClassroomService();
    await classroomService.initialize(accessToken);
    
    const tomorrowAssignments = await classroomService.getDueWorkTomorrow();
    
    // Filter only unsubmitted assignments
    const unsubmittedAssignments = tomorrowAssignments.filter(a => !a.isDone);
    
    // If no unsubmitted assignments, don't send email
    if (unsubmittedAssignments.length === 0) {
      console.log(`✓ ${userEmail} has no unsubmitted assignments due tomorrow - skipping reminder`);
      return { success: true, skipped: true, reason: 'No unsubmitted assignments' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"StudyBuddy" <${EMAIL_USER}>`,
      to: userEmail,
      subject: `⚠️ Reminder: ${unsubmittedAssignments.length} assignment${unsubmittedAssignments.length > 1 ? 's' : ''} due tomorrow!`,
      html: generateReminderEmailHTML(userName, unsubmittedAssignments),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Reminder sent to ${userEmail}:`, result.messageId);
    return { success: true, messageId: result.messageId, assignmentCount: unsubmittedAssignments.length };
  } catch (error) {
    console.error(`❌ Failed to send reminder to ${userEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Get all users who have reminders enabled
const getUsersForReminder = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    // Deduplicate by email address
    const emailMap = new Map();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Only include users with:
      // 1. Valid email
      // 2. Classroom access (so we have their token)
      // 3. Homework reminders enabled (or not explicitly disabled)
      if (data.email && data.hasClassroomAccess) {
        const reminderEnabled = data.homeworkReminderEnabled !== false; // Default to true
        if (reminderEnabled && !emailMap.has(data.email)) {
          emailMap.set(data.email, {
            uid: doc.id,
            email: data.email,
            name: data.displayName || data.name || 'Student',
            accessToken: data.classroomAccessToken
          });
        }
      }
    });
    
    return Array.from(emailMap.values());
  } catch (error) {
    console.error('Error fetching users for reminder:', error);
    throw error;
  }
};

// API Handler
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, accessToken, singleUser, cronSecret } = req.body || {};
    
    // For cron jobs, verify using Vercel's CRON_SECRET header or query param
    if (req.method === 'GET') {
      // Vercel sends Authorization header with CRON_SECRET for cron jobs
      const authHeader = req.headers['authorization'];
      const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
      const isManualCron = (req.query?.secret || cronSecret) === process.env.CRON_SECRET;
      
      if (!isVercelCron && !isManualCron) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Return info about users who should receive reminders
      const users = await getUsersForReminder();
      return res.status(200).json({
        success: true,
        message: `Found ${users.length} users with homework reminders enabled`,
        users: users.map(u => ({ email: u.email, name: u.name })),
        note: 'Access tokens must be provided per-user for actual sends'
      });
    }

    // Manual single-user send
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // If sending to a single user, look up their info from Firestore
    let email;
    let name;

    if (singleUser && userId) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userData = userDoc.data();
      email = userData.email;
      name = userData.displayName || userData.name || 'Student';
    }

    if (!email) {
      return res.status(400).json({ error: 'User email required' });
    }

    const result = await sendReminderToUser(email, name, accessToken);
    
    if (result.success) {
      if (result.skipped) {
        return res.status(200).json({
          success: true,
          message: 'No unsubmitted assignments due tomorrow - no reminder needed!',
          skipped: true
        });
      }
      return res.status(200).json({
        success: true,
        message: `Reminder sent! You have ${result.assignmentCount} assignment${result.assignmentCount > 1 ? 's' : ''} to turn in.`,
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Send homework reminder error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send homework reminder'
    });
  }
}

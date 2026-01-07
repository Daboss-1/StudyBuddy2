// API endpoint to send homework report emails
import nodemailer from 'nodemailer';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
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

// Generate beautiful HTML email template
const generateEmailHTML = (userName, todayAssignments, tomorrowAssignments) => {
  const firstName = userName?.split(' ')[0] || 'Student';
  
  const todayCompleted = todayAssignments.filter(a => a.isDone).length;
  const todayTotal = todayAssignments.length;
  const allTodayDone = todayTotal > 0 && todayCompleted === todayTotal;
  
  const renderAssignment = (assignment) => {
    const isDone = assignment.isDone;
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
                  background: ${isDone ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)'};
                ">
                  <tr>
                    <td align="center" valign="middle" style="
                      width: 24px;
                      height: 24px;
                      line-height: 24px;
                      text-align: center;
                      vertical-align: middle;
                      color: white;
                      font-size: ${isDone ? '14px' : '12px'};
                    ">${isDone ? '✓' : '○'}</td>
                  </tr>
                </table>
              </td>
              <td valign="top">
                <div style="
                  font-size: 16px;
                  font-weight: 600;
                  color: ${isDone ? '#9ca3af' : '#1f2937'};
                  ${isDone ? 'text-decoration: line-through;' : ''}
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
                    padding: 6px 12px;
                    background: ${isDone ? '#e5e7eb' : 'linear-gradient(135deg, #667eea, #764ba2)'};
                    color: ${isDone ? '#6b7280' : 'white'};
                    text-decoration: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                  ">
                    ${isDone ? 'View Submission' : 'Open in Classroom →'}
                  </a>
                ` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  };

  const renderEmptyState = (message) => `
    <tr>
      <td style="padding: 40px 20px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
        <div style="font-size: 18px; color: #10b981; font-weight: 600;">${message}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">Great job staying on top of your work!</div>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StudyBuddy Homework Report</title>
</head>
<body style="
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f3f4f6;
  line-height: 1.6;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 30px;
              text-align: center;
            ">
              <div style="font-size: 32px; margin-bottom: 8px;">📚</div>
              <h1 style="
                margin: 0;
                color: white;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
              ">
                Daily Homework Report
              </h1>
              <p style="
                margin: 12px 0 0 0;
                color: rgba(255,255,255,0.9);
                font-size: 16px;
              ">
                Hey ${firstName}! Here's what's on your plate 📋
              </p>
            </td>
          </tr>

          <!-- Today's Status Banner -->
          ${allTodayDone && todayTotal > 0 ? `
          <tr>
            <td style="padding: 0;">
              <div style="
                background: linear-gradient(135deg, #10b981, #059669);
                padding: 16px 30px;
                text-align: center;
              ">
                <span style="color: white; font-size: 16px; font-weight: 600;">
                  🎊 Amazing! You've completed all ${todayTotal} assignment${todayTotal > 1 ? 's' : ''} for today!
                </span>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Today's Assignments Section -->
          <tr>
            <td style="padding: 30px 30px 10px 30px;">
              <div style="
                display: flex;
                align-items: center;
                margin-bottom: 20px;
              ">
                <div style="
                  background: linear-gradient(135deg, #f59e0b, #d97706);
                  color: white;
                  padding: 8px 16px;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                ">
                  📅 Due Today
                </div>
                ${todayTotal > 0 ? `
                <span style="
                  margin-left: 12px;
                  color: #6b7280;
                  font-size: 14px;
                ">
                  ${todayCompleted}/${todayTotal} completed
                </span>
                ` : ''}
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
                ${todayAssignments.length > 0 
                  ? todayAssignments.map(renderAssignment).join('')
                  : renderEmptyState('No assignments due today!')}
              </table>
            </td>
          </tr>

          <!-- Tomorrow's Assignments Section -->
          <tr>
            <td style="padding: 30px 30px 10px 30px;">
              <div style="
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                display: inline-block;
              ">
                🌅 Due Tomorrow
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
                ${tomorrowAssignments.length > 0 
                  ? tomorrowAssignments.map(renderAssignment).join('')
                  : renderEmptyState('No assignments due tomorrow!')}
              </table>
            </td>
          </tr>

          <!-- Motivational Section -->
          <tr>
            <td style="padding: 30px;">
              <div style="
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                border-radius: 12px;
                padding: 24px;
                text-align: center;
              ">
                <div style="font-size: 32px; margin-bottom: 12px;">
                  ${allTodayDone ? '🚀' : '💪'}
                </div>
                <div style="font-size: 18px; font-weight: 600; color: #92400e; margin-bottom: 8px;">
                  ${allTodayDone 
                    ? "All caught up? Get ahead!" 
                    : "You've got this!"}
                </div>
                <div style="font-size: 14px; color: #a16207;">
                  ${allTodayDone 
                    ? "Consider starting tomorrow's assignments early to stay stress-free!" 
                    : "Focus on one assignment at a time. You're doing great!"}
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              background: #f9fafb;
              padding: 24px 30px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
            ">
              <div style="
                font-size: 20px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 8px;
              ">
                StudyBuddy
              </div>
              <div style="font-size: 13px; color: #9ca3af; margin-bottom: 12px;">
                Your personal study companion
              </div>
              <div style="font-size: 12px; color: #d1d5db;">
                To unsubscribe from these emails, visit Settings in your StudyBuddy dashboard.
              </div>
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

// Send email to a single user
export const sendHomeworkReportToUser = async (userEmail, userName, accessToken) => {
  try {
    if (!EMAIL_PASS) {
      throw new Error('EMAIL_APP_PASSWORD not configured');
    }

    // Initialize classroom service and get assignments
    const classroomService = new GoogleClassroomService();
    await classroomService.initialize(accessToken);
    
    const [todayAssignments, tomorrowAssignments] = await Promise.all([
      classroomService.getDueWorkToday(),
      classroomService.getDueWorkTomorrow()
    ]);

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"StudyBuddy" <${EMAIL_USER}>`,
      to: userEmail,
      subject: `📚 Your Daily Homework Report - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      html: generateEmailHTML(userName, todayAssignments, tomorrowAssignments),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${userEmail}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${userEmail}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Get all unique users who have email notifications enabled
const getAllUsersForEmail = async () => {
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
      // 3. Email notifications enabled (or not explicitly disabled)
      if (data.email && data.hasClassroomAccess) {
        const emailNotificationsEnabled = data.emailNotificationsEnabled !== false; // Default to true
        if (emailNotificationsEnabled && !emailMap.has(data.email)) {
          emailMap.set(data.email, {
            id: doc.id,
            email: data.email,
            name: data.name || data.displayName,
            // Note: We can't get access tokens from Firestore for security reasons
            // The scheduled job will need a different approach (see notes below)
          });
        }
      }
    });
    
    return Array.from(emailMap.values());
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

// API Handler
export default async function handler(req, res) {
  // Allow POST for manual sends and GET for cron job
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, userEmail, userName, accessToken, sendToAll, cronSecret, singleUser } = req.body || {};
    
    // For cron jobs, verify using Vercel's CRON_SECRET header or query param
    if (req.method === 'GET' || sendToAll) {
      // Vercel sends Authorization header with CRON_SECRET for cron jobs
      const authHeader = req.headers['authorization'];
      const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
      const isManualCron = (req.query?.secret || cronSecret) === process.env.CRON_SECRET;
      
      if (!isVercelCron && !isManualCron) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // For scheduled sends, we need a different approach since we can't store access tokens
      // Return info about users who should receive emails
      const users = await getAllUsersForEmail();
      return res.status(200).json({
        success: true,
        message: `Found ${users.length} users with email notifications enabled`,
        users: users.map(u => ({ email: u.email, name: u.name })),
        note: 'Access tokens must be provided per-user for actual sends'
      });
    }

    // Manual single-user send (from dashboard button)
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token required' });
    }

    // If sending to a single user, look up their info from Firestore
    let email = userEmail;
    let name = userName;

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

    const result = await sendHomeworkReportToUser(email, name, accessToken);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Homework report sent successfully!',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Send homework report error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send homework report'
    });
  }
}

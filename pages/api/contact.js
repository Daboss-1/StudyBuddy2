import { adminDb } from '../../lib/firebase-admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, subject, message } = req.body;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    // Save contact form submission to Firestore
    await adminDb.collection('contact_submissions').add({
      name,
      email,
      subject,
      message,
      timestamp: new Date(),
      status: 'new'
    });

    // TODO: Send email notification to admin
    // You can integrate with email service like SendGrid, Nodemailer, etc.
    
    console.log('Contact form submission:', {
      name,
      email,
      subject,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({ message: 'Contact form submitted successfully' });
  } catch (error) {
    console.error('Error saving contact form:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

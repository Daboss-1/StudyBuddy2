// API endpoint to exchange Google OAuth authorization code for access token
// This is needed for Android app which receives auth code from Google Sign-In

export default async function handler(req, res) {
  console.log('DEBUG: exchange-auth-code called with method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { authCode, redirectUri } = req.body;
    
    if (!authCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Authorization code required' 
      });
    }

    console.log('DEBUG: Exchanging auth code for access token...');
    console.log('DEBUG: Auth code length:', authCode.length);

    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri || '', // Empty for Android
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    console.log('DEBUG: Token response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      console.error('DEBUG: Token exchange failed:', tokenData);
      return res.status(400).json({
        success: false,
        message: tokenData.error_description || tokenData.error || 'Token exchange failed',
      });
    }

    console.log('DEBUG: Token exchange successful');
    console.log('DEBUG: Access token length:', tokenData.access_token?.length || 0);
    console.log('DEBUG: Refresh token present:', !!tokenData.refresh_token);
    console.log('DEBUG: Expires in:', tokenData.expires_in);

    return res.status(200).json({
      success: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
    });

  } catch (error) {
    console.error('DEBUG: exchange-auth-code error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
}

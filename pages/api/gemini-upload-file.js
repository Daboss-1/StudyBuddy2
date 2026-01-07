import { GoogleAIFileManager } from '@google/generative-ai/server';
import { google } from 'googleapis';

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { driveFileId, accessToken, fileName, mimeType } = req.body;

    if (!driveFileId || !accessToken) {
      return res.status(400).json({ error: 'Drive file ID and access token are required' });
    }

    // Initialize Google Drive API
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId: driveFileId,
      fields: 'name,mimeType,size'
    });

    const fileSize = parseInt(fileMetadata.data.size || '0');
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB limit for Gemini

    if (fileSize > MAX_SIZE) {
      return res.status(413).json({ 
        error: `File is too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum size is 20MB.` 
      });
    }

    // Get the file stream from Google Drive
    const fileStream = await drive.files.get({
      fileId: driveFileId,
      alt: 'media'
    }, { responseType: 'stream' });

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of fileStream.data) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Create a temporary file and upload to Gemini
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempFilePath = path.join(os.tmpdir(), `gemini_${Date.now()}_${driveFileId}`);
    fs.writeFileSync(tempFilePath, buffer);

    try {
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: mimeType || fileMetadata.data.mimeType,
        displayName: fileName || fileMetadata.data.name,
      });

      console.log(`DEBUG: Uploaded ${fileName} to Gemini: ${uploadResult.file.uri}`);

      // Wait for file to be processed (check status)
      let fileStatus = uploadResult.file.state;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (fileStatus === 'PROCESSING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const fileInfo = await fileManager.getFile(uploadResult.file.name);
        fileStatus = fileInfo.state;
        attempts++;
        console.log(`DEBUG: File ${fileName} status: ${fileStatus} (attempt ${attempts})`);
      }

      if (fileStatus !== 'ACTIVE') {
        console.error(`DEBUG: File ${fileName} not ready after ${attempts} attempts. Status: ${fileStatus}`);
        throw new Error(`File processing failed or timed out. Status: ${fileStatus}`);
      }

      console.log(`DEBUG: File ${fileName} is ready to use`);

      return res.status(200).json({
        fileUri: uploadResult.file.uri,
        mimeType: uploadResult.file.mimeType,
        displayName: uploadResult.file.displayName,
        name: uploadResult.file.name
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

  } catch (error) {
    console.error('File upload error:', error);
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({ 
        error: 'Upload quota exceeded. Please try again later.' 
      });
    }

    return res.status(500).json({ 
      error: error.message || 'Failed to upload file to AI service' 
    });
  }
}

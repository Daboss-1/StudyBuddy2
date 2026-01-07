import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tempFiles = []; // Track temporary files for cleanup

  try {
    const { prompt, assignment, attachments, fileUris } = req.body;
    console.log('DEBUG: Attachments received:', attachments);
    console.log('DEBUG: File URIs received:', fileUris);
    console.log('DEBUG: Prompt received:', prompt);
    console.log('DEBUG: Assignment received:', assignment);

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('DEBUG: Gemini API called with attachments:', attachments?.length || 0);

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    let parts = [];

    // Add file URIs FIRST (already uploaded to Gemini)
    if (fileUris && fileUris.length > 0) {
      console.log(`DEBUG: Adding ${fileUris.length} file URIs to request...`);
      for (const fileUri of fileUris) {
        console.log(`DEBUG: Adding file URI: ${fileUri.uri} (${fileUri.displayName})`);
        parts.push({
          fileData: {
            fileUri: fileUri.uri,
            mimeType: fileUri.mimeType
          }
        });
      }
      
      // Add a single instruction about the files
      const fileNames = fileUris.map(f => f.displayName).join(', ');
      parts.push({
        text: `\n\nAttached files for analysis: ${fileNames}\n\n`
      });
    }

    // Add the prompt AFTER the files
    parts.push({ text: prompt });

    // Handle legacy file attachments if provided (for backwards compatibility)
    if (attachments && attachments.length > 0 && (!fileUris || fileUris.length === 0)) {
      console.log(`DEBUG: Processing ${attachments.length} legacy attachments...`);
      
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        console.log(`DEBUG: Processing attachment ${i + 1}: ${attachment.name}`);
        
        try {
          if (attachment.fileData && attachment.fileData.data) {
            // Create temporary file
            const tempDir = os.tmpdir();
            const tempFileName = `gemini_temp_${Date.now()}_${i}${attachment.fileData.fileExtension}`;
            const tempFilePath = path.join(tempDir, tempFileName);
            
            // Debug: log the data structure
            console.log(`DEBUG: Processing file data - encoding: ${attachment.fileData.encoding || 'unknown'}`);
            console.log(`DEBUG: Data type: ${typeof attachment.fileData.data}`);
            
            // Write file data to temporary file
            let fileBuffer;
            
            // Check if data has encoding specified
            if (attachment.fileData.encoding === 'base64' && typeof attachment.fileData.data === 'string') {
              // Base64 encoded string (most reliable for JSON transmission)
              console.log(`DEBUG: Converting base64 string to buffer (length: ${attachment.fileData.data.length})`);
              fileBuffer = Buffer.from(attachment.fileData.data, 'base64');
            } else if (typeof attachment.fileData.data === 'string') {
              // Regular string (text files)
              console.log(`DEBUG: Converting string to buffer (length: ${attachment.fileData.data.length})`);
              fileBuffer = Buffer.from(attachment.fileData.data, 'utf8');
            } else if (Buffer.isBuffer(attachment.fileData.data)) {
              // Already a buffer (shouldn't happen through JSON)
              console.log(`DEBUG: Data is already a Buffer`);
              fileBuffer = attachment.fileData.data;
            } else if (attachment.fileData.data.type === 'Buffer' && Array.isArray(attachment.fileData.data.data)) {
              // Serialized Buffer format from JSON
              console.log(`DEBUG: Reconstructing from serialized Buffer format (length: ${attachment.fileData.data.data.length})`);
              fileBuffer = Buffer.from(attachment.fileData.data.data);
            } else if (Array.isArray(attachment.fileData.data)) {
              // Array of bytes
              console.log(`DEBUG: Converting array to buffer (length: ${attachment.fileData.data.length})`);
              fileBuffer = Buffer.from(attachment.fileData.data);
            } else if (typeof attachment.fileData.data === 'object' && attachment.fileData.data !== null) {
              // Object with numeric keys (fallback)
              const keys = Object.keys(attachment.fileData.data);
              console.log(`DEBUG: Converting object to buffer (${keys.length} keys)`);
              const byteArray = Object.keys(attachment.fileData.data)
                .filter(key => !isNaN(key))
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => attachment.fileData.data[key]);
              console.log(`DEBUG: Extracted ${byteArray.length} bytes from object`);
              fileBuffer = Buffer.from(byteArray);
            } else {
              throw new Error(`Unsupported data format: ${typeof attachment.fileData.data}`);
            }
            
            console.log(`DEBUG: Final buffer size: ${fileBuffer.length} bytes`);
            
            if (fileBuffer.length === 0) {
              throw new Error('Buffer is empty - file data was not properly transmitted');
            }
            
            fs.writeFileSync(tempFilePath, fileBuffer);
            tempFiles.push(tempFilePath);
            
            console.log(`DEBUG: Created temp file: ${tempFilePath} (${fileBuffer.length} bytes)`);
            
            // Upload file to Gemini
            const uploadResult = await fileManager.uploadFile(tempFilePath, {
              mimeType: attachment.fileData.mimeType,
              displayName: attachment.name,
            });
            
            console.log(`DEBUG: Uploaded file to Gemini: ${uploadResult.file.displayName}`);
            
            // Add file reference to parts
            parts.push({
              fileData: {
                fileUri: uploadResult.file.uri,
                mimeType: uploadResult.file.mimeType,
              },
            });
            
            // Add a text description of the file
            parts.push({
              text: `\n\n[Attached File: ${attachment.name}]\n`
            });
            
          } else {
            console.log(`DEBUG: Attachment ${attachment.name} has no file data, adding as text`);
            // Fallback to text content if no file data
            parts.push({
              text: `\n\n[File Content: ${attachment.name}]\n${attachment.content}\n`
            });
          }
        } catch (attachmentError) {
          console.error(`DEBUG: Error processing attachment ${attachment.name}:`, attachmentError);
          // Add error info as text
          parts.push({
            text: `\n\n[Error processing file: ${attachment.name} - ${attachmentError.message}]\n`
          });
        }
      }
    }

    console.log(`DEBUG: Sending ${parts.length} parts to Gemini (1 text + ${parts.length - 1} attachments/files)`);

    // Generate content with attachments
    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    console.log(`DEBUG: Gemini response received: ${text.length} characters`);

    return res.status(200).json({
      response: text,
      assignment: assignment || null,
      attachmentsProcessed: (fileUris?.length || 0) + (attachments?.length || 0),
      filesAttached: fileUris?.length || 0
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    
    // Handle specific error types
    if (error.message.includes('API key')) {
      return res.status(500).json({ 
        error: 'AI service configuration error. Please try again later.' 
      });
    }
    
    // Handle 413 Payload Too Large
    if (error.message.includes('413') || error.message.includes('too large') || error.message.includes('payload')) {
      return res.status(413).json({ 
        error: 'The uploaded files are too large. Please deselect some attachments and try again.' 
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({ 
        error: 'AI service is temporarily busy. Please try again in a few minutes.' 
      });
    }

    if (error.message.includes('file') || error.message.includes('upload')) {
      return res.status(500).json({ 
        error: 'Error processing file attachments. Please try again.' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to get AI assistance. Please try again.' 
    });
  } finally {
    // Clean up temporary files
    for (const tempFile of tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log(`DEBUG: Cleaned up temp file: ${tempFile}`);
        }
      } catch (cleanupError) {
        console.error(`DEBUG: Error cleaning up temp file ${tempFile}:`, cleanupError);
      }
    }
  }
}

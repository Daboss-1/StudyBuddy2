import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { prompt, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  try {
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Create the full prompt with context
    const fullPrompt = context 
      ? `Context: ${context}\n\nQuestion: ${prompt}\n\nPlease provide a helpful study-related response. Answet the question, as that would suit their learning needs. Do not drag out the response, keep it concise.`
      : `Study Question: ${prompt}\n\nPlease provide a helpful educational response, include key concepts to understand, and resources that might help. Also, condense the response.`;

    // Generate content
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({
      success: true,
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gemini AI Error:', error);
    
    // Handle specific API errors
    if (error.message?.includes('API key')) {
      return res.status(401).json({ 
        message: 'AI service configuration error. Please check API key.' 
      });
    }
    
    if (error.message?.includes('quota')) {
      return res.status(429).json({ 
        message: 'AI service quota exceeded. Please try again later.' 
      });
    }

    res.status(500).json({ 
      message: 'Failed to generate AI response',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

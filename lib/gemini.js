import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function generateStudySuggestions(userProgress, courseInfo) {
  try {
    const prompt = `
      Based on the following student progress and course information, generate study suggestions:
      
      User Progress: ${JSON.stringify(userProgress)}
      Course Info: ${JSON.stringify(courseInfo)}
      
      Please provide:
      1. Areas that need improvement
      2. Study strategies
      3. Recommended study schedule
      4. Peer collaboration suggestions
      
      Format the response in a helpful, encouraging manner.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating study suggestions:', error);
    throw error;
  }
}

export async function generateAssignmentHelp(assignmentDetails) {
  try {
    const prompt = `
      Help a student understand this assignment better:
      
      Assignment: ${JSON.stringify(assignmentDetails)}
      
      Please provide:
      1. Key concepts to understand
      2. Study approach recommendations
      3. Common pitfalls to avoid
      4. Resources that might help
      
      Keep the tone encouraging and educational.
    `;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating assignment help:', error);
    throw error;
  }
}

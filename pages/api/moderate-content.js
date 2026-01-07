import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `
You are a content moderation AI for an educational chat platform. Your role is to detect ONLY genuinely mean, bullying, or inappropriate language. Be reasonable and allow normal student conversation.

Analyze this message and ONLY flag it if it contains:

1. **Clearly Mean or Bullying Language**:
   - Direct insults aimed at hurting someone
   - Cruel or mocking statements
   - Threatening language

2. **Inappropriate Content**:
   - Explicit profanity or vulgar language
   - Sexual content
   - Hate speech or slurs

3. **Severe Harassment**:
   - Repeated targeting of someone
   - Encouraging others to exclude someone
   - Serious threats or intimidation

DO NOT flag:
- Casual slang or informal language
- Academic discussions, even if critical
- Questions or asking for help
- Friendly banter between peers
- Minor frustration or venting (as long as not directed at someone)
- Ordinary conversation topics
- Mild disagreements or debates

Message to analyze: "${content}"

Provide JSON analysis:
{
  "approved": boolean (default to TRUE unless clearly inappropriate),
  "confidence": number (0.0-1.0),
  "reason": "brief explanation if not approved",
  "toxicityScore": number (0.0-1.0, only high if genuinely harmful),
  "categories": ["list only if truly inappropriate"]
}

Be lenient - only block messages that are clearly mean, bullying, or inappropriate. Most messages should be approved.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Clean the JSON response
      const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanText);
      
      // Validate and sanitize the response
      const sanitizedAnalysis = {
        approved: Boolean(analysis.approved !== false), // Default to approved
        confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0.8)),
        reason: analysis.reason || null,
        sentiment: Math.max(-1, Math.min(1, Number(analysis.sentiment) || 0)),
        toxicityScore: Math.max(0, Math.min(1, Number(analysis.toxicityScore) || 0)),
        categories: Array.isArray(analysis.categories) ? analysis.categories : [],
        suggestions: analysis.suggestions || null,
        educationalValue: Math.max(0, Math.min(1, Number(analysis.educationalValue) || 0.5)),
        flags: {
          disguisedProfanity: Boolean(analysis.flags?.disguisedProfanity),
          cyberbullying: Boolean(analysis.flags?.cyberbullying),
          gossip: Boolean(analysis.flags?.gossip),
          exclusionary: Boolean(analysis.flags?.exclusionary),
          offTopic: Boolean(analysis.flags?.offTopic)
        }
      };

      // Only reject if toxicity is very high (genuinely harmful content)
      if (sanitizedAnalysis.toxicityScore > 0.75) {
        sanitizedAnalysis.approved = false;
        if (!sanitizedAnalysis.reason) {
          sanitizedAnalysis.reason = 'Message contains inappropriate or harmful content';
        }
      }
      
      return res.status(200).json({
        ...sanitizedAnalysis,
        cleanContent: content // For now, we don't modify the content
      });

    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      
      // Enhanced fallback analysis using multiple detection methods
      const fallbackAnalysis = performEnhancedFallbackAnalysis(content);
      
      return res.status(200).json(fallbackAnalysis);
    }
  } catch (error) {
    console.error('Content moderation error:', error);
    
    // Even the fallback failed - use basic analysis
    const basicAnalysis = performBasicAnalysis(content);
    return res.status(200).json(basicAnalysis);
  }
}

// Enhanced fallback analysis with better detection algorithms
function performEnhancedFallbackAnalysis(content) {
  const lowerContent = content.toLowerCase();
  let toxicityScore = 0;
  let categories = [];
  let flags = {
    disguisedProfanity: false,
    cyberbullying: false,
    gossip: false,
    exclusionary: false,
    offTopic: false
  };

  // Only detect truly inappropriate language (severe profanity and slurs)
  const severeLanguagePatterns = [
    /\b(f[u*@]ck|sh[i1!]t|b[i1!]tch|[a@]ssh[o0]le|d[a@]mn|hell)\b/i,
    /\b(n[i1!]gg[a@e3]r|f[a@]g|r[e3]t[a@]rd)\b/i, // Slurs
  ];

  // Direct bullying or threats
  const bullyingPatterns = [
    /\bk[i1!]ll\s+your?self\b/i,
    /\byou\s+should\s+die\b/i,
    /\bi\s+hate\s+you\b/i,
    /\byou.?re\s+(worthless|pathetic|trash)\b/i,
    /\bnobody\s+likes\s+you\b/i,
  ];

  // Check for severe language
  for (const pattern of severeLanguagePatterns) {
    if (pattern.test(content)) {
      toxicityScore += 0.8;
      categories.push('inappropriate-language');
      flags.disguisedProfanity = true;
      break;
    }
  }

  // Check for bullying
  for (const pattern of bullyingPatterns) {
    if (pattern.test(content)) {
      toxicityScore += 0.9;
      categories.push('cyberbullying');
      flags.cyberbullying = true;
      break;
    }
  }

  // Calculate overall toxicity (capped at 1.0)
  toxicityScore = Math.min(1, toxicityScore);

  return {
    approved: toxicityScore < 0.7, // Only block if very toxic
    confidence: 0.7,
    reason: toxicityScore >= 0.7 ? 
      'Message contains mean or inappropriate language' : null,
    sentiment: toxicityScore > 0.5 ? -0.5 : 0,
    toxicityScore,
    categories,
    suggestions: toxicityScore >= 0.7 ? 
      'Please communicate respectfully' : null,
    educationalValue: toxicityScore < 0.3 ? 0.5 : 0.2,
    flags,
    cleanContent: content
  };
}

// Basic analysis as last resort
function performBasicAnalysis(content) {
  // Only block truly offensive language
  const severeWords = ['fuck', 'shit', 'bitch', 'asshole'];
  const hasSevereWord = severeWords.some(word => 
    content.toLowerCase().includes(word));

  return {
    approved: !hasSevereWord,
    confidence: 0.5,
    reason: hasSevereWord ? 'Message contains inappropriate language' : null,
    sentiment: hasSevereWord ? -0.5 : 0,
    toxicityScore: hasSevereWord ? 0.8 : 0.1,
    categories: hasSevereWord ? ['inappropriate-language'] : [],
    suggestions: hasSevereWord ? 'Please use appropriate language' : null,
    educationalValue: 0.5,
    flags: {
      disguisedProfanity: hasSevereWord,
      cyberbullying: false,
      gossip: false,
      exclusionary: false,
      offTopic: false
    },
    cleanContent: content
  };
}

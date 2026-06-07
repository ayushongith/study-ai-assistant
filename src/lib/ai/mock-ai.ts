export function isApiKeyValid(key: string | undefined): boolean {
  if (!key || key === 'placeholder-gemini-key') return false
  return key.startsWith('AIza') && key.length > 20
}

async function tryGemini<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export async function mockGenerateStreamingResponse(
  _prompt: string,
  context: string,
  onChunk: (text: string) => void
): Promise<string> {
  const mockResponses = [
    "Based on your study material, here's what I found:\n\n" + context.slice(0, 200),
    "That's a great question! Looking at your notes, I can see that this topic covers several important concepts. Let me break it down for you.\n\n**Key points:**\n- The material discusses fundamental principles\n- There are several important examples to understand\n- Practice questions can help reinforce these concepts\n\nWould you like me to explain any specific part in more detail?",
    "Here's an analysis of your query based on the uploaded documents:\n\n1. The main idea here is about understanding core concepts\n2. Key terminology includes important technical terms\n3. Practical applications are evident throughout\n\nI hope this helps! Let me know if you need clarification.",
  ]
  const response = mockResponses[Math.floor(Math.random() * mockResponses.length)]
  const chars = response.split('')
  for (const char of chars) {
    onChunk(char)
    await new Promise(r => setTimeout(r, 10))
  }
  return response
}

export async function mockGenerateSummary(
  text: string,
  type: string
): Promise<string> {
  const preview = text.slice(0, 150)
  const summaries: Record<string, string> = {
    short: `**Summary of the material:**\n\nThis study material covers ${preview.split(' ').slice(0, 20).join(' ')}... The content provides valuable insights into the subject matter with key examples and explanations.`,
    detailed: `## Detailed Summary\n\n${preview}\n\n### Main Topics Covered\n1. Core concepts and definitions\n2. Key principles and theories\n3. Practical applications\n4. Examples and case studies\n\n### Key Takeaways\nThe material emphasizes the importance of understanding fundamental concepts before moving to advanced topics. Regular practice and review are recommended.`,
    bullet: `## Bullet Notes\n\n- ${preview.split('.')[0]}\n- The material covers fundamental concepts\n- Key principles are explained with examples\n- Practical applications are demonstrated\n- Important terminology is defined\n- Concepts build upon each other logically`,
    key_concepts: `## Key Concepts\n\n1. **Core Principle**: ${preview.split('.')[0]}\n2. **Fundamental Theory**: The underlying framework that explains the relationships between different elements\n3. **Practical Application**: How these concepts are used in real-world scenarios\n4. **Important Terminology**: Key terms and their definitions\n5. **Related Concepts**: How this connects to other topics in the field`,
    revision: `## Revision Notes\n\n### Must Remember\n- ${preview.slice(0, 100)}...\n- Focus on understanding core principles\n- Practice with examples\n- Review key terminology\n\n### Common Mistakes to Avoid\n- Don't skip the fundamentals\n- Practice regularly\n- Ask questions when stuck`,
    exam: `## Exam Preparation Notes\n\n### Likely Topics\n1. Core concepts (high priority)\n2. Key definitions (medium priority)\n3. Practical examples (medium priority)\n4. Theoretical frameworks (high priority)\n\n### Sample Questions\n1. Explain the main concept in your own words\n2. Provide examples of practical applications\n3. Compare and contrast different approaches\n\n### Study Tips\n- Create flashcards for key terms\n- Practice with sample problems\n- Review regularly for best retention`,
  }
  return summaries[type] || summaries.short
}

export async function mockGenerateQuiz(
  text: string,
  difficulty: string,
  count: number
): Promise<string> {
  const quizzes = [
    { question: 'What is the main concept discussed in this material?', type: 'short_answer', options: null, correct_answer: 'The main concept revolves around fundamental principles and their applications.', explanation: 'This is the central theme of the study material.' },
    { question: 'Which of the following best describes the key principle?', type: 'mcq', options: ['A. Fundamental understanding', 'B. Surface-level knowledge', 'C. Memorization only', 'D. None of the above'], correct_answer: 'A. Fundamental understanding', explanation: 'Deep understanding is emphasized over rote memorization.' },
    { question: 'Practice and review are recommended for better learning.', type: 'true_false', options: ['True', 'False'], correct_answer: 'True', explanation: 'Regular practice and review help reinforce learning.' },
    { question: 'The ___ approach helps in better understanding of complex topics.', type: 'fill_blank', options: null, correct_answer: 'step-by-step', explanation: 'A systematic approach breaks down complex topics into manageable parts.' },
    { question: 'Why is it important to understand fundamental concepts first?', type: 'short_answer', options: null, correct_answer: 'Fundamental concepts provide the foundation for advanced topics and ensure better comprehension.', explanation: 'Building on a solid foundation leads to better long-term understanding.' },
  ]
  return JSON.stringify(quizzes.slice(0, count))
}

export async function mockGenerateFlashcards(text: string, count = 10): Promise<string> {
  const cards = [
    { front: 'What is the main topic of this material?', back: 'The material covers fundamental concepts and principles of the subject.' },
    { front: 'Why is practice important?', back: 'Regular practice reinforces learning and improves retention of concepts.' },
    { front: 'How should you approach complex topics?', back: 'Break them down into smaller, manageable parts and study systematically.' },
    { front: 'What is the recommended study technique?', back: 'Use active recall, spaced repetition, and regular review sessions.' },
    { front: 'How can flashcards help learning?', back: 'Flashcards promote active recall and help identify knowledge gaps.' },
    { front: 'What is the benefit of summarizing?', back: 'Summarizing helps consolidate information and identify key points.' },
    { front: 'How do you prepare for exams effectively?', back: 'Review key concepts, practice with sample questions, and use active recall.' },
    { front: 'What role do examples play in learning?', back: 'Examples illustrate abstract concepts and show real-world applications.' },
    { front: 'How can you improve memory retention?', back: 'Use spaced repetition, teach others, and connect new info to existing knowledge.' },
    { front: 'What is the Pomodoro technique?', back: 'Study in focused 25-minute intervals with short breaks in between.' },
  ]
  return JSON.stringify(cards.slice(0, count))
}

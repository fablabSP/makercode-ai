/**
 * socratic-engine.js — local state for guided mode.
 *
 * The model does the talking. This module tracks where the learner is in the
 * question sequence, how many hints they have used, and whether they have made
 * a genuine attempt yet. It turns button presses into instructions the model
 * can follow.
 */

export const QUESTION_SEQUENCE = [
  { id: 'trigger', label: 'Trigger', question: 'What should trigger the system?' },
  { id: 'input', label: 'Input', question: 'What information must the board read?' },
  { id: 'decision', label: 'Decision', question: 'What decision must the program make?' },
  { id: 'output', label: 'Output', question: 'What should the system output?' },
  { id: 'structure', label: 'Structure', question: 'Which programming structure is suitable?' },
  { id: 'feature', label: 'Feature', question: 'Which component or board feature is required?' },
  { id: 'pin', label: 'Pin', question: 'Which pin should be used?' },
  { id: 'test', label: 'Test', question: 'What test would show whether it works?' },
  { id: 'edge', label: 'Edge case', question: 'What edge case could cause failure?' },
  { id: 'improve', label: 'Improve', question: 'How could the design be improved?' }
];

const LEVEL_VOICE = {
  beginner: 'Use short sentences and everyday words. Define any technical term the moment you use it.',
  intermediate: 'Use normal technical vocabulary. Expect the learner to know variables, loops and functions.',
  advanced: 'Use precise technical vocabulary. Assume the learner knows timing, state and non-blocking design.'
};

export function createSession() {
  return {
    stepIndex: 0,
    hintLevel: 0,
    attempts: 0,
    solutionRevealed: false,
    answered: []
  };
}

export function currentStep(session) {
  return QUESTION_SEQUENCE[Math.min(session.stepIndex, QUESTION_SEQUENCE.length - 1)];
}

export function progress(session) {
  return {
    step: Math.min(session.stepIndex + 1, QUESTION_SEQUENCE.length),
    total: QUESTION_SEQUENCE.length,
    percent: Math.round((session.stepIndex / QUESTION_SEQUENCE.length) * 100),
    label: currentStep(session).label
  };
}

/** The learner typed something themselves. */
export function recordAttempt(session, text) {
  session.attempts += 1;
  session.answered.push({ step: currentStep(session).id, text });
  return session;
}

export function advance(session) {
  if (session.stepIndex < QUESTION_SEQUENCE.length - 1) session.stepIndex += 1;
  session.hintLevel = 0;
  return session;
}

export function reset(session) {
  Object.assign(session, createSession());
  return session;
}

/**
 * Turn a Socratic control into an extra instruction appended to the prompt.
 * Returns { text, systemNote } — text goes in the chat as the learner's turn.
 */
export function buildAction(action, session, ctx) {
  const step = currentStep(session);
  const voice = LEVEL_VOICE[ctx.level] || LEVEL_VOICE.beginner;
  const attemptMade = session.attempts > 0;

  switch (action) {
    case 'hint': {
      session.hintLevel = Math.min(session.hintLevel + 1, 3);
      const strength = ['', 'a small hint', 'a stronger hint', 'a partial worked example'][session.hintLevel];
      return {
        text: `Give me ${strength}.`,
        systemNote: [
          `The learner asked for a hint on: "${step.question}"`,
          `Hint level ${session.hintLevel} of 3. Give ${strength} and nothing more.`,
          session.hintLevel < 3
            ? 'Do not give the answer. End by asking the same question again in a simpler way.'
            : 'Show a partial example only — leave the key part for the learner to complete.',
          voice
        ].join(' ')
      };
    }

    case 'explain':
      return {
        text: 'Explain the concept behind this step.',
        systemNote: [
          `Explain the concept behind "${step.question}" in general terms.`,
          'Use a different example, not the learner\'s own project.',
          'Put the explanation in "explanation" and keep "code" empty.',
          voice
        ].join(' ')
      };

    case 'check':
      return {
        text: 'Check my thinking.',
        systemNote: [
          'Review the learner\'s most recent answer.',
          'Say clearly what is correct first, then what is missing or wrong, then ask one question that moves them forward.',
          'Do not give the full solution.',
          voice
        ].join(' ')
      };

    case 'step':
      return {
        text: 'Show me one step.',
        systemNote: [
          'Reveal exactly one step of the solution and no more.',
          'Put that single step in "plan" as one item. Keep "code" empty.',
          'End with a question that asks the learner what the next step should be.',
          voice
        ].join(' ')
      };

    case 'solution':
      session.solutionRevealed = true;
      return {
        text: 'Show me the solution.',
        systemNote: [
          attemptMade
            ? 'The learner has made an attempt and asked to see the solution. Give the complete solution now.'
            : 'The learner asked for the solution without attempting. Give it, but open "understanding" by naming the one idea they should look at closely as they read it.',
          'Fill every field including "code", "explanation", "testSteps" and "debuggingSteps".',
          'End with "reflectionQuestion" asking them to explain one line back in their own words.',
          voice
        ].join(' ')
      };

    case 'similar':
      return {
        text: 'Give me a similar challenge.',
        systemNote: [
          'Set a new but similar challenge at the same difficulty, using the same board.',
          'Describe it in "understanding" and put the goal in "extensionChallenge". Keep "code" and "plan" empty.',
          'Ask the learner to state the input, process and output for the new challenge.',
          voice
        ].join(' ')
      };

    default:
      return { text: action, systemNote: voice };
  }
}

/** Guardrail: has the learner earned the solution yet? */
export function canRevealSolution(session) {
  return session.attempts > 0;
}

export function nudgeBeforeSolution(session) {
  if (canRevealSolution(session)) return null;
  return 'Have a go first, even a rough one. Type what you think should happen, then ask again.';
}

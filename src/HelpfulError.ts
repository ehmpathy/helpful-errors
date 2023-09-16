/**
 * HelpfulError errors are used to add information that helps the future observer of the error understand whats going on
 */
export class HelpfulError extends Error {
  constructor(message: string, metadata?: Record<string, any>) {
    const fullMessage = `${message}${
      metadata ? `\n\n${JSON.stringify(metadata)}` : ''
    }`;
    super(fullMessage);
  }
}

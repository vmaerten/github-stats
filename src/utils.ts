/**
 * Check if a username belongs to a bot that should be excluded
 */
export function isBot(username: string): boolean {
  const lowercaseUsername = username.toLowerCase();

  const botPatterns = [
    'renovate',
    'copilot',
    'dependabot'
  ];

  return botPatterns.some(pattern => lowercaseUsername.includes(pattern));
}

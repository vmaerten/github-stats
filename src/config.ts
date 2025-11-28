// Parse repository from environment variable or use default
function parseRepository(): { owner: string; repo: string } {
  const envRepo = process.env.REPO;

  if (envRepo) {
    const parts = envRepo.split("/");
    if (parts.length !== 2) {
      throw new Error(`Invalid REPO format: "${envRepo}". Expected format: "owner/repo"`);
    }
    return {
      owner: parts[0],
      repo: parts[1]
    };
  }

  // Default repository
  return {
    owner: "pbstck",
    repo: "app"
  };
}

// Parse period days from environment variable or use default
function parsePeriodDays(): number {
  const envDays = process.env.DAYS;

  if (envDays) {
    const days = parseInt(envDays, 10);
    if (isNaN(days) || days <= 0) {
      throw new Error(`Invalid DAYS value: "${envDays}". Expected a positive number.`);
    }
    return days;
  }

  // Default period
  return 30;
}

export const config = {
  // GitHub repository to analyze
  // Can be overridden with REPO environment variable (format: "owner/repo")
  repository: parseRepository(),

  // Time period for analysis (in days)
  // Can be overridden with DAYS environment variable
  periodDays: parsePeriodDays(),

  // GitHub personal access token (from environment variable)
  githubToken: process.env.TOKEN,

  // Output format: "markdown" or "csv"
  outputFormat: "markdown" as "markdown" | "csv"
};

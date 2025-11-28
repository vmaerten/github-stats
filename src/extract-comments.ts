import * as fs from "fs";
import * as path from "path";
import { CommentsClient } from "./comments-client";
import { CommentExtractionResult, PRConversation } from "./comments-types";
import { formatCommentsAsMarkdown, exportCommentsAsJSON } from "./comments-formatter";

// Parse repository from environment variable
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

  throw new Error("REPO environment variable is required");
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

  return 30;
}

// Parse username from environment variable
function parseUsername(): string {
  const username = process.env.USER;
  if (!username) {
    throw new Error("USER environment variable is required");
  }
  return username;
}

async function main() {
  console.log("GitHub Comments Extractor");
  console.log("=========================\n");

  // Validate token
  const githubToken = process.env.TOKEN;
  if (!githubToken) {
    console.error("Error: TOKEN environment variable is required");
    process.exit(1);
  }

  // Parse config
  let repository: { owner: string; repo: string };
  let username: string;
  let periodDays: number;

  try {
    repository = parseRepository();
    username = parseUsername();
    periodDays = parsePeriodDays();
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }

  const { owner, repo } = repository;

  // Calculate date range
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - periodDays);

  console.log(`Repository: ${owner}/${repo}`);
  console.log(`Username: ${username}`);
  console.log(`Period: ${fromDate.toISOString().split("T")[0]} to ${toDate.toISOString().split("T")[0]}`);
  console.log(`Days: ${periodDays}\n`);

  // Initialize client
  const client = new CommentsClient(githubToken, owner, repo);

  // Fetch user's comments
  console.log("Fetching review comments (code comments)...");
  const reviewComments = await client.fetchReviewCommentsForRepo(fromDate, username);
  console.log(`Found ${reviewComments.length} review comments`);

  console.log("Fetching issue comments (general PR comments)...");
  const issueComments = await client.fetchIssueCommentsForRepo(fromDate, username);
  console.log(`Found ${issueComments.length} issue comments\n`);

  // Get unique PR numbers where user commented
  const prNumbers = new Set<number>();
  for (const c of reviewComments) prNumbers.add(c.prNumber);
  for (const c of issueComments) prNumbers.add(c.prNumber);

  console.log(`Fetching full conversations for ${prNumbers.size} PRs...`);

  // Fetch all comments for each PR
  const conversations: PRConversation[] = [];
  for (const prNumber of prNumbers) {
    // Find PR info from existing comments
    const existingComment = reviewComments.find(c => c.prNumber === prNumber)
      || issueComments.find(c => c.prNumber === prNumber);

    const allComments = await client.fetchAllCommentsForPR(prNumber, username);
    const userCommentCount = allComments.filter(c => c.isTargetUser).length;

    conversations.push({
      prNumber,
      prTitle: existingComment?.prTitle || `PR #${prNumber}`,
      prAuthor: existingComment?.prAuthor || "unknown",
      userCommentCount,
      allComments
    });
  }

  // Sort conversations by user comment count (descending)
  conversations.sort((a, b) => b.userCommentCount - a.userCommentCount);

  console.log(`Fetched ${conversations.reduce((sum, c) => sum + c.allComments.length, 0)} total comments\n`);

  // Build result
  const result: CommentExtractionResult = {
    username,
    repository: `${owner}/${repo}`,
    period: { from: fromDate, to: toDate },
    reviewComments,
    issueComments,
    totalCount: reviewComments.length + issueComments.length,
    conversations
  };

  // Output directory
  const outputDir = `./output/${owner}-${repo}/comments`;

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Export Markdown
  const markdown = formatCommentsAsMarkdown(result);
  const mdPath = path.join(outputDir, `comments-${username}.md`);
  fs.writeFileSync(mdPath, markdown, "utf-8");
  console.log(`Generated Markdown: ${mdPath}`);

  // Export JSON
  const jsonPath = exportCommentsAsJSON(result, outputDir);
  console.log(`Generated JSON: ${jsonPath}`);

  console.log(`\nTotal: ${result.totalCount} comments extracted`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

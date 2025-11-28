import { GitHubClient } from "./github-client";
import { calculateStats } from "./stats";
import { formatAsMarkdown, formatAsCSV } from "./formatter";
import { exportPersonReports, exportPersonReportsCSV, exportSummaryTable, exportSummaryTableCSV } from "./file-exporter";
import { exportToExcel } from "./excel-exporter";
import { config } from "./config";
import { PRData, ReviewData, ReviewRequestData, CommentData, RepositoryStats } from "./types";
import { isBot } from "./utils";

async function main() {
  console.log("GitHub PR Statistics Analyzer");
  console.log("==============================\n");

  // Validate GitHub token
  if (!config.githubToken) {
    console.error("Error: TOKEN environment variable is not set.");
    console.error("Please set your GitHub personal access token:");
    console.error("  export TOKEN=your_token_here");
    console.error("\nYou can create a token at: https://github.com/settings/tokens");
    process.exit(1);
  }

  // Initialize GitHub client
  const client = new GitHubClient(
    config.githubToken,
    config.repository.owner,
    config.repository.repo
  );

  // Calculate date range
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - config.periodDays);

  console.log(`Repository: ${config.repository.owner}/${config.repository.repo}`);
  console.log(`Period: ${fromDate.toISOString().split("T")[0]} to ${toDate.toISOString().split("T")[0]}`);
  console.log(`Days: ${config.periodDays}\n`);

  // Fetch pull requests
  console.log("Fetching pull requests...");
  const allPrs = await client.fetchPullRequests(fromDate, toDate);

  // Filter out bot PRs and drafts
  const prsWithoutBots = allPrs.filter(pr => !isBot(pr.author));
  const prs = prsWithoutBots.filter(pr => !pr.isDraft);
  const draftsFiltered = prsWithoutBots.length - prs.length;
  console.log(`Found ${allPrs.length} pull requests (${prs.length} after filtering bots and ${draftsFiltered} drafts)\n`);

  if (prs.length === 0) {
    console.log("No pull requests found in the specified period.");
    return;
  }

  // Fetch reviews, review requests, and comments for each PR
  console.log("Fetching reviews, review requests, and comments...");
  const reviewsMap = new Map<number, ReviewData[]>();
  const reviewRequestsMap = new Map<number, ReviewRequestData[]>();
  const commentsMap = new Map<number, CommentData[]>();

  for (let i = 0; i < prs.length; i++) {
    const pr = prs[i];
    process.stdout.write(`Progress: ${i + 1}/${prs.length} PRs processed\r`);

    const [reviews, reviewRequests, comments, readyForReviewDate] = await Promise.all([
      client.fetchReviews(pr.number),
      client.fetchReviewRequests(pr.number),
      client.fetchPRComments(pr.number),
      client.fetchReadyForReviewDate(pr.number)
    ]);

    // Update readyForReviewAt if ready_for_review event exists
    if (readyForReviewDate) {
      pr.readyForReviewAt = readyForReviewDate;
    }

    reviewsMap.set(pr.number, reviews);
    reviewRequestsMap.set(pr.number, reviewRequests);
    commentsMap.set(pr.number, comments);
  }
  console.log("\n");

  // Calculate statistics
  console.log("Calculating statistics...");
  const personStats = calculateStats(prs, reviewsMap, reviewRequestsMap, commentsMap);

  const repositoryStats: RepositoryStats = {
    repository: `${config.repository.owner}/${config.repository.repo}`,
    period: {
      from: fromDate,
      to: toDate
    },
    totalPRs: prs.length,
    stats: personStats
  };

  // Format and display output
  console.log("\n");
  if (config.outputFormat === "csv") {
    console.log(formatAsCSV(repositoryStats));
  } else {
    console.log(formatAsMarkdown(repositoryStats));
  }

  // Create output directory based on repository name
  const outputDir = `./output/${config.repository.owner}-${config.repository.repo}`;

  // Export summary tables and individual reports
  console.log("\n");
  exportSummaryTable(repositoryStats, outputDir);
  exportSummaryTableCSV(repositoryStats, outputDir);
  exportPersonReports(
    personStats,
    repositoryStats.repository,
    repositoryStats.period,
    outputDir
  );
  exportPersonReportsCSV(
    personStats,
    repositoryStats.repository,
    repositoryStats.period,
    outputDir
  );

  // Export to Excel
  await exportToExcel(repositoryStats, personStats, outputDir);
}

// Run the main function
main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

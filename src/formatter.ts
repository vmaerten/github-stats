import { RepositoryStats, TimeMetrics } from "./types";

/**
 * Format a time duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format time metrics to a readable string
 */
function formatTimeMetrics(metrics: TimeMetrics | null): string {
  if (!metrics) {
    return "N/A";
  }

  return `${formatDuration(metrics.average)} / ${formatDuration(metrics.min)} / ${formatDuration(metrics.max)} / ${formatDuration(metrics.median)}`;
}

/**
 * Format stats as a Markdown table
 */
export function formatAsMarkdown(stats: RepositoryStats): string {
  const lines: string[] = [];

  // Header
  lines.push(`# PR Statistics for ${stats.repository}`);
  lines.push("");
  lines.push(`**Period:** ${stats.period.from.toISOString().split("T")[0]} to ${stats.period.to.toISOString().split("T")[0]}`);
  lines.push(`**Total PRs:** ${stats.totalPRs}`);
  lines.push("");

  // Table header
  lines.push("| Person | PRs Opened | Reviews (A/C/CR) | Participation | First Comment Time (avg/min/max/median) | First Review Time (avg/min/max/median) | Approval Time (avg/min/max/median) |");
  lines.push("|--------|------------|------------------|---------------|------------------------------------------|----------------------------------------|-------------------------------------|");

  // Table rows
  for (const personStats of stats.stats) {
    const reviewCount = `${personStats.reviewMetrics.approved}/${personStats.reviewMetrics.commented}/${personStats.reviewMetrics.changesRequested}`;
    const participation = `${personStats.uniquePRsReviewed}/${personStats.eligiblePRsForReview} (${personStats.reviewParticipationRate.toFixed(0)}%)`;
    const firstCommentTime = formatTimeMetrics(personStats.timeToFirstComment);
    const firstReviewTime = formatTimeMetrics(personStats.timeToFirstReview);
    const approvalTime = formatTimeMetrics(personStats.timeToApproval);

    lines.push(
      `| ${personStats.person} | ${personStats.prsOpened} | ${reviewCount} | ${participation} | ${firstCommentTime} | ${firstReviewTime} | ${approvalTime} |`
    );
  }

  lines.push("");
  lines.push("**Legend:**");
  lines.push("- A/C/CR = Approved / Commented / Changes Requested");
  lines.push("- Participation = Unique PRs reviewed / Eligible PRs (excluding own PRs and bots)");
  lines.push("- First Comment = Time to any interaction (review or comment)");
  lines.push("- First Review = Time to formal review (Approved or Changes Requested only)");
  lines.push("- Times shown as: average / min / max / median");

  return lines.join("\n");
}

/**
 * Format stats as CSV
 */
export function formatAsCSV(stats: RepositoryStats): string {
  const lines: string[] = [];

  // Header
  lines.push("Person,PRs Opened,Reviews Approved,Reviews Commented,Reviews Changes Requested,Total Reviews Given,Unique PRs Reviewed,Eligible PRs,Participation Rate (%),First Comment Avg (ms),First Comment Min (ms),First Comment Max (ms),First Comment Median (ms),First Review Avg (ms),First Review Min (ms),First Review Max (ms),First Review Median (ms),Approval Avg (ms),Approval Min (ms),Approval Max (ms),Approval Median (ms)");

  // Data rows
  for (const personStats of stats.stats) {
    const firstComment = personStats.timeToFirstComment;
    const firstReview = personStats.timeToFirstReview;
    const approval = personStats.timeToApproval;

    const row = [
      personStats.person,
      personStats.prsOpened,
      personStats.reviewMetrics.approved,
      personStats.reviewMetrics.commented,
      personStats.reviewMetrics.changesRequested,
      personStats.totalReviewsGiven,
      personStats.uniquePRsReviewed,
      personStats.eligiblePRsForReview,
      personStats.reviewParticipationRate.toFixed(2),
      firstComment?.average.toFixed(0) || "",
      firstComment?.min.toFixed(0) || "",
      firstComment?.max.toFixed(0) || "",
      firstComment?.median.toFixed(0) || "",
      firstReview?.average.toFixed(0) || "",
      firstReview?.min.toFixed(0) || "",
      firstReview?.max.toFixed(0) || "",
      firstReview?.median.toFixed(0) || "",
      approval?.average.toFixed(0) || "",
      approval?.min.toFixed(0) || "",
      approval?.max.toFixed(0) || "",
      approval?.median.toFixed(0) || ""
    ];

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

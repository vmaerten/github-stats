import { PersonStats, PersonPRDetail } from "./types";

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
 * Format review status for display
 */
function formatReviewStatus(status: PersonPRDetail["reviewStatus"]): string {
  switch (status) {
    case "APPROVED":
      return "✅ Approved";
    case "COMMENTED":
      return "💬 Commented (formal review)";
    case "CHANGES_REQUESTED":
      return "🔄 Changes Requested";
    case "COMMENTED_ONLY":
      return "💬 Commented";
    case "NOT_REVIEWED":
      return "⏸️ Not Reviewed";
    case "OWN_PR":
      return "👤 Own PR";
  }
}

/**
 * Generate individual report for a person
 */
export function generatePersonReport(
  personStats: PersonStats,
  repository: string,
  period: { from: Date; to: Date }
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# PR Review Report - ${personStats.person}`);
  lines.push("");
  lines.push(`**Period:** ${period.from.toISOString().split("T")[0]} to ${period.to.toISOString().split("T")[0]}`);
  lines.push(`**Repository:** ${repository}`);
  lines.push("");

  // Summary section
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **PRs Opened:** ${personStats.prsOpened}`);
  lines.push(`- **Reviews Given:** ${personStats.totalReviewsGiven} (${personStats.reviewMetrics.approved} approved, ${personStats.reviewMetrics.commented} commented, ${personStats.reviewMetrics.changesRequested} changes requested)`);
  lines.push(`- **Participation:** ${personStats.uniquePRsReviewed}/${personStats.eligiblePRsForReview} (${personStats.reviewParticipationRate.toFixed(0)}%)`);

  if (personStats.timeToFirstComment) {
    lines.push(`- **Avg First Comment Time:** ${formatDuration(personStats.timeToFirstComment.average)}`);
  }

  if (personStats.timeToFirstReview) {
    lines.push(`- **Avg First Review Time:** ${formatDuration(personStats.timeToFirstReview.average)}`);
  }

  lines.push("");

  // Detailed PR list
  lines.push("## Detailed PR List");
  lines.push("");
  lines.push("| PR # | Title | Author | Ready for Review | Age | Status | Time Open | Reviewers | Review Status | First Comment | First Review | Link |");
  lines.push("|------|-------|--------|------------------|-----|--------|-----------|-----------|---------------|---------------|--------------|------|");

  for (const prDetail of personStats.prDetails) {
    const readyDate = prDetail.readyForReviewAt.toISOString().split("T")[0];
    const age = `${prDetail.ageInDays}d`;

    // Format PR status (state + draft)
    let prStatus: string;
    if (prDetail.state === "merged") {
      prStatus = "Merged";
    } else if (prDetail.state === "closed") {
      prStatus = "Closed";
    } else {
      prStatus = prDetail.isDraft ? "Open (Draft)" : "Open";
    }

    const timeOpenStr = formatDuration(prDetail.timeOpen);
    const firstCommentStr = prDetail.firstCommentTime !== null ? formatDuration(prDetail.firstCommentTime) : "N/A";
    const firstReviewStr = prDetail.firstReviewTime !== null ? formatDuration(prDetail.firstReviewTime) : "N/A";
    const reviewStatusStr = formatReviewStatus(prDetail.reviewStatus);

    // Escape pipe characters in title
    const safeTitle = prDetail.title.replace(/\|/g, "\\|");

    lines.push(
      `| #${prDetail.prNumber} | ${safeTitle} | ${prDetail.author} | ${readyDate} | ${age} | ${prStatus} | ${timeOpenStr} | ${prDetail.reviewerCount} | ${reviewStatusStr} | ${firstCommentStr} | ${firstReviewStr} | [Link](${prDetail.url}) |`
    );
  }

  lines.push("");

  // Legend
  lines.push("## Legend");
  lines.push("");
  lines.push("- **Ready for Review:** Date when PR became ready for review (or creation date if never drafted)");
  lines.push("- **Age:** Days since PR became ready for review");
  lines.push("- **Status:**");
  lines.push("  - Open: PR is currently open");
  lines.push("  - Open (Draft): PR is currently open but in draft state");
  lines.push("  - Merged: PR has been merged");
  lines.push("  - Closed: PR was closed without merging");
  lines.push("- **Time Open:** Duration from ready for review to merged/closed (or now if still open)");
  lines.push("- **Reviewers:** Number of unique people who formally reviewed this PR (excluding bots)");
  lines.push("- **Review Status:**");
  lines.push("  - ✅ Approved: Formally approved the PR");
  lines.push("  - 💬 Commented (formal review): Submitted a formal review with comments");
  lines.push("  - 💬 Commented: Left comments on the PR (no formal review)");
  lines.push("  - 🔄 Changes Requested: Requested changes before approval");
  lines.push("  - ⏸️ Not Reviewed: Did not review or comment on this PR");
  lines.push("  - 👤 Own PR: PR created by this person");
  lines.push("- **First Comment:** Time from review request to first interaction (review or comment)");
  lines.push("- **First Review:** Time from review request to first formal review (Approved or Changes Requested)");

  return lines.join("\n");
}

/**
 * Generate individual report for a person in CSV format
 */
export function generatePersonReportCSV(
  personStats: PersonStats,
  repository: string,
  period: { from: Date; to: Date }
): string {
  const lines: string[] = [];

  // Header row
  lines.push("PR Number,Title,Author,Ready for Review,Age (days),Status,Time Open,Reviewers,Review Status,First Comment,First Review,URL");

  // Data rows
  for (const prDetail of personStats.prDetails) {
    const readyDate = prDetail.readyForReviewAt.toISOString().split("T")[0];
    const age = prDetail.ageInDays;

    // Format PR status
    let prStatus: string;
    if (prDetail.state === "merged") {
      prStatus = "Merged";
    } else if (prDetail.state === "closed") {
      prStatus = "Closed";
    } else {
      prStatus = prDetail.isDraft ? "Open (Draft)" : "Open";
    }

    // Format review status
    let reviewStatus: string;
    switch (prDetail.reviewStatus) {
      case "APPROVED":
        reviewStatus = "Approved";
        break;
      case "COMMENTED":
        reviewStatus = "Commented (formal review)";
        break;
      case "CHANGES_REQUESTED":
        reviewStatus = "Changes Requested";
        break;
      case "COMMENTED_ONLY":
        reviewStatus = "Commented";
        break;
      case "NOT_REVIEWED":
        reviewStatus = "Not Reviewed";
        break;
      case "OWN_PR":
        reviewStatus = "Own PR";
        break;
    }

    // Escape quotes and commas in title
    const safeTitle = `"${prDetail.title.replace(/"/g, '""')}"`;
    const timeOpenStr = formatDuration(prDetail.timeOpen);
    const firstCommentStr = prDetail.firstCommentTime !== null ? formatDuration(prDetail.firstCommentTime) : "N/A";
    const firstReviewStr = prDetail.firstReviewTime !== null ? formatDuration(prDetail.firstReviewTime) : "N/A";

    lines.push(
      `${prDetail.prNumber},${safeTitle},${prDetail.author},${readyDate},${age},${prStatus},${timeOpenStr},${prDetail.reviewerCount},${reviewStatus},${firstCommentStr},${firstReviewStr},${prDetail.url}`
    );
  }

  return lines.join("\n");
}

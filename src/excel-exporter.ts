import * as ExcelJS from "exceljs";
import * as path from "path";
import { PersonStats, RepositoryStats } from "./types";

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
 * Export all data to an Excel file with multiple sheets
 */
export async function exportToExcel(
  repositoryStats: RepositoryStats,
  personStats: PersonStats[],
  outputDir: string = "./output"
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // Create Summary sheet
  const summarySheet = workbook.addWorksheet("Summary");

  // Summary headers
  summarySheet.columns = [
    { header: "Person", key: "person", width: 20 },
    { header: "PRs Opened", key: "prsOpened", width: 12 },
    { header: "Reviews (A/C/CR)", key: "reviews", width: 18 },
    { header: "Participation", key: "participation", width: 20 },
    { header: "First Comment Avg", key: "firstCommentAvg", width: 20 },
    { header: "First Review Avg", key: "firstReviewAvg", width: 20 },
  ];

  // Add summary data
  for (const stats of personStats) {
    const reviewCount = `${stats.reviewMetrics.approved}/${stats.reviewMetrics.commented}/${stats.reviewMetrics.changesRequested}`;
    const participation = `${stats.uniquePRsReviewed}/${stats.eligiblePRsForReview} (${stats.reviewParticipationRate.toFixed(0)}%)`;
    const firstCommentAvg = stats.timeToFirstComment ? formatDuration(stats.timeToFirstComment.average) : "N/A";
    const firstReviewAvg = stats.timeToFirstReview ? formatDuration(stats.timeToFirstReview.average) : "N/A";

    summarySheet.addRow({
      person: stats.person,
      prsOpened: stats.prsOpened,
      reviews: reviewCount,
      participation: participation,
      firstCommentAvg: firstCommentAvg,
      firstReviewAvg: firstReviewAvg,
    });
  }

  // Style the summary sheet header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD3D3D3" },
  };

  // Create a sheet for each person
  for (const stats of personStats) {
    const sheetName = sanitizeSheetName(stats.person);
    const sheet = workbook.addWorksheet(sheetName);

    // Define columns
    sheet.columns = [
      { header: "PR #", key: "prNumber", width: 8 },
      { header: "Title", key: "title", width: 50 },
      { header: "Author", key: "author", width: 20 },
      { header: "Ready for Review", key: "readyForReview", width: 18 },
      { header: "Age", key: "age", width: 10 },
      { header: "Status", key: "status", width: 15 },
      { header: "Time Open", key: "timeOpen", width: 15 },
      { header: "Reviewers", key: "reviewers", width: 12 },
      { header: "Review Status", key: "reviewStatus", width: 25 },
      { header: "First Comment", key: "firstComment", width: 15 },
      { header: "First Review", key: "firstReview", width: 15 },
      { header: "URL", key: "url", width: 60 },
    ];

    // Add data rows
    for (const prDetail of stats.prDetails) {
      const readyDate = prDetail.readyForReviewAt.toISOString().split("T")[0];
      const age = `${prDetail.ageInDays}d`;

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

      const timeOpenStr = formatDuration(prDetail.timeOpen);
      const firstCommentStr = prDetail.firstCommentTime !== null ? formatDuration(prDetail.firstCommentTime) : "N/A";
      const firstReviewStr = prDetail.firstReviewTime !== null ? formatDuration(prDetail.firstReviewTime) : "N/A";

      sheet.addRow({
        prNumber: prDetail.prNumber,
        title: prDetail.title,
        author: prDetail.author,
        readyForReview: readyDate,
        age: age,
        status: prStatus,
        timeOpen: timeOpenStr,
        reviewers: prDetail.reviewerCount,
        reviewStatus: reviewStatus,
        firstComment: firstCommentStr,
        firstReview: firstReviewStr,
        url: prDetail.url,
      });
    }

    // Style the header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };
  }

  // Write to file
  const filepath = path.join(outputDir, "github-stats.xlsx");
  await workbook.xlsx.writeFile(filepath);
  console.log(`✓ Generated Excel file: ${filepath}`);
}

/**
 * Sanitize sheet name to comply with Excel naming rules
 * - Max 31 characters
 * - No special characters: \ / ? * [ ]
 */
function sanitizeSheetName(name: string): string {
  let sanitized = name.replace(/[\\/\?\*\[\]]/g, "_");
  if (sanitized.length > 31) {
    sanitized = sanitized.substring(0, 31);
  }
  return sanitized;
}

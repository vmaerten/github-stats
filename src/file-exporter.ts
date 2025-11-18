import * as fs from "fs";
import * as path from "path";
import { PersonStats, RepositoryStats } from "./types";
import { generatePersonReport, generatePersonReportCSV } from "./report-generator";
import { formatAsMarkdown, formatAsCSV } from "./formatter";

/**
 * Create directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Export the summary table to a Markdown file
 */
export function exportSummaryTable(
  repositoryStats: RepositoryStats,
  outputDir: string = "./output"
): void {
  ensureDirectoryExists(outputDir);

  try {
    const summaryMarkdown = formatAsMarkdown(repositoryStats);
    const filepath = path.join(outputDir, "summary.md");
    fs.writeFileSync(filepath, summaryMarkdown, "utf-8");
    console.log(`✓ Generated summary table: ${filepath}`);
  } catch (error) {
    console.error(`Error writing summary table:`, error);
  }
}

/**
 * Export the summary table to a CSV file
 */
export function exportSummaryTableCSV(
  repositoryStats: RepositoryStats,
  outputDir: string = "./output"
): void {
  ensureDirectoryExists(outputDir);

  try {
    const summaryCSV = formatAsCSV(repositoryStats);
    const filepath = path.join(outputDir, "summary.csv");
    fs.writeFileSync(filepath, summaryCSV, "utf-8");
    console.log(`✓ Generated summary CSV: ${filepath}`);
  } catch (error) {
    console.error(`Error writing summary CSV:`, error);
  }
}

/**
 * Export individual reports for all persons in Markdown format
 */
export function exportPersonReports(
  stats: PersonStats[],
  repository: string,
  period: { from: Date; to: Date },
  outputDir: string = "./output"
): void {
  // Ensure output directory exists
  ensureDirectoryExists(outputDir);

  console.log(`Generating individual Markdown reports in ${outputDir}/...`);

  let successCount = 0;
  let errorCount = 0;

  for (const personStats of stats) {
    try {
      const report = generatePersonReport(personStats, repository, period);
      const filename = `${sanitizeFilename(personStats.person)}.md`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, report, "utf-8");
      successCount++;
    } catch (error) {
      console.error(`Error writing report for ${personStats.person}:`, error);
      errorCount++;
    }
  }

  console.log(`✓ Generated ${successCount} individual Markdown reports`);
  if (errorCount > 0) {
    console.log(`✗ Failed to generate ${errorCount} reports`);
  }
}

/**
 * Export individual reports for all persons in CSV format
 */
export function exportPersonReportsCSV(
  stats: PersonStats[],
  repository: string,
  period: { from: Date; to: Date },
  outputDir: string = "./output"
): void {
  // Ensure output directory exists
  ensureDirectoryExists(outputDir);

  console.log(`Generating individual CSV reports in ${outputDir}/...`);

  let successCount = 0;
  let errorCount = 0;

  for (const personStats of stats) {
    try {
      const report = generatePersonReportCSV(personStats, repository, period);
      const filename = `${sanitizeFilename(personStats.person)}.csv`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, report, "utf-8");
      successCount++;
    } catch (error) {
      console.error(`Error writing CSV report for ${personStats.person}:`, error);
      errorCount++;
    }
  }

  console.log(`✓ Generated ${successCount} individual CSV reports`);
  if (errorCount > 0) {
    console.log(`✗ Failed to generate ${errorCount} CSV reports`);
  }
}

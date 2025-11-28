import * as fs from "fs";
import * as path from "path";
import { CommentExtractionResult, ReviewComment, IssueComment, ConversationComment } from "./comments-types";

/**
 * Format the extraction result as Markdown
 */
export function formatCommentsAsMarkdown(result: CommentExtractionResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Comments by ${result.username}`);
  lines.push("");
  lines.push(`**Repository:** ${result.repository}`);
  lines.push(`**Period:** ${formatDate(result.period.from)} to ${formatDate(result.period.to)}`);
  lines.push(`**Total Comments:** ${result.totalCount}`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Review comments (on code): ${result.reviewComments.length}`);
  lines.push(`- General comments (on PRs): ${result.issueComments.length}`);
  lines.push(`- PRs with conversations: ${result.conversations.length}`);
  lines.push("");

  // Group conversations by PR author
  const conversationsByAuthor = groupConversationsByPRAuthor(result);

  // Sort authors by user comment count (descending)
  const sortedAuthors = [...conversationsByAuthor.entries()].sort(
    (a, b) => b[1].userCommentCount - a[1].userCommentCount
  );

  lines.push("## Conversations by PR Author");
  lines.push("");

  for (const [author, authorData] of sortedAuthors) {
    lines.push(`### @${author} (${authorData.userCommentCount} comments from ${result.username})`);
    lines.push("");

    for (const conversation of authorData.conversations) {
      lines.push(`#### PR #${conversation.prNumber}: ${conversation.prTitle}`);
      lines.push("");

      for (const comment of conversation.allComments) {
        const highlight = comment.isTargetUser ? " ⭐" : "";
        const authorLabel = comment.isTargetUser
          ? `**@${comment.author}**${highlight}`
          : `@${comment.author}`;

        const typeLabel = comment.type === "review" && comment.path
          ? `[Code: \`${comment.path}\`]`
          : "[General]";

        lines.push(`##### ${authorLabel} (${formatDateTime(comment.createdAt)}) ${typeLabel}`);
        lines.push("");
        lines.push(comment.body);
        lines.push("");
        lines.push(`[View on GitHub](${comment.htmlUrl})`);
        lines.push("");
        lines.push("---");
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

/**
 * Export the result as JSON
 */
export function exportCommentsAsJSON(
  result: CommentExtractionResult,
  outputDir: string
): string {
  const output = {
    metadata: {
      username: result.username,
      repository: result.repository,
      period: {
        from: result.period.from.toISOString(),
        to: result.period.to.toISOString()
      },
      generatedAt: new Date().toISOString(),
      totalCount: result.totalCount,
      reviewCommentsCount: result.reviewComments.length,
      issueCommentsCount: result.issueComments.length,
      conversationsCount: result.conversations.length
    },
    reviewComments: result.reviewComments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    })),
    issueComments: result.issueComments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    })),
    conversations: result.conversations.map((conv) => ({
      ...conv,
      allComments: conv.allComments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString()
      }))
    }))
  };

  const filepath = path.join(outputDir, `comments-${result.username}.json`);
  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), "utf-8");
  return filepath;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDateTime(date: Date): string {
  return date.toISOString().replace("T", " ").substring(0, 16);
}

interface PRData {
  prNumber: number;
  title: string;
  reviewComments: ReviewComment[];
  issueComments: IssueComment[];
}

interface AuthorData {
  totalComments: number;
  prs: PRData[];
}

interface ConversationAuthorData {
  userCommentCount: number;
  conversations: CommentExtractionResult["conversations"];
}

function groupConversationsByPRAuthor(result: CommentExtractionResult): Map<string, ConversationAuthorData> {
  const authorMap = new Map<string, ConversationAuthorData>();

  for (const conversation of result.conversations) {
    const author = conversation.prAuthor;
    if (!authorMap.has(author)) {
      authorMap.set(author, { userCommentCount: 0, conversations: [] });
    }
    const data = authorMap.get(author)!;
    data.userCommentCount += conversation.userCommentCount;
    data.conversations.push(conversation);
  }

  return authorMap;
}

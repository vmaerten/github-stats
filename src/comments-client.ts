import { Octokit } from "@octokit/rest";
import { ReviewComment, IssueComment, ConversationComment } from "./comments-types";

export class CommentsClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private prCache: Map<number, { title: string; author: string }> = new Map();

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Fetch all review comments (diff comments on code lines) for the repo
   * Filters by username and date range
   */
  async fetchReviewCommentsForRepo(
    fromDate: Date,
    username: string
  ): Promise<ReviewComment[]> {
    const comments: ReviewComment[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.octokit.pulls.listReviewCommentsForRepo({
        owner: this.owner,
        repo: this.repo,
        sort: "created",
        direction: "desc",
        per_page: perPage,
        page: page
      });

      if (response.data.length === 0) break;

      for (const comment of response.data) {
        const createdAt = new Date(comment.created_at);

        // Stop if we've gone past our date range
        if (createdAt < fromDate) {
          return comments;
        }

        // Filter by username
        if (comment.user?.login !== username) continue;

        // Extract PR number from pull_request_url
        const prNumber = this.extractPRNumber(comment.pull_request_url);

        // Get PR info (with caching)
        const prInfo = await this.getPRInfo(prNumber);

        // Skip comments on own PRs
        if (prInfo.author === username) continue;

        comments.push({
          id: comment.id,
          prNumber,
          prTitle: prInfo.title,
          prAuthor: prInfo.author,
          body: comment.body,
          createdAt,
          htmlUrl: comment.html_url,
          path: comment.path,
          line: comment.line ?? null,
          commitId: comment.commit_id,
          inReplyToId: comment.in_reply_to_id
        });
      }

      // Check if oldest comment is past our date range
      const oldest = response.data[response.data.length - 1];
      if (new Date(oldest.created_at) < fromDate) break;

      page++;
    }

    return comments;
  }

  /**
   * Fetch all issue comments for the repo (includes PR general comments)
   * Filters by username and date range, and only returns PR comments (not issue comments)
   */
  async fetchIssueCommentsForRepo(
    fromDate: Date,
    username: string
  ): Promise<IssueComment[]> {
    const comments: IssueComment[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.octokit.issues.listCommentsForRepo({
        owner: this.owner,
        repo: this.repo,
        sort: "created",
        direction: "desc",
        per_page: perPage,
        page: page
      });

      if (response.data.length === 0) break;

      for (const comment of response.data) {
        const createdAt = new Date(comment.created_at);

        if (createdAt < fromDate) {
          return comments;
        }

        if (comment.user?.login !== username) continue;

        // Only include PR comments (not issue comments)
        if (!this.isPRComment(comment.html_url)) continue;

        // Extract PR number from issue_url
        const prNumber = this.extractIssueNumber(comment.issue_url);

        // Get PR info (with caching)
        const prInfo = await this.getPRInfo(prNumber);

        // Skip comments on own PRs
        if (prInfo.author === username) continue;

        comments.push({
          id: comment.id,
          prNumber,
          prTitle: prInfo.title,
          prAuthor: prInfo.author,
          body: comment.body || "",
          createdAt,
          htmlUrl: comment.html_url
        });
      }

      const oldest = response.data[response.data.length - 1];
      if (new Date(oldest.created_at) < fromDate) break;

      page++;
    }

    return comments;
  }

  private extractPRNumber(pullRequestUrl: string): number {
    // URL format: https://api.github.com/repos/owner/repo/pulls/123
    const match = pullRequestUrl.match(/\/pulls\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractIssueNumber(issueUrl: string): number {
    // URL format: https://api.github.com/repos/owner/repo/issues/123
    const match = issueUrl.match(/\/issues\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private isPRComment(htmlUrl: string): boolean {
    // PR comments have /pull/ in the URL
    return htmlUrl.includes("/pull/");
  }

  private async getPRInfo(prNumber: number): Promise<{ title: string; author: string }> {
    if (this.prCache.has(prNumber)) {
      return this.prCache.get(prNumber)!;
    }

    try {
      const response = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });
      const info = {
        title: response.data.title,
        author: response.data.user?.login || "unknown"
      };
      this.prCache.set(prNumber, info);
      return info;
    } catch {
      const fallback = { title: `PR #${prNumber}`, author: "unknown" };
      this.prCache.set(prNumber, fallback);
      return fallback;
    }
  }

  /**
   * Fetch ALL comments for a specific PR (from all users)
   */
  async fetchAllCommentsForPR(prNumber: number, targetUsername: string): Promise<ConversationComment[]> {
    const comments: ConversationComment[] = [];

    // Fetch review comments (on code)
    try {
      const reviewResponse = await this.octokit.pulls.listReviewComments({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100
      });

      for (const comment of reviewResponse.data) {
        comments.push({
          id: comment.id,
          author: comment.user?.login || "unknown",
          isTargetUser: comment.user?.login === targetUsername,
          type: "review",
          body: comment.body,
          createdAt: new Date(comment.created_at),
          htmlUrl: comment.html_url,
          path: comment.path,
          line: comment.line ?? null
        });
      }
    } catch (error) {
      console.error(`Error fetching review comments for PR #${prNumber}:`, error);
    }

    // Fetch issue comments (general discussion)
    try {
      const issueResponse = await this.octokit.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        per_page: 100
      });

      for (const comment of issueResponse.data) {
        comments.push({
          id: comment.id,
          author: comment.user?.login || "unknown",
          isTargetUser: comment.user?.login === targetUsername,
          type: "issue",
          body: comment.body || "",
          createdAt: new Date(comment.created_at),
          htmlUrl: comment.html_url
        });
      }
    } catch (error) {
      console.error(`Error fetching issue comments for PR #${prNumber}:`, error);
    }

    // Fetch reviews (approval/changes requested with body text)
    try {
      const reviewsResponse = await this.octokit.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        per_page: 100
      });

      for (const review of reviewsResponse.data) {
        // Only include reviews that have actual content
        if (review.body && review.body.trim() && review.submitted_at) {
          comments.push({
            id: review.id,
            author: review.user?.login || "unknown",
            isTargetUser: review.user?.login === targetUsername,
            type: "review",
            body: review.body,
            createdAt: new Date(review.submitted_at),
            htmlUrl: review.html_url
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching reviews for PR #${prNumber}:`, error);
    }

    // Sort by date
    comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return comments;
  }
}

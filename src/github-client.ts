import { Octokit } from "@octokit/rest";
import { config } from "./config";
import { PRData, ReviewData, ReviewRequestData, CommentData } from "./types";

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Fetch all pull requests within the specified time period
   */
  async fetchPullRequests(fromDate: Date, toDate: Date): Promise<PRData[]> {
    const prs: PRData[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: perPage,
        page: page
      });

      if (response.data.length === 0) {
        break;
      }

      for (const pr of response.data) {
        const createdAt = new Date(pr.created_at);

        // Stop if we've gone past our date range
        if (createdAt < fromDate) {
          return prs;
        }

        // Only include PRs created within our date range
        if (createdAt >= fromDate && createdAt <= toDate) {
          // Determine state: merged > closed > open
          let state: "open" | "closed" | "merged";
          if (pr.merged_at) {
            state = "merged";
          } else if (pr.closed_at) {
            state = "closed";
          } else {
            state = "open";
          }

          prs.push({
            number: pr.number,
            title: pr.title,
            author: pr.user?.login || "unknown",
            createdAt: createdAt,
            readyForReviewAt: createdAt, // Will be updated later if ready_for_review event exists
            closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            state: state,
            isDraft: pr.draft || false
          });
        }
      }

      // Check if we've gone past our date range
      const oldestPR = response.data[response.data.length - 1];
      if (new Date(oldestPR.created_at) < fromDate) {
        break;
      }

      page++;
    }

    return prs;
  }

  /**
   * Fetch all reviews for a specific pull request
   */
  async fetchReviews(prNumber: number): Promise<ReviewData[]> {
    const reviews: ReviewData[] = [];

    const response = await this.octokit.pulls.listReviews({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber
    });

    for (const review of response.data) {
      if (review.user && review.submitted_at && review.state) {
        const state = review.state as "APPROVED" | "COMMENTED" | "CHANGES_REQUESTED" | "DISMISSED" | "PENDING";

        // Only count actual reviews (not pending or dismissed)
        if (state === "APPROVED" || state === "COMMENTED" || state === "CHANGES_REQUESTED") {
          reviews.push({
            prNumber: prNumber,
            reviewer: review.user.login,
            state: state,
            submittedAt: new Date(review.submitted_at)
          });
        }
      }
    }

    return reviews;
  }

  /**
   * Fetch review request events from the timeline
   */
  async fetchReviewRequests(prNumber: number): Promise<ReviewRequestData[]> {
    const reviewRequests: ReviewRequestData[] = [];

    try {
      const response = await this.octokit.issues.listEventsForTimeline({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber
      });

      for (const event of response.data) {
        if (event.event === "review_requested") {
          const eventData = event as any;
          const reviewer = eventData.requested_reviewer?.login;
          const createdAt = eventData.created_at;
          if (reviewer && createdAt) {
            reviewRequests.push({
              prNumber: prNumber,
              reviewer: reviewer,
              requestedAt: new Date(createdAt)
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching timeline for PR #${prNumber}:`, error);
    }

    return reviewRequests;
  }

  /**
   * Fetch regular PR comments (not review comments, just discussion comments)
   */
  async fetchPRComments(prNumber: number): Promise<CommentData[]> {
    const comments: CommentData[] = [];

    try {
      const response = await this.octokit.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber
      });

      for (const comment of response.data) {
        if (comment.user && comment.created_at) {
          comments.push({
            prNumber: prNumber,
            commenter: comment.user.login,
            createdAt: new Date(comment.created_at)
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching comments for PR #${prNumber}:`, error);
    }

    return comments;
  }

  /**
   * Fetch the ready_for_review event date from the timeline
   * Returns null if PR was never a draft or no ready_for_review event exists
   */
  async fetchReadyForReviewDate(prNumber: number): Promise<Date | null> {
    try {
      const response = await this.octokit.issues.listEventsForTimeline({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber
      });

      for (const event of response.data) {
        if (event.event === "ready_for_review") {
          const eventData = event as any;
          if (eventData.created_at) {
            return new Date(eventData.created_at);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ready_for_review for PR #${prNumber}:`, error);
    }

    return null;
  }
}

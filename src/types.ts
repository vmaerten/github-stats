export interface PRData {
  number: number;
  title: string;
  author: string;
  createdAt: Date;
  readyForReviewAt: Date;
  closedAt: Date | null;
  mergedAt: Date | null;
  state: "open" | "closed" | "merged";
  isDraft: boolean;
}

export interface ReviewData {
  prNumber: number;
  reviewer: string;
  state: "APPROVED" | "COMMENTED" | "CHANGES_REQUESTED";
  submittedAt: Date;
}

export interface ReviewRequestData {
  prNumber: number;
  reviewer: string;
  requestedAt: Date;
}

export interface CommentData {
  prNumber: number;
  commenter: string;
  createdAt: Date;
}

export interface TimeMetrics {
  average: number;
  min: number;
  max: number;
  median: number;
}

export interface ReviewMetrics {
  approved: number;
  commented: number;
  changesRequested: number;
}

export interface PersonPRDetail {
  prNumber: number;
  title: string;
  author: string;
  createdAt: Date;
  readyForReviewAt: Date;
  ageInDays: number;
  state: "open" | "closed" | "merged";
  isDraft: boolean;
  reviewStatus: "APPROVED" | "COMMENTED" | "CHANGES_REQUESTED" | "COMMENTED_ONLY" | "NOT_REVIEWED" | "OWN_PR";
  firstCommentTime: number | null; // milliseconds from review request, null if not applicable
  firstReviewTime: number | null; // milliseconds from review request, null if not applicable
  timeOpen: number; // milliseconds from readyForReview to merged/closed/now
  reviewerCount: number; // number of unique people who formally reviewed this PR (excluding bots)
  url: string;
}

export interface PersonStats {
  person: string;
  prsOpened: number;
  reviewMetrics: ReviewMetrics;
  totalReviewsGiven: number; // total number of reviews (can be > PRs if multiple reviews on same PR)
  uniquePRsReviewed: number; // number of unique PRs reviewed (excluding own PRs)
  reviewParticipationRate: number; // percentage of PRs reviewed (0-100)
  eligiblePRsForReview: number; // total PRs excluding own PRs and bots
  timeToFirstComment: TimeMetrics | null;
  timeToFirstReview: TimeMetrics | null;
  timeToApproval: TimeMetrics | null;
  prDetails: PersonPRDetail[]; // detailed list of all PRs and this person's participation
}

export interface RepositoryStats {
  repository: string;
  period: {
    from: Date;
    to: Date;
  };
  totalPRs: number;
  stats: PersonStats[];
}

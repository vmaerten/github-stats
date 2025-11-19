import { PRData, ReviewData, ReviewRequestData, CommentData, PersonStats, PersonPRDetail, TimeMetrics, ReviewMetrics } from "./types";
import { isBot } from "./utils";
import { config } from "./config";

/**
 * Calculate statistical metrics from an array of time durations (in milliseconds)
 */
function calculateTimeMetrics(durations: number[]): TimeMetrics | null {
  if (durations.length === 0) {
    return null;
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = durations.reduce((acc, val) => acc + val, 0);

  return {
    average: sum / durations.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
  };
}

/**
 * Calculate statistics for all persons involved in the repository
 */
export function calculateStats(
  prs: PRData[],
  reviews: Map<number, ReviewData[]>,
  reviewRequests: Map<number, ReviewRequestData[]>,
  comments: Map<number, CommentData[]>
): PersonStats[] {
  const personMap = new Map<string, {
    prsOpened: number;
    reviewsApproved: number;
    reviewsCommented: number;
    reviewsChangesRequested: number;
    prsReviewedSet: Set<number>; // Track unique PRs reviewed
    ownPRNumbers: Set<number>; // Track own PRs to exclude from participation
    timeToFirstComment: number[];
    timeToFirstReview: number[];
    timeToApproval: number[];
    prDetailsMap: Map<number, {
      reviewStatus: "APPROVED" | "COMMENTED" | "CHANGES_REQUESTED" | "COMMENTED_ONLY" | "NOT_REVIEWED" | "OWN_PR";
      firstCommentTime: number | null;
      firstReviewTime: number | null;
    }>;
  }>();

  // Count PRs opened by each person (excluding bots)
  for (const pr of prs) {
    if (isBot(pr.author)) {
      continue;
    }

    if (!personMap.has(pr.author)) {
      personMap.set(pr.author, {
        prsOpened: 0,
        reviewsApproved: 0,
        reviewsCommented: 0,
        reviewsChangesRequested: 0,
        prsReviewedSet: new Set<number>(),
        ownPRNumbers: new Set<number>(),
        timeToFirstComment: [],
        timeToFirstReview: [],
        timeToApproval: [],
        prDetailsMap: new Map()
      });
    }
    const authorData = personMap.get(pr.author)!;
    authorData.prsOpened++;
    authorData.ownPRNumbers.add(pr.number);
  }

  // Process reviews for each PR
  for (const [prNumber, prReviews] of reviews.entries()) {
    const prReviewRequests = reviewRequests.get(prNumber) || [];
    const prComments = comments.get(prNumber) || [];

    // Filter out bot reviews
    const filteredReviews = prReviews.filter(review => !isBot(review.reviewer));

    // Group reviews by reviewer
    const reviewsByPerson = new Map<string, ReviewData[]>();
    for (const review of filteredReviews) {
      if (!reviewsByPerson.has(review.reviewer)) {
        reviewsByPerson.set(review.reviewer, []);
      }
      reviewsByPerson.get(review.reviewer)!.push(review);
    }

    // Process each reviewer's reviews for this PR
    for (const [reviewer, personReviews] of reviewsByPerson.entries()) {
      // Initialize person if not exists
      if (!personMap.has(reviewer)) {
        personMap.set(reviewer, {
          prsOpened: 0,
          reviewsApproved: 0,
          reviewsCommented: 0,
          reviewsChangesRequested: 0,
          prsReviewedSet: new Set<number>(),
          ownPRNumbers: new Set<number>(),
          timeToFirstComment: [],
          timeToFirstReview: [],
          timeToApproval: [],
          prDetailsMap: new Map()
        });
      }

      const personData = personMap.get(reviewer)!;

      // Track that this person reviewed this PR
      personData.prsReviewedSet.add(prNumber);

      // Sort reviews by submission time
      const sortedReviews = [...personReviews].sort(
        (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
      );

      // Count review types (only count the latest review state for each PR)
      const latestReview = sortedReviews[sortedReviews.length - 1];
      if (latestReview.state === "APPROVED") {
        personData.reviewsApproved++;
      } else if (latestReview.state === "COMMENTED") {
        personData.reviewsCommented++;
      } else if (latestReview.state === "CHANGES_REQUESTED") {
        personData.reviewsChangesRequested++;
      }

      // Calculate times for PR details
      let firstCommentTime: number | null = null;
      let firstReviewTime: number | null = null;

      // Find the review request time for this reviewer
      const reviewRequest = prReviewRequests.find(req => req.reviewer === reviewer);
      if (reviewRequest) {
        const requestTime = reviewRequest.requestedAt.getTime();

        // Get person's comments on this PR (excluding bots)
        const personComments = prComments.filter(c => c.commenter === reviewer && !isBot(c.commenter));

        // Time to first comment (either a review OR a regular comment)
        const allInteractions: { type: string; timestamp: number }[] = [];

        // Add all reviews as interactions
        sortedReviews.forEach(review => {
          allInteractions.push({
            type: 'review',
            timestamp: review.submittedAt.getTime()
          });
        });

        // Add all comments as interactions
        personComments.forEach(comment => {
          allInteractions.push({
            type: 'comment',
            timestamp: comment.createdAt.getTime()
          });
        });

        // Sort all interactions by time
        allInteractions.sort((a, b) => a.timestamp - b.timestamp);

        // Time to first comment (any interaction)
        if (allInteractions.length > 0) {
          const timeToFirstComment = allInteractions[0].timestamp - requestTime;
          if (timeToFirstComment >= 0) {
            personData.timeToFirstComment.push(timeToFirstComment);
            firstCommentTime = timeToFirstComment;
          }
        }

        // Time to first review (APPROVED or CHANGES_REQUESTED only)
        const firstFormalReview = sortedReviews.find(
          r => r.state === "APPROVED" || r.state === "CHANGES_REQUESTED"
        );
        if (firstFormalReview) {
          const timeToFirst = firstFormalReview.submittedAt.getTime() - requestTime;
          if (timeToFirst >= 0) {
            personData.timeToFirstReview.push(timeToFirst);
            firstReviewTime = timeToFirst;
          }
        }

        // Time to approval/changes requested (same as first formal review)
        const approvalReview = sortedReviews.find(
          r => r.state === "APPROVED" || r.state === "CHANGES_REQUESTED"
        );
        if (approvalReview) {
          const timeToApprovalValue = approvalReview.submittedAt.getTime() - requestTime;
          if (timeToApprovalValue >= 0) {
            personData.timeToApproval.push(timeToApprovalValue);
          }
        }
      }

      // Store PR detail for this reviewer (even if not requested for review)
      personData.prDetailsMap.set(prNumber, {
        reviewStatus: latestReview.state,
        firstCommentTime,
        firstReviewTime
      });
    }
  }

  // Process PR comments for people who didn't submit formal reviews
  for (const [prNumber, prComments] of comments.entries()) {
    const prReviewRequests = reviewRequests.get(prNumber) || [];
    const filteredComments = prComments.filter(c => !isBot(c.commenter));

    // Group comments by commenter
    const commentsByPerson = new Map<string, CommentData[]>();
    for (const comment of filteredComments) {
      if (!commentsByPerson.has(comment.commenter)) {
        commentsByPerson.set(comment.commenter, []);
      }
      commentsByPerson.get(comment.commenter)!.push(comment);
    }

    // For each commenter on this PR
    for (const [commenter, personComments] of commentsByPerson.entries()) {
      // Initialize person if not exists
      if (!personMap.has(commenter)) {
        personMap.set(commenter, {
          prsOpened: 0,
          reviewsApproved: 0,
          reviewsCommented: 0,
          reviewsChangesRequested: 0,
          prsReviewedSet: new Set<number>(),
          ownPRNumbers: new Set<number>(),
          timeToFirstComment: [],
          timeToFirstReview: [],
          timeToApproval: [],
          prDetailsMap: new Map()
        });
      }

      const personData = personMap.get(commenter)!;

      // If they don't already have a review status for this PR (meaning no formal review)
      if (!personData.prDetailsMap.has(prNumber)) {
        // Calculate firstCommentTime if they were review-requested
        let firstCommentTime: number | null = null;
        const reviewRequest = prReviewRequests.find(req => req.reviewer === commenter);

        if (reviewRequest && personComments.length > 0) {
          // Sort comments by time to find the first one
          const sortedComments = [...personComments].sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
          );

          const timeToFirstComment = sortedComments[0].createdAt.getTime() - reviewRequest.requestedAt.getTime();
          if (timeToFirstComment >= 0) {
            personData.timeToFirstComment.push(timeToFirstComment);
            firstCommentTime = timeToFirstComment;
          }
        }

        // Mark as COMMENTED_ONLY (regular comments, no formal review)
        personData.prDetailsMap.set(prNumber, {
          reviewStatus: "COMMENTED_ONLY",
          firstCommentTime: firstCommentTime,
          firstReviewTime: null
        });
      }
    }
  }

  // Convert map to array of PersonStats
  const totalPRs = prs.length;
  const stats: PersonStats[] = [];
  for (const [person, data] of personMap.entries()) {
    const totalReviewsGiven = data.reviewsApproved + data.reviewsCommented + data.reviewsChangesRequested;

    // Calculate PRs reviewed excluding own PRs
    const prsReviewedExcludingOwn = new Set(
      [...data.prsReviewedSet].filter(prNumber => !data.ownPRNumbers.has(prNumber))
    );
    const prsReviewedCount = prsReviewedExcludingOwn.size;

    // Calculate total PRs excluding own PRs for participation rate
    const totalPRsExcludingOwn = totalPRs - data.ownPRNumbers.size;
    const reviewParticipationRate = totalPRsExcludingOwn > 0 ? (prsReviewedCount / totalPRsExcludingOwn) * 100 : 0;

    // Build PR details for this person
    const prDetails: PersonPRDetail[] = [];
    for (const pr of prs) {
      const isOwnPR = data.ownPRNumbers.has(pr.number);
      const prDetail = data.prDetailsMap.get(pr.number);

      // Calculate time open: from readyForReview to merged/closed/now
      let timeOpen: number;
      if (pr.mergedAt) {
        timeOpen = pr.mergedAt.getTime() - pr.readyForReviewAt.getTime();
      } else if (pr.closedAt) {
        timeOpen = pr.closedAt.getTime() - pr.readyForReviewAt.getTime();
      } else {
        // Still open
        timeOpen = Date.now() - pr.readyForReviewAt.getTime();
      }

      // Calculate reviewer count: unique people who formally reviewed (excluding bots)
      const prReviews = reviews.get(pr.number) || [];
      const uniqueReviewers = new Set<string>();
      for (const review of prReviews) {
        if (!isBot(review.reviewer)) {
          uniqueReviewers.add(review.reviewer);
        }
      }
      const reviewerCount = uniqueReviewers.size;

      const detail: PersonPRDetail = {
        prNumber: pr.number,
        title: pr.title,
        author: pr.author,
        createdAt: pr.createdAt,
        readyForReviewAt: pr.readyForReviewAt,
        ageInDays: Math.floor((Date.now() - pr.readyForReviewAt.getTime()) / (1000 * 60 * 60 * 24)),
        state: pr.state,
        isDraft: pr.isDraft,
        reviewStatus: isOwnPR ? "OWN_PR" : (prDetail?.reviewStatus || "NOT_REVIEWED"),
        firstCommentTime: prDetail?.firstCommentTime || null,
        firstReviewTime: prDetail?.firstReviewTime || null,
        timeOpen: timeOpen,
        reviewerCount: reviewerCount,
        url: `https://github.com/${config.repository.owner}/${config.repository.repo}/pull/${pr.number}`
      };

      prDetails.push(detail);
    }

    stats.push({
      person,
      prsOpened: data.prsOpened,
      reviewMetrics: {
        approved: data.reviewsApproved,
        commented: data.reviewsCommented,
        changesRequested: data.reviewsChangesRequested
      },
      totalReviewsGiven,
      uniquePRsReviewed: prsReviewedCount,
      reviewParticipationRate,
      eligiblePRsForReview: totalPRsExcludingOwn,
      timeToFirstComment: calculateTimeMetrics(data.timeToFirstComment),
      timeToFirstReview: calculateTimeMetrics(data.timeToFirstReview),
      timeToApproval: calculateTimeMetrics(data.timeToApproval),
      prDetails
    });
  }

  // Sort by PRs opened (descending), then by person name
  stats.sort((a, b) => {
    if (b.prsOpened !== a.prsOpened) {
      return b.prsOpened - a.prsOpened;
    }
    return a.person.localeCompare(b.person);
  });

  return stats;
}

/**
 * A review comment left on a specific line in a PR diff
 */
export interface ReviewComment {
  id: number;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  body: string;
  createdAt: Date;
  htmlUrl: string;
  path: string;
  line: number | null;
  commitId: string;
  inReplyToId?: number;
}

/**
 * A general comment on a PR (not on a specific diff line)
 */
export interface IssueComment {
  id: number;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  body: string;
  createdAt: Date;
  htmlUrl: string;
}

/**
 * Result of the comment extraction
 */
export interface CommentExtractionResult {
  username: string;
  repository: string;
  period: {
    from: Date;
    to: Date;
  };
  reviewComments: ReviewComment[];
  issueComments: IssueComment[];
  totalCount: number;
  conversations: PRConversation[];
}

/**
 * A full PR conversation with all comments
 */
export interface PRConversation {
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  userCommentCount: number;
  allComments: ConversationComment[];
}

/**
 * A comment in a conversation (can be from any user)
 */
export interface ConversationComment {
  id: number;
  author: string;
  isTargetUser: boolean;
  type: "review" | "issue";
  body: string;
  createdAt: Date;
  htmlUrl: string;
  path?: string;
  line?: number | null;
}

/**
 * Configuration for the extract-comments command
 */
export interface CommentsConfig {
  githubToken: string;
  repository: {
    owner: string;
    repo: string;
  };
  periodDays: number;
  username: string;
}

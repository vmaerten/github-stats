# GitHub PR Statistics

Analyze GitHub pull request statistics per person, including review metrics and response times.

## Features

- **PR counts** - Number of PRs opened by each person
- **Review metrics** - Count of reviews by type (approved, commented, changes requested)
- **Response times** - Time from review request to first review and to approval
- **Statistical analysis** - Average, min, max, and median times
- **Multiple formats** - Output as Markdown table or CSV

## Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Configure GitHub token**

Create a GitHub personal access token at https://github.com/settings/tokens

Required scopes:
- `repo` (for private repositories)
- `public_repo` (for public repositories only)

Set the token as an environment variable:

```bash
export GITHUB_TOKEN=your_github_token_here
```

3. **Configure repository and period**

Edit `src/config.ts` to set:
- Target repository (owner/repo)
- Analysis period (in days)
- Output format (markdown or csv)

## Usage

**Run in development mode:**

```bash
pnpm dev
```

**Build and run:**

```bash
pnpm build
pnpm start
```

## Example Output

```markdown
# PR Statistics for facebook/react

Period: 2024-10-19 to 2024-11-18

| Person | PRs Opened | Reviews (A/C/CR) | First Review Time (avg/min/max/median) | Approval Time (avg/min/max/median) |
|--------|------------|------------------|----------------------------------------|-------------------------------------|
| user1  | 5          | 2/3/1            | 2h / 30m / 5h / 1h 30m                | 1d / 4h / 3d / 18h                 |
| user2  | 3          | 1/0/2            | 4h / 1h / 8h / 3h                     | 1d 12h / 6h / 2d / 1d 8h           |

Legend:
- A/C/CR = Approved / Commented / Changes Requested
- Times shown as: average / min / max / median
```

## Configuration

Default configuration in `src/config.ts`:

```typescript
export const config = {
  repository: {
    owner: "facebook",
    repo: "react"
  },
  periodDays: 30,
  githubToken: process.env.GITHUB_TOKEN || "",
  outputFormat: "markdown" as "markdown" | "csv"
};
```

## How It Works

1. Fetches all PRs in the specified time period
2. For each PR, retrieves reviews and timeline events
3. Extracts review request timestamps from timeline
4. Calculates statistics per person:
   - PRs opened
   - Reviews given (by type)
   - Time to first review (from review request)
   - Time to approval/changes requested
5. Formats results as Markdown table or CSV

## License

ISC

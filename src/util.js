import * as core from "@actions/core";
import * as github from "@actions/github";
import minimatch from "minimatch";
import { ERROR_MESSAGE } from "./constant.js";

function parseCSV(value) {
  if (value.trim() === "") return [];
  return value.split(",").map((p) => p.trim());
}

export function shouldRun() {
  const excludeBranches = parseCSV(
    core.getInput("exclude-branches", {
      required: false,
    })
  );

  if (!excludeBranches.length) return true;

  const sourceBranch = github.context.payload.pull_request.head.ref;

  const result = excludeBranches.some((p) => minimatch(sourceBranch, p));

  if (result) {
    core.notice("source branch matched the exclude pattern, exiting...");
  }

  return !result;
}

export function addComment(octokit, subjectId) {
  return octokit.graphql(
    `
        mutation addCommentWhenMissingLinkIssues($subjectId: String!, $body: String!) {
          addComment(input:{subjectId: $subjectId, body: $body}) {
            clientMutationId
          }
        }
      `,
    {
      subjectId,
      body: `${ERROR_MESSAGE} <br/> 
      [Use GitHub automation to close the issue when a PR is merged](${REFERENCE_LINK})`,
    }
  );
}

export function getLinkedIssues(
  octokit,
  repositoryName,
  repositoryNumber,
  owner
) {
  return octokit.graphql(
    `
    query getLinkedIssues($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          id
          closingIssuesReferences {
            totalCount
          }
        }
      }
    }
    `,
    {
      owner,
      name: repositoryName,
      number: repositoryNumber,
    }
  );
}

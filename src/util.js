import * as core from "@actions/core";
import * as github from "@actions/github";
import minimatch from "minimatch";
import { BODY_COMMENT } from "./constants.js";

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
      body: BODY_COMMENT,
    }
  );
}

export function getLinkedIssues({ octokit, prNumber, repoOwner, repoName }) {
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
      owner: repoOwner,
      name: repoName,
      number: prNumber,
    }
  );
}

/*export function deleteLinkedIssueComments({
  octokit,
  prNumber: number,
  repoName: name,
}) {
  return Promise.all(
    nodeIds.map((id) =>
      octokit.graphql(
        `
      mutation deleteCommentLinkedIssue($id: ID!) {
        deleteIssueComment(input: {id: $id }) {
          clientMutationId
        }
      }
      `,
        {
          id,
        }
      )
    )
  );
}*/

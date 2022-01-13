import * as core from "@actions/core";
import * as github from "@actions/github";

import { ERROR_MESSAGE } from "./constants.js";
import {
  getLinkedIssues,
  addComment,
  deleteLinkedIssueComments,
  getPrComments,
} from "./util.js";

const format = (obj) => JSON.stringify(obj, undefined, 2);

async function run() {
  core.info(`
    *** ACTION RUN - START ***
    `);

  try {
    const { payload, eventName } = github.context;

    if (eventName !== "pull_request") {
      throw new Error(
        `This action can only run on "pull_request", but "${eventName}" was received. Please check your workflow.`
      );
    }

    core.debug(`
    *** PAYLOAD ***
    ${format(payload)}
    `);

    const {
      number,
      repository: { owner, name },
    } = payload;

    const token = core.getInput("github-token");
    const shouldComment = core.getInput("comment");

    const octokit = github.getOctokit(token);
    const data = await getLinkedIssues({
      prNumber: number,
      repoName: name,
      repoOwner: owner.login,
      octokit,
    });

    core.debug(`
    *** GRAPHQL DATA ***
    ${format(data)}
    `);

    const pullRequest = data?.repository?.pullRequest;
    const linkedIssuesCount = pullRequest?.closingIssuesReferences?.totalCount;

    const linkedIssuesComments = await getPrComments({
      octokit,
      repoName: name,
      prNumber: number,
      repoOwner: owner.login,
    });

    core.info("Issues: " + format(linkedIssuesComments));

    core.setOutput("linked_issues_count", linkedIssuesCount);

    if (!linkedIssuesCount) {
      const prId = pullRequest?.id;

      if (prId && !linkedIssuesComments.length && shouldComment) {
        const body = core.getInput("custom-body-comment");
        await addComment({octokit, prId, body});
        
        core.debug(`Comment added for ${prId} PR`);
      }

      core.setFailed(ERROR_MESSAGE);
    } else if (linkedIssuesComments.length) {
        await deleteLinkedIssueComments(octokit, linkedIssuesComments);
        core.debug(`${nodeIds.length} Comments deleted.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  } finally {
    core.info(`
    *** ACTION RUN - END ***
    `);
  }
}

export { run };

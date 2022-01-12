import * as core from "@actions/core";
import * as github from "@actions/github";
import { ERROR_MESSAGE } from "./constants.js";
import { getLinkedIssues, addComment } from "./util.js";

const format = (obj) => JSON.stringify(obj, undefined, 2);

async function run() {
  core.info(`
    *** ACTION RUN - START ***
    `);

  try {
    const { payload, eventName } = github.context;

    if (eventName !== "pull_request") {
      throw new Error(
        `This action can only run on "pull_request", but "${eventName}" was received.Please check your workflow.`
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
    const octokit = github.getOctokit(token);
    const data = await getLinkedIssues(octokit, name, number, owner.login);

    core.debug(`
    *** GRAPHQL DATA ***
    ${format(data)}
    `);

    const pullRequest = data?.repository?.pullRequest;
    const linkedIssuesCount = pullRequest?.closingIssuesReferences?.totalCount;

    core.setOutput("linked_issues_count", linkedIssuesCount);

    if (!linkedIssuesCount) {
      const subjectId = pullRequest?.id;
      if (subjectId) {
        await addComment(octokit, subjectId);
        core.debug("Comment added.");
      }
      core.setFailed(ERROR_MESSAGE);
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

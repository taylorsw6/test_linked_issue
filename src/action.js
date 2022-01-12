import * as core from "@actions/core";
import * as github from "@actions/github";

const format = (obj) => JSON.stringify(obj, undefined, 2);

async function run() {
  core.info(`
    *** ACTION RUN - START **sssss*
    `);

  try {
    const { payload, eventName } = github.context;

    core.info(`
      *** PAYLOAD ***
      ${format(payload)}
      `);

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
    const octokit = github.getOctokit(token);
    const data = await octokit.graphql(
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
        owner: owner.login,
        name,
        number,
      }
    );

    core.info(`
    *** GRAPHQL DATA ***
    ${format(data)}
    `);

    const linkedIssuesCount =
      data?.repository?.pullRequest?.closingIssuesReferences?.totalCount;

    core.setOutput("linked_issues_count", linkedIssuesCount);

    if (!linkedIssuesCount) {
      const errorMessage =
        "No linked issues found. Please add the corresponding issues in the pull request description.";

      const mutationQuery = `mutation
          addCommentWhenMissingLinkIssues($subjectId: String!, $body: String!) {
            addComment(input:{subjectId: $subjectId, body: $body}) {
              clientMutationId
            }
          }
        `;

      await octokit.graphql(mutationQuery, {
        subjectId: owner.login,
        body: errorMessage,
      });
      core.debug("Comment added.");

      core.setFailed(errorMessage);
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

import * as githubActions from "@actions/github";

import { findReferendumState } from "./find-referendum-state";
import { parseRFC } from "./parse-RFC";
import { RequestResult, RequestState } from "./types";

const blockHashInstructions =
  `<details><summary>Instructions to find the block hash</summary>` +
  "Here is one way to find the corresponding block hash." +
  `\n\n1. Open the referendum on Subsquare.` +
  "\n\n2. Switch to the `Timeline` tab." +
  `\n<img width="250px" src="https://raw.githubusercontent.com/paritytech/rfc-propose/main/src/images/timeline_tab.png" />` +
  "\n\n---" +
  "\n\n3. Go to the details of the `Confirmed` event." +
  `\n<img width="480px" src="https://raw.githubusercontent.com/paritytech/rfc-propose/main/src/images/confirmed_event.png" />` +
  "\n\n---" +
  `\n\n2. Go to the details of the block containing that event.` +
  `\n<img width="380px" src="https://raw.githubusercontent.com/paritytech/rfc-propose/main/src/images/block_number.png" />` +
  "\n\n---" +
  `\n\n2. Here you can find the block hash.` +
  `\n<img width="620px" src="https://raw.githubusercontent.com/paritytech/rfc-propose/main/src/images/block_hash.png" />` +
  `\n</details>`;

export const handleProcessCommand = async (
  requestState: RequestState,
  blockHash: string | undefined,
): Promise<RequestResult> => {
  const parseRFCResult = await parseRFC(requestState);
  if ("success" in parseRFCResult) {
    return parseRFCResult;
  }
  if (!blockHash && !blockHash?.startsWith("0x")) {
    return {
      success: false,
      errorMessage:
        "Please provider a block hash where the referendum confirmation event is to be found.\n" +
        "For example:\n\n" +
        "```\n/rfc process 0x39fbc57d047c71f553aa42824599a7686aea5c9aab4111f6b836d35d3d058162\n```\n\n" +
        blockHashInstructions,
    };
  }

  const { octokitInstance: octokit } = requestState;

  const referendumState = await findReferendumState({ parseRFCResult, blockHash });
  if (!referendumState) {
    return {
      success: false,
      errorMessage: `Unable to find the referendum confirm event in the given block.\n\n` + blockHashInstructions,
    };
  } else if (referendumState === "approved") {
    try {
      octokit.log.info(
        `Trying to merge PR #${githubActions.context.issue.number} in ${githubActions.context.repo.owner}/${githubActions.context.repo.repo}.`,
      );
      await requestState.octokitInstance.rest.pulls.merge({
        owner: githubActions.context.repo.owner,
        repo: githubActions.context.repo.repo,
        pull_number: githubActions.context.issue.number,
        merge_method: "squash",
      });
      return { success: true, message: "The on-chain referendum has approved the RFC." };
    } catch (e) {
      octokit.log.error(String(e));
      return {
        success: false,
        errorMessage:
          "The on-chain referendum has approved the RFC, however I was not able to merge the PR automatically.",
      };
    }
  } else if (referendumState === "rejected") {
    try {
      await octokit.rest.pulls.update({
        owner: githubActions.context.repo.owner,
        repo: githubActions.context.repo.repo,
        pull_number: githubActions.context.issue.number,
        state: "closed",
      });
      return { success: true, message: "The on-chain referendum has rejected the RFC." };
    } catch (e) {
      octokit.log.error(String(e));
      return {
        success: false,
        errorMessage:
          "The on-chain referendum has rejected the RFC, however I was not able to close the PR automatically.",
      };
    }
  } else {
    throw new Error(`The referendum is in an unknown state: "${String(referendumState)}".`);
  }
};

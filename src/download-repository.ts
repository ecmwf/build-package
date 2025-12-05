import path from "path";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as exec from "@actions/exec";

import { extendDependencies } from "./env-functions";
import { isError } from "./helper-functions";

import { EnvironmentVariables } from "./types/env-functions";

/**
 * Clones a Github repository including all submodules to a directory with supplied name.
 *
 * @param {string} repository Github repository owner and name.
 * @param {string} packageName Name of the package.
 * @param {string} branch Branch (or tag) name. Make sure to supply tags in their verbose form: `refs/tags/tag-name`.
 * @param {string} githubToken Github access token, with `repo` and `actions:read` scopes.
 * @param {string} downloadDir Directory where the repository will be cloned.
 * @param {EnvironmentVariables} env Local environment object.
 * @returns {Promise<boolean>} Whether the clone operation was successful.
 */
const downloadRepository = async (
    repository: string,
    packageName: string,
    branch: string,
    githubToken: string,
    downloadDir: string,
    env: EnvironmentVariables,
): Promise<boolean> => {
    core.startGroup(`Download ${packageName} Repository`);

    const [owner, repo] = repository.split("/");

    core.info(`==> Repository: ${owner}/${repo}`);

    const repoUrl = `https://token:${githubToken}@github.com/${owner}/${repo}.git`;
    const sourceDir = path.join(downloadDir, packageName);

    // Ensure the parent directory exists
    await io.mkdirP(downloadDir);

    let isCommitHash = false;
    let gitRef = branch;
    let headSha: string | undefined;

    if (/^[0-9a-f]{40}$/i.test(gitRef)) {
        // We've been given a commit hash instead of a branch or tag.
        core.info(`==> Hash: ${gitRef}`);
        isCommitHash = true;
        headSha = gitRef;
    } else {
        if (/^refs\/tags\//.test(gitRef)) {
            gitRef = gitRef.replace(/^refs\/tags\//, "");
            core.info(`==> Tag: ${gitRef}`);
        } else {
            gitRef = gitRef.replace(/^refs\/heads\//, "");
            core.info(`==> Branch: ${gitRef}`);
        }
    }

    try {
        if (isCommitHash) {
            // For commit hashes, we need to clone the repository first, then checkout the specific commit
            core.info(
                `==> Cloning repository to checkout with commit ${gitRef}...`,
            );

            await exec.exec("git", [
                "clone",
                "--filter=blob:none",
                repoUrl,
                sourceDir,
            ]);

            core.info(`==> Checking out commit ${gitRef}...`);
            await exec.exec("git", ["-C", sourceDir, "checkout", gitRef]);

            core.info(`==> Initializing and updating submodules...`);
            await exec.exec("git", [
                "-C",
                sourceDir,
                "submodule",
                "update",
                "--init",
                "--recursive",
            ]);
        } else {
            core.info(`==> Cloning repository with branch/tag: ${gitRef}...`);

            await exec.exec("git", [
                "clone",
                "--recursive",
                "--depth",
                "1",
                "--branch",
                gitRef,
                repoUrl,
                sourceDir,
            ]);
        }

        if (!headSha) {
            let gitOutput = "";
            const options = {
                listeners: {
                    stdout: (data: Buffer) => {
                        gitOutput += data.toString();
                    },
                },
                silent: true,
            };

            await exec.exec(
                "git",
                ["-C", sourceDir, "rev-parse", "HEAD"],
                options,
            );

            headSha = gitOutput.trim();
        }

        core.info(`==> Repository cloned successfully to ${sourceDir}`);
        core.info(`==> Commit SHA: ${headSha}`);

        await extendDependencies(env, packageName, headSha);

        return true;
    } catch (error) {
        if (error instanceof Error) {
            isError(true, `Error cloning repository ${repo}: ${error.message}`);
        }
        return false;
    } finally {
        core.endGroup();
    }
};

export default downloadRepository;

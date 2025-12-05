import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import { describe, it, expect, vi, beforeEach } from "vitest";

import downloadRepository from "../src/download-repository";

vi.mock("@actions/core");
vi.mock("@actions/exec");
vi.mock("@actions/io");

// Test parameters.
const repository = "owner/repo";
const packageName = "repo";
const repo = "repo";
const owner = "owner";
const branch = "develop";
const commitHash = "f0b00fd201c7ddf14e1572a10d5fb4577c4bd6a2";
const githubToken = "12345";
const downloadDir = "/path/to/download";
const sourceDir = "/path/to/download/repo";
const repoUrl = `https://token:${githubToken}@github.com/${owner}/${repo}.git`;
const errorObject = new Error("Git clone failed!");

// Base environment object, we will take care not to modify it.
const env = {
    CC: "gcc-10",
    CXX: "g++-10",
    FC: "gfortran-10",
    CMAKE_VERSION: "3.21.1",
};

describe("downloadRepository", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (io.mkdirP as vi.Mock).mockResolvedValue(undefined);
    });

    it("clones a branch successfully with submodules", async () => {
        const testEnv = { ...env };

        (exec.exec as vi.Mock).mockImplementation(
            async (command: string, args?: string[], options?: object) => {
                if (
                    command === "git" &&
                    args?.[0] === "clone" &&
                    args?.[1] === "--recursive"
                ) {
                    return Promise.resolve(0);
                }
                if (
                    command === "git" &&
                    args?.[0] === "-C" &&
                    args?.[2] === "rev-parse"
                ) {
                    // Simulate git rev-parse HEAD output
                    const stdout = options?.listeners?.stdout;
                    if (stdout) {
                        stdout(Buffer.from(`${commitHash}\n`));
                    }
                    return Promise.resolve(0);
                }
                return Promise.resolve(0);
            },
        );

        const result = await downloadRepository(
            repository,
            packageName,
            branch,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(true);
        expect(io.mkdirP).toHaveBeenCalledWith(downloadDir);
        expect(exec.exec).toHaveBeenCalledWith("git", [
            "clone",
            "--recursive",
            "--depth",
            "1",
            "--branch",
            branch,
            repoUrl,
            sourceDir,
        ]);
        expect(core.info).toHaveBeenCalledWith(`==> Repository: ${repository}`);
        expect(core.info).toHaveBeenCalledWith(`==> Branch: ${branch}`);
        expect(core.info).toHaveBeenCalledWith(
            `==> Repository cloned successfully to ${sourceDir}`,
        );
    });

    it("clones a tag successfully with submodules", async () => {
        const testEnv = { ...env };
        const testTag = "1.0.0";
        const testBranch = `refs/tags/${testTag}`;

        (exec.exec as vi.Mock).mockImplementation(
            async (command: string, args?: string[], options?: object) => {
                if (
                    command === "git" &&
                    args?.[0] === "clone" &&
                    args?.[1] === "--recursive"
                ) {
                    return Promise.resolve(0);
                }
                if (
                    command === "git" &&
                    args?.[0] === "-C" &&
                    args?.[2] === "rev-parse"
                ) {
                    const stdout = options?.listeners?.stdout;
                    if (stdout) {
                        stdout(Buffer.from(`${commitHash}\n`));
                    }
                    return Promise.resolve(0);
                }
                return Promise.resolve(0);
            },
        );

        const result = await downloadRepository(
            repository,
            packageName,
            testBranch,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(true);
        expect(exec.exec).toHaveBeenCalledWith("git", [
            "clone",
            "--recursive",
            "--depth",
            "1",
            "--branch",
            testTag,
            repoUrl,
            sourceDir,
        ]);
        expect(core.info).toHaveBeenCalledWith(`==> Tag: ${testTag}`);
    });

    it("clones a commit hash successfully with submodules", async () => {
        const testEnv = { ...env };

        (exec.exec as vi.Mock).mockResolvedValue(0);

        const result = await downloadRepository(
            repository,
            packageName,
            commitHash,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(true);
        expect(exec.exec).toHaveBeenCalledWith("git", [
            "clone",
            "--filter=blob:none",
            repoUrl,
            sourceDir,
        ]);
        expect(exec.exec).toHaveBeenCalledWith("git", [
            "-C",
            sourceDir,
            "checkout",
            commitHash,
        ]);
        expect(exec.exec).toHaveBeenCalledWith("git", [
            "-C",
            sourceDir,
            "submodule",
            "update",
            "--init",
            "--recursive",
        ]);
        expect(core.info).toHaveBeenCalledWith(`==> Hash: ${commitHash}`);
    });

    it("returns false if git clone fails for branch", async () => {
        const testEnv = { ...env };

        (exec.exec as vi.Mock).mockRejectedValueOnce(errorObject);

        const result = await downloadRepository(
            repository,
            packageName,
            branch,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(false);
        expect(core.warning).toHaveBeenCalledWith(
            `Error cloning repository ${repo}: ${errorObject.message}`,
        );
    });

    it("returns false if git checkout fails for commit hash", async () => {
        const testEnv = { ...env };

        (exec.exec as vi.Mock)
            .mockResolvedValueOnce(0) // Clone succeeds
            .mockRejectedValueOnce(errorObject); // Checkout fails

        const result = await downloadRepository(
            repository,
            packageName,
            commitHash,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(false);
        expect(core.warning).toHaveBeenCalledWith(
            `Error cloning repository ${repo}: ${errorObject.message}`,
        );
    });

    it("returns false if submodule update fails for commit hash", async () => {
        const testEnv = { ...env };

        (exec.exec as vi.Mock)
            .mockResolvedValueOnce(0) // Clone succeeds
            .mockResolvedValueOnce(0) // Checkout succeeds
            .mockRejectedValueOnce(errorObject); // Submodule update fails

        const result = await downloadRepository(
            repository,
            packageName,
            commitHash,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(false);
        expect(core.warning).toHaveBeenCalledWith(
            `Error cloning repository ${repo}: ${errorObject.message}`,
        );
    });

    it("extends environment object with dependency", async () => {
        const testEnv = { ...env };

        const expectedEnv = {
            ...testEnv,
            DEPENDENCIES: {
                [packageName]: commitHash,
            },
        };

        (exec.exec as vi.Mock).mockImplementation(
            async (command: string, args?: string[], options?: object) => {
                if (
                    command === "git" &&
                    args?.[0] === "clone" &&
                    args?.[1] === "--recursive"
                ) {
                    return Promise.resolve(0);
                }
                if (
                    command === "git" &&
                    args?.[0] === "-C" &&
                    args?.[2] === "rev-parse"
                ) {
                    const stdout = options?.listeners?.stdout;
                    if (stdout) {
                        stdout(Buffer.from(`${commitHash}\n`));
                    }
                    return Promise.resolve(0);
                }
                return Promise.resolve(0);
            },
        );

        const result = await downloadRepository(
            repository,
            packageName,
            branch,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(true);
        expect(testEnv).toStrictEqual(expectedEnv);
    });

    it("handles refs/heads/ prefix correctly", async () => {
        const testEnv = { ...env };
        const testBranch = `refs/heads/${branch}`;

        (exec.exec as vi.Mock).mockImplementation(
            async (command: string, args?: string[], options?: object) => {
                if (
                    command === "git" &&
                    args?.[0] === "clone" &&
                    args?.[1] === "--recursive"
                ) {
                    return Promise.resolve(0);
                }
                if (
                    command === "git" &&
                    args?.[0] === "-C" &&
                    args?.[2] === "rev-parse"
                ) {
                    const stdout = options?.listeners?.stdout;
                    if (stdout) {
                        stdout(Buffer.from(`${commitHash}\n`));
                    }
                    return Promise.resolve(0);
                }
                return Promise.resolve(0);
            },
        );

        const result = await downloadRepository(
            repository,
            packageName,
            testBranch,
            githubToken,
            downloadDir,
            testEnv,
        );

        expect(result).toBe(true);
        expect(exec.exec).toHaveBeenCalledWith("git", [
            "clone",
            "--recursive",
            "--depth",
            "1",
            "--branch",
            branch, // Should strip refs/heads/
            repoUrl,
            sourceDir,
        ]);
    });
});

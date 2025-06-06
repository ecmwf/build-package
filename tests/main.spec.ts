import * as core from "@actions/core";
import { describe, it, expect, vi } from "vitest";

import main from "../src/main";

import { setupEnv } from "../src/env-functions";
import { restoreCache, saveCache } from "../src/cache-functions";
import downloadArtifact from "../src/download-artifact";
import uploadArtifact from "../src/upload-artifact";
import downloadRepository from "../src/download-repository";
import buildPackage from "../src/build-package";
import { EnvironmentVariables } from "../src/types/env-functions";

vi.mock("@actions/core");
vi.mock("../src/env-functions");
vi.mock("../src/cache-functions");
vi.mock("../src/download-artifact");
vi.mock("../src/upload-artifact");
vi.mock("../src/download-repository");
vi.mock("../src/build-package");

const inputs: ActionInputs = {
    workspace: "/path/to/work/repo/repo",
    repository: "owner/repo",
    cmake: false,
    ecbundle: false,
    cmake_options: null,
    self_build: true,
    self_test: true,
    self_coverage: true,
    dependencies: ["owner/repo1", "owner/repo2", "owner/repo3"],
    dependency_branch: "develop",
    force_build: false,
    cache_suffix: null,
    recreate_cache: false,
    os: "ubuntu-22.04",
    compiler: "gnu-10",
    compiler_cc: "gcc-10",
    compiler_cxx: "g++-10",
    compiler_fc: "gfortran-10",
    github_token: "***",
    install_dir: "/path/to/install",
    download_dir: "/path/to/download",
    parallelism_factor: "2",
};

const outputs: ActionOutputs = {
    bin_path: "/path/to/install/repo2/bin:/path/to/install/repo2/bin",
    include_path:
        "/path/to/install/repo2/include:/path/to/install/repo2/include",
    install_path: "/path/to/install/repo2:/path/to/install/repo2",
    lib_path: "/path/to/install/repo2/lib:/path/to/install/repo2/lib",
    coverage_file: "/path/to/work/repo/repo/build/coverage.info",
};

const env: EnvironmentVariables = {
    BIN_PATH: outputs.bin_path,
    INCLUDE_PATH: outputs.include_path,
    INSTALL_PATH: outputs.install_path,
    LIB_PATH: outputs.lib_path,
    COVERAGE_FILE: outputs.coverage_file as string,
    COVERAGE_DIR: "/path/to/work/repo/repo/build/coverage",
};

const errorObject = new Error("Oops!");
const emptyObject = {};

describe("main", () => {
    it("resolves the promise if dependency artifacts are found", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValueOnce(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if dependency build is forced", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "force_build") return true;
            return inputs[inputName];
        });
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (restoreCache as vi.Mock).mockResolvedValueOnce(false);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (saveCache as vi.Mock).mockResolvedValueOnce(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if cached dependencies are found", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(false);
        (restoreCache as vi.Mock).mockResolvedValueOnce(true);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if restoring cache is being skipped", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "recreate_cache") return true;
            return inputs[inputName];
        });
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(false);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (saveCache as vi.Mock).mockResolvedValueOnce(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if dependencies are built", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(false);
        (restoreCache as vi.Mock).mockResolvedValueOnce(false);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (saveCache as vi.Mock).mockResolvedValueOnce(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if cmake options are passed", async () => {
        expect.assertions(2);

        const cmakeOptions = '-DCMAKE_VAR=1 -DJSON_VAR={"key": "value"}';

        const testCmakeOptions = cmakeOptions.replace(/^['"]|['"]$/g, "");

        const testEnv = {
            ...env,
        };

        (core.getInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "cmake_options") return cmakeOptions;
            return inputs[inputName];
        });
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(true);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
        expect(buildPackage).toHaveBeenCalledWith(
            inputs.repository,
            "repo",
            inputs.workspace,
            `${inputs.install_dir}/repo`,
            inputs.cmake,
            inputs.ecbundle,
            testCmakeOptions,
            undefined,
            inputs.self_test,
            inputs.self_coverage,
            inputs.os,
            inputs.compiler,
            testEnv,
            inputs.parallelism_factor,
            inputs.github_token,
            undefined,
            undefined,
            undefined,
        );
    });

    it("resolves the promise if dependency cmake options are passed", async () => {
        expect.assertions(4);

        const dependencyCmakeOptions = [
            'owner/repo1: "--DOPT1=ON -DOPT2=OFF"',
            "owner/repo3: --DOPT3=ON",
        ];

        const testDependencyCmakeOptions1 = dependencyCmakeOptions[0]
            .split(/:\s?(.+)/)[1]
            .replace(/^['"]|['"]$/g, "");
        const testDependencyCmakeOptions2 = undefined;
        const testDependencyCmakeOptions3 = dependencyCmakeOptions[1]
            .split(/:\s?(.+)/)[1]
            .replace(/^['"]|['"]$/g, "");

        const testEnv = {
            ...env,
        };

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "dependency_cmake_options")
                return dependencyCmakeOptions;
            return inputs[inputName];
        });

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValue(false);
        (restoreCache as vi.Mock).mockResolvedValueOnce(false);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
        expect(buildPackage).toHaveBeenCalledWith(
            inputs.dependencies[0],
            "repo1",
            `${inputs.download_dir}/repo1`,
            `${inputs.install_dir}/repo1`,
            inputs.cmake,
            inputs.ecbundle,
            testDependencyCmakeOptions1,
            null,
            false,
            false,
            inputs.os,
            inputs.compiler,
            testEnv,
            inputs.parallelism_factor,
            inputs.github_token,
            undefined,
            undefined,
            undefined,
        );
        expect(buildPackage).toHaveBeenCalledWith(
            inputs.dependencies[1],
            "repo2",
            `${inputs.download_dir}/repo2`,
            `${inputs.install_dir}/repo2`,
            inputs.cmake,
            inputs.ecbundle,
            testDependencyCmakeOptions2,
            null,
            false,
            false,
            inputs.os,
            inputs.compiler,
            testEnv,
            inputs.parallelism_factor,
            inputs.github_token,
            undefined,
            undefined,
            undefined,
        );
        expect(buildPackage).toHaveBeenCalledWith(
            inputs.dependencies[2],
            "repo3",
            `${inputs.download_dir}/repo3`,
            `${inputs.install_dir}/repo3`,
            inputs.cmake,
            inputs.ecbundle,
            testDependencyCmakeOptions3,
            null,
            false,
            false,
            inputs.os,
            inputs.compiler,
            testEnv,
            inputs.parallelism_factor,
            inputs.github_token,
            undefined,
            undefined,
            undefined,
        );
    });

    it("resolves the promise if build is skipped", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "self_build") return false;
            return inputs[inputName];
        });
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(true);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if code coverage is skipped", async () => {
        expect.assertions(1);

        const testEnv: EnvironmentVariables = {
            ...env,
        };

        delete testEnv.COVERAGE_FILE;
        delete testEnv.COVERAGE_DIR;

        const expectedOutputs = {
            ...outputs,
        };

        delete expectedOutputs.coverage_file;

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "self_coverage") return false;
            return inputs[inputName];
        });
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(testEnv);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(true);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(expectedOutputs);
    });

    it("resolves the promise if saving built dependency to cache fails", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(false);
        (restoreCache as vi.Mock).mockResolvedValueOnce(false);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (saveCache as vi.Mock).mockResolvedValueOnce(false);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(true);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if package artifact upload fails", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(true);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (uploadArtifact as vi.Mock).mockResolvedValueOnce(false);

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("resolves the promise if code coverage artifact upload fails", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(true);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockResolvedValue(true);
        (uploadArtifact as vi.Mock).mockImplementationOnce((repository) => {
            if (repository === "coverage-repo") return false;
            return true;
        });

        await expect(main()).resolves.toStrictEqual(outputs);
    });

    it("rejects the promise if dependency cmake options are not in expected format", async () => {
        expect.assertions(1);

        const dependencyCmakeOptions = ['owner/repo1 "-DCMAKE_VAR=1"'];

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "dependency_cmake_options")
                return dependencyCmakeOptions;
            return inputs[inputName];
        });

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);

        await expect(main()).rejects.toBe(
            `Unexpected CMake option, must be in 'packageName: option' format: ${dependencyCmakeOptions[0]}`,
        );

        (setupEnv as vi.Mock).mockReset();
    });

    it("rejects the promise if environment setup errors out", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(undefined);

        await expect(main()).rejects.toBe("Error setting up build environment");
    });

    it("rejects the promise if dependency name is in unexpected format", async () => {
        expect.assertions(1);

        const unexpectedDependencyName = "owner-repo@branch";

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation((inputName) => {
            if (inputName === "dependencies") return [unexpectedDependencyName];
            return inputs[inputName];
        });

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);

        await expect(main()).rejects.toBe(
            `Unexpected dependency name, must be in '[packageName:]owner/repo[@branch]' format: ${unexpectedDependencyName}`,
        );
    });

    it("rejects the promise if dependency repository download fails", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(false);
        (restoreCache as vi.Mock).mockResolvedValueOnce(false);
        (downloadRepository as vi.Mock).mockResolvedValueOnce(false);

        await expect(main()).rejects.toBe("Error downloading repository");
    });

    it("rejects the promise if dependency is not built", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(false);
        (restoreCache as vi.Mock).mockResolvedValueOnce(false);
        (downloadRepository as vi.Mock).mockResolvedValueOnce(true);
        (buildPackage as vi.Mock).mockResolvedValueOnce(false);

        await expect(main()).rejects.toBe("Error building dependency");
    });

    it("rejects the promise if package build fails", async () => {
        expect.assertions(1);

        (core.getInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getBooleanInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );
        (core.getMultilineInput as vi.Mock).mockImplementation(
            (inputName) => inputs[inputName],
        );

        (setupEnv as vi.Mock).mockResolvedValueOnce(env);
        (downloadArtifact as vi.Mock).mockResolvedValueOnce(true);
        (downloadRepository as vi.Mock).mockResolvedValue(true);
        (buildPackage as vi.Mock).mockImplementation((repository) => {
            if (repository === "owner/repo") return false;
            return true;
        });

        await expect(main()).rejects.toBe("Error building package");
    });

    it.each`
        error
        ${errorObject}
        ${emptyObject}
    `(
        "rejects the promise if an error is thrown ($error)",
        async ({ error }) => {
            expect.assertions(1);

            (core.getInput as vi.Mock).mockImplementation(
                (inputName) => inputs[inputName],
            );
            (core.getBooleanInput as vi.Mock).mockImplementation(
                (inputName) => inputs[inputName],
            );
            (core.getMultilineInput as vi.Mock).mockImplementation(
                (inputName) => inputs[inputName],
            );

            (setupEnv as vi.Mock).mockImplementationOnce(() => {
                throw error;
            });

            await expect(main()).rejects.toBe(error.message);
        },
    );
});

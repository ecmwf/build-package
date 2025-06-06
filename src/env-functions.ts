import * as process from "process";
import * as core from "@actions/core";
import * as exec from "@actions/exec";

import { isError } from "./helper-functions";

import { EnvironmentVariables } from "./types/env-functions";

/**
 * Returns local environment variables:
 *
 *   CC
 *   CXX
 *   FC
 *   CMAKE_VERSION
 *   OPENSSL_ROOT_DIR
 *   OPENSSL_INCLUDE_DIR
 *
 * @param {string} os Current OS platform.
 * @param {string|null} compilerCc C compiler alias.
 * @param {string|null} compilerCxx C++ compiler alias.
 * @param {string} compilerFc Fortran compiler alias.
 * @returns {Promise<EnvironmentVariables>} Environment object with keys as variable names.
 */
export const setupEnv = async (
    os: string,
    compilerCc: string | null,
    compilerCxx: string | null,
    compilerFc: string,
): Promise<EnvironmentVariables> => {
    core.startGroup("Setup Environment");

    const env: EnvironmentVariables = {
        CC: compilerCc,
        CXX: compilerCxx,
        FC: compilerFc,
    };

    core.info(`==> Compiler env: ${JSON.stringify(env)}`);

    let output = "{}";

    const options: exec.ExecOptions = {
        listeners: {
            stdout: (data) => {
                output = data.toString();
            },
        },
    };

    // Get CMake command capabilities output in JSON format.
    let exitCode = await exec.exec(
        "env",
        ["cmake", "-E", "capabilities"],
        options,
    );

    if (isError(exitCode, "CMake capabilities command failed")) return env;

    let cMakeVersion;

    try {
        const json = JSON.parse(output);
        cMakeVersion = json.version.string;
    } catch (error) {
        if (error instanceof Error)
            isError(
                true,
                `CMake capabilities JSON parsing failed: ${error.message}`,
            );
        return env;
    }

    if (isError(!cMakeVersion, "CMake version string not found")) return env;

    env.CMAKE_VERSION = cMakeVersion;

    core.info(`==> CMake version: ${env.CMAKE_VERSION}`);

    // On macOS, linking against system OpenSSL library is not permitted.
    //   Instead, we link against the Homebrew version. Here we prepare necessary environment variables.
    if (/^macos-/.test(os)) {
        output = "";
        exitCode = await exec.exec(
            "env",
            ["brew", "--prefix", "openssl"],
            options,
        );

        if (isError(exitCode, "Homebrew command failed")) return env;

        if (isError(!output, "Homebrew OpenSSL prefix not found")) return env;

        const openSslDir = output.replace(/\n$/, "");

        env.OPENSSL_ROOT_DIR = openSslDir;
        env.OPENSSL_INCLUDE_DIR = `${openSslDir}/include`;

        core.info(`==> OpenSSL prefix: ${env.OPENSSL_ROOT_DIR}`);
    }

    core.endGroup();

    return env;
};

/**
 * Extends environment object with installation paths.
 *
 * @param {EnvironmentVariables|null} env Environment object.
 * @param {string} installDir Path to installation directory.
 * @param {string} packageName Package name.
 */
export const extendPaths = async (
    env: EnvironmentVariables | null,
    installDir: string,
    packageName: string,
) => {
    if (!env) return;

    if (env.PATH) {
        env.PATH = `${installDir}/bin:${env.PATH}`;
    } else if (process.env.PATH) {
        env.PATH = `${installDir}/bin:${process.env.PATH}`;
    } else {
        env.PATH = `${installDir}/bin`;
    }

    core.info(`==> Extended local PATH variable to include ${installDir}/bin`);

    if (env.BIN_PATH) {
        env.BIN_PATH = `${installDir}/bin:${env.BIN_PATH}`;
    } else {
        env.BIN_PATH = `${installDir}/bin`;
    }

    if (env.INCLUDE_PATH) {
        env.INCLUDE_PATH = `${installDir}/include:${env.INCLUDE_PATH}`;
    } else {
        env.INCLUDE_PATH = `${installDir}/include`;
    }

    if (env.INSTALL_PATH) {
        env.INSTALL_PATH = `${installDir}:${env.INSTALL_PATH}`;
    } else {
        env.INSTALL_PATH = installDir;
    }

    if (env.LIB_PATH) {
        env.LIB_PATH = `${installDir}/lib:${installDir}/lib64:${env.LIB_PATH}`;
    } else {
        env.LIB_PATH = `${installDir}/lib:${installDir}/lib64`;
    }

    // Define common package path variables:
    // - packageName_DIR
    // - PACKAGENAME_DIR
    // - PACKAGENAME_PATH
    env[`${packageName}_DIR`] = installDir;
    env[`${packageName.toUpperCase()}_DIR`] = installDir;
    env[`${packageName.toUpperCase()}_PATH`] = installDir;
};

/**
 * Extends environment object with dependencies.
 *
 * @param {EnvironmentVariables|null} env Environment object.
 * @param {string} repository Github repository owner and name.
 * @param {string} sha Github repository commit SHA.
 */
export const extendDependencies = async (
    env: EnvironmentVariables | null,
    packageName: string,
    sha: string,
) => {
    if (!env) return;

    if (env.DEPENDENCIES instanceof Object) {
        Object.assign(env.DEPENDENCIES, {
            ...env.DEPENDENCIES,
            [packageName]: sha,
        });
    } else {
        env.DEPENDENCIES = {
            [packageName]: sha,
        };
    }

    core.info(
        `==> Extended list of dependencies to include ${packageName}: ${sha}`,
    );
};

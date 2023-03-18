import { homedir } from "node:os";
import { join } from "node:path";
import * as action from "@actions/core";
import { downloadTool } from "@actions/tool-cache";
import * as cache from "@actions/cache";
import { restoreCache, saveCache } from "@actions/cache";
import { getExecOutput, exec } from "@actions/exec";

const INSTALLER_URL = "https://install.determinate.systems/nix";
const NIX_DIR = join(homedir(), ".nix-profile");
const NIX_INSTALL_DIR = "/nix";

export default async (): Promise<{
  nixVersion: string;
  floxVersion: string;
  cacheHit: boolean;
}> => {
  // throw error on unsupported platforms (windows)
  if (process.platform === "win32") {
    throw new Error("Flox is not supported on Windows");
  }
  const cacheKey = `floxcache-${process.platform}-${process.arch}`;
  const cacheEnabled = cache.isFeatureAvailable();
  let cacheHit = false;
  let nixVersion: string | undefined;
  let floxVersion: string | undefined;

  if (cacheEnabled) {
    const cacheRestored = await restoreCache(
      [NIX_DIR, NIX_INSTALL_DIR],
      cacheKey
    );
    if (cacheRestored) {
      floxVersion = await verifyFlox();
      if (floxVersion) {
        cacheHit = true;
        action.info("Flox was restored from cache");
      } else {
        action.warning("Flox was not restored from cache");
      }
      nixVersion = await verifyNix();
      if (nixVersion) {
        cacheHit = true;
        action.info("Nix was restored from cache");
      } else {
        action.warning("Nix was not restored from cache");
      }
    }
  }

  if (!cacheHit) {
    action.info("Downloading a new version of Nix");
    const installerPath = await downloadTool(INSTALLER_URL);

    action.info("Installing Nix");
    await exec("chmod", ["a+x", installerPath]);
    await getExecOutput(installerPath, ["install", "--no-confirm"]);
    await exec("sudo", [
      "chmod",
      "a+x",
      "/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh",
    ]);
    await exec("/nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh");

    action.info("Installing Flox");
    await exec("/bin/bash", [
      "-c",
      "yes | nix profile install --impure 'github:flox/floxpkgs#flox.fromCatalog' --accept-flake-config",
    ]);
    nixVersion = await verifyNix();
    floxVersion = await verifyFlox();
    if (!nixVersion) {
      throw new Error("Nix was not installed correctly");
    }

    if (cacheEnabled) {
      action.info("Saving Nix to cache");
      await saveCache([NIX_DIR, NIX_INSTALL_DIR], cacheKey);
    }

    if (!floxVersion) {
      throw new Error("Flox was not installed correctly");
    }
  }
  return { nixVersion, floxVersion, cacheHit };
};

async function verifyNix(): Promise<string | undefined> {
  const { exitCode, stdout } = await getExecOutput("nix", ["--version"]);
  return exitCode === 0 ? stdout.trim() : undefined;
}

async function verifyFlox(): Promise<string | undefined> {
  const { exitCode, stdout } = await getExecOutput("flox", ["--version"]);
  return exitCode === 0 ? stdout.trim() : undefined;
}

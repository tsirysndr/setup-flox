import { homedir } from "node:os";
import { join } from "node:path";
import * as action from "@actions/core";
import * as cache from "@actions/cache";
import { restoreCache, saveCache } from "@actions/cache";
import { getExecOutput, exec } from "@actions/exec";
const NIX_DIR = join(homedir(), ".nix-profile");
const NIX_INSTALL_DIR = "/nix";
export default async () => {
    // throw error on unsupported platforms (windows)
    if (process.platform === "win32") {
        throw new Error("Flox is not supported on Windows");
    }
    const cacheKey = `floxcache-${process.platform}-${process.arch}`;
    const cacheEnabled = cache.isFeatureAvailable();
    let cacheHit = false;
    let version;
    if (cacheEnabled) {
        const cacheRestored = await restoreCache([NIX_DIR, NIX_INSTALL_DIR], cacheKey);
        if (cacheRestored) {
            version = await verifyFlox();
            if (version) {
                cacheHit = true;
                action.info("Flox was restored from cache");
            }
            else {
                action.warning("Flox was not restored from cache");
            }
        }
    }
    if (!cacheHit) {
        action.info("Installing Flox");
        await exec("sudo", [
            "bash",
            "-c",
            "yes | nix profile install --impure 'github:flox/floxpkgs#flox.fromCatalog' --accept-flake-config",
        ]);
        version = await verifyFlox();
        if (cacheEnabled) {
            action.info("Saving Nix to cache");
            await saveCache([NIX_DIR, NIX_INSTALL_DIR], cacheKey);
        }
        if (!version) {
            throw new Error("Flox was not installed correctly");
        }
    }
    return { version, cacheHit };
};
async function verifyFlox() {
    const { exitCode, stdout } = await getExecOutput("flox", ["--version"]);
    return exitCode === 0 ? stdout.trim() : undefined;
}

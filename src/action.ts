import { tmpdir } from "node:os";
import * as action from "@actions/core";
import setup from "./setup.js";

if (!process.env.RUNNER_TEMP) {
  process.env.RUNNER_TEMP = tmpdir();
}

setup()
  .then(({ nixVersion, floxVersion }) => {
    action.setOutput("nix-version", nixVersion);
    action.setOutput("flox-version", floxVersion);
  })
  .catch((error) => {
    action.setFailed(error.message);
  });

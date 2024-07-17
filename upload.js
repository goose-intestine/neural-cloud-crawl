import fs from "node:fs/promises";
import { fork } from "node:child_process";
import os from "node:os";

import chalk from "chalk";
import cliProgress from "cli-progress";
import { Octokit } from "@octokit/core";
import "dotenv/config";

import { DefaultValues } from "./defaultValues.js";

const numCPUs = os.cpus().length;

// create new container
const multibar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: `${chalk.blueBright("{bar}")} | {name} | ${chalk.yellow(
      "{value}"
    )}/{total}`,
  },
  cliProgress.Presets.rect
);

const octokit = new Octokit({
  auth: DefaultValues.githubToken,
});

// TODO: use oca, cli-progress & cli-spinner make it fansy!
// TODO: upload by child_process
const upload = async (keyword) => {
  console.log(chalk.yellow("Uploading Image to Github..."));

  const filePath = `images/${keyword}`;

  const subFiles = await fs.readdir(filePath);

  for (const subFile of subFiles) {
    const subFilePath = `${filePath}/${subFile}`;

    const images = await fs.readdir(subFilePath);

    for (const [index, image] of images.entries()) {
      const imagePath = `${subFilePath}/${image}`;

      console.log(imagePath);
      // try {
      //   await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
      //     owner: "goose-intestine",
      //     repo: "neural-cloud-crawl",
      //     path: `images/${keyword}/${subFile}/${image}`,
      //     headers: {
      //       "X-GitHub-Api-Version": "2022-11-28",
      //       accept: "application/vnd.github.object+json",
      //     },
      //     ref: "gh-pages",
      //   });
      // } catch (e) {
      //   const imageFile = await fs.readFile(imagePath);

      //   await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
      //     owner: "goose-intestine",
      //     repo: "neural-cloud-crawl",
      //     path: `images/${keyword}/${subFile}/${image}`,
      //     message: `Upload image ${image}`,
      //     content: imageFile.toString("base64"),
      //     headers: {
      //       "X-GitHub-Api-Version": "2022-11-28",
      //       accept: "application/vnd.github.object+json",
      //     },
      //     branch: "gh-pages",
      //   });
      // }
    }
  }
};

await upload("表情包");

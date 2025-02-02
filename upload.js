import fs from "node:fs/promises";

import chalk from "chalk";
import cliProgress from "cli-progress";

import { Octokit } from "@octokit/core";
import "dotenv/config";

import { DefaultValues } from "./defaultValues.js";

const octokit = new Octokit({
  auth: DefaultValues.githubToken,
});

let totalFileNo = 0;

const upload = async (keyword, headless = false) => {
  let multibar;

  if (!headless) {
    // create new container
    multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: `${chalk.blueBright("{bar}")} | {name} | ${chalk.yellow(
          "{value}"
        )}/{total}`,
      },
      cliProgress.Presets.rect
    );
  }

  const filePath = `images/${keyword}`;

  const subFiles = await fs.readdir(filePath);

  const owner = "goose-intestine";
  const repo = "neural-cloud-crawl";
  const branch = "gh-pages";

  for (const subFile of subFiles) {
    const subFilePath = `${filePath}/${subFile}`;

    const images = await fs.readdir(subFilePath);
    totalFileNo += images.length;
  }

  console.log(chalk.yellow("Uploading images to Github..."));

  let subProgressBar;
  let totalProgressBar;

  if (!headless) {
    subProgressBar = multibar.create(0, 0, {
      name: "N/A",
    });
    totalProgressBar = multibar.create(totalFileNo, 0, {
      name: "Total",
    });
  }

  for (const subFile of subFiles) {
    const subFilePath = `${filePath}/${subFile}`;

    const images = await fs.readdir(subFilePath);
    const filesToPush = [];

    if (!headless) {
      subProgressBar.setTotal(images.length);
      subProgressBar.update(0, { name: subFile });
    }

    for (const image of images) {
      const imagePath = `${subFilePath}/${image}`;

      try {
        await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
          owner,
          repo,
          path: `${subFilePath}/${image}`,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
          ref: branch,
        });
      } catch (e) {
        const imageFile = await fs.readFile(imagePath, { encoding: "base64" });

        filesToPush.push({
          path: `${subFilePath}/${image}`,
          content: imageFile,
        });
      }

      if (!headless) {
        subProgressBar.increment();
      }
    }

    if (filesToPush.length > 0) {
      // Function to create blobs for multiple files
      const createBlobShas = await Promise.all(
        filesToPush.map(async (fileToPush) => {
          const data = await octokit.request(
            "POST /repos/{owner}/{repo}/git/blobs",
            {
              owner,
              repo,
              content: fileToPush.content,
              encoding: "base64",
              headers: {
                "X-GitHub-Api-Version": "2022-11-28",
                accept: "application/vnd.github.object+json",
              },
            }
          );

          return data.data.sha;
        })
      );

      // Get the current branch reference
      const currentCommitRefResponse = await octokit.request(
        "GET /repos/{owner}/{repo}/git/ref/{ref}",
        {
          owner,
          repo,
          ref: `heads/${branch}`,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
        }
      );
      const currentCommitSha = currentCommitRefResponse.data.object.sha;
      // console.log(currentCommitSha);

      // Get the sha of the root tree on the commit retrieved previously
      const getRootTreeResponse = await octokit.request(
        "GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
        {
          owner,
          repo,
          commit_sha: currentCommitSha,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
        }
      );
      const rootTreeSha = getRootTreeResponse.data.tree.sha;
      // console.log(rootTreeSha);

      // Create a new tree with the files
      const createTreeResponse = await octokit.request(
        "POST /repos/{owner}/{repo}/git/trees",
        {
          owner,
          repo,
          base_tree: rootTreeSha,
          tree: filesToPush.map((file, index) => ({
            path: file.path,
            mode: "100644",
            type: "blob",
            sha: createBlobShas[index],
          })),
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
        }
      );
      const newTreeSha = createTreeResponse.data.sha;
      // console.log(newTreeSha);

      // Create a new commit with the tree and the last commit's tree SHA
      const createCommitResponse = await octokit.request(
        "POST /repos/{owner}/{repo}/git/commits",
        {
          owner,
          repo,
          message: `Upload images - ${keyword}/${subFile}`,
          tree: newTreeSha,
          parents: [currentCommitSha],
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
        }
      );
      const commitSha = createCommitResponse.data.sha;
      // console.log(commitSha);

      // Update the branch reference with the new commit
      await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: commitSha,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
          accept: "application/vnd.github.object+json",
        },
      });
    }

    if (!headless) {
      totalProgressBar.increment(images.length);
    }
  }

  if (!headless) {
    multibar.stop();
  }
  console.log(chalk.green("Upload completed."));
  return;
};

export { upload };

import fs from "node:fs/promises";

import { Octokit } from "@octokit/core";
import "dotenv/config";

import { DefaultValues } from "./defaultValues.js";
import { sleep } from "./utils.js";

const octokit = new Octokit({
  auth: DefaultValues.githubToken,
});

const upload = async (keyword) => {
  const filesToPush = [];

  const filePath = `./images/${keyword}/`;

  const subFiles = await fs.readdir(filePath);

  for (const subFile of subFiles) {
    const subFilePath = `${filePath}/${subFile}`;

    const images = await fs.readdir(subFilePath);

    for (const image of images) {
      const imagePath = `${subFilePath}/${image}`;

      try {
        await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
          owner: "goose-intestine",
          repo: "neural-cloud-crawl",
          path: `images/${keyword}/${subFile}/${image}`,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
          ref: "gh-pages",
        });
      } catch (e) {
        console.log(`images/${keyword}/${subFile}/${image} not found`);
        const imageFile = await fs.readFile(imagePath);

        filesToPush.push({
          path: `images/${keyword}/${subFile}/${image}`,
          content: imageFile.toString("base64"),
        });
      }
    }
  }

  // Create files
  const treeData = filesToPush.map((file) => ({
    path: file.path,
    mode: "100644",
    type: "blob",
    content: file.content,
  }));

  // Get the current branch reference
  const branchHeadResponse = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/{ref}",
    {
      owner: "goose-intestine",
      repo: "neural-cloud-crawl",
      ref: "heads/gh-pages",
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const branchHeadSha = branchHeadResponse.data.object.sha;
  console.log(branchHeadSha);

  // Create a new tree with the files
  const createTreeResponse = await octokit.request(
    "POST /repos/{owner}/{repo}/git/trees",
    {
      owner: "goose-intestine",
      repo: "neural-cloud-crawl",
      tree: treeData,
      base_tree: branchHeadSha,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const treeSha = createTreeResponse.data.sha;
  console.log(treeSha);

  // Create a new commit with the tree
  const createCommitResponse = await octokit.request(
    "POST /repos/{owner}/{repo}/git/commits",
    {
      owner: "goose-intestine",
      repo: "neural-cloud-crawl",
      message: "Add new images",
      tree: treeSha,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  const commitSha = createCommitResponse.data.sha;
  console.log(commitSha);

  // Update the branch reference with the new commit
  await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
    owner: "goose-intestine",
    repo: "neural-cloud-crawl",
    ref: "heads/gh-pages",
    sha: commitSha,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
};

await upload("表情包");

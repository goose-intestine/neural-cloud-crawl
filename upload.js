import fs from "node:fs/promises";

import { Octokit } from "@octokit/core";
import "dotenv/config";

import { DefaultValues } from "./defaultValues.js";
import { sleep } from "./utils.js";

const octokit = new Octokit({
  auth: DefaultValues.githubToken,
});

const upload = async (keyword) => {
  const filePath = `./image/${keyword}/`;

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
          path: `image/${keyword}/${subFile}/${image}`,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
          ref: "gh-pages",
        });
      } catch (e) {
        const imageFile = await fs.readFile(imagePath);

        await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
          owner: "goose-intestine",
          repo: "neural-cloud-crawl",
          path: `image/${keyword}/${subFile}/${image}`,
          message: "Upload image",
          content: imageFile.toString("base64"),
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            accept: "application/vnd.github.object+json",
          },
          ref: "gh-pages",
        });
      }
    }
  }
};

await upload("表情包");

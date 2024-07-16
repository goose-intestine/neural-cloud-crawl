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

  console.log(files);

  for (const subFile of subFiles) {
    const subFilePath = `${filePath}/${subFile}`;

    const images = await fs.readdir(subFilePath);

    for (const image of images) {
      const imagePath = `${subFilePath}/${image}`;

      await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner: "goose-intestine",
        repo: "neural-cloud-crawl",
        path: "images",
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
          accept: "application/vnd.github.object+json",
        },
        ref: "gh-pages",
      });
    }
  }

  // for (const file of files) {
  //   const filePath = stickerPath + file;

  //   const image = await fs.readFile(filePath);

  //   await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
  //     owner: "goose-intestine",
  //     repo: "neural-cloud-crawl",
  //     path: `resources/character/${keyword}/${file}`,
  //     message: "Upload character image",
  //     content: image.toString("base64"),
  //   });

  //   await sleep(1000);
  // }
};

await upload("表情包");


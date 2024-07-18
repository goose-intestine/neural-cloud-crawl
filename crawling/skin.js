import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";

import puppeteer from "puppeteer";
import { Octokit } from "@octokit/core";

import { DefaultValues } from "../defaultValues.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let browser;

// Octokit Client
const octokit = new Octokit({
  auth: DefaultValues.githubToken,
});

const getCharacterListResponse = await octokit.request(
  "GET /repos/{owner}/{repo}/contents/{path}",
  {
    owner: "goose-intestine",
    repo: "neural-cloud-crawl",
    path: "resources/character.json",
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
      accept: "application/vnd.github.object+json",
    },
    ref: "gh-pages",
  }
);

const characterList = JSON.parse(
  Buffer.from(getCharacterListResponse.data.content, "base64").toString("utf-8")
);
const characterNameList = characterList.map((c) => c.name);

const domain = "http://wiki.42lab.cloud";

let allSkinList = [];
let skinThemeList = [];
let allSkinSortByTheme = [];

try {
  browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
  });

  const page1 = await browser.newPage();

  await page1.setViewport({ width: 800, height: 800 });
  await page1.setRequestInterception(true);

  page1.on("request", (request) => {
    if (
      request.resourceType() === "image" ||
      request.resourceType() === "font"
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });

  for (const characterName of characterNameList) {
    await page1.goto(`${domain}/w/${characterName}`);

    const skinList = await page1.evaluate(() => {
      const sPhotoList = Array.from(
        document.querySelectorAll("div.skin > img")
      );

      const sNameList = Array.from(
        document.querySelectorAll("div.skin-list b")
      );

      const sThemeList = Array.from(
        document.querySelectorAll("div.skin-list span")
      );

      return sPhotoList.map((sPhoto, index) => {
        return {
          url: sPhoto.getAttribute("src"),
          name: sNameList[index].textContent,
          theme: sThemeList[index].textContent,
        };
      });
    });

    const processedSkinList = skinList.map((s) => {
      return {
        ...s,
        character: characterName,
      };
    });

    allSkinList = [...allSkinList, ...processedSkinList];
  }

  skinThemeList = [...new Set(allSkinList.map((s) => s.theme))];
  allSkinList = allSkinList.map((s) => {
    return {
      ...s,
      url: `${domain}${s.url}`,
      theme: s.theme,
    };
  });

  for (const theme of skinThemeList) {
    const filteredSkinList = allSkinList.filter((skin) => {
      return skin.theme === theme;
    });

    const tempList = filteredSkinList.map((skin) => {
      return {
        name: `${skin.character}-${skin.name}`,
        url: skin.url,
      };
    });

    allSkinSortByTheme.push({ name: theme, photoUrlList: tempList });
  }
} catch (e) {
  console.log(e);
}

await browser.close();

const directoryPath = path.join(__dirname, "../resources");

try {
  await fs.access(directoryPath);
} catch (e) {
  await fs.mkdir(directoryPath);
}

await fs.writeFile(
  `${directoryPath}/skinTheme.json`,
  JSON.stringify(skinThemeList)
);

const keyword = "心智投影";

const indexPath = path.join(__dirname, `../index`);

try {
  await fs.access(indexPath);
} catch (e) {
  await fs.mkdir(indexPath);
}

await fs.writeFile(
  `${indexPath}/${keyword}.txt`,
  JSON.stringify(allSkinSortByTheme),
  {
    encoding: "utf-8",
  }
);

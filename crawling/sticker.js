import fs from "node:fs/promises";

import chalk from "chalk";
import puppeteer from "puppeteer-core";
import { Octokit } from "@octokit/core";
import cliSpinners from "cli-spinners";
import ora from "ora";
import "dotenv/config";

import { download } from "../download-parent.js";
import { upload } from "../upload.js";
import { sleep } from "../utils.js";
import { DefaultValues } from "../defaultValues.js";

let browser;

let browserLaunchSpinner, fetchPostSpinner, fetchImageSpinner;

const searchKeyword = "表情包";

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

const getEventListResponse = await octokit.request(
  "GET /repos/{owner}/{repo}/contents/{path}",
  {
    owner: "goose-intestine",
    repo: "neural-cloud-crawl",
    path: "resources/event.json",
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
      accept: "application/vnd.github.object+json",
    },
    ref: "gh-pages",
  }
);

const eventList = JSON.parse(
  Buffer.from(getEventListResponse.data.content, "base64").toString("utf-8")
);

try {
  // const browserURL = "http://127.0.0.1:9223";
  // const browser = await puppeteer.connect({
  //   browserURL,
  // });

  browserLaunchSpinner = ora({
    text: chalk.yellow("Launching browser..."),
    spinner: cliSpinners.circleHalves,
  }).start();

  // Launch the browser and open a new blank page
  browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
    executablePath: `${process.env.CHROME_PATH}`,
    args: [
      `--user-data-dir=${process.env.PROFILE_PATH}`,
      `--profile-directory=${process.env.PROFILE_NAME}`,
    ],
  });

  browserLaunchSpinner.succeed(chalk.green("Launching browser..."));

  fetchPostSpinner = ora({
    text: chalk.yellow("Fetching post's url..."),
    spinner: cliSpinners.circleHalves,
  }).start();

  const domain = "https://nga.178.com";

  const page1 = await browser.newPage();

  // Navigate the page to a URL.
  await page1.goto(`${domain}/thread.php?stid=29111018`);

  const searchInput = await page1.waitForSelector(
    "#mainmenu > div > div > div.right > div:nth-child(4) > span > input"
  );
  // Set screen size.
  await page1.setViewport({ width: 1920, height: 1080 });

  await page1.click(
    "#mainmenu > div > div > div.right > div:nth-child(4) > span > input"
  );

  await searchInput.type(searchKeyword);
  await page1.keyboard.press("Enter");

  await sleep(2000);

  const pageList = await browser.pages();
  const page2 = pageList[2];
  page2.bringToFront();

  const postList = [];

  // Fetch search result pages
  const searchResultUrls = await page2.evaluate(() => {
    const searchPages = Array.from(document.querySelectorAll("#pagebbtm a"));

    return [
      ...new Set(
        searchPages.map((searchPage) => searchPage.getAttribute("href"))
      ),
    ].filter((link) => !link.includes("javascript:void(0)"));
  });

  // Fetch post's url
  for (const navLink of searchResultUrls) {
    if (page2.url() !== `${domain}${navLink}`) {
      await page2.goto(`${domain}${navLink}`);
    }

    await page2.waitForSelector("#pagebbtm");

    const data = await page2.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll("#topicrows tr > td.c2 > a")
      );

      return links.map((link) => {
        if (link.textContent.includes("欢迎教授下载使用")) {
        }

        return {
          title: link.textContent
            .replace("[微博拌匀]", "")
            .replace("[云图计划]", ""),
          url: link.getAttribute("href"),
        };
      });
    });

    postList.push(...data);
  }

  fetchPostSpinner.succeed(chalk.green("Fetching post's url..."));

  const photoListToDownload = [];

  // const post = postList[0];
  // await page2.goto(post.url);
  // await page2.waitForSelector("#post1strow0");

  // const photos = await page2.evaluate(() => {
  //   const photoList = Array.from(
  //     document.querySelectorAll("#post1strow0 > td.c2 > span > p > img")
  //   );

  //   return photoList
  //     .map((photo) => photo.getAttribute("data-srclazy"))
  //     .filter((photoUrl) => {
  //       return !(!photoUrl || photoUrl === "" || photoUrl === null);
  //     });
  // });

  // let characterName = post.title;

  // for (const name of characterList) {
  //   if (post.title.includes(name)) {
  //     characterName = name;
  //     break;
  //   }
  // }

  // photoListToDownload.push({
  //   name: characterName,
  //   photoUrlList: photos,
  // });

  // Fetch image's urls from posts
  fetchImageSpinner = ora({
    text: chalk.yellow("Fetching image's url..."),
    spinner: cliSpinners.circleHalves,
  }).start();

  for (const post of postList) {
    if (!post) {
      continue;
    }

    await page2.goto(post.url);
    await page2.waitForSelector("#post1strow0");

    const photos = await page2.evaluate(() => {
      const photoList = Array.from(
        document.querySelectorAll("#post1strow0 > td.c2 > span > p > img")
      );

      return photoList
        .map((photo) => photo.getAttribute("data-srcorg"))
        .filter((photoUrl) => {
          return !(!photoUrl || photoUrl === "" || photoUrl === null);
        });
    });

    let postName = post.title;

    let characterIncluded = false;
    let eventIncluded = false;

    for (const character of characterList) {
      if (post.title.includes(character.name)) {
        postName = character.name;
        characterIncluded = true;
        break;
      }
    }

    for (const event of eventList) {
      if (post.title.includes(event.story)) {
        if (characterIncluded) {
          postName = `${postName}-${event.story}`;
        } else {
          postName = event.story;
        }
        eventIncluded = true;
        break;
      }
    }

    if (characterIncluded || eventIncluded) {
      photoListToDownload.push({
        name: postName,
        photoUrlList: photos,
      });
    }
  }

  fetchImageSpinner.succeed(chalk.green("Fetching image's url..."));

  await browser.close();

  await fs.writeFile(
    `${searchKeyword}.txt`,
    JSON.stringify(photoListToDownload),
    { encoding: "utf-8" }
  );

  await download(searchKeyword, false);
  await upload(searchKeyword);
} catch (e) {
  console.log(` > ${chalk.redBright(`Error due to ${e} ${e.stack}`)}`);
  await browser.close();
}

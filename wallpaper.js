import fs from "node:fs/promises";

import chalk from "chalk";
import puppeteer from "puppeteer-core";

import cliSpinners from "cli-spinners";
import ora from "ora";
import "dotenv/config";

import characterList from "./characterList.js";
import { download } from "./parent-download.js";
import { sleep } from "./utils.js";

let browser;

let browserLaunchSpinner, fetchPostSpinner, fetchImageSpinner;

const searchKeyword = "壁纸";

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

  const searchResultUrls = await page2.evaluate(() => {
    const searchPages = Array.from(document.querySelectorAll("#pagebbtm a"));

    return [
      ...new Set(
        searchPages.map((searchPage) => searchPage.getAttribute("href"))
      ),
    ].filter((link) => !link.includes("javascript:void(0)"));
  });

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
        return {
          title: link.textContent
            .replace("[微博拌匀]", "")
            .replace("[云图计划]", "")
            .replace("现在为您带来", "")
            .replace(/[/\\?%*:|"<>]/g, ""),
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
      console.log(photoList);

      return photoList
        .map((photo) => photo.getAttribute("data-srcorg"))
        .filter((photoUrl) => {
          return !(!photoUrl || photoUrl === "" || photoUrl === null);
        });
    });

    let characterName = post.title;

    photoListToDownload.push({
      name: characterName,
      photoUrlList: photos,
    });
  }

  fetchImageSpinner.succeed(chalk.green("Fetching image's url..."));

  await browser.close();

  await fs.writeFile(
    `${searchKeyword}.txt`,
    JSON.stringify(photoListToDownload),
    { encoding: "utf-8" }
  );

  await download(searchKeyword);
} catch (e) {
  console.log(` > ${chalk.redBright(`Error due to ${e} ${e.stack}`)}`);
  await browser.close();
}


import puppeteer from "puppeteer-core";
import readline from "readline";

import characterList from "./characterList.js";

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
};

// const browserURL = "http://127.0.0.1:9223";
// const browser = await puppeteer.connect({
//   browserURL,
// });

// Launch the browser and open a new blank page
const browser = await puppeteer.launch({
  headless: false,
  ignoreDefaultArgs: ["--disable-extensions"],
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: [
    "--user-data-dir=C:/Users/JerryOr.LR1907325/AppData/Local/Google/Chrome/User Data",
    "--profile-directory=Profile 1",
  ],
});

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

await searchInput.type("表情包");
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
      if (link.textContent.includes("欢迎教授下载使用")) {
        return;
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

console.log("Post URL fetched");

const photoListToDownload = [];

for (const post of postList) {
  if (!post) {
    continue;
  }

  await page2.goto(post.url);

  await page2.waitForSelector("#postattach0");

  await page2.click("#postattach0 > a");

  const photos = await page2.evaluate(() => {
    const photoList = Array.from(
      document.querySelectorAll("#postattach0 > div > a > img")
    );
    console.log(photoList);

    return photoList.map((photo) => photo.getAttribute("src"));
  });

  console.log(photos);

  let characterName = post.title;

  for (const name of characterList) {
    if (post.title.includes(name)) {
      characterName = name;
      break;
    }
  }

  photoListToDownload.push({
    name: characterName,
    photos,
  });
}

console.log(photoListToDownload);
// Close the Page
await askQuestion("Press Enter to close the browser");

await browser.close();


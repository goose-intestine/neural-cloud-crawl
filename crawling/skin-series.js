import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";

import puppeteer from "puppeteer";
import { download } from "../download-parent.js";
import { upload } from "../upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let browser;
let skinSerieList;

// TODO: seems like not full at wiki.42lab.com
// TODO: maybe need to crawl from nga as well
const domain = "http://wiki.42lab.cloud";

try {
  browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: ["--disable-extensions"],
  });

  const page1 = await browser.newPage();

  await page1.setViewport({ width: 800, height: 800 });
  await page1.setRequestInterception(true);

  page1.on("request", (request) => {
    if (request.resourceType() === "image") {
      request.abort();
    } else {
      request.continue();
    }
  });

  // Navigate the page to a URL.
  await page1.goto(
    `${domain}/w/%E5%88%86%E7%B1%BB:%E5%BF%83%E6%99%BA%E6%8A%95%E5%BD%B1%E7%B3%BB%E5%88%97`
  );

  skinSerieList = await page1.evaluate(() => {
    const sList = Array.from(
      document.querySelectorAll("div.mw-category-group ul > li > a")
    );

    return Array.from(sList).map((link) => ({
      name: link.textContent,
      url: link.getAttribute("href"),
      skinList: [],
    }));
  });

  for (const skinSerie of skinSerieList) {
    const page2 = await browser.newPage();

    await page2.setViewport({ width: 800, height: 800 });
    await page2.setRequestInterception(true);

    page2.on("request", (request) => {
      if (request.resourceType() === "image") {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page2.goto(`${domain}${skinSerieList[0].url}`);

    skinSerie.serieImg = await page2.evaluate(() => {
      const img = document.querySelector("#theme-header > img");

      return img.getAttribute("src");
    });

    skinSerie.skinList = await page2.evaluate(() => {
      const characterSkinList = Array.from(
        document.querySelectorAll("#skin-list > li")
      );

      const characterSkinInfo = Array.from(
        characterSkinList.map((cSkin) => {
          const skinInfos = cSkin.querySelectorAll("span");

          return {
            name: skinInfos[0].textContent,
            character: skinInfos[1].textContent,
          };
        })
      );

      return characterSkinInfo;
    });

    await page2.close();
  }
} catch (e) {
  console.log(e);
}

await browser.close();

// Download skin serie header
const imagePath = path.join(__dirname, "../images");

try {
  await fs.access(imagePath);
} catch (e) {
  await fs.mkdir(imagePath);
}

const imagesToDownload = skinSerieList.map((skinSerie) => {
  // Make photoUrlList object to make files have its own name instead of index
  return {
    name: skinSerie.name,
    photoUrlList: [
      { name: `${skinSerie.name}`, url: `${domain}${skinSerie.serieImg}` },
    ],
  };
});

const keyword = "心智投影";

await fs.writeFile(`${keyword}.txt`, JSON.stringify(imagesToDownload), {
  encoding: "utf-8",
});

await download(keyword, true);
// await upload(keyword, true);


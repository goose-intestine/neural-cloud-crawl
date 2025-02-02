import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";

// import puppeteer from "puppeteer-core";
import puppeteer from "puppeteer";

import { DefaultValues } from "../defaultValues.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let browser;

// Launch the browser and open a new blank page
// browser = await puppeteer.launch({
//   headless: true,
//   ignoreDefaultArgs: ["--disable-extensions"],
//   executablePath: `${DefaultValues.chromePath}`,
//   args: [
//     `--user-data-dir=${DefaultValues.profilePath}`,
//     `--profile-directory=${DefaultValues.profileName}`,
//   ],
// });

browser = await puppeteer.launch({
  headless: true,
  ignoreDefaultArgs: ["--disable-extensions"],
});

const page1 = await browser.newPage();

await page1.setViewport({ width: 800, height: 800 });

// Navigate the page to a URL.
await page1.goto("http://wiki.42lab.cloud/w/心智人形图鉴");

await page1.evaluate(() => {
  const selectElem = document.querySelector("#per-page");
  const optionElem = selectElem.querySelector(
    "#per-page > option:nth-child(4)"
  );

  optionElem.selected = true;
  const event = new Event("change", { bubbles: true });
  selectElem.dispatchEvent(event);
});

const characterList = await page1.evaluate(() => {
  const cList = Array.from(
    document.querySelectorAll("#Nsoultable > tbody > tr.nsoulqueryline > td")
  );

  const processedList = [];
  for (let i = 0; i < cList.length; i += 10) {
    const icon = cList[i + 2].querySelector("img.mainicon");
    const iconUrl = icon
      .getAttribute("style")
      .replace("background-image:url(", "")
      .replace(")", "");

    const tempCharacter = {
      id: cList[i].textContent,
      name: cList[i + 1].textContent,
      iconUrl,
      class: cList[i + 3].textContent,
      enterprise: cList[i + 4].textContent,
      getMethod: cList[i + 9].textContent,
    };

    processedList.push(tempCharacter);
  }

  return processedList;
});

await browser.close();

const directoryPath = path.join(__dirname, "../resources");

try {
  await fs.access(directoryPath);
} catch (e) {
  await fs.mkdir(directoryPath);
}

await fs.writeFile(
  `${directoryPath}/character.json`,
  JSON.stringify(characterList)
);

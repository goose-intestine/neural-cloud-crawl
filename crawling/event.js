import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";

import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let browser;
let eventList;

try {
  browser = await puppeteer.launch({
    headless: true,
    ignoreDefaultArgs: ["--disable-extensions"],
  });

  const page1 = await browser.newPage();

  await page1.setViewport({ width: 800, height: 800 });

  // Navigate the page to a URL.
  await page1.goto(
    "http://wiki.42lab.cloud/w/%E8%A1%8C%E5%8A%A8%E8%AE%B0%E5%BD%95"
  );

  eventList = await page1.evaluate(() => {
    const tList = Array.from(document.querySelectorAll("table.wikitable"));

    const processedList = [];
    const mainStoryCellList = Array.from(tList[0].querySelectorAll("td"));
    const characterStoryCellList = Array.from(tList[1].querySelectorAll("td"));

    for (let i = 3; i < mainStoryCellList.length; i += 3) {
      const tempStory = {
        type: "main",
        chapter: mainStoryCellList[i].textContent.replace("\n", ""),
        location: mainStoryCellList[i + 1].textContent.replace("\n", ""),
        story: mainStoryCellList[i + 2].textContent.replace("\n", ""),
      };

      processedList.push(tempStory);
    }

    for (let i = 2; i < characterStoryCellList.length; i += 2) {
      const tempStory = {
        type: "character",
        character: characterStoryCellList[i].textContent.replace("\n", ""),
        story: characterStoryCellList[i + 1].textContent.replace("\n", ""),
      };

      processedList.push(tempStory);
    }

    return processedList;
  });
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

await fs.writeFile(`${directoryPath}/event.json`, JSON.stringify(eventList));

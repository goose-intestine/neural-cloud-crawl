import fs from "node:fs/promises";
import { fork } from "node:child_process";
import os from "node:os";
const numCPUs = os.cpus().length;

import DraftLog from "draftlog";
DraftLog(console);

const downloadFile = async (url, path) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(path, buffer);
};

const download = async (character) => {
  console.log("Downloading images...");

  try {
    await fs.access("./images");
  } catch (e) {
    await fs.mkdir("./images");
  }

  for (const character of photoListToDownload) {
    try {
      await fs.access(`./images/${character.name}`);
    } catch (e) {
      await fs.mkdir(`./images/${character.name}`);
    }

    for (const photoUrl of character.photoUrlList) {
      await downloadFile(
        photoUrl,
        `./images/${character.name}/${photoUrl.split("/").pop()}`
      );
    }

    console.log(`${character.name} Sticker Pack downloaded`);
  }
};

export { download };

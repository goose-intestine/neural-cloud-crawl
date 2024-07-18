import fs from "node:fs/promises";

import { sleep } from "./utils.js";

let entity;
let index;

let keyword;

const downloadFile = async (url, path) => {
  try {
    await fs.access(path);
  } catch (e) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(path, buffer);
    } catch (e) {
      await downloadFile(url, path);
    }
  }
};

const download = async (entity) => {
  try {
    await fs.access(`./images/${keyword}/${entity.name}`);
  } catch (e) {
    await fs.mkdir(`./images/${keyword}/${entity.name}`);
  }

  for (const [photoIndex, photoUrl] of entity.photoUrlList.entries()) {
    // set custom file name if type = object
    const photoPath =
      typeof photoUrl !== "object"
        ? `./images/${keyword}/${entity.name}/${
            entity.name
          }-${photoIndex}.${photoUrl.slice(-3)}`
        : `./images/${keyword}/${entity.name}/${
            photoUrl.name
          }.${photoUrl.url.slice(-3)}`;

    const url = typeof photoUrl === "object" ? photoUrl.url : photoUrl;

    try {
      await fs.access(photoPath);

      await sleep(100);
    } catch (e) {
      await downloadFile(url, photoPath);
    }

    process.send({
      type: "progress",
      pid: process.pid,
      entity,
      index,
    });
  }

  process.send({ pid: process.pid, entity, index, completed: true });
};

process.on("message", async (payload) => {
  if (payload.pid !== process.pid) {
    return;
  }

  if (payload.keyword) {
    keyword = payload.keyword;
  }

  if (payload.entity) {
    entity = payload.entity;
    index = payload.index;
    await download(entity);
  }
});

if (process.send) {
  process.send({ type: "handshake", pid: process.pid });
}

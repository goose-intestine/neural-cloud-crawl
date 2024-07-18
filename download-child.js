import fs from "node:fs/promises";

let entity;
let index;

let keyword;

const downloadFile = async (url, path) => {
  try {
    await fs.access(path);
  } catch (e) {
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(path, buffer);
  }
};

const download = async (entity) => {
  try {
    await fs.access(`./images/${keyword}/${entity.name}`);
  } catch (e) {
    await fs.mkdir(`./images/${keyword}/${entity.name}`);
  }

  for (const [photoIndex, photoUrl] of entity.photoUrlList.entries()) {
    try {
      await fs.access(
        `./images/${keyword}/${entity.name}/${
          entity.name
        }-${photoIndex}.${photoUrl.slice(-3)}`
      );

      process.send({
        type: "progress",
        pid: process.pid,
        entity,
        index,
        completed: true,
      });
    } catch (e) {
      // set custom file name if type = object
      if (typeof photoUrl !== "object") {
        await downloadFile(
          photoUrl,
          `./images/${keyword}/${entity.name}/${
            entity.name
          }-${photoIndex}.${photoUrl.slice(-3)}`
        );
      } else {
        await downloadFile(
          photoUrl.url,
          `./images/${keyword}/${entity.name}/${
            photoUrl.name
          }.${photoUrl.url.slice(-3)}`
        );
      }

      process.send({
        type: "progress",
        pid: process.pid,
        entity,
        index,
        completed: true,
      });
    }
  }
  process.send({ pid: process.pid, entity, index, completed: true });
};

process.on("message", async (payload) => {
  if (payload.pid !== process.pid && entity) {
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

import fs from "node:fs/promises";

let entity;
let index;

let keyword;

const downloadFile = async (url, path) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(path, buffer);
};

const download = async (entity) => {
  try {
    await fs.access(`./image/${keyword}/${entity.name}`);
  } catch (e) {
    await fs.mkdir(`./image/${keyword}/${entity.name}`);
  }

  for (const photoUrl of entity.photoUrlList) {
    await downloadFile(
      photoUrl,
      `./image/${keyword}/${entity.name}/${photoUrl.split("/").pop()}`
    );

    process.send({
      type: "progress",
      pid: process.pid,
      entity,
      index,
      completed: true,
    });
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


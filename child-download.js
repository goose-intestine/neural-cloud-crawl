import fs from "node:fs/promises";

let character;
let index;

const downloadFile = async (url, path) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(path, buffer);
};

const download = async (character) => {
  try {
    await fs.access(`./images/${character.name}`);
  } catch (e) {
    await fs.mkdir(`./images/${character.name}`);
  }

  for (const [photoIndex, photoUrl] of character.photoUrlList.entries()) {
    await downloadFile(
      photoUrl,
      `./images/${character.name}/${photoUrl.split("/").pop()}`
    );

    process.send({
      type: "progress",
      pid: process.pid,
      character,
      index,
      completed: true,
    });
  }
  process.send({ pid: process.pid, character, index, completed: true });
};

process.on("message", async (payload) => {
  if (!payload.pid === process.pid && character) {
    return;
  }
  if (payload.character) {
    character = payload.character;
    index = payload.index;
    await download(character);
  }
});

if (process.send) {
  process.send({ type: "handshake", pid: process.pid });
}
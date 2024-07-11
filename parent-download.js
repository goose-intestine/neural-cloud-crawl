import { fork } from "node:child_process";
import os from "node:os";
import fs from "node:fs/promises";

import cliProgress from "cli-progress";

const numCPUs = os.cpus().length;

// create new container
const multibar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: " {bar} | {name} | {value}/{total}",
  },
  cliProgress.Presets.rect
);

const download = async (characterList) => {
  let index = 0;

  const resultList = new Array(characterList.length).fill(false);

  try {
    await fs.access("./images");
  } catch (e) {
    await fs.mkdir("./images");
  }

  for (let i = 0; i < numCPUs; i++) {
    if (i >= characterList.length) {
      break;
    }

    const forked = fork("child-download.js");

    forked.on("message", (msg) => {
      console.log(msg);
      if (msg.type === "handshake") {
        forked.send({
          pid: msg.pid,
          character: characterList[index],
          index,
        });
        index++;
        return;
      }

      if (msg.completed) {
        resultList[index] = true;
        return;
      }

      if (!resultList.includes(false)) {
        forked.kill();
        return;
      }

      forked.send({ pid: msg.pid, character: characterList[index], index });
      index++;
      return;
    });

    // while (resultList.includes(false)) {
    //   continue;
    // }
  }

  while (resultList.includes(false)) {
    continue;
  }

  multibar.stop();

  console.log("Download complete.");

  process.exit();
};

export { download };


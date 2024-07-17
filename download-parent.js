import fs from "node:fs/promises";
import { fork } from "node:child_process";
import os from "node:os";

import chalk from "chalk";
import cliProgress from "cli-progress";

const numCPUs = os.cpus().length;

// create new container
const multibar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: `${chalk.blueBright("{bar}")} | {name} | ${chalk.yellow(
      "{value}"
    )}/{total}`,
  },
  cliProgress.Presets.rect
);

const download = async (keyword) => {
  console.log(chalk.yellow("Downloading Image..."));

  let index = 0;

  const entityListContent = await fs.readFile(`${keyword}.txt`, {
    encoding: "utf-8",
  });

  const entityList = JSON.parse(entityListContent);

  const resultList = new Array(entityList.length).fill(false);

  try {
    await fs.access(`./image`);
  } catch (e) {
    await fs.mkdir(`./image`);
  }

  try {
    await fs.access(`./image/${keyword}`);
  } catch (e) {
    await fs.mkdir(`./image/${keyword}`);
  }

  const barList = [];
  const barIndexMap = [];

  for (let i = 0; i < numCPUs; i++) {
    if (i >= entityList.length) {
      break;
    }
    
    barList.push(
      multibar.create(entityList[i].photoUrlList.length, 0, {
        name: entityList[i].name,
      })
    );

    barIndexMap[i] = i;
  }

  for (let i = 0; i < numCPUs; i++) {
    if (i >= entityList.length) {
      break;
    }

    const forked = fork("download-child.js");

    forked.on("message", (msg) => {
      let barIndex;

      if (Object.prototype.hasOwnProperty.call(msg, "index")) {
        barIndex = barIndexMap.indexOf(msg.index);
      }

      if (msg.type === "handshake") {
        barIndex = barIndexMap.indexOf(index);
        forked.send({
          keyword: keyword,
          pid: msg.pid,
          entity: entityList[index],
          index,
        });
        index++;
        return;
      }

      if (msg.type === "progress") {
        barList[barIndex].increment();
        return;
      }

      if (msg.completed) {
        resultList[msg.index] = true;

        if (index >= entityList.length) {
          return;
        }
        barList[barIndex].update(0, {
          total: entityList[index].photoUrlList.length,
          name: entityList[index].name,
        });
        barIndexMap[barIndex] = index;
      }

      forked.send({ pid: msg.pid, entity: entityList[index], index });
      index++;
      return;
    });

    if (!resultList.includes(false)) {
      forked.kill();
    }
  }
  const checkResultList = setInterval(() => {
    if (!resultList.includes(false)) {
      console.log(chalk.yellow("\nDownload complete."));

      multibar.stop();
      clearInterval(checkResultList);

      process.exit();
    }
  }, 500);

  return;
};

export { download };

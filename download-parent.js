import fs from "node:fs/promises";
import { fork } from "node:child_process";
import os from "node:os";

import chalk from "chalk";
import cliProgress from "cli-progress";

const numCPUs = os.cpus().length;

const download = async (keyword, headless = false) => {
  let multibar;
  if (!headless) {
    // create new container
    multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: true,
        format: `${chalk.blueBright("{bar}")} | {name} | ${chalk.yellow(
          "{value}"
        )}/{total}`,
      },
      cliProgress.Presets.rect
    );
  }

  console.log(chalk.yellow("Downloading Image..."));

  let index = 0;

  const entityListContent = await fs.readFile(`${keyword}.txt`, {
    encoding: "utf-8",
  });

  const entityList = JSON.parse(entityListContent);

  const resultList = new Array(entityList.length).fill(false);

  try {
    await fs.access(`./images`);
  } catch (e) {
    await fs.mkdir(`./images`);
  }

  try {
    await fs.access(`./images/${keyword}`);
  } catch (e) {
    await fs.mkdir(`./images/${keyword}`);
  }

  const barList = new Array(numCPUs).fill(null);
  const barIndexMap = [];

  if (!headless) {
    for (let i = 0; i < numCPUs; i++) {
      if (i >= entityList.length) {
        break;
      }

      barList[i] = multibar.create(entityList[i].photoUrlList.length, 0, {
        name: entityList[i].name,
      });

      barIndexMap[i] = i;
    }
  }

  for (let i = 0; i < numCPUs; i++) {
    if (i >= entityList.length) {
      break;
    }

    const forked = fork("download-child.js");

    forked.on("message", async (msg) => {
      let barIndex;

      if (Object.prototype.hasOwnProperty.call(msg, "index") && !headless) {
        barIndex = barIndexMap.indexOf(msg.index);
      }

      if (msg.type === "handshake") {
        if (!headless) {
          barIndex = barIndexMap.indexOf(index);
        }
        forked.send({
          keyword: keyword,
          pid: msg.pid,
          entity: entityList[index],
          index,
        });
        index += 1;
        return;
      }

      if (msg.type === "progress") {
        if (!headless) {
          barList[barIndex].increment();
        }
        return;
      }

      if (msg.completed) {
        resultList[msg.index] = true;

        if (index >= entityList.length) {
          return;
        }
        if (!headless) {
          // Update bar's info
          await barList[barIndex].update(0, {
            name: entityList[index].name,
          });
          await barList[barIndex].setTotal(
            entityList[index].photoUrlList.length
          );

          barIndexMap[barIndex] = index;
        }
      }

      forked.send({ pid: msg.pid, entity: entityList[index], index });
      index += 1;
      return;
    });

    if (!resultList.includes(false)) {
      forked.kill();
    }
  }
  const checkResultList = setInterval(() => {
    if (!resultList.includes(false)) {
      if (!headless) {
        multibar.stop();
      }

      console.log(chalk.green("Download completed."));

      clearInterval(checkResultList);
    }
  }, 500);

  return;
};

export { download };

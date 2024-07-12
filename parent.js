import { fork } from "node:child_process";
import os from "node:os";
import fs from "node:fs/promises";

import chalk from "chalk";
import cliProgress from "cli-progress";
import characterList from "./characterList.js";

const numCPUs = os.cpus().length;

const data = [
  {
    name: "玛吉西尔达",
    photoUrlList: [
      "https://img.nga.178.com/attachments/mon_202204/20/-ztdofQ17p-22c3Z2nT3cSrs-rs.png",
      "https://img.nga.178.com/attachments/mon_202204/20/-ztdofQ17p-6ym1ZtT3cSrs-rs.png",
      "https://img.nga.178.com/attachments/mon_202204/20/-ztdofQ17p-fub0ZpT3cSrs-rs.png",
      "https://img.nga.178.com/attachments/mon_202204/20/-ztdofQ17p-jimZ23T3cSrs-rs.png",
      "https://img.nga.178.com/attachments/mon_202204/20/-ztdofQ17p-8jiuZwT3cSrs-rs.png",
      "https://img.nga.178.com/attachments/mon_202204/20/-ztdofQ17p-fdf6ZoT3cSrs-rs.png",
      "https://img.nga.178.com/attachments/mon_202204/20/-ztdofQ17p-85foZ1bT3cSrs-rs.png",
    ],
  },
];

// create new container
const multibar = new cliProgress.MultiBar(
  {
    clearOnComplete: false,
    hideCursor: true,
    format: " {bar} | {characterName} | {value}/{total}",
  },
  cliProgress.Presets.rect
);

const download = async (characterList) => {
  let index = 0;

  const resultList = new Array(characterList.length).fill(false);

  const barList = [];
  for (const character of characterList) {
    barList.push(
      multibar.create(character.photoUrlList.length, 0, {
        characterName: character.name,
      })
    );
  }

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
      // console.log(msg);

      if (msg.type === "handshake") {
        forked.send({
          pid: msg.pid,
          character: characterList[index],
          index,
        });
        index++;
        return;
      }

      if (msg.type === "progress") {
        barList[msg.index].increment();
        return;
      }

      if (msg.completed) {
        resultList[msg.index] = true;
        return;
      }

      forked.send({ pid: msg.pid, character: characterList[index], index });
      index++;
      return;
    });

    const checkResultList = setInterval(() => {
      if (!resultList.includes(false)) {
        clearInterval(checkResultList);
        forked.kill();
        multibar.log(chalk.green("Download complete.\n"));
        multibar.stop();
      }
    }, 500);

    if (!resultList.includes(false)) {
      console.log("Download Complete.\n")
      process.exit();
    }

    return;
  }
};

await download(data);

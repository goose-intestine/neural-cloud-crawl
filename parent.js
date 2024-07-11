import { fork } from "node:child_process";
import os from "node:os";
import fs from "node:fs/promises";

import cliProgress from "cli-progress";
import { download } from "./parent-download.js";

const numCPUs = os.cpus().length;

const forked = fork("child.js");

forked.on("message", (msg) => {
  console.log("Message from child", msg);
});

forked.send({ hello: "world" });

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

// await download(data);


import { download } from "../download-parent.js";
import { upload } from "../upload.js";

const keyword = "心智投影";

await download(keyword, false);

await upload(keyword, false);

process.exit();

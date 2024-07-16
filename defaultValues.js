import "dotenv/config";

const DefaultValues = {
  chromePath: process.env.CHROME_PATH,
  profilePath: process.env.PROFILE_PATH,
  profileName: process.env.PROFILE_NAME,
  githubToken: process.env.GITHUB_TOKEN,
};

export { DefaultValues };

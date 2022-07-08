import { Octokit } from "octokit";

const OCTOKIT = new Octokit();

const FIRMWARE_REPO = {
  owner: "OpenVTx",
  repo: "OpenVTx",
};

const CORS_PROXY = "https://cors.bubblesort.me/?";

export interface ReleaseAsset {
  Name: string;
  Target: string;
  DownloadURL: string;
}

export type ReleaseMap = { [index: string]: ReleaseAsset[] };

export class Github {
  public static async fetchReleases(): Promise<ReleaseMap> {
    const resp = await OCTOKIT.rest.repos.listReleases(FIRMWARE_REPO);
    const data = resp.data.filter((r) => r.assets.length > 0);

    const releases: ReleaseMap = {};
    for (const r of data) {
      releases[r.tag_name] = r.assets.map((a) => {
        return {
          Name: a.name,
          Target: a.name.replace(`_${r.tag_name}.bin`, ""),
          DownloadURL: a.browser_download_url,
        };
      });
    }
    return releases;
  }

  public static fetchAsset(asset: ReleaseAsset) {
    const headers = [
      ["Origin", "http://localhost"],
      ["X-Requested-With", "XMLHttpRequest"],
    ];
    const proxy = `${CORS_PROXY}${asset.DownloadURL}`;
    return fetch(proxy, { headers });
  }
}

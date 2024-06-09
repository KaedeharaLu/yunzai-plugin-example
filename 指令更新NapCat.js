/** 本js仅适配1.5.2及以上版本的napcat，使用前请添加依赖pnpm add (axios，http-proxy-agent，https-proxy-agent，adm-zip) -w */
/** 不想使用代理可以将38行与39行注释掉 */
/** 34行定义napcat的上级目录，请确保napcat的最后一级目录名称为NapCat.win32.x64，然后把前面的目录路径填到34行，例如完整的目录为C:\napcat\NapCat.win32.x64 */
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import AdmZip from 'adm-zip';
export class napcat extends plugin {
  constructor() {
    super({
      name: "指令更新nc",
      dsc: "指令更新nc，并自动重连应用更新",
      event: "message",
      priority: 5000,
      rule: [
        {
          /** 命令正则匹配 */
          reg: "^#?更新nc$",
          /** 执行方法 */
          fnc: "update",
          permission: "master",
        }
      ]
    })
  }
  async update(e) {
    const PROXY_HTTP = 'http://127.0.0.1:11451';
    const PROXY_HTTPS = 'http://127.0.0.1:11451';
    const httpAgent = new HttpProxyAgent(PROXY_HTTP);
    const httpsAgent = new HttpsProxyAgent(PROXY_HTTPS);
    /** 这里写napcat运行上级目录 */
    const base_path = "C:\\Users\\Administrator\\Desktop\\Yunzai-Bot";
    const api_url = "https://api.github.com/repos/NapNeko/NapCatQQ/releases/latest";
    const client = axios.create({
      /** 不用代理可以将下面这两行注释掉 */
      httpAgent: httpAgent,
      httpsAgent: httpsAgent,
      followRedirect: true
    });
    const noProxyClient = axios.create();
    await e.reply(`正在更新`)
    try {
      const resp = await client.get(api_url);
      const release_data = resp.data;
      const latestVersion = release_data.tag_name;
      const version = 'v' +  this.e.bot.version.app_version;
      if (version === latestVersion) {
        await e.reply(`已经是最新版了~\n当前版本:${version}`);
        return;
      }
      const win_asset = release_data.assets.find(asset => asset.name.includes('win'));
      if (!win_asset) {
        e.reply(`未找到对应release`);
      }
      const download_url = win_asset.browser_download_url;
      const download_resp = await client.get(download_url, { responseType: 'arraybuffer' });
      const file_path = path.join(base_path, win_asset.name);
      await fs.mkdir(path.dirname(file_path), { recursive: true });
      await fs.writeFile(file_path, download_resp.data);
      await e.reply(`正在执行文件覆盖`)
      const zip = new AdmZip(file_path);
      const zipEntries = zip.getEntries();
  
      for (const zipEntry of zipEntries) {
        const fullPath = path.join(base_path, zipEntry.entryName);
        if (zipEntry.isDirectory) {
          await fs.mkdir(fullPath, { recursive: true }).catch((err) => {
            console.error(`Error creating directory ${fullPath}:`, err);
          });
        } else {
          try {
            const content = zipEntry.getData();
            await fs.writeFile(fullPath, content);
          } catch (error) {
            if (error.code === 'EBUSY' || error.code === 'EPERM') {
              console.error(`Error writing file ${fullPath} (可能被占用):`, error);
            } else {
              throw error; 
            }
          }
        }
      }
  
      await e.reply(`正在重启napcat以应用更新`)
      await noProxyClient.post('http://127.0.0.1:3000/set_restart', { delay: 10 });
      await wait(8000);
      await e.reply(`更新完成！`)
    } catch (error) {
      console.error(error);
      await e.reply(`更新失败: ${error.message}`)
    }
  }
}
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
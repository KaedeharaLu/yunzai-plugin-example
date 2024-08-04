import puppeteer from 'puppeteer';
import fs from 'fs';

export class ScreenShot extends plugin {
    constructor() {
        super({
            name: '网页截图插件',
            dsc: '通过指定 URL 截图并发送',
            event: 'message',
            priority: -1,
            rule: [
                {
                    reg: '#截图',
                    fnc: 'screenShot'
                }
            ]
        });
    }

    async screenShot(e) {
        await this.takeScreenshot(e, './data/screenshot.png');
    }

    async takeScreenshot(e, filePath, url = null) {
        let targetUrl = url || e.raw_message.slice(3).trim();

        var notice=await e.reply('开始尝试截图，请稍等······', true);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        const timeout = 15000; // 15秒
        let status = 0;

        if (!targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }

        try {
            // 监听页面响应事件来获取状态码
            page.on('response', async (response) => {
                const url = response.url();
                if (url === targetUrl) {
                    status = response.status();
                }
            });

            // 跳转到目标 URL
            const navigationPromise = page.goto(targetUrl, {
                waitUntil: 'networkidle2',
            });

            // 等待导航完成
            await navigationPromise;

            if (status !== 200) {
                await e.reply(`网页返回错误状态码${status}`, true);
                e.group.recallMsg(notice.message_id)
                return;
            }

            // 截图并处理超时
            const screenshotPromise = new Promise(async (resolve, reject) => {
                try {
                    await new Promise(resolve => setTimeout(resolve, 4000)); // 额外的等待时间
                    await page.screenshot({
                        path: filePath,
                        fullPage: true,
                    });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('截图超时')), timeout)
            );

            await Promise.race([screenshotPromise, timeoutPromise]);

            await e.reply(['截图完成!', segment.image(filePath)], true);
            e.group.recallMsg(notice.message_id)
            await browser.close();

            fs.unlink(filePath, (err) => {
                if (err) {
                    logger.error('删除截图文件时出错:', err);
                } else {
                    logger.mark('截图文件删除成功');
                }
            });

        } catch (error) {
            logger.error('截图过程中发生错误:', error);
            await e.reply('截图失败，请稍后再试。', true);
            e.group.recallMsg(notice.message_id)
        }
    }
}

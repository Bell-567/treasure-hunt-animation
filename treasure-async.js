#!/usr/bin/env node
/**
 * 月影神庙 · 异步寻宝记（终端增强版）
 * ------------------------------------------------------------
 * 在原版 treasure.js 的基础上：
 *   1. 全部改写为 async / await，并用 try / catch / finally 收尾
 *   2. 新增情节：雨夜匿名信、月影湖谜语、神庙分岔路、
 *      三重试炼（Promise.all）、流沙之门（Promise.race）、
 *      符文之锁、宝藏反转
 *   3. 新增失败重试（withRetry）、并发、竞速等异步模式
 *
 * 运行：node treasure-async.js
 * 快速演示：node treasure-async.js --fast
 */

const SPEED = process.argv.includes('--fast') ? 0.12 : 1;

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  gold: '\x1b[38;5;221m',
  cyan: '\x1b[38;5;80m',
  green: '\x1b[38;5;114m',
  red: '\x1b[38;5;203m',
  yellow: '\x1b[38;5;215m',
  gray: '\x1b[38;5;245m',
  white: '\x1b[97m',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms * SPEED));

const startedAt = Date.now();
const clock = () => `${((Date.now() - startedAt) / 1000).toFixed(1).padStart(5, '0')}s`;

function log(message, tone = 'gray') {
  console.log(`${C.dim}[${clock()}]${C.reset} ${C[tone] || ''}${message}${C.reset}`);
}

function stage(title) {
  console.log(`\n${C.gold}┌─ ${title} ${'─'.repeat(Math.max(0, 34 - title.length))}${C.reset}`);
}

function banner() {
  console.log(`${C.gold}${C.bold}`);
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   月 影 神 庙 · 异 步 寻 宝 记       ║');
  console.log('  ║   async / await · Promise.all · race ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log(C.reset);
}

/** 带重试标记的任务错误 */
class StoryError extends Error {
  constructor(message, retryable = false) {
    super(message);
    this.name = 'StoryError';
    this.retryable = retryable;
  }
}

/** 通用重试器：只重试标记为 retryable 的错误 */
async function withRetry(task, attempts = 3, label = '任务') {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task(attempt);
    } catch (err) {
      if (!(err instanceof StoryError) || !err.retryable || attempt === attempts) {
        throw err;
      }
      log(`${label}第 ${attempt} 次尝试失败：${err.message}`, 'yellow');
      await sleep(600);
      log('你退回阴影里，重新来过……', 'dim');
    }
  }
}

/** 藏宝图 API：全部为 async 方法 */
class TreasureMap {
  static async getInitialClue() {
    await sleep(800);
    return {
      text: '月圆之夜，湖心之眼；第三块基石，会为你让路。',
      sigil: '太阳纹章',
    };
  }

  static async decodeAncientScript(clue) {
    await sleep(1000);
    if (!clue || !clue.text) {
      throw new StoryError('羊皮卷被雨水泡开了，没有线索可以解码。', true);
    }
    return {
      location: '月影湖心的沉没神庙',
      riddle: '什么东西越洗越脏？',
    };
  }

  static async crossMoonLake(decoded) {
    await sleep(700);
    log('摆渡人从雾里撑出一条小船：「答对我的谜，才渡你过去。」', 'cyan');
    await sleep(500);
    log(`谜面：${decoded.riddle}`, 'bold');
    await sleep(600);
    if (Math.random() < 0.18) {
      throw new StoryError('摆渡人摇头：「太急了，再想想。」', true);
    }
    log('你答：「水。」摆渡人笑了，竹篙一点，船滑向湖心。', 'green');
    return '湖畔石阶';
  }

  static async enterTemple(route) {
    if (route === 'front') {
      await sleep(1300);
      log('你拨动门侧日晷，晷针指向「申时」。石门缓缓升起。', 'green');
      return '正门';
    }

    return withRetry(
      async (attempt) => {
        await sleep(800);
        if (attempt < 3 && Math.random() < 0.6) {
          throw new StoryError('守卫的火把光扫过拐角，你屏住呼吸退回暗处。', true);
        }
        log('第三次，你贴着潮湿的石壁，从守卫背后溜了过去。', 'green');
        return '地下水道';
      },
      3,
      '潜入地下水道'
    );
  }

  static async lightBrazier() {
    await sleep(1200 + Math.random() * 500);
    log('东侧青铜火盆亮起，火光沿着铜槽一路蔓延。', 'green');
    return '火盆';
  }

  static async readStarChart() {
    await sleep(1700 + Math.random() * 400);
    log('星象盘咬合，指针停在天顶的猎户座。', 'green');
    return '星图';
  }

  static async sneakPastGuards() {
    await sleep(2100 + Math.random() * 400);
    log('巡逻队转向西侧，你贴着墙根穿过长廊。', 'green');
    return '潜行';
  }

  static async openTreasureBox() {
    await sleep(1000);
    return {
      line1: '箱子里没有金币，也没有宝石。',
      line2: '只有一枚星辉罗盘、半张写着「天空之城」的地图，',
      line3: '和一张字条：「真正的宝藏，是愿意继续出发的人。」',
    };
  }
}

async function findTreasure() {
  banner();
  const runStarted = Date.now();

  stage('第一幕 · 雨夜来信');
  log('雨点敲打窗棂。一封没有署名的信，从门缝下滑了进来。', 'white');
  await sleep(700);
  log('火漆上压着一枚太阳纹章——三百年前「观星会」的标记。', 'gold');
  log('信纸上只有一行字：「月圆之夜，去图书馆。别相信影子。」', 'gold');

  stage('第二幕 · 古籍解码');
  log('第三排书架后，你摸到一只铜匣，里面是一卷被虫蛀过的羊皮地图。', 'white');
  const clue = await TreasureMap.getInitialClue();
  log(`地图上残存的墨迹拼出一句话：「${clue.text}」`, 'gold');
  await sleep(500);
  log('你把地图铺在观星台上，星轨与墨线重叠，浮出一个地名……', 'gray');
  const decoded = await TreasureMap.decodeAncientScript(clue);
  log(`解码成功：${decoded.location}。`, 'green');
  log(`羊皮卷背面还有一行小字：「${decoded.riddle}」`, 'gold');

  stage('第三幕 · 月影湖');
  let lake;
  try {
    lake = await TreasureMap.crossMoonLake(decoded);
  } catch (err) {
    if (!(err instanceof StoryError)) throw err;
    log('摆渡人消失了，湖面重新被雾吞没。', 'red');
    throw err;
  }
  log(`小船靠岸：${lake}。`, 'green');

  stage('第四幕 · 神庙之门');
  const route = Math.random() < 0.5 ? 'front' : 'tunnel';
  log(
    route === 'front'
      ? '你选择拨动正门的日晷。'
      : '你拨开水草，钻进冰冷的地下水道。',
    'cyan'
  );
  const entrance = await TreasureMap.enterTemple(route);
  log(`你从${entrance}进入了神庙。`, 'green');

  stage('第五幕 · 三重试炼（Promise.all）');
  log('中庭的地面裂成三块：火盆、星盘、守卫长廊，必须同时完成。', 'gold');
  log('你深吸一口气，同时启动三个机关……', 'gray');
  const trials = await Promise.all([
    TreasureMap.lightBrazier(),
    TreasureMap.readStarChart(),
    TreasureMap.sneakPastGuards(),
  ]);
  log(`三重试炼同时完成：${trials.join(' · ')}。`, 'green');

  stage('第六幕 · 流沙之门（Promise.race）');
  log('头顶的沙漏突然翻转，石门开始下沉。你只有一次机会。', 'yellow');
  const outcome = await Promise.race([
    (async () => {
      await sleep(2200);
      log('你侧身滚过正在闭合的门缝，石屑擦过肩头。', 'green');
      return 'escape';
    })(),
    (async () => {
      await sleep(3400);
      return 'closed';
    })(),
  ]);
  if (outcome !== 'escape') {
    throw new StoryError('石门合拢，你被挡在门外。');
  }
  log('身后传来石门落地的闷响。你赶上了。', 'yellow');

  stage('第七幕 · 符文之锁');
  log('门前嵌着三枚符文：月、星、日。石壁刻着：「夜之后是光，光之前是星。」', 'gold');
  for (const rune of ['月', '星', '日']) {
    await sleep(550);
    log(`符文「${rune}」亮起……`, 'cyan');
  }
  log('三枚符文连成一条光路，门后传来齿轮松开的声音。', 'green');

  stage('终幕 · 宝藏');
  log('穹顶裂开一道缝，月光落在石台的箱子上。箱盖没有锁。', 'white');
  const treasure = await TreasureMap.openTreasureBox();
  log(treasure.line1, 'yellow');
  await sleep(600);
  log(treasure.line2, 'gold');
  log(treasure.line3, 'gold');
  await sleep(400);
  log('你合上箱盖。下一段旅程，已经在罗盘里发亮。', 'cyan');

  const seconds = ((Date.now() - runStarted) / 1000).toFixed(1);
  console.log(`\n${C.gold}${C.bold}探险完成 · 总用时 ${seconds}s${C.reset}`);
  console.log(`${C.dim}真正的宝藏，是愿意继续出发的人。${C.reset}\n`);
}

findTreasure()
  .catch((err) => {
    if (err instanceof StoryError) {
      console.error(`\n${C.red}任务失败：${err.message}${C.reset}\n`);
    } else {
      console.error(`\n${C.red}意外中断：${err.message}${C.reset}\n`);
    }
    process.exitCode = 1;
  })
  .finally(() => {
    console.log(`${C.dim}—— 冒险结束 ——${C.reset}`);
  });

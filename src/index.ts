import { Context, Logger, Schema, User } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './pc'
import * as GameLog from './Dice_log'
import * as Dice_set from './Dice_set'
import * as cmd from './cmd'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Circle } from './Circle'
import { parse2 } from './utils/cmd_parse2'

interface GameSpaceData {
  isBotOn: boolean
  rule: string
  version: string
  /** uid - 角色 id */
  team: { [name: string]: number }
}

interface PlayerData {
  version: string
  publicPc: number | null;
  pcList: number[]
  hiyDice: number[]
  newPcPre: boolean
}

interface CharacterData {
  id?: number
  master: number
  assets: [string, any][]
  /** 本来是想把历史记录也放到 assets 里的，但是为了防止有人 st 瞎改就提了一级 */
  history: object
}


declare module 'koishi' {
  interface Tables {
    circledice_pc: CharacterData
  }
  interface User {
    player: PlayerData
  }
  interface Channel {
    gameSpace: GameSpaceData
  }
}

export interface Config {
  GameLog: GameLog.default.Config
  newPcPre: boolean
  useRollVM: string
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    useRollVM: Schema.union(['diceScript', 'oneDice']).default('diceScript').description('使用那种骰点解析方式：'),
    newPcPre: Schema.boolean().default(true).description('是否在每个群都创建一张角色卡并绑定：')
  }).description('基本配置'),
  Schema.object({
    GameLog: GameLog.default.Config,
  }),
])

export const name = 'circledice'
export const using = ['database', 'cron'] as const
export const log = new Logger('CircleDice:')
export type Rule = 'coc7' | 'dnd5e'

let circle: Circle;

export function apply(ctx: Context, config: Config) {
  // 扩展数据模型
  ctx.model.extend('circledice_pc', {
    'id': 'unsigned',
    'master': 'unsigned',
    'assets': {
      type: 'json',
      initial: []
    },
    'history': {
      type: 'json',
      initial: {}
    }
  }, {
    autoInc: true
  });

  ctx.model.extend('user', {
    player: {
      type: 'json', initial: {
        'version': 'dev',
        'hiyDice': [0],
        'pcList': [],
        'publicPc': null,
        'newPcPre': config.newPcPre
      }
    }
  })

  ctx.model.extend('channel', {
    gameSpace: {
      type: 'json', initial: {
        'isBotOn': true,
        'rule': 'coc7',
        'team': {},
        'version': 'dev'
      }
    }
  })

  // 创建相关目录等
  ctx.on('ready', () => {
    let dir = path.join(ctx.baseDir, config.GameLog.logSaveDir)
    fs.stat(dir)
      .then(stat => log.info('Log 目录创建于', new Date(stat.birthtimeMs).toLocaleString()))
      .catch(err => {
        err.code == 'ENOENT' ?
          fs.mkdir(dir, { recursive: true })
            .then(() => log.info('创建 Log 保存目录完成'))
            .catch((err) => log.error('创建 Log 保存目录失败', err)) :
          log.warn(err)
      })

  })

  ctx.user().middleware((session, next) => {
    let { parsed: { prefix, content } } = session
    if (prefix) {
      // 有前缀 但是没被默认解析处理到
      const a = parse2(content)
      if (a){
        return session.execute(a)
      }
    }
    return next()
  })

  circle = new Circle(ctx, config)
  circle.load()
    .then(() => {
      log.info('骑士已上线，开始加载子插件……')
      ctx.plugin(Dice_r, config)
      ctx.plugin(Dice_pc, config)
      ctx.plugin(GameLog, config)
      ctx.plugin(Dice_set, config)
      ctx.plugin(cmd, config)
    })
}

// 这里放一些常用的工具函数
/** 生成 length 长度的随机字符 */
export function randomString(length: number) {
  let str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i)
    result += str[Math.floor(Math.random() * str.length)];
  return result;
}

export { circle,PlayerData,GameSpaceData,CharacterData }

import { Context, Logger, Schema, User } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './Dice_pc'
import * as Dice_log from './Dice_log'
import * as fs from 'fs'
import * as path from 'path'
import vm from './lib/dicescript'
import { dice as vm2 } from '@onedice/core'


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
  pclist: []
  hiyDice: number[]
  newPcPre: boolean
}

interface CharacterData {
  id: number
  assets: [string, Assets][]
  history: hiy
}

type hiy = { [name: string]: number }

interface Assets {
  /** 标识`ats.value`值的类型 */
  type: 0 | 1 | 2 | 3 | 4 | 5,
  /**
| type | value                      | 用途                  |
| ---- | -------------------------- | :-------------------- |
| 1    | 数字                       | COC中的技能检定       |
| 2    | 数字，但一般不可变（常量） | COC中属性             |
| 3    | 字符串，为掷骰表达式       | COC中的DB，武器的伤害 |
| 4    | 字符串，是自然语言          | 背景简介          |
| 5    | 对象，存有描述武器的属性    | COC 中的武器    |
 0 为类型不明 
 */
  value: any
}

export interface Config {
  uploadPC: string
  normalRule: string
  logSaveDir: string
  netcutPwd: string
  netcutOn: boolean
  autoDelLog: number
  useRollVM: string
  newPcPre: boolean
}

export interface RollRet {
  ok: boolean
  ret: number
  detail: string
  rest: string
  err: string
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    useRollVM: Schema.union(['diceScript', 'oneDice']).default('diceScript').description('使用那种骰点解析方式：'),
    newPcPre: Schema.boolean().default(true).description('新群录入属性时是否默认新建角色：')
  }).description('基本配置'),
  Schema.object({
    uploadPC: Schema.string().description('上传空白人物卡绝对路径'),
    normalRule: Schema.string().default('coc7').description('全局默认规则，现已支持：coc7'),
    logSaveDir: Schema.string().default('circledice-log').description('保存log的目录'),
    netcutOn: Schema.boolean().default(true).description('是否上传到 netcut 方便分享？'),
    netcutPwd: Schema.string().default('pwd').description('分享到 netcut 时的密码'),
    autoDelLog: Schema.number().default(259200).description('定时删除多少秒前的log')
  }).description('Log 日志配置')
])

export const name = 'circledice'
export const using = ['database', 'cron'] as const
const log = new Logger('CircleDice/dice:')

const diceInit: [string, Assets][] = [
  ['MAXID', { type: 1, value: 1 }]
]

let dice: Dice;

export function apply(ctx: Context, config: Config) {
  // 扩展数据模型
  ctx.model.extend('circledice_pc', {
    'id': 'unsigned',
    'assets': {
      type: 'json',
      initial: []
    },
    'history': {
      type: 'json',
      initial: {}
    }
  });

  ctx.model.extend('user', {
    player: {
      type: 'json', initial: {
        'version': 'dev',
        'hiyDice': [0],
        'pclist': [],
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

  log.info('CircleDice 已启动...正在尝试初始化数据')
  dice = new Dice(ctx, config)
  ctx.plugin(Dice_r, config)
  ctx.plugin(Dice_pc, config)
  ctx.plugin(Dice_log, config)
  //ctx.on('before-send') 是否 bot off 完全静默？
  //ctx.on('brfore-parse') todo 二次解析指令
}


class Dice {
  ctx: Context
  config: Config
  chAll: Map<number, CharacterData>
  knight: Character
  maxPcId: number

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
    this.load()
  }

  // 依稀记得设计这个加载机制原因是 db.create 返回没有 id 字段，没法确定 ID
  // 现在一想 加个 uuid 字段或者发个 issues 什么的应该能更好的解决（
  async load() {
    this.chAll = new Map()
    let data = await this.ctx.database.get('circledice_pc', { id: { $gt: -1 } })
    // 第一次
    if (data.length == 0) {
      data.push({
        id: 1,
        'assets': diceInit,
        'history': { 'maxPcId': 1 }
      })
    }
    // 真构造（？
    data.forEach(ele => {
      this.chAll.set(ele.id, ele)
    })
    this.knight = this.getChRaw(1) // 圆桌骑士x

    return this.knight

  }

  save(ctx: Context) {
    let data: CharacterData[] = []
    this.chAll.forEach(ch => {
      data.push({
        id: ch.id,
        assets: ch.assets,
        history: ch.history
      })
    })
    ctx.database.upsert('circledice_pc', data)
      .then(() => log.info('角色数据保存完成'))
  }


  getChRaw(id: number): Character {
    return new Character(this.chAll.get(id))
  }

  getCh(u: User, g: GameSpaceData) {
    let pcid = g.team[u.id]
    if (pcid) {
      // 绑卡状态
      return this.getChRaw(pcid)
    } else {
      pcid = u.player.publicPc
      if (pcid) {
        // 从来没有用过，新建一张
        return this.newCh(u, g)
      } else {
        return this.getChRaw(pcid)
      }
    }
  }

  newCh(u: User, g: GameSpaceData) {
    this.maxPcId++
  }

  roll(text: string): RollRet {
    let ret: RollRet = {
      'ok': false,
      'ret': 0,
      'rest': '',
      'detail': '',
      'err': null
    }
    switch (this.config.useRollVM) {
      case 'diceScript':
        let mctx = vm.newVM()
        mctx.Flags.PrintBytecode = true;
        mctx.Flags.EnableDiceWoD = true;
        mctx.Flags.EnableDiceCoC = true;
        mctx.Flags.EnableDiceFate = true;
        mctx.Flags.EnableDiceDoubleCross = true;
        try {
          mctx.Run(text)
          if (mctx.Error) {
            ret.err = `语法异常: ${mctx.Error.Error()}`
          } else {
            ret.detail = mctx.Detail
            ret.ret = +mctx.Ret.ToString() || 0
            ret.rest = mctx.RestInput
            ret.ok = true
          }
        } catch (e) {
          ret.err = 'diceScriptERR: ' + e.message
        }
        return ret
      case 'oneDice':
        try {
          const [value, root] = vm2(text)
          ret.ret = value
          ret.detail = root.toString()
          ret.ok = true
        } catch (e) {
          ret.err = String(e)
        }
        return ret
    }
  }
}

class Character {
  id: number
  name: string
  assets: Map<string, any>
  history: hiy

  constructor(ele: CharacterData) {
    this.assets = new Map()
  }

  get(key: string, type: string | number) {

  }

  set(key: string, value: any, type: string | number) {

  }

  Addhiy(k: string,n:number) {

  }
}

export { dice }

// 这里放一些常用的工具函数
export function randomString(length: number) {
  let str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i)
    result += str[Math.floor(Math.random() * str.length)];
  return result;
}
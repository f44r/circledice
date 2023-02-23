import { Context, Logger, Schema, User } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './Dice_pc'
import * as Dice_log from './Dice_log'
import * as cmd from './cmd'
import * as fs from 'fs/promises'
import * as path from 'path'
import { vm } from './roll/dicescript'
import * as vm2 from '@onedice/core'
import { debounce } from 'lodash-es'


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
  pclist: [number, string][]
  hiyDice: number[]
  newPcPre: boolean
}

interface CharacterData {
  id?: number
  master: number
  assets: [string, any][]
  /** 本来是想把历史记录也放到 assets 里的，但是为了防止有人 st 瞎改就提了一级 */
  history: hiy
}

type hiy = { [ruleName: string]: { [skillName: string]: number } }

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
  /** 是否运算成功 */
  ok: boolean
  /** 最终结果 */
  ret: number
  /** 过程 */
  detail: string
  /** 剩余文本 */
  rest: string
  /** 错误信息 */
  err: string
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    useRollVM: Schema.union(['diceScript', 'oneDice']).default('diceScript').description('使用那种骰点解析方式：'),
    newPcPre: Schema.boolean().default(true).description('是否在每个群都创建一张角色卡并绑定：')
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


let dice: Dice;

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

  // 创建相关目录等
  ctx.on('ready', () => {
    let dir = path.join(ctx.baseDir, config.logSaveDir)
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

  log.info('CircleDice 已启动...正在尝试初始化数据')
  dice = new Dice(ctx, config)
  ctx.plugin(Dice_r, config)
  ctx.plugin(Dice_pc, config)
  ctx.plugin(Dice_log, config)
  ctx.plugin(cmd, config)
  //ctx.on('before-send') 是否 bot off 完全静默？
  //ctx.on('brfore-parse') todo 二次解析指令
}


class Dice {
  ctx: Context
  config: Config

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
  }

  async getChRaw(id: number) {
    let ch = new Character((await this.ctx.database.get('circledice_pc', id))[0], this)
    return ch
  }

  // 新建角色
  async newCh(u: Pick<User, 'id' | 'player'>) {
    let data = await this.ctx.database.create('circledice_pc', {
      master: u.id,
      assets: [],
      history: {}
    })
    let ch = new Character(data, this)
    log.info(`创建角色：[${ch.id}]`)
    return ch
  }

  async getCh(u: Pick<User, 'id' | 'player'>, g: GameSpaceData) {
    let id: number
    if (g) {
      id = g.team[u.id]
    } else {
      // 使用全局
      id = u.player.publicPc
      if (!id) {
        // 从来没有用过，新建一张
        let ch = await this.newCh(u)
        u.player.publicPc = ch.id
        return ch
      } else {
        return this.getChRaw(id)
      }
    }

    if (id) {
      // 绑卡状态
      return this.getChRaw(id)
    } else {
      let ch: Character
      if (u.player.newPcPre) {
        // 每群新建
        ch = await this.newCh(u)
        g.team[u.id] = ch.id
        u.player.pclist.push([ch.id, ch.name])
        return ch
      } else {
        // 使用全局
        id = u.player.publicPc
        if (!id) {
          // 从来没有用过，新建一张
          let ch = await this.newCh(u)
          u.player.publicPc = ch.id
          return ch
        } else {
          return this.getChRaw(id)
        }
      }
    }
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
            ret.err = `语法异常: ${mctx.Error.error()}`
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
        // 还没看完源码，记得有个未知符号错误可用 rest 属性 todo
        try {
          const [value, root] = vm2.dice(text)
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
  master: number
  assets: Map<string, any>
  history: hiy
  dice: Dice

  constructor(ele: CharacterData, dice: Dice) {
    this.dice = dice
    this.assets = new Map(ele.assets)
    this.id = ele.id
    this.master = ele.master
    this.name = this.get('name')
    this.history = {
      'coc7success': {},
      'coc7fail': {}
    }
  }

  get name() {
    return this.get('name')
  }

  set name(val) {
    this.name = val
  }

  /**
   * 获取角色卡数据 不存在返回 1\
   * 指定类型时且不存在时返回对应类型默认值
   */
  get(key: string) {
    if (this.assets.has(key)) {
      return this.assets.get(key)
    }
    return 1
  }


  /** 删除角色卡数据 */
  del(key: string) {
    this.assets.delete(key)
  }

  /**
   * 设置角色数据
   * @param key 键值
   * @param value 变量值
   * @param type 指定类型，默认 1
   */
  set(key: string, value: any) {
    if (this.assets.has(key)) {
      this.assets.set(key, value)
    } else {
      this.assets.set(key,value)
    }
    debounce(this.save(), 1000)
  }


  has(k: string) {
    return this.assets.has(k)
  }

  /**
   * 设置角色历史记录，用于 en 指令
   * @param k 技能名
   * @param b 成功还是失败
   */
  AddCOC7skillHiy(k: string, b: boolean) {
    if (b) {
      this.history['coc7success'][k] ?
        this.history['coc7success'][k]++ :
        this.history['coc7success'][k] = 1
    } else {
      this.history['coc7fail'][k] ?
        this.history['coc7fail'][k]++ :
        this.history['coc7fail'][k] = 1
    }
  }

  save() {
    let ele: CharacterData = {
      'id': this.id,
      'master': this.master,
      'assets': [...this.assets],
      'history': this.history,
    }
    this.dice.ctx.database.upsert('circledice_pc', [ele])
    return null
  }
}

export { dice, Character }

// 这里放一些常用的工具函数
/** 生成 length 长度的随机字符 */
export function randomString(length: number) {
  let str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i)
    result += str[Math.floor(Math.random() * str.length)];
  return result;
}

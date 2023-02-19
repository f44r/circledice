import { Context, Logger, Schema, User } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './Dice_pc'
import * as Dice_log from './Dice_log'
import * as cmd from './cmd'
import * as fs from 'fs/promises'
import * as path from 'path'
import { vm } from './lib/dicescript'
import  * as vm2  from '@onedice/core'


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
  id: number
  master: number
  assets: [string, Assets][]
  /** 本来是想把历史记录也放到 assets 里的，但是为了防止有人 st 瞎改就提了一级 */
  history: hiy
}

type hiy = { [ruleName: string]: { [skillName: string]: number } }

type AssetsName = '?' | 'number' | 'const' | 'exp' | 'string' | 'object' // 记忆编号对人实在不友好
type AssetsNameT = 0 | 1 | 2 | 3 | 4 | 5

interface Assets {
  /** 标识`ats.value`值的类型 */
  type: AssetsNameT,
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

  ctx.on('dispose', () => {
    dice.save()
  })

  ctx.using(['cron'], (ctx) => {
    ctx.cron('*/5 * * * *', () => {
      dice.save()
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
  chAll: Map<number, Character>
  knight: Character
  maxPcId: number

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
    this.load()
      .then(() => {
        log.info(` Knight 已上线。\n记录角色数量：${this.maxPcId} | 实际角色数量：${this.chAll.size}\n`)
      })
    //.catch((err)=>log.warn('加载数据异常',err))
  }

  // 依稀记得设计这个加载机制原因是 db.create 返回没有 id 字段，没法确定 ID
  // 现在一想 加个 uuid 字段或者发个 issues 什么的应该能更好的解决（
  async load() {
    this.chAll = new Map()
    let data = await this.ctx.database.get('circledice_pc', { id: { $gt: -1 } })
    // 第一次
    if (data.length == 0) {
      data.push({
        'id': 1,
        'master': 0,
        'assets': [
          ['maxPcId', { type: 1, value: 1 }],
          ['name', { type: 4, value: 'knight' }]
        ],
        'history': {}
      })
    }
    // 真构造（？
    data.forEach(ele => {
      this.chAll.set(ele.id,new Character(ele))
    })
    this.knight = this.chAll.get(1) // 圆桌骑士x
    this.maxPcId = this.knight.get('maxPcId')
  }

  save() {
    let data: CharacterData[] = []

    this.chAll.forEach(ch => {
      data.push({
        id: ch.id,
        master: ch.master,
        assets: [...ch.assets],
        history: ch.history
      })
    })
    this.ctx.database.upsert('circledice_pc', data)
      .then(() => log.info(`角色数据保存完成，共计 ${data.length} 名。`))
  }



  getCh(u: Pick<User, 'id' | 'player'>, g: GameSpaceData) {
    let id = g.team[u.id]
    if (id) {
      // 绑卡状态
      return this.chAll.get(id)
    } else {
      let ch: Character
      if (u.player.newPcPre) {
        // 每群新建
        ch = this.newCh(u)
        g.team[u.id] = ch.id
        u.player.pclist.push([ch.id, ch.name])
        return ch
      } else {
        // 使用全局
        id = u.player.publicPc
        if (!id) {
          // 从来没有用过，新建一张
          let ch = this.newCh(u)
          u.player.publicPc = ch.id
          return ch
        } else {
          return this.chAll.get(id)
        }
      }
    }
  }

  // 新建角色
  newCh(u: Pick<User, 'id' | 'player'>) {
    this.maxPcId++
    this.knight.set('maxPcId',this.maxPcId)
    let e: CharacterData = {
      id: this.maxPcId,
      master: u.id,
      assets: [],
      history: {}
    }
    let ch = new Character(e)
    this.chAll.set(this.maxPcId, ch)
    log.info(`创建角色：[${ch.id}]${ch.name}`)
    return ch
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
  name: string
  master:number
  assets: Map<string, Assets>
  history: hiy

  constructor(ele: CharacterData) {
    this.assets = new Map(ele.assets)
    this.id = ele.id
    this.master = ele.master
    this.name = this.get('name', 4) // 等价于 this.get('name','string') 那个用得顺手用那个
    this.history = {
      'coc7success': {},
      'coc7fail': {}
    }
  }

  /**
   * 获取角色卡数据 不存在返回 1\
   * 指定类型时且不存在时返回对应类型默认值
   */
  get(key: string, type?: AssetsNameT | AssetsName) {
    if (this.assets.has(key)) {
      return this.assets.get(key).value
    }
    if (type) {
      type = assetsAs(type)
      return assetsBase(type)
    }
    return 1
  }
  /** 返回类型，默认 1 */
  getType(key: string) {
    if (this.assets.has(key)) {
      return this.assets.get(key).type
    }
    return 1
  }

  /**
 * 删除角色卡数据，类型错误/不存在返回 false
 * @param key 键值
 * @param type 类型，默认 1 
 */
  del(key: string, type: AssetsNameT | AssetsName = 1) {
    type = assetsAs(type)
    let ret = this.assets.get(key)
    if (!ret) return true
    if (type != ret.type) {
      return false
    }
    this.assets.delete(key)
    return true
  }

  /**
   * 设置角色数据
   * @param key 键值
   * @param value 变量值
   * @param type 指定类型，默认 1
   */
  set(key: string, value: any, type?: AssetsName | AssetsNameT) {
    if (type == undefined) {
      let ret = this.assets.get(key)
      if (ret != undefined) {
        // 修改
        this.assets.set(key, { type: ret.type, value: value })
        null
      } else {
        this.assets.set(key, { type: 1, value: value })
      }
    } else {
      // 指定类型
      type = assetsAs(type)
      let a: Assets = {
        'type': type,
        'value': value
      }
      this.assets.set(key, a)
    }
  }

  /** 随便设置什么，类型自动判断，虽然可能有错 */
  setAny(key: string, value: any) {
    let i: AssetsNameT = 0
    switch (typeof value) {
      case 'number':
        i = undefined // 防止破坏一些被设置 const 的 assets 被改成 number，set 时自行判断就好
        break;
      case 'string':
        i = dice.roll(value).ok ? 3 : 4
        break;
      case 'object':
        i = 5
        break;
      default:
        i = 0
    }
    this.set(key, value, i)
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

/** 根据资源别名返回真实序号 */
function assetsAs(t: string | number): AssetsNameT {
  if (typeof t == 'number')
    return t as AssetsNameT;
  switch (t) {
    case 'number': return 1;
    case 'const': return 2;
    case 'exp': return 3;
    case 'string': return 4;
    case 'object': return 5;
    default: return 0
  }
}

/** 返回各类型的默认值 */
function assetsBase(a: AssetsNameT) {
  switch (a) {
    case 0: case 1: case 2: return 1;
    case 3: case 4: return '';
    case 5: return null
  }
}
import { Context, Logger, Schema, User } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './Dice_pc'
import * as GameLog from './Dice_log'
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
  pcList: number[]
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

interface RollRet {
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

export interface Config {
  GameLog: GameLog.default.Config
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    GameLog: GameLog.default.Config,
  }),
])

export const name = 'circledice'
export const using = ['database', 'cron'] as const
const log = new Logger('CircleDice/dice:')


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
  circle = new Circle(ctx, config)
  ctx.plugin(Dice_r, config)
  ctx.plugin(Dice_pc, config)
  ctx.plugin(GameLog, config)
  ctx.plugin(cmd, config)
}


class Circle {
  ctx: Context
  config: Config
  chAll: Map<number, Character>
  knight: Character

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
    this.chAll = new Map()
    this.load()
      .then(() => log.info('加载完成。'))
  }

  async load() {
    let data = await this.ctx.database.stats()
    if (data.size == 0) {
      await this.ctx.database.create('circledice_pc', {
        master: 0,
        assets: [
          ['name', 'knight'],
          ['ID:1', 'knight']
        ],
        history: {}
      })
      let ID2 = await this.newCh({ id: 0 }) // 创建一张处理错误的角色卡 ID2
      ID2.name = 'ID2'
    }
    this.knight = await this.getChRaw(1)
  }

  async getChRaw(id: number) {
    if (this.chAll.has(id)) {
      return this.chAll.get(id)
    }
    let data = await this.ctx.database.get('circledice_pc', id)
    if (data.length == 0) {
      log.warn('错误的角色卡 ID ！')
      return this.getChRaw(2)
    }
    let ch = new Character(data[0], this)
    this.chAll.set(ch.id, ch)
    return ch
  }

  // 新建角色
  async newCh(u: Pick<User, 'id'>) {
    let data = await this.ctx.database.create('circledice_pc', { master: u.id, assets: [], history: {} })
    let ch = new Character(data, this)
    log.info(`创建角色：[${ch.id}]`)
    return ch
  }

  async getCh(u: Pick<User, 'id' | 'player'>, g: GameSpaceData) {
    let id: number
    let ch: Character
    if (g)
      id = g.team[u.id];

    if (id) {
      // 群聊绑卡状态
      ch = await this.getChRaw(id)
    } else {
      if (u.player.newPcPre && g) {
        // 每群新建
        ch = await this.newCh(u)
        g.team[u.id] = ch.id
        u.player.pcList.push(ch.id)
      } else {
        // 使用全局
        id = u.player.publicPc
        if (id == null) {
          // 从来没有用过，新建一张
          ch = await this.newCh(u)
          u.player.publicPc = ch.id
          u.player.pcList.push(ch.id)
        } else {
          ch = await this.getChRaw(id)
        }
      }
    }
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

  alias(key: string) {

  }
}

class Character {
  id: number
  master: number
  _name: string
  assets: Map<string, any>
  history: hiy
  circle: Circle

  constructor(ele: CharacterData, circle: Circle) {
    this.circle = circle
    this.assets = new Map(ele.assets)
    this.id = ele.id
    this.master = ele.master
    this._name = this.assets.get('name') ?? '无名'
    this.history = {
      'coc7success': {},
      'coc7fail': {}
    }
  }

  get name() {
    return this._name
  }

  set name(val) {
    this.set('name', val)
    this.circle.knight.set(`ID:${this.id}`, val)
  }

  /** 获取角色卡数据 不存在返回 1*/
  get(key: string) {
    if (this.has(key)) {
      return this.assets.get(key)
    }
    return 1
  }

  /** 删除角色卡数据 */
  del(key: string) {
    this.assets.delete(key)
  }

  /** 添加或修改角色数据 */
  set(key: string, value: any) {
    this.assets.set(key, value)
    /*debounce(
      this.save()
      , 1000)*/
  }

  has(k: string) {
    return this.assets.has(k)
  }

  /**
   * 设置角色历史记录，用于 en 指令
   * @param k 技能名
   * @param b 成功还是失败
   */
  AddCOC7Hiy(k: string, b: boolean) {
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
    this.circle.ctx.database.upsert('circledice_pc', [ele])
      .catch(() => log.info(`更新角色 [${this.id}]${this.name} 数据`))
    return null
  }
}

export { circle, Character }

// 这里放一些常用的工具函数
/** 生成 length 长度的随机字符 */
export function randomString(length: number) {
  let str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i)
    result += str[Math.floor(Math.random() * str.length)];
  return result;
}

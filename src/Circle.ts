import * as onedice from '@onedice/core'
import { Context, User } from 'koishi'
import { Character } from './pc/Character'
import { Config, log, PlayerData, GameSpaceData } from './index'

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

export class Circle {
  ctx: Context
  config: Config
  chAll: Map<number, Character>
  knight: Character
  ob: Character

  constructor(ctx: Context, config: Config) {
    this.ctx = ctx
    this.config = config
    this.chAll = new Map()
  }

  async load() {
    let [data] = await this.ctx.database.get('circledice_pc', 1)
    if (!data) {
      await this.newCh({ id: 0 }) // 为了确保 master id 是 0 手动添加
      await this.newCh({ id: 0 }) // 创建一张处理错误的角色卡 Observer
    }
    this.knight = await this.getChRaw(1)
    this.ob = await this.getChRaw(1)
    this.knight.name = 'Knight'
    this.ob.name = 'Observer'
  }

  async getChRaw(id: number):Promise<Character> {
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
    let ret: RollRet = { 'ok': false, 'ret': 0, 'rest': '', 'detail': '', 'err': null }
    switch (this.config.useRollVM) {
      case 'oneDice':
        try {
          const [value, root] = onedice.dice(text)
          ret.ret = value
          ret.detail = root.toString()
          ret.ok = true
        } catch (e) {
          ret.err = e.message
        }
        return ret
    }
  }

  randomSTR(length: number = 6) {
    let str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = length; i > 0; --i)
      result += str[Math.floor(Math.random() * str.length)];
    return result;
  }
}

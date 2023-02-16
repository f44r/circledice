import { Context, Logger, Schema } from 'koishi'
import { Config } from './config'
import { Character, PlayerData, GameSpace, Assets, MsgLog } from './lib/types'
import { createHmac } from 'crypto'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './Dice_pc'
import * as Dice_log from './Dice_log'


export const name = 'circledice'
export const using = ['database'] as const

export { Config }

const log = new Logger('CircleDice/dice:')
let dice: Dice;
export function apply(ctx: Context, config: Config) {
  // 扩展数据模型
  ctx.model.extend('circledice_pc', {
    'id': 'unsigned',
    'name': 'string',
    'version': 'string',
    'clear': 'boolean',
    'token': 'string',
    'assets': 'json',
    'history': 'json'
  })
  ctx.model.extend('user', {
    player: {
      type:'json'
    }
  })
  ctx.model.extend('channel', {
    gameSpace: {
      type:'json'
    },
  })

  log.info('CircleDice 已启动...正在尝试初始化数据')
  //dice = new Dice(ctx) 启动一个类的想法不变，但是会将 先攻、Log 这些数据移除。
  ctx.plugin(Dice_r)
  ctx.plugin(Dice_pc)
  ctx.plugin(Dice_log)
  //ctx.plugin(Dice_init)
}

export { dice }

class Dice {
  /**之后所有的 version 属性都来自这里 供后续版本数据结构升级使用 */
  version: string = 'dev'
  /** 最大 pcid */
  maxpcid: number
  /** 最大 logid  */
  maxlogid: number
  /** 用角色卡机制存一些零散的数据 */ // 因为单独开一张表来存既麻烦又浪费
  knight: Character
  /** 全部角色数据 */
  chaAll: Map<number, Character> = new Map()
  ctx: Context

  constructor(ctx: Context) { // todo botID:string[]=[] 多 bot 配置页面
    this.ctx = ctx
    this.loadDice()
      .then(() => {
        log.info(` Knight 已上线。\n记录角色数量：${this.maxpcid} | 实际角色数量：${this.chaAll.size}\nMaxLogID：${this.maxlogid}\n`)
      })
  }

  /** 加载骰子数据 */
  async loadDice() {
    let x = await this.ctx.database.get('circledice_pc', { id: { $gt: 0 } })
    for (let x1 of x) {
      x1.assets = new Map(Object.entries(x1.assets))
      this.chaAll.set(x1.id, x1)
    }
    this.knight = this.chaAll.get(1)
    try {
      this.knight.assets.set('lastTime', { type: 1, value: Date.now() })
      this.chaAll.set(1, this.knight)
    } catch (error) {
      this.knight = {
        'id': 1,
        'name': 'knight',
        'clear': false,
        'token': 'x',
        'version': this.version,
        'assets': new Map([
          ['maxpc', { type: 1, value: 1 }],
          ['maxlog', { type: 1, value: 0 }],
          ['lastTime', { type: 1, value: Date.now() }],
          ['desc', { type: 4, value: '初号机屹立于大地之上' }] // 虽然没有意义,但很有意义(
        ])
      }
      this.chaAll.set(1, this.knight)
    }
    this.maxpcid = this.knight.assets.get('maxpc').value
    this.maxlogid = this.knight.assets.get('maxlog').value
    await this.save()
  }

  /** 保存骰子数据 */
  async save() {
    let rows = [], row: any = {}
    for (let x1 of this.chaAll.values()) {
      row = x1
      row.assets = [...x1.assets.entries()].reduce((obj, [key, value]) => (obj[key] = value, obj), {})
      rows.push(row)
    }
    await this.ctx.database.upsert('circledice_pc', rows)
    log.info('共 ' + rows.length + ' 个角色的数据更新入数据库。')
  }

  /** 使 `maxpcid` +1，返回+1后 `maxpcid` */
  newChaId() {
    this.maxpcid++
    return this.maxpcid
  }

  createCha(): Character {
    this.maxpcid++
    return {
      'id': this.maxpcid,
      'name': 'knight',
      'clear': false,
      'token': '',
      'version': this.version
    }
  }

  newCha(character: Character) {
    this.chaAll.set(character.id, character)
  }
  /** 使 `maxlogid` +1，返回+1后 `maxlogid` */
  newLogId() {
    this.maxlogid++
    return this.maxlogid
  }

  /** 根据 ID 加盐生成 token 
   * @param 应为群组ID或者个人ID
  */
  getToken(x: string): string {
    const pwd = 'pwd';// 或许可以提供一个配置项
    const hash = createHmac('md5', pwd).update(x).digest('hex');
    return hash
  }

  /** 简易资源类型推断 */
  getAssetsType(val: any) {
    let i: Assets['type'] = 0
    switch (typeof val) {
      case 'number':
        i = 1
        break;
      case 'string':
        // todo 这里需要 rd 的 api,先简单判断一下吧
        i = val.match(/^((\d*)d)?(\d+)(\+((\d*)d)?(\d+))*$/i) ? 3 : 4
        break;
      case 'object':
        i = 5
        break;
      default:
        i = 0
    }
    return i
  }

  /** 快速设置角色资源值 
   * @param character 角色
   * @param key 资源键值
   * @param val 资源值
   * @param typ 可选 指定资源类型
  */
  setChaAs(character: Character, key: string, val: any, typ: Assets['type'] = 0) {
    let i: Assets['type'] = 0
    if (typ != 0) {
      i = typ
    } else {
      i = this.getAssetsType(val)
    }
    let cha = this.chaAll.get(character.id)
    cha.assets.set(key, { type: i, value: val })
    this.chaAll.set(character.id, cha)
  }

  /** 快速获取角色资源值;其实不够快 */
  getChaAs(c: Character, key: string) {
    return c.assets.get(key).value
  }

  /** 获取当前 PC ；在群且录入过角色，使用录入角色；否则使用全局角色
   * @param p 玩家数据
   * @param g 群组数据
   */
  getCurrentPC(p: PlayerData, g: GameSpace) {
    let pc: Character;
    if (!g) {
      const pcid = g.team.get(p.uid) // 非 0 id
      pc = pcid ? this.chaAll.get(pcid) : this.chaAll.get(p.publicPc[0])
    } else {
      pc = this.chaAll.get(p.publicPc[0])
    }
    return pc
  }

  createLogIt(s:string){
    let logIt:MsgLog
    return logIt
  }
}



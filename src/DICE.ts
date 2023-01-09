import { Context, Session } from 'koishi'
import { Character,PlayerData, GameSpace, Assets } from './lib/types'
import { createHmac } from 'crypto'

class DICE {
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
  ctx:Context

  constructor(ctx: Context) { // todo botID:string[]=[] 多 bot 配置页面
    this.ctx = ctx
    this.loadDice()
      .then((x) => {
        this.maxlogid = x.get('maxlog').value
        this.maxpcid = x.get('maxpc').value
      })
  }

  /** 加载骰子数据 */
  async loadDice() {
    [this.knight] = await this.ctx.database.get('circledice_pc', [1])
    if (!this.knight) {
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
      await this.ctx.database.upsert('circledice_pc', [this.knight])
    }
    this.ctx.database.get('circledice_pc', { id: { $gt: 0 } })
      .then((x) => {
        x.forEach((x2) => this.chaAll.set(x2.id, x2))
      })
    return this.knight.assets
  }
  /** 保存骰子数据 */
  async save() {
    let rows = []
    for (let row of this.chaAll) {
      rows.push(row[1])
    }
    await this.ctx.database.upsert('circledice_pc', rows)
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

  newCha(character:Character){
    this.chaAll.set(character.id,character)
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
  getAssetsType(val:any){
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
    this.chaAll.set(character.id,cha)
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
}


export { DICE }
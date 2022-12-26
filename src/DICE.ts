import { Context } from 'koishi'
import { Character } from './lib/types'
import crypto from 'crypto'

class DICE {
  readonly version: string = '0.0.1'
  knight: Character
  chaAll: Character[]

  constructor(ctx: Context) {
    this.loadDice(ctx)
  }

  /** 加载骰子数据 */
  async loadDice(ctx: Context) {
    [this.knight] = await ctx.database.get('circledice_pc', [1])
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
      await ctx.database.upsert('circledice_pc', [this.knight])
    }
    this.chaAll = await ctx.database.get('circledice_pc', {
      id: { $gt: 0 }
    })
  }
  /** 保存骰子数据 */
  async save(ctx: Context) {
    await ctx.database.upsert('circledice_pc', this.chaAll)
  }

  newChaId() {
    let id = this.knight.assets.get('maxpc').value
    DICE.Aset(this.knight.assets, 'maxpc', id + 1)
    return id + 1
  }

  getToken(x: string) {
    const pwd = 'pwd';
    const hash = crypto.createHmac('md5', pwd).update(x).digest('hex');
    return hash
  }

  /** 快速设置角色资源值 */
  static Aset(assets: Character['assets'], a1: any, a2: any) {
    const model: [0, 1, 2, 3, 4, 5] = [0, 1, 2, 3, 4, 5]
    let i = 0
    switch (typeof a2) {
      case 'number':
        i = 1
        break;
      case 'string':
        if (a2.match(/\d*d\d*/)) { // todo 这里需要 rd 的 api
          i = 3
        } else {
          i = 4
        }
        break;
      case 'object':
        i = 5
        break;
      default:
        i = 0
    }
    assets.set(a1, { type: model[i], value: a2 })
  }
  /** 快速获取角色资源值 */
  static Aget(assets: Character['assets'], s: string) {
    return assets.get(s).value
  }
}


export { DICE }
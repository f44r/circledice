import { hiy, CharacterData, log } from "../index";
import { Circle } from "../Circle";

export class Character {
  id: number
  master: number
  assets: Map<string, any>
  history: hiy
  circle: Circle
  private lastUpDataTime = Date.now()
  private Timeout: NodeJS.Timeout

  constructor(ele: CharacterData, circle: Circle) {
    this.circle = circle
    this.assets = new Map(ele.assets)
    this.id = ele.id
    this.master = ele.master
    this.name = '无名'
    this.rule = 'coc7'
    this.history = {
      'coc7success': {},
      'coc7fail': {}
    }
  }

  get name() {
    return this.assets.get('name')
  }

  set name(val) {
    this.set('name', val)
    this.circle.knight ? this.circle.knight.set(`ID:${this.id}`, val) : null
  }

  get rule(){
    return this.assets.get('_rule')
  }

  set rule(val){
    this.assets.set('_rule',val)
  }

  /** 获取角色卡数据 不存在返回 1*/
  get(key: string) {
    if (this.has(key)) {
      return this.assets.get(key)
    }
    return 0
  }

  /** 删除角色卡数据 */
  del(key: string) {
    this.assets.delete(key)
  }

  /** 添加或修改角色数据 */
  set(key: string, value: any) {
    this.assets.set(key, value)
    this.save()
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
    this.save()
  }

  #save() {
    let ele: CharacterData = {
      'id': this.id,
      'master': this.master,
      'assets': [...this.assets],
      'history': this.history,
    }
    this.circle.ctx.database.upsert('circledice_pc', [ele])
      .then(() => log.info(`更新角色 [${this.id}]${this.name} 数据 | ${new Date(this.lastUpDataTime + 1000).toString()}`))
  }

  save() {
    const now = Date.now()
    if ((now - this.lastUpDataTime) < 1000) {
      // 两次 save 时间小于 1 s 重新设置保存操作
      log.debug('重置保存操作')
      this.Timeout ? clearTimeout(this.Timeout) : null
      this.Timeout = setTimeout(this.#save, 1000)
    }
    // 延迟保存操作 防抖
    this.Timeout = setTimeout(this.#save, 1000)
    this.lastUpDataTime = now
  }
}

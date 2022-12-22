namespace CircledDice {

  // 骰数据
  export interface DiceData {
    version: number // 之后所有的版本都来自这里 后续版本数据结构升级使用
    maxPcID: number // 供给 newPc 使用
    maxLogID: number // 给 newLog 使用
    deckData?: object[] // 原始的牌堆数据
  }

  // 游戏空间 位于 channe 表
  export interface GameSpace {
    botOn: boolean // 没什么用处的开关
    version: number
    rule: string
    pwd: string // 群密钥 初始化随机生成
    nowlog?: [boolean, number, string] // 当前 log 的状态 开关、id、token
    team?: Map<string, number> // pluserid -> pcid 
    loglist?: Map<number, string> // logid -> logname
    init?: Map<string, number> // '[pcid]name' -> ri 先攻
  }

  // logText
  export interface logText {
    uid: string
    mid: string
    pcName: string
    context: string // 如有图片 用 ![](link) 合并进去
  }

  // 独立的 msglog 表 id 自增
  export interface msglog {
    islog: boolean // 清理无用日志时使用
    botId: string // 针对多个 bot 在一个群情况 格式 platform-userid
    logID: number // 提取特定日志使用
    logToken: string // 来自群密钥
    gid: string // gid 格式 platform-channeId-guildId
    time: number // 根据时间 提取特定群日志 & 清理日志 时使用;
    logText: logText
  }

  // assets 角色都有什么呢
  type atsname = string
  export interface ats {
    type: number,
    value: number | string | object // 理论这里应该有武器的数据类型
  }

  // pc 角色数据，独立的储存在 cd_pc 表中
  export interface pc {
    name: string,
    version: number,
    clear: boolean // 清理标记
    token: string // 根据 pl 的 pwd 生成
    assets?: Map<atsname, ats> // st 指令时更新
    history?: {
      // 计数检定的成败次数
      success?: Map<atsname, number>,
      fail?: Map<atsname, number>
    }
  }

  // pl 玩家数据 位于 user 表
  export interface pl {
    version: number
    pwd: string // 个人密钥 初始化时生成
    nowPc: [number, string] // 默认 pc 
    pclist?: Map<number, string> // 使用 pc 的 账号和密码x
    history?: {
      rolldice?: number[] // r 指令更新
    }
  }

};
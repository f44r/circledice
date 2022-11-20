# 然后确定数据结构



## 文件夹结构

```
.
├─deck
├─helpdoc
├─log
├─group
├─user
├─config
└─tmp
```
## Dice

```js
dice = {
	"name":"",
    "pcid":0,
    "runtime":0, // 开始运行时间
}
```




## 单群数据

```js
Group = {
     "bot":true, // 是否开关
     "pc":{
          "QQ1":"pc1", // pl 与 pc 的对应关系
          "QQ2":"pc2"
     },
     "log":"", // 当前 log 名字，为空说明此前没有记录
     "loglist":[
         {
             "name":"", // 日志名
             "num":0 //
         }
     ],
     "init":{
         "name":12 // xia
     }
     "last":{
         "time":0 // 最后发言时间
     }
}
```



## 单用户数据

```js
user = {
     "pclist":{
          "pc1":{},	//详细数据
          "pc2":{}	//详细数据
     },
     "hiy":{
          "s":0,		//次数
          "hs":0	//次数
     },
     "last":{
         "time":0
     }
}
```



## 角色卡

```js
pc = {
	"id":"",	// 一个骰子上自增，
	"name":"", // 名字，是否允许同名（？
    "att":{}, // 属性
    "skill":[], // 属性
    "poss":[],	// 财产 possessions 武器等
    "hiy":{}, // 统计
    "rule":"" // 适用规则
    
}
```

## 技能

```js
skill = {
    "name": "",
    "expression": "1d20", // ra技能 本质就是 r 1d100 比较界限 ； dnd 等则是  r d20+调整值 +…… ； 无限等也是类似的相加 ； 此属性应该在录入时生成 
    "tag": true, // 真 向上比较 expression > 界限
    "limit": 0, // 目前只有 coc - BRP系统需要这一属性 其他时候的 难度等级都依靠主持人和模组给出，并非硬性要求
    "rule": "" // 使用规则
}
```
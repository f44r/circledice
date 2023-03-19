// TODO: 一个更好的 st

type Token = {
  T: string,
  V: string
}

/**
 * 返回一个数组\
 * [\
 *  [null,'力量+10'] 表示一个需要修改的属性 \
 *  ['力量',40] 表示一个需要录入的属性 K-V \
 *  ['武器',{}] \
 * ]
 */
function main(text: string) {
  // 格式化原始文本
  text = text[text.length] == ';' ? text : text + ';'
  return parse(text)
}

function parse(text: string) {
  let arr: Token[] = []
  let f = [
    '+', '-', '*', '/', 'x', '^',
    'd', 'a', 'c', 'f', '(', ')',
    'k', 'q', 'p', 'b'
  ]
  // 分离
  for (let s of text) {
    if (f.includes(s)) {
      arr.push({ T: 'count', V: s })
      continue
    }
    switch (s) {
      case '{':
        arr.push({ T: s, V: s })
        break;
      case '}':
        arr.push({ T: s, V: s })
        break;
      case ';':
        arr.push({ T: s, V: s })
        break
      case '=':
        arr.push({ T: s, V: s })
        break
      default:
        if (isNaN(+s)) {
          arr.push({ T: 'str', V: s })
        } else {
          arr.push({ T: 'num', V: s })
        }
    }
  }
  // 合并 紧邻的数字和字符
  let i = 0
  const cl = ['num', 'str']
  while (i < arr.length - 1) {
    const e1 = arr[i], e2 = arr[i + 1]
    if (e1.T == e2.T && cl.includes(e1.T)) {
      arr.splice(i, 2, { T: e1.T, V: e1.V + e2.V })
      continue
    }
    i++
  }
  // 合并 简单算式 如 1+2、1d50
  // 我知道代码重复了，但是我实在不想手动迭代了，对现在的我来说心智负担太大，不好维护
  i = 0
  while (i < arr.length) {
    const e0 = arr[i - 1], e1 = arr[i], e2 = arr[i + 1]
    if ([e0, e1, e2].includes(undefined)) {
      i++
      continue
    }
    // 1d
    if (e0.T == 'num' && e1.T == 'count') {
      arr.splice(i - 1, 2, { T: e1.T, V: e0.V + e1.V })
      continue
    }
    if (e1.T == e2.T && e1.T == 'count') {
      arr.splice(i, 2, { T: e1.T, V: e1.V + e2.V })
      continue
    }
    // d100
    if (e1.T == 'count' && e2.T == 'num') {
      arr.splice(i, 2, { T: e1.T, V: e1.V + e2.V })
      continue
    }
    i++
  }
  return arr
}

function exec_pair(arr: Token[]) {
  // 运算
  let i = 0
  let ret = []
  // xx=(xx) xx(xx,)
  let m = arr.findIndex(v => v.T == '(')
  while (m > 0) {
    const j = arr.findIndex(v => v.T == ')')
    arr[m].T = arr[j] = null
    let key = arr[m - 1]
    if (key.T == '=') {
      arr[m - 1].T = null
      key = arr[m - 2]
    }
    const st_sub = arr.slice(m, j)
    ret.push([key.V, exec_base(st_sub)])
    // 继续找
    m = ret.findIndex(v => v.T == '(')
  }
}

function exec_base(arr: Token[]) {
  let ret = []
  let find = (s: string) => arr.findIndex(v => v.T == s)
  // k=v; 第一种赋值语法
  let i = find('=')
  while (i > 0) {
    let k_index = i - 1, v_index = i + 1
    if (k_index < 0 || v_index > arr.length) {
      throw Error('等号两端缺少参数')
    }
    let key = arr[k_index], val = arr[v_index]
    if (key.T != 'str') {
      throw Error('键必须是字符')
    }
    let j = find(';')
    if (j == arr.length) { // 最后的分号;  k=v; 或者 k1=60k2=70k3=90...
      ret.push([key, val])
      arr.splice(k_index, 3)
      i = find('=')
      continue;
    }
    if (j <= v_index) { // k=;v or  k;=v
      throw Error('分号出现在值之前')
    }

    // k1=60k2=50;k3=v3;k4=v4
    let a = j - v_index;
    if (a == 1) {
      ret.push([key, val])
      arr.splice(k_index, 4)
      i = find('=')
      continue;
    }
  }
  // xx50  xx1d50 简化的赋值语法
  return []
}

let test = [
  // 'A60B70CC8',
  // 'A=60BB=CC;DD(6D50)',
  '1d4+8'
]

test.forEach(v => {
  console.log(main(v))
})
1

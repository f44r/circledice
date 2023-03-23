type alias = {
  [rule: string]: { [key: string]: string[] }
}

const aliasConfig: alias = require('./alias.yml')

export function alias(key: string, rule = 'coc7') {
  const t = Object.entries(aliasConfig[rule])
  for (let [k, v] of t) {
    if (v.includes(key)) {
      return k
    }
  }
  return null
}

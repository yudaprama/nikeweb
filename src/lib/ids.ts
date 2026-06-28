import { customAlphabet } from 'nanoid'

// Mirrors LobeHub's idGenerator (lobehub/packages/database/src/utils/idGenerator.ts):
// `<prefix>_<nanoid(12)>` over the same alphabet. pREST inserts raw SQL and does
// NOT run Drizzle's `$defaultFn`, so the client must mint primary keys itself.
const nano = customAlphabet(
  '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  12,
)

const PREFIX = {
  sessions: 'ssn',
  messages: 'msg',
  topics: 'tpc',
  agents: 'agt',
} as const

export function newId(kind: keyof typeof PREFIX): string {
  return `${PREFIX[kind]}_${nano()}`
}

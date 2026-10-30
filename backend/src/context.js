import { AsyncLocalStorage } from 'node:async_hooks'
const scope = new AsyncLocalStorage()
export const runWithWorkspace = (auth, next) => scope.run(auth, next)
export const getWorkspace = () => scope.getStore() || null
export const getOrgId = () => scope.getStore()?.orgId ?? 1

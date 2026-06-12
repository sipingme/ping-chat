import Store from 'electron-store'

interface ScheduledTask {
  id: string
  partition: string
  content: string
  executeAt: number
  autoSend: boolean
  cancelled: boolean
}

const store = new Store<{ tasks: ScheduledTask[] }>({ name: 'scheduler', defaults: { tasks: [] } })

function getTasks(): ScheduledTask[] {
  return store.get('tasks', [])
}

function saveTasks(tasks: ScheduledTask[]): void {
  store.set('tasks', tasks)
}

export function scheduleMessage(partition: string, content: string, delayMs: number, autoSend = true): string {
  const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const tasks = getTasks()
  tasks.push({
    id,
    partition,
    content,
    executeAt: Date.now() + delayMs,
    autoSend,
    cancelled: false,
  })
  saveTasks(tasks)
  return id
}

export function cancelScheduledMessage(id: string): boolean {
  const tasks = getTasks()
  const task = tasks.find((t) => t.id === id)
  if (task) {
    task.cancelled = true
    saveTasks(tasks)
    return true
  }
  return false
}

export function getScheduledMessages(partition?: string): ScheduledTask[] {
  const tasks = getTasks().filter((t) => !t.cancelled && t.executeAt > Date.now())
  if (partition) {
    return tasks.filter((t) => t.partition === partition)
  }
  return tasks
}

export function runScheduler(cb: (partition: string, content: string, autoSend: boolean) => void): void {
  setInterval(() => {
    const now = Date.now()
    const tasks = getTasks()
    let dirty = false
    for (const task of tasks) {
      if (!task.cancelled && task.executeAt <= now) {
        task.cancelled = true
        dirty = true
        cb(task.partition, task.content, task.autoSend)
      }
    }
    if (dirty) saveTasks(tasks)
  }, 1000)
}

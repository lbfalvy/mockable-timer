export interface Time {
    now(): number
    wait(n: number, f: () => void, repeat?: boolean): () => void
}

export const time: Time = {
    now: () => Date.now() / 1000,
    wait(s, f, repeat = false) {
        const handler = repeat ? setInterval : setTimeout
        const clearer = repeat ? clearInterval : clearTimeout
        const ret = handler(f, s * 1000)
        return () => clearer(ret)
    }
}

export type ScheduleEntry = [number, () => void]
export interface TimeManager {
    progress(s: number): Promise<void>
    progressTo(s: number): Promise<void>
    getNext(): ScheduleEntry | undefined
    getQueue(): ScheduleEntry[]
    runAll(limit?: number): Promise<void>
    flushMtq(): Promise<void>
}

export function mockTime(): [Time, TimeManager] {
    var now = 0
    const queue: ScheduleEntry[] = []
    const mockTime: Time = {
        now: () => now,
        wait: (s, f, repeat = false) => {
            const at = s + mockTime.now()
            var clear = () => {
                queue.splice(queue.indexOf(entry), 1)
            }
            const entry: ScheduleEntry = [
                at,
                repeat ? () => {
                    clear = mockTime.wait(s, f, repeat)
                    f()
                } : f
            ]
            const onePast = queue.findIndex(([t]) => at < t)
            queue.splice(0 < onePast ? onePast : queue.length, 0, entry)
            return () => clear()
        }
    }
    const manager: TimeManager = {
        async progressTo(t) {
            if (t < now) throw new Error("I, too, sometimes wish we could turn back time")
            while (queue[0] && queue[0][0] <= t) {
                const [time, handler] = queue.shift()!
                now = time
                handler()
                await manager.flushMtq()
            }
            now = t
            await manager.flushMtq()
        },
        getNext: () => queue[0],
        getQueue: () => queue,
        flushMtq: () => new Promise(r => setTimeout(r, 0)),
        progress: s => manager.progressTo(now + s),
        async runAll(limit = 10_000) {
            for (let i = 0; i < limit; i++) {
                const task = manager.getNext()
                if (!task) return
                await manager.progressTo(task[0])
            }
            throw new Error(`Ran ${limit} tasks and still have more. This indicates an infinite loop.`)
        }
    }
    return [mockTime, manager]
}
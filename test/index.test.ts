import { mockTime, Time, TimeManager } from "../src"

describe('Time service', () => {  
    describe('Mocks', () => {
        var time!: Time
        var timeMgr!: TimeManager
        beforeEach(() => {
            [time, timeMgr] = mockTime()
        })
        test('Progress, progressTo, getQueue and getNext all work as expected', async () => {
            var checkpoints = 0
            time.wait(10, () => {
                expect(time.now()).toBe(10)
                checkpoints++
            })
            time.wait(20, () => {
                expect(time.now()).toBe(20)
                checkpoints++
            })
            time.wait(45, () => checkpoints++)
            await timeMgr.progress(15)
            expect(timeMgr.getQueue().map(([at]) => at)).toStrictEqual([20, 45])
            expect(timeMgr.getNext()?.[0]).toBe(20)
            expect(checkpoints).toBe(1)
            await timeMgr.progressTo(30)
            expect(checkpoints).toBe(2)
            expect(time.now()).toBe(30)
            await timeMgr.progressTo(46)
            expect(checkpoints).toBe(3)
            expect(timeMgr.getNext()).toBeUndefined()
        })
        test('runAll runs all, fails on infinite', async () => {
            const cb = jest.fn()
            time.wait(10, cb)
            time.wait(20, cb)
            time.wait(30, cb)
            await timeMgr.runAll(100)
            expect(cb).toHaveBeenCalledTimes(3)
            expect(time.now()).toBe(30)
            time.wait(10, cb, true)
            await expect(timeMgr.runAll(100)).rejects.toBeInstanceOf(Error)
        })
        test('flushMtq flushes the microtask queue completely', async () => {
            const cb = jest.fn()
            Promise.resolve().then(cb)
            await timeMgr.flushMtq()
            expect(cb).toHaveBeenCalled() // It flushes previously enqueued events
            Promise.resolve().then(async () => {
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
                await Promise.resolve()
                // Surely if these are resolved then everything is
                cb()
            })
            await timeMgr.flushMtq()
            expect(cb).toHaveBeenCalledTimes(2)
            setTimeout(cb, 10) // Not a microtask
            time.wait(0, cb)
            await timeMgr.flushMtq()
            expect(cb).toHaveBeenCalledTimes(2) // Ensure that the last call didn't happen
        })
        test('Interval works and can be cancelled', async () => {
            const cb = jest.fn()
            const cancel = time.wait(5, cb, true)
            await timeMgr.progress(15)
            expect(cb).toHaveBeenCalledTimes(3)
            cancel()
            await timeMgr.progress(15)
            expect(cb).toHaveBeenCalledTimes(3)
        })
        test('Timeout can be cancelled', async () => {
            const cb = jest.fn()
            const cancel = time.wait(15, cb, true)
            cancel()
            await timeMgr.progress(20)
            expect(cb).not.toHaveBeenCalled()
        })
    })
})
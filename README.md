# Mockable Timer

A thin wrapper over Date.now(), setTimeout and setInterval, along with an
elaborate mock

Designed for dependency injection, and for wrapping further to support
any other interface

NOT designed for replacing the original Date.now(), setTimeout and
setInterval for testing. It will probably work but it isn't an intended
use case. Unit testing implies dependency injection

## Usage

### Client

```ts
import { time } from 'mockable-timer'
```

Import the default implementation, which depends on `Date.now()`,
`setTimeout`, `setInterval`, `clearTimeout` and `clearInterval`

```ts
time.now()
```

Get the exact UNIX timestamp in seconds. It's not in milliseconds because
most platforms zero out the two last digits anyway to prevent cache
timing attacks and this way durations within human perception range are
easier to read and compare

```ts
const cancel = time.wait(60, () => alert('Are you still there?'))
cancel()
```

Set a timeout. The time is in seconds for consistency. `wait` returns a
function, calling this function cancels the timeout.

```ts
time.wait(60, () => alert('Another minute passed'), true)
```

Set an interval. The third parameter is a boolean that defaults to
`false`.

### Mock

```ts
import { mockTime } from 'mockable-timer'

const [time, timeManager] = mockTime()

export type ScheduleEntry = [number, () => void]
export interface TimeManager {
    progress(s: number): Promise<void>
    progressTo(s: number): Promise<void>
    flushMtq(): Promise<void>
    runAll(limit?: number): Promise<void>
    getNext(): ScheduleEntry | undefined
    getQueue(): ScheduleEntry[]
}
```

The time manager supports the following methods:

- **`progress`**: Moves time forward by the specified number of seconds
- **`progressTo`**: Moves time to the specified point, throws if the
	point is in the psat
- **`flushMtq`**: Flush all microtasks using `setTimeout` with a duration
	of 0. This is done after every enqueued timer by the mock
- **`runAll`**: Run the timer until the queue is empty. Throws if there
	are still more after 10K executed timers. Note that this can get
	stuck on intervals
- **`getNext`**: Return a tuple of the next task and its due timestamp.
	Returns undefined if the queue is empty
- **`getQueue`**: Return an array of all enqueued tasks with their due
	timestamps

## Todo

- Make runAll halt if there are only repeating timers left